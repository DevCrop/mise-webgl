import type {
  DebugSnapshot,
  FrameTick,
  MiseHealthReport,
  MiseRenderPass,
  QualityTier,
  ViewportState,
} from "../Contracts.js";
import type { TrackFrameResult } from "../kernel/MiseTrackRuntime.js";
import type {
  PhysicalSurface,
  RenderCommand,
  StageSession,
  StageTrackSession,
  ViewMeasurement,
  ViewSession,
} from "./MiseStageTypes.js";
import { runCleanups } from "../kernel/Cleanup.js";

/** Measures every dirty logical View against its physical Surface. */
export function measureStageViews(
  stage: StageSession,
  force = false,
): void {
  const snapshots = new Map<PhysicalSurface, ViewportState | null>();
  for (const view of stage.views.values()) {
    const physical = view.surface.physical;
    const snapshot = snapshots.has(physical)
      ? snapshots.get(physical) ?? null
      : physical.viewport.snapshot();
    snapshots.set(physical, snapshot);
    if (!snapshot) {
      view.measurement = null;
      continue;
    }
    if (
      !force
      && sameViewport(view.measurement?.surfaceViewport ?? null, snapshot)
    ) continue;
    view.measurement = measureView(view, snapshot);
  }
}

/** Renders stable Surface/View ordered commands. */
export function renderStageCommands(
  commands: readonly RenderCommand[],
): void {
  const ordered = [...commands].sort(compareRenderCommands);
  for (const command of ordered) {
    const renderState = command.result.renderState;
    if (!renderState) continue;
    command.track.view.surface.physical.renderer.render(
      renderState.scene,
      renderState.camera,
      command.measurement.pass,
    );
  }
}

/** Returns each physical Surface once in declaration order. */
export function uniquePhysicals(
  stage: StageSession | null,
): readonly PhysicalSurface[] {
  if (!stage) return [];
  return [...new Set(
    [...stage.surfaces.values()].map((surface) => surface.physical),
  )];
}

/** Whether a Track may be mounted against its current View state. */
export function shouldMountTrack(track: StageTrackSession): boolean {
  if (!track.view.surface.physical.available) return false;
  return trackWantsMount(track);
}

/** Whether Track policy currently requests a mounted Scene. */
export function trackWantsMount(track: StageTrackSession): boolean {
  return track.runtime.definition.activation === "always"
    || track.view.measurement?.visible === true;
}

/** Applies or removes the native Surface fallback marker. */
export function setSurfaceFallback(
  canvas: HTMLCanvasElement,
  active: boolean,
): void {
  if (active) {
    canvas.dataset["miseState"] = "fallback";
    return;
  }
  delete canvas.dataset["miseState"];
}

/** Disposes one non-shared physical Surface boundary. */
export function disposePhysicalSurface(surface: PhysicalSurface): void {
  surface.available = false;
  runCleanups([
    () => surface.viewport.dispose(),
    () => surface.renderer.dispose(),
  ], "MISE physical Surface cleanup failed.");
}

/** Creates a zero-value Track frame result for diagnostics. */
function idleTrackResult(): TrackFrameResult {
  return {
    demand: "idle",
    renderState: null,
    state: null,
  };
}

/** Builds one immutable Playground snapshot from current Stage state. */
export function createStageDebugSnapshot(
  stage: StageSession,
  results: ReadonlyMap<StageTrackSession, TrackFrameResult>,
  tick: FrameTick,
  fallbackQuality: QualityTier,
  health: MiseHealthReport,
): DebugSnapshot | null {
  const lead = stage.tracks.find((track) => results.get(track)?.state)
    ?? stage.tracks[0];
  if (!lead) return null;
  const result = results.get(lead) ?? idleTrackResult();
  const viewport = lead.view.measurement?.viewport;
  const state = result.state;
  const stats = lead.view.surface.physical.renderer.stats();
  return {
    scene: lead.runtime.activeSceneId ?? "none",
    lifecycle: lead.runtime.lifecycle,
    driver: lead.runtime.activeDriverKind,
    progress: state?.progress ?? 0,
    velocity: state?.velocity ?? 0,
    frameMs: tick.delta * 1000,
    quality: state?.quality ?? fallbackQuality,
    pixelRatio: viewport?.pixelRatio ?? 1,
    stats,
    health,
    stage: {
      id: stage.id,
      surfaces: [...stage.surfaces.values()].map((surface) => ({
        id: surface.definition.id,
        available: surface.physical.available,
        views: [...stage.views.values()].filter(
          (view) => view.surface === surface,
        ).length,
        stats: surface.physical.renderer.stats(),
      })),
      tracks: stage.tracks.map((track) => {
        const trackState = results.get(track)?.state;
        return {
          id: track.runtime.definition.id,
          surface: track.view.surface.definition.id,
          view: track.view.definition.id,
          scene: track.runtime.activeSceneId ?? "none",
          lifecycle: track.runtime.lifecycle,
          driver: track.runtime.activeDriverKind,
          visible: track.view.measurement?.visible ?? false,
          mounted: track.mounted,
          progress: trackState?.progress ?? 0,
        };
      }),
    },
  };
}

function measureView(
  view: ViewSession,
  surfaceViewport: ViewportState,
): ViewMeasurement {
  const canvasRect = readRect(
    view.surface.physical.canvas,
    surfaceViewport.width,
    surfaceViewport.height,
  );
  const anchorRect = view.definition.target.kind === "surface"
    ? canvasRect
    : readRect(view.anchor, 0, 0);
  const viewportRect = {
    x: anchorRect.left - canvasRect.left,
    y: anchorRect.top - canvasRect.top,
    width: anchorRect.width,
    height: anchorRect.height,
  };
  const scissor = intersectRect(viewportRect, {
    x: 0,
    y: 0,
    width: surfaceViewport.width,
    height: surfaceViewport.height,
  });
  const visible = scissor.width > 0
    && scissor.height > 0
    && intersectsBrowserViewport(anchorRect, view.anchor);
  const width = Math.max(1, viewportRect.width);
  const height = Math.max(1, viewportRect.height);
  return {
    visible,
    surfaceViewport,
    viewport: {
      width,
      height,
      pixelRatio: surfaceViewport.pixelRatio,
      drawingBufferWidth: Math.max(
        1,
        Math.floor(width * surfaceViewport.pixelRatio),
      ),
      drawingBufferHeight: Math.max(
        1,
        Math.floor(height * surfaceViewport.pixelRatio),
      ),
    },
    pass: {
      viewport: viewportRect,
      scissor,
      clear: view.definition.clear,
    },
  };
}

function sameViewport(
  left: ViewportState | null,
  right: ViewportState,
): boolean {
  return left?.width === right.width
    && left.height === right.height
    && left.pixelRatio === right.pixelRatio
    && left.drawingBufferWidth === right.drawingBufferWidth
    && left.drawingBufferHeight === right.drawingBufferHeight;
}

function readRect(
  element: HTMLElement,
  fallbackWidth: number,
  fallbackHeight: number,
): Pick<DOMRect, "left" | "top" | "width" | "height" | "right" | "bottom"> {
  if (typeof element.getBoundingClientRect === "function") {
    return element.getBoundingClientRect();
  }
  return {
    left: 0,
    top: 0,
    width: fallbackWidth,
    height: fallbackHeight,
    right: fallbackWidth,
    bottom: fallbackHeight,
  };
}

function intersectRect(
  source: MiseRenderPass["viewport"],
  bounds: MiseRenderPass["viewport"],
): MiseRenderPass["scissor"] {
  const left = Math.max(source.x, bounds.x);
  const top = Math.max(source.y, bounds.y);
  const right = Math.min(source.x + source.width, bounds.x + bounds.width);
  const bottom = Math.min(source.y + source.height, bounds.y + bounds.height);
  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function intersectsBrowserViewport(
  rect: Pick<DOMRect, "left" | "top" | "right" | "bottom">,
  element: HTMLElement,
): boolean {
  const view = element.ownerDocument?.defaultView;
  if (!view) return true;
  return rect.right > 0
    && rect.bottom > 0
    && rect.left < view.innerWidth
    && rect.top < view.innerHeight;
}

function compareRenderCommands(
  left: RenderCommand,
  right: RenderCommand,
): number {
  const surfaceOrder = left.track.view.surface.definition.id.localeCompare(
    right.track.view.surface.definition.id,
  );
  return surfaceOrder
    || left.order - right.order
    || left.track.view.definition.id.localeCompare(
      right.track.view.definition.id,
    );
}
