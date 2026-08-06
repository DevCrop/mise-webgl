import type { Camera, Scene } from "three";
import type { ViewportState } from "./FrameTypes.js";
import type { MiseViewClear } from "./StageTypes.js";

/** Renderer counters exposed to Health and Playground tooling. */
export interface RendererStats {
  /** Draw calls in the most recent render. */
  readonly calls: number;
  /** Triangles in the most recent render. */
  readonly triangles: number;
  /** Geometry allocations currently tracked by Three.js. */
  readonly geometries: number;
  /** Texture allocations currently tracked by Three.js. */
  readonly textures: number;
  /** Compiled WebGL programs currently tracked by Three.js. */
  readonly programs: number;
}

/** Context-loss callbacks owned by the runtime. */
export interface MiseRendererContextCallbacks {
  /** Called after the browser reports WebGL context loss. */
  lost(): void;
  /** Called after the browser reports context restoration. */
  restored(): void;
}

/** Minimal rendering capability required by the MISE runtime. */
export interface MiseRendererPort {
  /** Creates rendering state for the supplied canvas. */
  mount(
    canvas: HTMLCanvasElement,
    callbacks: MiseRendererContextCallbacks,
  ): boolean;
  /** Applies a drawing-buffer size. */
  resize(viewport: ViewportState): void;
  /** Renders one Three.js Scene. */
  render(scene: Scene, camera: Camera, pass?: MiseRenderPass): void;
  /** Clears the current framebuffer. */
  clear(): void;
  /** Reads normalized renderer counters. */
  stats(): RendererStats;
  /** Releases renderer state and its WebGL context. */
  dispose(): void;
}

/** Creates the required Renderer port. */
export type MiseRendererFactory = () => MiseRendererPort;

/** Rectangle expressed in Surface CSS-pixel coordinates. */
export interface MiseRenderRect {
  /** Left offset from the Surface canvas. */
  readonly x: number;
  /** Top offset from the Surface canvas. */
  readonly y: number;
  /** Rectangle width. */
  readonly width: number;
  /** Rectangle height. */
  readonly height: number;
}

/** One View render pass expressed in Surface CSS pixels. */
export interface MiseRenderPass {
  /** Full logical Viewport, which may extend outside the visible Surface. */
  readonly viewport: MiseRenderRect;
  /** Visible clipped rectangle used for buffer clear and fragment output. */
  readonly scissor: MiseRenderRect;
  /** Buffer clear operation performed inside the View scissor. */
  readonly clear: MiseViewClear;
}
