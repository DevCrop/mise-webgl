import type { DriveSpec } from "./DriverTypes.js";
import type { FrameControl, QualityTier } from "./FrameTypes.js";
import type { RendererStats } from "./RendererTypes.js";

/** Canonical collaboration keys observed by the core runtime. */
export type CoreMiseCollaboration =
  | "application.providers"
  | "application.registry"
  | "application.container"
  | "application.factory"
  | "application.runtime"
  | "browser-application.logging"
  | "browser-application.mise"
  | "browser-application.navigation"
  | "browser-application.page-changer"
  | "browser-application.scroll"
  | "page-changer.page"
  | "page.motion"
  | "runtime.renderer"
  | "runtime.frame-loop"
  | "runtime.clock"
  | "runtime.scene-changer"
  | "runtime.driver"
  | "runtime.debug"
  | "scene-changer.scene"
  | "scene.resource-scope"
  | "scene.object-factory"
  | "scroll-port.mise";

/** Core or Host-defined Health collaboration key. */
export type MiseCollaboration =
  | CoreMiseCollaboration
  | (string & {});

/** Aggregate Health state for the compiled capability profile. */
export type MiseHealthStatus = "pending" | "healthy";

/** Immutable Health report for the current application. */
export interface MiseHealthReport {
  /** Aggregate result for the expected capability profile. */
  readonly status: MiseHealthStatus;
  /** Expected collaborations already observed. */
  readonly observed: readonly MiseCollaboration[];
  /** Expected collaborations not yet observed. */
  readonly missing: readonly MiseCollaboration[];
  /** Number of expected collaborations. */
  readonly total: number;
}

/** Restricted write boundary for expected Host Health collaborations. */
export interface MiseHealthReporter {
  /**
   * Marks one expected collaboration as observed.
   *
   * Unknown keys are ignored and repeated marks are idempotent.
   *
   * @param collaboration - Core or Host-defined expected collaboration key.
   */
  mark(collaboration: MiseCollaboration): void;
}

/** One physical Surface exposed to development diagnostics. */
export interface DebugSurfaceSnapshot {
  /** Experience-local Surface ID. */
  readonly id: string;
  /** Whether its Renderer context may currently render. */
  readonly available: boolean;
  /** Number of logical Views assigned to the Surface. */
  readonly views: number;
  /** Context-local renderer counters. */
  readonly stats: RendererStats;
}

/** One independently active Track exposed to development diagnostics. */
export interface DebugTrackSnapshot {
  /** Experience-local Track ID. */
  readonly id: string;
  /** Surface receiving the Track render pass. */
  readonly surface: string;
  /** View receiving the Track render pass. */
  readonly view: string;
  /** Active Scene ID, or `none` before deferred mount. */
  readonly scene: string;
  /** Active Scene lifecycle state. */
  readonly lifecycle: string;
  /** Active Driver kind. */
  readonly driver: DriveSpec["kind"];
  /** Whether the View intersects the browser viewport. */
  readonly visible: boolean;
  /** Whether the Track has committed its initial Scene. */
  readonly mounted: boolean;
  /** Latest sampled progress, or zero before update. */
  readonly progress: number;
}

/** Concurrent Stage topology exposed to development diagnostics. */
export interface DebugStageSnapshot {
  /** Active Experience ID. */
  readonly id: string;
  /** Physical Surface state in declaration order. */
  readonly surfaces: readonly DebugSurfaceSnapshot[];
  /** Track state in declaration order. */
  readonly tracks: readonly DebugTrackSnapshot[];
}

/** Read-only runtime snapshot consumed by a Debug port. */
export interface DebugSnapshot {
  /** Active Scene ID. */
  readonly scene: string;
  /** Active Scene lifecycle state. */
  readonly lifecycle: string;
  /** Active Driver kind. */
  readonly driver: DriveSpec["kind"];
  /** Active Driver progress. */
  readonly progress: number;
  /** Active Driver velocity. */
  readonly velocity: number;
  /** Current frame duration in milliseconds. */
  readonly frameMs: number;
  /** Current adaptive quality tier. */
  readonly quality: QualityTier;
  /** Current renderer pixel ratio. */
  readonly pixelRatio: number;
  /** Current renderer counters. */
  readonly stats: RendererStats;
  /** Current application Health report. */
  readonly health: MiseHealthReport;
  /** Optional concurrent Stage topology for multi-Surface diagnostics. */
  readonly stage?: DebugStageSnapshot;
}

/** Optional development diagnostics adapter. */
export interface DebugPort {
  /** Whether runtime snapshots should be produced. */
  readonly enabled: boolean;
  /** Mounts diagnostic UI. */
  mount(documentRoot: Document): void;
  /** Updates diagnostic output. */
  update(snapshot: DebugSnapshot): void;
  /** Removes diagnostic UI and retained state. */
  dispose(): void;
}

/** Creates an optional Debug port with the shared application frame boundary. */
export type DebugPortFactory = (frames: FrameControl) => DebugPort;
