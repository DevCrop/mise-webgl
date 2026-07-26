import type { FrameInfo } from "./SceneModule.js";

export type FrameCallback = (frame: FrameInfo) => void;
export type FrameRequest = (callback: FrameRequestCallback) => number;
export type FrameCancel = (handle: number) => void;

export class FrameLoop {
  private readonly callbacks = new Set<FrameCallback>();
  private readonly leases = new Set<symbol>();
  private readonly suspensions = new Set<symbol>();
  private handle: number | null = null;
  private previousTime: number | null = null;
  private disposed = false;

  constructor(
    private readonly requestFrame: FrameRequest = window.requestAnimationFrame.bind(window),
    private readonly cancelFrame: FrameCancel = window.cancelAnimationFrame.bind(window),
  ) {}

  subscribe(callback: FrameCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  invalidate(): void {
    this.schedule();
  }

  acquireContinuous(): () => void {
    const lease = Symbol("frame-lease");
    this.leases.add(lease);
    this.schedule();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.leases.delete(lease);
    };
  }

  acquireSuspension(): () => void {
    if (this.disposed) return () => undefined;

    const suspension = Symbol("frame-suspension");
    this.suspensions.add(suspension);
    if (this.handle !== null) {
      this.cancelFrame(this.handle);
      this.handle = null;
    }
    this.previousTime = null;

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.suspensions.delete(suspension);
      if (this.suspensions.size === 0) this.schedule();
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.handle !== null) this.cancelFrame(this.handle);
    this.handle = null;
    this.previousTime = null;
    this.callbacks.clear();
    this.leases.clear();
    this.suspensions.clear();
  }

  private schedule(): void {
    if (this.disposed || this.suspensions.size > 0 || this.handle !== null) return;
    this.handle = this.requestFrame((time) => this.tick(time));
  }

  private tick(time: number): void {
    this.handle = null;
    const delta = this.previousTime === null
      ? 0
      : Math.min(0.1, Math.max(0, (time - this.previousTime) / 1000));
    this.previousTime = time;
    const frame = { time: time / 1000, delta } satisfies FrameInfo;
    for (const callback of this.callbacks) callback(frame);

    if (this.leases.size > 0) {
      this.schedule();
    } else {
      this.previousTime = null;
    }
  }
}
