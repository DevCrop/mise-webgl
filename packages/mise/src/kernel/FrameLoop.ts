import type {
  FrameCallback,
  FrameControl,
  FrameTick,
} from "../Contracts.js";
import { MiseClock } from "../clock/MiseClock.js";

export type FrameRequest = (callback: FrameRequestCallback) => number;
export type FrameCancel = (handle: number) => void;

export class FrameLoop implements FrameControl {
  private readonly callbacks = new Set<FrameCallback>();
  private readonly leases = new Set<symbol>();
  private readonly suspensions = new Set<symbol>();
  private handle: number | null = null;
  private disposed = false;

  constructor(
    private readonly requestFrame: FrameRequest = window.requestAnimationFrame.bind(window),
    private readonly cancelFrame: FrameCancel = window.cancelAnimationFrame.bind(window),
    private readonly clock: MiseClock = new MiseClock(),
  ) {}

  subscribe(callback: FrameCallback): () => void {
    if (this.disposed) return () => undefined;
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  invalidate(): void {
    this.schedule();
  }

  acquireContinuous(): () => void {
    if (this.disposed) return () => undefined;
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
    this.clock.pause();

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
    this.clock.reset();
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
    const frame = this.clock.sample(time) satisfies FrameTick;
    let failure: unknown = null;
    for (const callback of this.callbacks) {
      try {
        callback(frame);
      } catch (error) {
        failure ??= error;
      }
    }

    if (this.leases.size > 0) this.schedule();
    else this.clock.pause();
    if (failure) throw failure;
  }
}
