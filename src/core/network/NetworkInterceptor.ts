import { NetworkStorage } from './NetworkStorage';
import { HttpMethod, NetworkHeader, NetworkRequest } from '../../types';

let nextId = 1;
const generateId = () => `req_${Date.now()}_${nextId++}`;

export class NetworkInterceptor {
  private originalFetch: typeof global.fetch | null = null;
  private originalXHR: typeof global.XMLHttpRequest | null = null;
  private isEnabled: boolean = false;

  public enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.interceptFetch();
    this.interceptXHR();
  }

  public disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;

    if (this.originalFetch) {
      global.fetch = this.originalFetch;
      this.originalFetch = null;
    }

    if (this.originalXHR) {
      global.XMLHttpRequest = this.originalXHR;
      this.originalXHR = null;
    }
  }

  public isActive(): boolean {
    return this.isEnabled;
  }

  private interceptFetch() {
    if (typeof global.fetch !== 'function') return;

    this.originalFetch = global.fetch;
    const originalFetch = this.originalFetch;

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (!this.isEnabled) {
        return originalFetch(input, init);
      }

      const id = generateId();
      const startTime = Date.now();

      let url = '';
      if (typeof input === 'string') {
        url = input;
      } else if (input && typeof (input as any).url === 'string') {
        url = (input as any).url;
      } else {
        url = String(input);
      }

      const method = (init?.method || (input && (input as any).method) || 'GET').toUpperCase() as HttpMethod;
      const requestHeaders: NetworkHeader = {};

      if (init?.headers) {
        if (typeof (init.headers as any).forEach === 'function') {
          (init.headers as any).forEach((value: string, key: string) => {
            requestHeaders[key] = value;
          });
        } else if (Array.isArray(init.headers)) {
          (init.headers as [string, string][]).forEach(([key, value]) => {
            requestHeaders[key] = value;
          });
        } else {
          Object.assign(requestHeaders, init.headers);
        }
      }

      let requestBody: any = init?.body;
      if (typeof requestBody === 'string') {
        try {
          requestBody = JSON.parse(requestBody);
        } catch {
          // Keep as string
        }
      }

      const requestItem: NetworkRequest = {
        id,
        url,
        method,
        status: 0,
        requestHeaders,
        requestBody,
        startTime,
        isPending: true,
      };

      NetworkStorage.addRequest(requestItem);

      try {
        const response = await originalFetch(input, init);
        const endTime = Date.now();
        const duration = endTime - startTime;

        const responseHeaders: NetworkHeader = {};
        if (response.headers && typeof (response.headers as any).forEach === 'function') {
          (response.headers as any).forEach((value: string, key: string) => {
            responseHeaders[key] = value;
          });
        }

        // Clone response to read body without consuming the user's response stream
        let responseBody: any = null;
        let responseSize = 0;
        try {
          const clone = response.clone();
          const text = await clone.text();
          responseSize = text.length;
          try {
            responseBody = JSON.parse(text);
          } catch {
            responseBody = text;
          }
        } catch (readErr) {
          responseBody = '[Binary or Unreadable Stream]';
        }

        NetworkStorage.updateRequest(id, {
          status: response.status,
          statusText: response.statusText,
          responseHeaders,
          responseBody,
          endTime,
          duration,
          size: responseSize,
          isPending: false,
        });

        return response;
      } catch (err: any) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        NetworkStorage.updateRequest(id, {
          status: 0,
          statusText: 'Failed',
          error: err?.message || 'Network request failed',
          endTime,
          duration,
          isPending: false,
        });

        throw err;
      }
    };
  }

  private interceptXHR() {
    if (typeof global.XMLHttpRequest === 'undefined') return;

    this.originalXHR = global.XMLHttpRequest;
    const OriginalXHR = this.originalXHR;
    const self = this;

    // Subclass or proxy XMLHttpRequest
    class InterceptedXHR extends OriginalXHR {
      private _devLensId: string = generateId();
      private _devLensMethod: string = 'GET';
      private _devLensUrl: string = '';
      private _devLensRequestHeaders: NetworkHeader = {};
      private _devLensStartTime: number = 0;

      open(method: string, url: string, async: boolean = true, username?: string | null, password?: string | null) {
        this._devLensMethod = method.toUpperCase();
        this._devLensUrl = url;
        return super.open(method, url, async, username, password);
      }

      setRequestHeader(name: string, value: string) {
        this._devLensRequestHeaders[name] = value;
        return super.setRequestHeader(name, value);
      }

      send(body?: any) {
        if (!self.isEnabled) {
          return super.send(body);
        }

        this._devLensStartTime = Date.now();

        let parsedBody = body;
        if (typeof body === 'string') {
          try {
            parsedBody = JSON.parse(body);
          } catch {
            // Keep as string
          }
        }

        NetworkStorage.addRequest({
          id: this._devLensId,
          url: this._devLensUrl,
          method: this._devLensMethod,
          status: 0,
          requestHeaders: this._devLensRequestHeaders,
          requestBody: parsedBody,
          startTime: this._devLensStartTime,
          isPending: true,
        });

        const onFinish = (status: number, statusText: string, error?: string) => {
          const endTime = Date.now();
          const duration = endTime - this._devLensStartTime;

          const rawResponseHeaders = this.getAllResponseHeaders ? this.getAllResponseHeaders() : '';
          const responseHeaders: NetworkHeader = {};
          if (rawResponseHeaders) {
            rawResponseHeaders.split('\r\n').forEach((line) => {
              const parts = line.split(': ');
              if (parts.length === 2) {
                responseHeaders[parts[0]] = parts[1];
              }
            });
          }

          let responseBody: any = null;
          let size = 0;
          try {
            if (this.responseType === '' || this.responseType === 'text') {
              const text = this.responseText;
              size = text ? text.length : 0;
              try {
                responseBody = JSON.parse(text);
              } catch {
                responseBody = text;
              }
            } else if (this.responseType === 'json') {
              responseBody = this.response;
              size = JSON.stringify(responseBody || '').length;
            } else {
              responseBody = `[${this.responseType || 'blob'}]`;
            }
          } catch {
            responseBody = '[Unable to parse response]';
          }

          NetworkStorage.updateRequest(this._devLensId, {
            status,
            statusText,
            responseHeaders,
            responseBody,
            endTime,
            duration,
            size,
            error,
            isPending: false,
          });
        };

        this.addEventListener('load', () => {
          onFinish(this.status, this.statusText);
        });

        this.addEventListener('error', () => {
          onFinish(this.status || 0, 'Error', 'Network Error');
        });

        this.addEventListener('timeout', () => {
          onFinish(this.status || 0, 'Timeout', 'Request Timed Out');
        });

        this.addEventListener('abort', () => {
          onFinish(this.status || 0, 'Aborted', 'Request Aborted');
        });

        return super.send(body);
      }
    }

    (global as any).XMLHttpRequest = InterceptedXHR;
  }
}

export const networkInterceptor = new NetworkInterceptor();
