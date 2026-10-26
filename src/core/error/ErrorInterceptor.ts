import { ErrorStorage } from './ErrorStorage';
import { ConsoleLog, LogLevel } from '../../types';

let nextId = 1;
const generateId = () => `log_${Date.now()}_${nextId++}`;

export class ErrorInterceptor {
  private originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
  } | null = null;

  private originalGlobalHandler: any = null;
  private isEnabled: boolean = false;

  public enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.interceptConsole();
    this.interceptGlobalErrors();
  }

  public disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    if (this.originalConsole) {
      console.log = this.originalConsole.log;
      console.info = this.originalConsole.info;
      console.warn = this.originalConsole.warn;
      console.error = this.originalConsole.error;
      this.originalConsole = null;
    }

    if (this.originalGlobalHandler && (global as any).ErrorUtils?.setGlobalHandler) {
      (global as any).ErrorUtils.setGlobalHandler(this.originalGlobalHandler);
      this.originalGlobalHandler = null;
    }
  }

  public isActive(): boolean {
    return this.isEnabled;
  }

  private interceptConsole() {
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };

    const levels: LogLevel[] = ['log', 'info', 'warn', 'error'];

    levels.forEach((level) => {
      const orig = this.originalConsole![level];

      (console as any)[level] = (...args: any[]) => {
        // Call original console to preserve terminal output
        orig(...args);

        if (!this.isEnabled) return;

        let message = '';
        let stack: string | undefined = undefined;

        try {
          const parts = args.map((arg) => {
            if (arg instanceof Error) {
              if (!stack) stack = arg.stack;
              return `${arg.name}: ${arg.message}`;
            }
            if (typeof arg === 'object' && arg !== null) {
              try {
                return JSON.stringify(arg, null, 2);
              } catch {
                return '[Circular or Unserializable Object]';
              }
            }
            return String(arg);
          });
          message = parts.join(' ');
        } catch {
          message = '[Error formatting log arguments]';
        }

        // If level is error and no stack found from error arg, create a stack trace
        if ((level === 'error' || level === 'warn') && !stack) {
          try {
            const err = new Error();
            stack = err.stack?.split('\n').slice(2).join('\n');
          } catch {
            // Ignore
          }
        }

        const logItem: ConsoleLog = {
          id: generateId(),
          level,
          message,
          args,
          stack,
          timestamp: Date.now(),
          isUnhandled: false,
        };

        ErrorStorage.addLog(logItem);
      };
    });
  }

  private interceptGlobalErrors() {
    const errorUtils = (global as any).ErrorUtils;
    if (errorUtils && typeof errorUtils.getGlobalHandler === 'function' && typeof errorUtils.setGlobalHandler === 'function') {
      this.originalGlobalHandler = errorUtils.getGlobalHandler();

      errorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
        if (this.isEnabled) {
          const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
          const stack = error instanceof Error ? error.stack : undefined;
          const componentStack = error?.componentStack;

          const logItem: ConsoleLog = {
            id: generateId(),
            level: 'error',
            message: `[Unhandled ${isFatal ? 'Fatal ' : ''}Exception] ${message}`,
            stack,
            componentStack,
            timestamp: Date.now(),
            isUnhandled: true,
          };

          ErrorStorage.addLog(logItem);
        }

        // Forward to original handler so React Native crash / RedBox handles it appropriately
        if (this.originalGlobalHandler) {
          this.originalGlobalHandler(error, isFatal);
        }
      });
    }

    // Promise rejection tracking if supported in environment
    if (typeof (global as any).onunhandledrejection === 'function' || (global as any).HermesInternal?.hasPromise) {
      const origRejectionHandler = (global as any).onunhandledrejection;
      (global as any).onunhandledrejection = (event: any) => {
        if (this.isEnabled) {
          const reason = event?.reason;
          const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason || 'Unhandled Promise Rejection');
          const stack = reason instanceof Error ? reason.stack : undefined;

          ErrorStorage.addLog({
            id: generateId(),
            level: 'error',
            message: `[Unhandled Promise Rejection] ${message}`,
            stack,
            timestamp: Date.now(),
            isUnhandled: true,
          });
        }
        if (typeof origRejectionHandler === 'function') {
          origRejectionHandler(event);
        }
      };
    }
  }
}

export const errorInterceptor = new ErrorInterceptor();
