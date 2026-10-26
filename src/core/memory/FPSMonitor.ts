export class FPSMonitor {
  private isRunning: boolean = false;
  private currentFPS: number = 60;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.frameCount = 0;
    this.lastTime = Date.now();

    const loop = () => {
      if (!this.isRunning) return;

      this.frameCount++;
      const now = Date.now();
      const delta = now - this.lastTime;

      if (delta >= 1000) {
        this.currentFPS = Math.min(60, Math.round((this.frameCount * 1000) / delta));
        this.frameCount = 0;
        this.lastTime = now;
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public getFPS(): number {
    return this.currentFPS;
  }
}

export const fpsMonitor = new FPSMonitor();
