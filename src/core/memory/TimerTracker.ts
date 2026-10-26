import { ActiveTimer } from '../../types';

export class TimerTracker {
  private activeTimers: Map<number | string, ActiveTimer> = new Map();
  private originalSetInterval: typeof global.setInterval | null = null;
  private originalClearInterval: typeof global.clearInterval | null = null;
  private originalSetTimeout: typeof global.setTimeout | null = null;
  private originalClearTimeout: typeof global.clearTimeout | null = null;
  private isEnabled: boolean = false;

  public enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;

    this.originalSetInterval = global.setInterval;
    this.originalClearInterval = global.clearInterval;
    this.originalSetTimeout = global.setTimeout;
    this.originalClearTimeout = global.clearTimeout;

    const self = this;

    (global as any).setInterval = (handler: TimerHandler, timeout?: number, ...args: any[]) => {
      let stack: string | undefined;
      try {
        const err = new Error();
        // Extract callsite
        stack = err.stack?.split('\n').slice(2, 5).join('\n');
      } catch {
        // Ignore
      }

      const timerId = self.originalSetInterval!(
        (...innerArgs: any[]) => {
          const item = self.activeTimers.get(timerId as any);
          if (item) {
            item.callCount++;
          }
          if (typeof handler === 'function') {
            handler(...innerArgs);
          } else if (typeof handler === 'string') {
            // eslint-disable-next-line no-eval
            eval(handler);
          }
        },
        timeout,
        ...args
      );

      if (self.isEnabled) {
        self.activeTimers.set(timerId as any, {
          id: timerId as any,
          type: 'interval',
          delay: timeout || 0,
          createdAt: Date.now(),
          stack,
          callCount: 0,
        });
      }

      return timerId;
    };

    (global as any).clearInterval = (id?: number | NodeJS.Timeout) => {
      if (id !== undefined) {
        self.activeTimers.delete(id as any);
      }
      return self.originalClearInterval!(id as any);
    };

    (global as any).setTimeout = (handler: TimerHandler, timeout?: number, ...args: any[]) => {
      let stack: string | undefined;
      try {
        const err = new Error();
        stack = err.stack?.split('\n').slice(2, 5).join('\n');
      } catch {
        // Ignore
      }

      const timerId = self.originalSetTimeout!(
        (...innerArgs: any[]) => {
          self.activeTimers.delete(timerId as any);
          if (typeof handler === 'function') {
            handler(...innerArgs);
          } else if (typeof handler === 'string') {
            // eslint-disable-next-line no-eval
            eval(handler);
          }
        },
        timeout,
        ...args
      );

      // Only track timeouts with longer duration (> 2s) to avoid tracking thousands of micro-tasks
      if (self.isEnabled && (timeout || 0) >= 2000) {
        self.activeTimers.set(timerId as any, {
          id: timerId as any,
          type: 'timeout',
          delay: timeout || 0,
          createdAt: Date.now(),
          stack,
          callCount: 0,
        });
      }

      return timerId;
    };

    (global as any).clearTimeout = (id?: number | NodeJS.Timeout) => {
      if (id !== undefined) {
        self.activeTimers.delete(id as any);
      }
      return self.originalClearTimeout!(id as any);
    };
  }

  public disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    if (this.originalSetInterval) {
      global.setInterval = this.originalSetInterval;
      this.originalSetInterval = null;
    }
    if (this.originalClearInterval) {
      global.clearInterval = this.originalClearInterval;
      this.originalClearInterval = null;
    }
    if (this.originalSetTimeout) {
      global.setTimeout = this.originalSetTimeout;
      this.originalSetTimeout = null;
    }
    if (this.originalClearTimeout) {
      global.clearTimeout = this.originalClearTimeout;
      this.originalClearTimeout = null;
    }

    this.activeTimers.clear();
  }

  public getActiveTimers(): ActiveTimer[] {
    return Array.from(this.activeTimers.values());
  }

  public getActiveIntervalsCount(): number {
    let count = 0;
    this.activeTimers.forEach((t) => {
      if (t.type === 'interval') count++;
    });
    return count;
  }
}

export const timerTracker = new TimerTracker();
