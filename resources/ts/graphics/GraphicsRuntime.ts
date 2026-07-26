import type { Logger } from "../logging/Logger.js";
import { FrameLoop } from "./FrameLoop.js";
import { QualityManager } from "./QualityManager.js";
import { SceneDirector } from "./SceneDirector.js";
import type { FrameInfo, SceneDescriptor, Viewport } from "./SceneModule.js";
import { ThreeRenderer } from "./ThreeRenderer.js";
import { ViewportManager } from "./ViewportManager.js";

export class GraphicsRuntime {
  private readonly viewport: ViewportManager;
  private unsubscribeFrame: (() => void) | null = null;
  private releaseContextSuspension: (() => void) | null = null;
  private releaseSceneFrames: (() => void) | null = null;
  private mounted = false;
  private available = false;

  constructor(
    private readonly renderer: ThreeRenderer,
    private readonly scenes: SceneDirector,
    private readonly frames: FrameLoop,
    private readonly quality: QualityManager,
    private readonly logger: Logger,
  ) {
    this.viewport = new ViewportManager(quality, frames, (value) => this.resize(value));
  }

  mount(canvas: HTMLCanvasElement): void {
    if (this.mounted) return;
    this.mounted = true;
    this.available = this.renderer.mount(canvas, {
      lost: () => {
        this.releaseContextSuspension ??= this.frames.acquireSuspension();
        this.logger.warning("webgl.context_lost");
      },
      restored: () => {
        this.releaseContextSuspension?.();
        this.releaseContextSuspension = null;
        this.scenes.recreate();
        this.viewport.sync(true);
        this.frames.invalidate();
        this.logger.success("webgl.context_restored");
      },
    });

    if (!this.available) {
      this.logger.warning("webgl.unavailable");
      return;
    }

    this.viewport.mount(canvas);
    this.unsubscribeFrame = this.frames.subscribe((frame) => this.render(frame));
  }

  activate(descriptor: SceneDescriptor): void {
    if (!this.available) return;
    this.scenes.switchTo(descriptor);
    this.releaseSceneFrames ??= this.frames.acquireContinuous();
    this.frames.invalidate();
  }

  setProgress(progress: number): void {
    this.scenes.setProgress(progress);
    this.frames.invalidate();
  }

  clear(): void {
    this.releaseSceneFrames?.();
    this.releaseSceneFrames = null;
    this.scenes.clear();
    this.renderer.clear();
  }

  dispose(): void {
    if (!this.mounted) return;
    this.mounted = false;
    this.available = false;
    this.unsubscribeFrame?.();
    this.unsubscribeFrame = null;
    this.releaseContextSuspension?.();
    this.releaseContextSuspension = null;
    this.releaseSceneFrames?.();
    this.releaseSceneFrames = null;
    this.viewport.dispose();
    this.scenes.dispose();
    this.renderer.dispose();
    this.logger.debug("graphics.disposed");
  }

  private resize(viewport: Viewport): void {
    this.renderer.resize(viewport);
    this.scenes.resize(viewport);
    this.frames.invalidate();
  }

  private render(frame: FrameInfo): void {
    if (this.quality.observeFrame(frame.delta)) this.viewport.sync(true);
    this.scenes.update(frame);
    const state = this.scenes.renderState();
    if (state) this.renderer.render(state.scene, state.camera);
  }
}
