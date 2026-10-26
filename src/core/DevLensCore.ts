import { DevLensConfig } from '../types';
import { networkInterceptor } from './network/NetworkInterceptor';
import { NetworkStorage } from './network/NetworkStorage';
import { errorInterceptor } from './error/ErrorInterceptor';
import { ErrorStorage } from './error/ErrorStorage';
import { memoryMonitor } from './memory/MemoryMonitor';

class DevLensCoreClass {
  private config: Required<DevLensConfig> = {
    maxNetworkRequests: 200,
    maxLogs: 200,
    maxMemorySamples: 60,
    enableNetwork: true,
    enableErrors: true,
    enableMemory: true,
    memorySampleIntervalMs: 1000,
    bubbleInitialPosition: { x: 20, y: 120 },
  };

  private isInitialized: boolean = false;

  public init(customConfig?: DevLensConfig) {
    if (this.isInitialized) {
      if (customConfig) {
        this.setConfig(customConfig);
      }
      return;
    }

    if (customConfig) {
      this.config = {
        ...this.config,
        ...customConfig,
        bubbleInitialPosition: customConfig.bubbleInitialPosition || this.config.bubbleInitialPosition,
      };
    }

    NetworkStorage.setMaxRequests(this.config.maxNetworkRequests);
    ErrorStorage.setMaxLogs(this.config.maxLogs);

    if (this.config.enableNetwork) {
      networkInterceptor.enable();
    }

    if (this.config.enableErrors) {
      errorInterceptor.enable();
    }

    if (this.config.enableMemory) {
      memoryMonitor.start(this.config.memorySampleIntervalMs);
    }

    this.isInitialized = true;
  }

  public setConfig(newConfig: Partial<DevLensConfig>) {
    this.config = {
      ...this.config,
      ...newConfig,
    };

    if (newConfig.maxNetworkRequests !== undefined) {
      NetworkStorage.setMaxRequests(newConfig.maxNetworkRequests);
    }

    if (newConfig.maxLogs !== undefined) {
      ErrorStorage.setMaxLogs(newConfig.maxLogs);
    }

    if (newConfig.enableNetwork !== undefined) {
      if (newConfig.enableNetwork) networkInterceptor.enable();
      else networkInterceptor.disable();
    }

    if (newConfig.enableErrors !== undefined) {
      if (newConfig.enableErrors) errorInterceptor.enable();
      else errorInterceptor.disable();
    }

    if (newConfig.enableMemory !== undefined) {
      if (newConfig.enableMemory) memoryMonitor.start(this.config.memorySampleIntervalMs);
      else memoryMonitor.stop();
    }
  }

  public getConfig(): Required<DevLensConfig> {
    return { ...this.config };
  }

  public clearAll() {
    NetworkStorage.clear();
    ErrorStorage.clear();
    memoryMonitor.clearAlerts();
  }

  public destroy() {
    networkInterceptor.disable();
    errorInterceptor.disable();
    memoryMonitor.stop();
    this.isInitialized = false;
  }
}

export const DevLens = new DevLensCoreClass();
