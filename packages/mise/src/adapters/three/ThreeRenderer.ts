import {
  WebGLRenderer,
  type Camera,
  type Scene,
  type TextureDataType,
  type ToneMapping,
} from "three";
import type {
  MiseRendererContextCallbacks,
  MiseRendererPort,
  MiseRenderPass,
  RendererStats,
  ViewportState,
} from "../../Contracts.js";

/** Immutable WebGLRenderer creation and output policy. */
export interface ThreeRendererOptions {
  /** Enables Three.js development shader diagnostics. */
  readonly checkShaderErrors?: boolean;
  /** Optional renderer output buffer type such as `HalfFloatType`. */
  readonly outputBufferType?: TextureDataType;
  /** Optional Three.js tone-mapping operator. */
  readonly toneMapping?: ToneMapping;
  /** Exposure multiplier used by the selected tone mapping. */
  readonly toneMappingExposure?: number;
}

/** Three.js implementation of the required MISE Renderer port. */
export class ThreeRenderer implements MiseRendererPort {
  private canvas: HTMLCanvasElement | null = null;
  private renderer: WebGLRenderer | null = null;
  private callbacks: MiseRendererContextCallbacks | null = null;
  private viewport: ViewportState | null = null;
  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.callbacks?.lost();
  };
  private readonly handleContextRestored = (): void => {
    this.callbacks?.restored();
  };
  private readonly options: ThreeRendererOptions;

  /**
   * Creates an unmounted Three.js Renderer adapter.
   *
   * @param options - Legacy debug boolean or immutable renderer output policy.
   */
  constructor(options: boolean | ThreeRendererOptions = {}) {
    this.options = normalizeOptions(options);
  }

  /**
   * Creates a WebGLRenderer for a canvas and attaches context listeners.
   *
   * @param canvas - Canvas used for the renderer lifetime.
   * @param callbacks - Runtime context loss and restoration callbacks.
   * @returns Whether renderer creation succeeded.
   */
  mount(
    canvas: HTMLCanvasElement,
    callbacks: MiseRendererContextCallbacks,
  ): boolean {
    if (this.renderer) return true;
    this.canvas = canvas;
    this.callbacks = callbacks;

    try {
      this.renderer = new WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        outputBufferType: this.options.outputBufferType,
      });
      this.renderer.debug.checkShaderErrors =
        this.options.checkShaderErrors ?? false;
      this.renderer.toneMapping =
        this.options.toneMapping ?? this.renderer.toneMapping;
      this.renderer.toneMappingExposure =
        this.options.toneMappingExposure
        ?? this.renderer.toneMappingExposure;
      this.renderer.setPixelRatio(1);
      canvas.addEventListener("webglcontextlost", this.handleContextLost);
      canvas.addEventListener("webglcontextrestored", this.handleContextRestored);
      return true;
    } catch {
      this.renderer = null;
      return false;
    }
  }

  /**
   * Applies the budgeted drawing-buffer size.
   *
   * @param viewport - Current viewport snapshot.
   */
  resize(viewport: ViewportState): void {
    this.viewport = viewport;
    this.renderer?.setSize(
      viewport.drawingBufferWidth,
      viewport.drawingBufferHeight,
      false,
    );
  }

  /**
   * Renders one Scene with its Camera.
   *
   * @param scene - Active Three.js Scene.
   * @param camera - Active Three.js Camera.
   * @param pass - Optional viewport, scissor, and clear policy.
   */
  render(scene: Scene, camera: Camera, pass?: MiseRenderPass): void {
    const renderer = this.renderer;
    if (!renderer) return;
    if (!pass) {
      renderer.setScissorTest(false);
      restoreFullViewport(renderer, this.viewport);
      renderer.autoClear = true;
      renderer.render(scene, camera);
      return;
    }
    const viewport = this.viewport;
    if (
      !viewport
      || pass.viewport.width <= 0
      || pass.viewport.height <= 0
      || pass.scissor.width <= 0
      || pass.scissor.height <= 0
    ) return;
    const ratio = viewport.pixelRatio;
    const renderViewport = toDrawingRect(pass.viewport, viewport, ratio);
    const scissor = toDrawingRect(pass.scissor, viewport, ratio);
    renderer.setViewport(
      renderViewport.x,
      renderViewport.y,
      renderViewport.width,
      renderViewport.height,
    );
    renderer.setScissor(
      scissor.x,
      scissor.y,
      scissor.width,
      scissor.height,
    );
    renderer.setScissorTest(true);
    renderer.autoClear = pass.clear === "all";
    if (pass.clear === "depth") renderer.clear(false, true, false);
    renderer.render(scene, camera);
  }

  /** Clears the current framebuffer when a renderer exists. */
  clear(): void {
    this.renderer?.setScissorTest(false);
    this.renderer?.clear();
  }

  /**
   * Reads rendering counters without exposing mutable Three.js state.
   *
   * @returns A normalized snapshot of Three.js renderer counters.
   */
  stats(): RendererStats {
    const info = this.renderer?.info;
    return {
      calls: info?.render.calls ?? 0,
      triangles: info?.render.triangles ?? 0,
      geometries: info?.memory.geometries ?? 0,
      textures: info?.memory.textures ?? 0,
      programs: info?.programs?.length ?? 0,
    };
  }

  /** Releases listeners, renderer allocations, and the WebGL context. */
  dispose(): void {
    if (!this.canvas && !this.renderer) return;
    this.canvas?.removeEventListener("webglcontextlost", this.handleContextLost);
    this.canvas?.removeEventListener("webglcontextrestored", this.handleContextRestored);
    this.renderer?.setAnimationLoop(null);
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer = null;
    this.canvas = null;
    this.callbacks = null;
    this.viewport = null;
  }
}

function restoreFullViewport(
  renderer: WebGLRenderer,
  viewport: ViewportState | null,
): void {
  if (!viewport) return;
  renderer.setViewport(
    0,
    0,
    viewport.drawingBufferWidth,
    viewport.drawingBufferHeight,
  );
}

function normalizeOptions(
  options: boolean | ThreeRendererOptions,
): ThreeRendererOptions {
  return typeof options === "boolean"
    ? { checkShaderErrors: options }
    : options;
}

function toDrawingRect(
  rect: MiseRenderPass["viewport"],
  surface: ViewportState,
  ratio: number,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  return {
    x: Math.floor(rect.x * ratio),
    y: Math.floor((surface.height - rect.y - rect.height) * ratio),
    width: Math.max(1, Math.floor(rect.width * ratio)),
    height: Math.max(1, Math.floor(rect.height * ratio)),
  };
}
