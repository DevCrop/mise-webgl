import { QualityManager } from "./QualityManager.js";
import { FrameLoop } from "./FrameLoop.js";
import type { Viewport } from "./SceneModule.js";

export class ViewportManager {
  private canvas: HTMLCanvasElement | null = null;
  private observer: ResizeObserver | null = null;
  private visualViewport: VisualViewport | null = null;
  private unsubscribeFrame: (() => void) | null = null;
  private current: Viewport | null = null;
  private syncPending = false;
  private readonly handleResize = (): void => this.requestSync();
  private readonly handleFrame = (): void => {
    if (this.syncPending) this.sync();
  };

  constructor(
    private readonly quality: QualityManager,
    private readonly frames: FrameLoop,
    private readonly onChange: (viewport: Viewport) => void,
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
    window.addEventListener("resize", this.handleResize, { passive: true });
    this.sync(true);
  }

  sync(force = false): void {
    const canvas = this.canvas;
    if (!canvas) return;
    this.syncPending = false;

    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const pixelRatio = this.quality.pixelRatio(width, height);
    const next: Viewport = {
      width,
      height,
      pixelRatio,
      drawingBufferWidth: Math.max(1, Math.floor(width * pixelRatio)),
      drawingBufferHeight: Math.max(1, Math.floor(height * pixelRatio)),
    };
    if (!force && this.current
      && this.current.width === next.width
      && this.current.height === next.height
      && this.current.pixelRatio === next.pixelRatio) return;

    this.current = next;
    this.onChange(next);
  }

  snapshot(): Viewport | null {
    return this.current;
  }

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    this.visualViewport?.removeEventListener("resize", this.handleResize);
    this.visualViewport = null;
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
