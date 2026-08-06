import type {
  MiseRenderPass,
  MiseRendererPort,
  SurfaceDefinition,
  ViewDefinition,
  ViewportState,
} from "../Contracts.js";
import type { TrackFrameResult } from "../kernel/MiseTrackRuntime.js";
import type { MiseTrackRuntime } from "../kernel/MiseTrackRuntime.js";
import type { ViewportManager } from "../kernel/ViewportManager.js";
import type { SceneChanger } from "../kernel/SceneChanger.js";

/** One mounted physical canvas, Renderer, and Viewport boundary. */
export interface PhysicalSurface {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: MiseRendererPort;
  readonly viewport: ViewportManager;
  readonly primary: boolean;
  available: boolean;
  contextEpoch: number;
}

/** One declared Surface bound to a physical canvas. */
export interface SurfaceSession {
  readonly definition: SurfaceDefinition;
  readonly physical: PhysicalSurface;
}

/** One logical View and its most recent layout measurement. */
export interface ViewSession {
  readonly definition: ViewDefinition;
  readonly surface: SurfaceSession;
  readonly anchor: HTMLElement;
  measurement: ViewMeasurement | null;
}

/** One independent Track runtime bound to a logical View. */
export interface StageTrackSession {
  readonly runtime: MiseTrackRuntime;
  readonly view: ViewSession;
  readonly primary: boolean;
  mounted: boolean;
  mounting: boolean;
  mountFailed: boolean;
}

/** Fully built candidate or active concurrent Stage graph. */
export interface StageSession {
  readonly id: string;
  readonly surfaces: ReadonlyMap<string, SurfaceSession>;
  readonly views: ReadonlyMap<string, ViewSession>;
  readonly tracks: readonly StageTrackSession[];
  readonly createdPhysicals: ReadonlySet<PhysicalSurface>;
}

/** Measured View geometry in Surface and browser coordinates. */
export interface ViewMeasurement {
  readonly visible: boolean;
  readonly surfaceViewport: ViewportState;
  readonly viewport: ViewportState;
  readonly pass: MiseRenderPass;
}

/** Ordered render work for one visible Track. */
export interface RenderCommand {
  readonly order: number;
  readonly track: StageTrackSession;
  readonly result: TrackFrameResult;
  readonly measurement: ViewMeasurement;
}

/** Factories used when a Stage requires additional Tracks or Surfaces. */
export interface MiseRuntimeFactories {
  /** Creates one Renderer for an additional physical Surface. */
  readonly createRenderer: () => MiseRendererPort;
  /** Creates one transactional Scene changer. */
  readonly createChanger: (track: string) => SceneChanger;
  /** Creates one Viewport manager wired to a physical Renderer. */
  readonly createViewport: (renderer: MiseRendererPort) => ViewportManager;
}
