import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { FrameLoop } from "../graphics/FrameLoop.js";
import type { FrameInfo } from "../graphics/SceneModule.js";

export class ScrollRuntime {
  private lenis: Lenis | null = null;
  private unsubscribeFrame: (() => void) | null = null;
  private releaseFrame: (() => void) | null = null;
  private idleFrames = 0;
  private mounted = false;
  private preference: MediaQueryList | null = null;
  private coarsePointer: MediaQueryList | null = null;
  private readonly wake = (): void => this.acquireFrames();
  private readonly handleNativeScroll = (): void => this.emitNativeProgress();
  private readonly handleCapabilityChange = (): void => this.rebuild();

  constructor(
    private readonly frames: FrameLoop,
    private readonly onProgress: (progress: number) => void,
  ) {}

  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    this.preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.coarsePointer = window.matchMedia("(any-pointer: coarse)");
    this.unsubscribeFrame = this.frames.subscribe((frame) => this.update(frame));
    this.preference.addEventListener("change", this.handleCapabilityChange);
    this.coarsePointer.addEventListener("change", this.handleCapabilityChange);
    this.rebuild();
  }

  refresh(): void {
    this.lenis?.resize();
    if (this.lenis) {
      this.onProgress(this.lenis.progress);
    } else {
      this.emitNativeProgress();
    }
  }

  dispose(): void {
    if (!this.mounted) return;
    this.mounted = false;
    this.teardownMode();
    this.preference?.removeEventListener("change", this.handleCapabilityChange);
    this.coarsePointer?.removeEventListener("change", this.handleCapabilityChange);
    this.preference = null;
    this.coarsePointer = null;
    this.unsubscribeFrame?.();
    this.unsubscribeFrame = null;
  }

  private rebuild(): void {
    this.teardownMode();
    if (!this.mounted) return;

    if (this.preference?.matches || this.coarsePointer?.matches) {
      window.addEventListener("scroll", this.handleNativeScroll, { passive: true });
      this.emitNativeProgress();
      return;
    }

    this.lenis = new Lenis({
      autoRaf: false,
      anchors: true,
      duration: 1.05,
      smoothWheel: true,
    });
    this.lenis.on("scroll", (event) => this.onProgress(event.progress));
    window.addEventListener("wheel", this.wake, { passive: true });
    window.addEventListener("keydown", this.wake);
    this.onProgress(this.lenis.progress);
  }

  private teardownMode(): void {
    window.removeEventListener("scroll", this.handleNativeScroll);
    window.removeEventListener("wheel", this.wake);
    window.removeEventListener("keydown", this.wake);
    this.lenis?.destroy();
    this.lenis = null;
    this.releaseFrame?.();
    this.releaseFrame = null;
    this.idleFrames = 0;
  }

  private acquireFrames(): void {
    if (this.releaseFrame) return;
    this.releaseFrame = this.frames.acquireContinuous();
    this.idleFrames = 0;
  }

  private update(frame: FrameInfo): void {
    const lenis = this.lenis;
    if (!lenis || !this.releaseFrame) return;
    lenis.raf(frame.time * 1000);
    if (lenis.isScrolling) {
      this.idleFrames = 0;
      return;
    }

    this.idleFrames += 1;
    if (this.idleFrames < 3) return;
    this.releaseFrame();
    this.releaseFrame = null;
    this.idleFrames = 0;
  }

  private emitNativeProgress(): void {
    const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    this.onProgress(Math.min(1, Math.max(0, window.scrollY / range)));
  }
}
