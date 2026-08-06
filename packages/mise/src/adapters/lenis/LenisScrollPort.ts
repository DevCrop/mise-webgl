import Lenis from "lenis";
import "lenis/dist/lenis.css";
import type {
  Direction,
  FrameControl,
  FrameTick,
  MiseScrollPort,
  ScrollSnapshot,
} from "../../Contracts.js";
import type { MiseLogger } from "../../logging/MiseLogger.js";

/** Capability-aware Lenis transport with native-scroll fallback. */
export class LenisScrollPort implements MiseScrollPort {
  private lenis: Lenis | null = null;
  private unsubscribeFrame: (() => void) | null = null;
  private releaseFrame: (() => void) | null = null;
  private idleFrames = 0;
  private mounted = false;
  private preference: MediaQueryList | null = null;
  private coarsePointer: MediaQueryList | null = null;
  private nativePosition = 0;
  private nativeTime = 0;
  private readonly wake = (): void => this.acquireFrames();
  private readonly handleNativeScroll = (): void => this.emitNativeProgress();
  private readonly handleCapabilityChange = (): void => this.rebuild();

  /**
   * Creates a scroll adapter that selects Lenis or native mode at mount time.
   *
   * @param frames - Shared scheduler used to drive Lenis.
   * @param onScroll - Consumer for normalized scroll snapshots.
   * @param logger - Scoped lifecycle logger.
   */
  constructor(
    private readonly frames: FrameControl,
    private readonly onScroll: (snapshot: ScrollSnapshot) => void,
    private readonly logger: MiseLogger,
  ) {}

  /** Selects Lenis or native mode and starts emitting scroll snapshots. */
  mount(): void {
    if (this.mounted) return;
    this.mounted = true;
    this.preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.coarsePointer = window.matchMedia("(any-pointer: coarse)");
    this.unsubscribeFrame = this.frames.subscribe((frame) => this.update(frame));
    this.preference.addEventListener("change", this.handleCapabilityChange);
    this.coarsePointer.addEventListener("change", this.handleCapabilityChange);
    this.rebuild();
    this.logger.success("scroll.mounted");
  }

  /** Re-measures the current mode and emits an updated snapshot. */
  refresh(): void {
    this.lenis?.resize();
    if (this.lenis) {
      this.emitLenisProgress();
    } else {
      this.emitNativeProgress();
    }
  }

  /** Releases media queries, browser listeners, Lenis, and frame leases. */
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
    this.logger.debug("scroll.disposed");
  }

  private rebuild(): void {
    this.teardownMode();
    if (!this.mounted) return;

    if (this.preference?.matches || this.coarsePointer?.matches) {
      this.mountNativeMode(
        this.preference?.matches ? "reduced_motion" : "coarse_pointer",
      );
      return;
    }

    try {
      this.lenis = new Lenis({
        autoRaf: false,
        anchors: true,
        duration: 1.05,
        smoothWheel: true,
      });
      this.lenis.on("scroll", (event) => {
        this.onScroll({
          progress: event.progress,
          position: event.scroll,
          velocity: event.velocity,
          direction: normalizeDirection(event.direction),
        });
      });
      window.addEventListener("wheel", this.wake, { passive: true });
      window.addEventListener("keydown", this.wake);
      window.addEventListener("click", this.wake);
      this.emitLenisProgress();
      this.logger.debug("scroll.mode_changed", {
        mode: "lenis",
        reason: "fine_pointer",
      });
    } catch {
      this.teardownMode();
      this.mountNativeMode("lenis_unavailable");
      this.logger.warning("scroll.lenis_unavailable");
    }
  }

  private mountNativeMode(reason: string): void {
    window.addEventListener("scroll", this.handleNativeScroll, { passive: true });
    this.emitNativeProgress();
    this.logger.debug("scroll.mode_changed", { mode: "native", reason });
  }

  private teardownMode(): void {
    window.removeEventListener("scroll", this.handleNativeScroll);
    window.removeEventListener("wheel", this.wake);
    window.removeEventListener("keydown", this.wake);
    window.removeEventListener("click", this.wake);
    this.lenis?.destroy();
    this.lenis = null;
    this.releaseFrame?.();
    this.releaseFrame = null;
    this.idleFrames = 0;
    this.nativePosition = 0;
    this.nativeTime = 0;
  }

  private acquireFrames(): void {
    if (this.releaseFrame) return;
    this.releaseFrame = this.frames.acquireContinuous();
    this.idleFrames = 0;
  }

  private update(frame: FrameTick): void {
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
    const position = window.scrollY;
    const now = performance.now();
    const elapsed = Math.max(1, now - this.nativeTime) / 1000;
    const delta = position - this.nativePosition;
    this.onScroll({
      progress: Math.min(1, Math.max(0, position / range)),
      position,
      velocity: this.nativeTime > 0 ? delta / elapsed : 0,
      direction: normalizeDirection(delta),
    });
    this.nativePosition = position;
    this.nativeTime = now;
  }

  private emitLenisProgress(): void {
    const lenis = this.lenis;
    if (!lenis) return;
    this.onScroll({
      progress: lenis.progress,
      position: lenis.scroll,
      velocity: lenis.velocity,
      direction: normalizeDirection(lenis.direction),
    });
  }
}

function normalizeDirection(value: number): Direction {
  return value > 0 ? 1 : value < 0 ? -1 : 0;
}
