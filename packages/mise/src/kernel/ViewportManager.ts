import type { ViewportState } from "../Contracts.js";
import type { FrameLoop } from "./FrameLoop.js";
import type { QualityManager } from "./QualityManager.js";

export class ViewportManager {
  private canvas: HTMLCanvasElement | null = null;
  private observer: ResizeObserver | null = null;
  private visualViewport: VisualViewport | null = null;
  private coarsePointer: MediaQueryList | null = null;
  private screenOrientation: ScreenOrientation | null = null;
  private unsubscribeFrame: (() => void) | null = null;
  private current: ViewportState | null = null;
  private syncPending = false;
  private readonly handleResize = (): void => this.requestSync();
  private readonly handleFrame = (): void => {
    if (this.syncPending) this.sync();
  };

  constructor(
    private readonly quality: QualityManager,
    private readonly frames: FrameLoop,
    private readonly onChange: (viewport: ViewportState) => void,
  ) {}

  mount(canvas: HTMLCanvasElement): void {
    this.dispose();
    this.canvas = canvas;
    this.unsubscribeFrame = this.frames.subscribe(this.handleFrame);
    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(this.handleResize);
      this.observer.observe(canvas);
    }
    this.visualViewport = window.visualViewport;
    this.visualViewport?.addEventListener("resize", this.handleResize, { passive: true });
    this.coarsePointer = window.matchMedia("(any-pointer: coarse)");
    this.coarsePointer.addEventListener("change", this.handleResize);
    this.screenOrientation = window.screen.orientation ?? null;
    this.screenOrientation?.addEventListener("change", this.handleResize);
    if (!this.screenOrientation) {
      window.addEventListener("orientationchange", this.handleResize, {
        passive: true,
      });
    }
    window.addEventListener("resize", this.handleResize, { passive: true });
    this.sync(true);
  }

  sync(force = false): void {
    const canvas = this.canvas;
    if (!canvas) return;
    this.syncPending = false;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const pixelRatio = this.quality.pixelRatio(
      width,
      height,
      window.devicePixelRatio,
      this.coarsePointer?.matches ?? false,
    );
    const next: ViewportState = {
      width,
      height,
      pixelRatio,
      drawingBufferWidth: Math.max(1, Math.floor(width * pixelRatio)),
      drawingBufferHeight: Math.max(1, Math.floor(height * pixelRatio)),
    };
    if (!force && sameViewport(this.current, next)) return;
    this.current = next;
    this.onChange(next);
  }

  snapshot(): ViewportState | null {
    return this.current;
  }

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    this.visualViewport?.removeEventListener("resize", this.handleResize);
    this.visualViewport = null;
    this.coarsePointer?.removeEventListener("change", this.handleResize);
    this.coarsePointer = null;
    this.screenOrientation?.removeEventListener("change", this.handleResize);
    this.screenOrientation = null;
    window.removeEventListener("orientationchange", this.handleResize);
    this.observer?.disconnect();
    this.observer = null;
    this.unsubscribeFrame?.();
    this.unsubscribeFrame = null;
    this.canvas = null;
    this.current = null;
    this.syncPending = false;
  }

  private requestSync(): void {
    if (!this.canvas || this.syncPending) return;
    this.syncPending = true;
    this.frames.invalidate();
  }
}

function sameViewport(current: ViewportState | null, next: ViewportState): boolean {
  return current?.width === next.width
    && current.height === next.height
    && current.pixelRatio === next.pixelRatio;
}
