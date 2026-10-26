import { ActiveTimer, HermesStats, MemoryLeakAlert, MemorySample } from '../../types';
import { timerTracker } from './TimerTracker';
import { fpsMonitor } from './FPSMonitor';

type Listener = (sample: MemorySample, alerts: MemoryLeakAlert[]) => void;

export class MemoryMonitor {
  private isRunning: boolean = false;
  private intervalId: any = null;
  private sampleIntervalMs: number = 1000;
  private history: MemorySample[] = [];
  private maxHistory: number = 60; // 60 seconds of history
  private alerts: MemoryLeakAlert[] = [];
  private listeners: Set<Listener> = new Set();

  public isHermesAvailable(): boolean {
    return Boolean((global as any).HermesInternal?.getInstrumentedStats);
  }

  public getHermesStats(): HermesStats | null {
    try {
      const stats = (global as any).HermesInternal?.getInstrumentedStats?.();
      return stats || null;
    } catch {
      return null;
    }
  }

  public start(sampleIntervalMs: number = 1000) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.sampleIntervalMs = sampleIntervalMs;

    timerTracker.enable();
    fpsMonitor.start();

    // Sample immediately
    this.takeSample();

    this.intervalId = setInterval(() => {
      this.takeSample();
    }, this.sampleIntervalMs);
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    fpsMonitor.stop();
    timerTracker.disable();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.history.length > 0) {
      listener(this.history[this.history.length - 1], this.alerts);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getHistory(): MemorySample[] {
    return [...this.history];
  }

  public getAlerts(): MemoryLeakAlert[] {
    return [...this.alerts];
  }

  public getActiveTimers(): ActiveTimer[] {
    return timerTracker.getActiveTimers();
  }

  public clearAlerts() {
    this.alerts = [];
    this.notify();
  }

  private takeSample() {
    const hermesStats = this.getHermesStats();
    let jsHeapSizeMB = 0;
    let allocatedBytesMB = 0;
    let totalHeapMB = 0;

    if (hermesStats) {
      // Hermes metrics are in bytes
      jsHeapSizeMB = Number(((hermesStats.js_heap_size || 0) / (1024 * 1024)).toFixed(2));
      allocatedBytesMB = Number(((hermesStats.allocated_bytes || 0) / (1024 * 1024)).toFixed(2));
      totalHeapMB = Number(((hermesStats.heap_size || 0) / (1024 * 1024)).toFixed(2));
    } else if ((performance as any)?.memory) {
      const perfMem = (performance as any).memory;
      jsHeapSizeMB = Number(((perfMem.usedJSHeapSize || 0) / (1024 * 1024)).toFixed(2));
      totalHeapMB = Number(((perfMem.totalJSHeapSize || 0) / (1024 * 1024)).toFixed(2));
      allocatedBytesMB = jsHeapSizeMB;
    } else {
      // Fallback baseline for non-Hermes / emulator environments
      const simulatedBase = 18.5 + (this.history.length % 5) * 0.4;
      jsHeapSizeMB = Number(simulatedBase.toFixed(2));
      allocatedBytesMB = Number((simulatedBase * 0.85).toFixed(2));
      totalHeapMB = 32.0;
    }

    const activeTimersCount = timerTracker.getActiveIntervalsCount();
    const fps = fpsMonitor.getFPS();

    const sample: MemorySample = {
      timestamp: Date.now(),
      jsHeapSizeMB,
      allocatedBytesMB,
      totalHeapMB,
      activeTimersCount,
      fps,
    };

    this.history.push(sample);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.analyzeLeaks(sample);
    this.notify();
  }

  private analyzeLeaks(latestSample: MemorySample) {
    const now = Date.now();
    const activeTimers = timerTracker.getActiveTimers();

    // 1. Check for runaway intervals
    activeTimers.forEach((timer) => {
      const activeDurationSec = Math.round((now - timer.createdAt) / 1000);
      if (timer.type === 'interval' && activeDurationSec > 60 && timer.callCount > 30) {
        const alertId = `timer_${timer.id}`;
        if (!this.alerts.some((a) => a.id === alertId)) {
          this.alerts.unshift({
            id: alertId,
            severity: 'warning',
            title: `Potential Timer Leak (Interval #${timer.id})`,
            description: `Interval has been running for ${activeDurationSec}s (${timer.callCount} executions). Verify if component unmounted without clearInterval().`,
            timestamp: now,
            type: 'runaway_timer',
            details: timer,
          });
        }
      }
    });

    // 2. Check for monotonic heap growth over last 12 samples (12 seconds)
    if (this.history.length >= 12) {
      const recent = this.history.slice(-12);
      let isMonotonicGrowth = true;
      for (let i = 1; i < recent.length; i++) {
        if (recent[i].jsHeapSizeMB < recent[i - 1].jsHeapSizeMB) {
          isMonotonicGrowth = false;
          break;
        }
      }

      const growthDelta = recent[recent.length - 1].jsHeapSizeMB - recent[0].jsHeapSizeMB;
      if (isMonotonicGrowth && growthDelta > 8.0) {
        const alertId = `heap_growth_${Math.floor(now / 30000)}`; // limit alert frequency to once every 30s
        if (!this.alerts.some((a) => a.id === alertId)) {
          this.alerts.unshift({
            id: alertId,
            severity: 'critical',
            title: 'Continuous Heap Memory Growth Detected',
            description: `JS Heap grew steadily by +${growthDelta.toFixed(1)} MB in the last 12s without garbage collection. Possible memory leak in closures, state arrays, or retained listeners.`,
            timestamp: now,
            type: 'rapid_growth',
          });
        }
      }
    }
  }

  private notify() {
    if (this.history.length === 0) return;
    const latest = this.history[this.history.length - 1];
    const alerts = [...this.alerts];
    this.listeners.forEach((listener) => {
      try {
        listener(latest, alerts);
      } catch {
        // Suppress
      }
    });
  }
}

export const memoryMonitor = new MemoryMonitor();
