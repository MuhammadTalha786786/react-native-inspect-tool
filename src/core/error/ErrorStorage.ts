import { ConsoleLog } from '../../types';

type Listener = (logs: ConsoleLog[]) => void;

class ErrorStorageClass {
  private logs: ConsoleLog[] = [];
  private maxLogs: number = 200;
  private listeners: Set<Listener> = new Set();

  public setMaxLogs(limit: number) {
    this.maxLogs = limit;
    this.trim();
  }

  public getLogs(): ConsoleLog[] {
    return [...this.logs];
  }

  public addLog(log: ConsoleLog) {
    this.logs.unshift(log);
    this.trim();
    this.notify();
  }

  public clear() {
    this.logs = [];
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getLogs());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private trim() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  private notify() {
    const list = this.getLogs();
    this.listeners.forEach((listener) => {
      try {
        listener(list);
      } catch {
        // Suppress errors to avoid crashing app
      }
    });
  }
}

export const ErrorStorage = new ErrorStorageClass();
