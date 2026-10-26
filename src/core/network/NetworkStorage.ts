import { NetworkRequest } from '../../types';

type Listener = (requests: NetworkRequest[]) => void;

class NetworkStorageClass {
  private requests: NetworkRequest[] = [];
  private maxRequests: number = 200;
  private listeners: Set<Listener> = new Set();

  public setMaxRequests(limit: number) {
    this.maxRequests = limit;
    this.trim();
  }

  public getRequests(): NetworkRequest[] {
    return [...this.requests];
  }

  public getRequest(id: string): NetworkRequest | undefined {
    return this.requests.find((r) => r.id === id);
  }

  public addRequest(request: NetworkRequest) {
    this.requests.unshift(request);
    this.trim();
    this.notify();
  }

  public updateRequest(id: string, updates: Partial<NetworkRequest>) {
    const index = this.requests.findIndex((r) => r.id === id);
    if (index !== -1) {
      this.requests[index] = {
        ...this.requests[index],
        ...updates,
      };
      this.notify();
    }
  }

  public clear() {
    this.requests = [];
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getRequests());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private trim() {
    if (this.requests.length > this.maxRequests) {
      this.requests = this.requests.slice(0, this.maxRequests);
    }
  }

  private notify() {
    const list = this.getRequests();
    this.listeners.forEach((listener) => {
      try {
        listener(list);
      } catch (err) {
        // Suppress listener errors to prevent app crashes
      }
    });
  }

  public toCurl(req: NetworkRequest): string {
    let curl = `curl -X ${req.method.toUpperCase()} '${req.url}'`;

    if (req.requestHeaders) {
      Object.entries(req.requestHeaders).forEach(([key, val]) => {
        // Skip some internal headers
        if (key.toLowerCase() !== 'content-length') {
          curl += ` \\\n  -H '${key}: ${val}'`;
        }
      });
    }

    if (req.requestBody) {
      let bodyStr = '';
      if (typeof req.requestBody === 'string') {
        bodyStr = req.requestBody;
      } else {
        try {
          bodyStr = JSON.stringify(req.requestBody);
        } catch {
          bodyStr = String(req.requestBody);
        }
      }
      // Escape single quotes for bash
      const escapedBody = bodyStr.replace(/'/g, "'\\''");
      curl += ` \\\n  --data-raw '${escapedBody}'`;
    }

    return curl;
  }
}

export const NetworkStorage = new NetworkStorageClass();
