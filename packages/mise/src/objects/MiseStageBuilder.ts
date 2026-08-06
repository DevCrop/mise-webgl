import {
  isStageExperienceDefinition,
  type ExperienceDefinition,
  type FrameControl,
  type ReducedMotionState,
  type ScrollSnapshot,
  type StageExperienceDefinition,
  type SurfaceDefinition,
} from "../Contracts.js";
import type { MiseLogger } from "../logging/MiseLogger.js";
import { MiseError } from "../MiseError.js";
import type { MiseHealthCheck } from "../kernel/MiseHealthCheck.js";
import type { MisePlan } from "../kernel/MisePlan.js";
import { MiseTrackRuntime } from "../kernel/MiseTrackRuntime.js";
import type { SceneChanger } from "../kernel/SceneChanger.js";
import {
  disposePhysicalSurface,
} from "./MiseStageLayout.js";
import type {
  MiseRuntimeFactories,
  PhysicalSurface,
  StageSession,
  StageTrackSession,
  SurfaceSession,
  ViewSession,
} from "./MiseStageTypes.js";

/** Dependencies used only while building candidate Stage graphs. */
export interface MiseStageBuilderOptions {
  readonly plan: MisePlan;
  readonly primaryChanger: SceneChanger;
  readonly frames: FrameControl;
  readonly logger: MiseLogger;
  readonly health: MiseHealthCheck;
  readonly reducedMotion: ReducedMotionState;
  readonly factories?: MiseRuntimeFactories;
  readonly mountSurface: (surface: PhysicalSurface) => void;
}

/** Transactional Factory for Surface, View, and Track candidate graphs. */
export class MiseStageBuilder {
  /** Creates a Stage builder with explicit runtime construction dependencies. */
  constructor(private readonly options: MiseStageBuilderOptions) {}

  /** Builds one rollback-safe candidate Stage. */
  build(
    definition: ExperienceDefinition,
    root: HTMLElement,
    defaultSurface: PhysicalSurface,
    activeStage: StageSession | null,
    scroll: ScrollSnapshot,
  ): StageSession {
    const normalized = normalizeExperience(definition);
    const created = new Set<PhysicalSurface>();
    const surfaces = new Map<string, SurfaceSession>();
    const views = new Map<string, ViewSession>();
    const tracks: StageTrackSession[] = [];
    try {
      this.createSurfaces(
        normalized,
        root,
        defaultSurface,
        activeStage,
        surfaces,
        created,
      );
      this.createViews(normalized, root, surfaces, views);
      this.createTracks(normalized, root, views, tracks, scroll);
      return {
        id: definition.id,
        surfaces,
        views,
        tracks,
        createdPhysicals: created,
      };
    } catch (error) {
      disposeBuiltCandidate(tracks, created);
      throw error;
    }
  }

  private createSurfaces(
    definition: StageExperienceDefinition,
    root: HTMLElement,
    defaultSurface: PhysicalSurface,
    activeStage: StageSession | null,
    output: Map<string, SurfaceSession>,
    created: Set<PhysicalSurface>,
  ): void {
    const canvases = new Set<HTMLCanvasElement>();
    for (const surface of definition.surfaces) {
      const canvas = resolveCanvas(surface, root, defaultSurface);
      if (canvases.has(canvas)) {
        throw new MiseError(
          "MISE_PLAN_INVALID",
          `MISE Surfaces resolve to the same canvas: ${surface.id}`,
        );
      }
      canvases.add(canvas);
      const physical = surface.target.kind === "default"
        ? defaultSurface
        : this.resolvePhysical(canvas, activeStage, created);
      output.set(surface.id, { definition: surface, physical });
    }
  }

  private createViews(
    definition: StageExperienceDefinition,
    root: HTMLElement,
    surfaces: ReadonlyMap<string, SurfaceSession>,
    output: Map<string, ViewSession>,
  ): void {
    for (const view of definition.views) {
      const surface = surfaces.get(view.surface);
      if (!surface) {
        throw new MiseError(
          "MISE_PLAN_INVALID",
          `MISE View references unavailable Surface: ${view.surface}`,
        );
      }
      const anchor = view.target.kind === "surface"
        ? surface.physical.canvas
        : resolveElement(root, view.target.selector, "View");
      output.set(view.id, {
        definition: view,
        surface,
        anchor,
        measurement: null,
      });
    }
  }

  private createTracks(
    definition: StageExperienceDefinition,
    root: HTMLElement,
    views: ReadonlyMap<string, ViewSession>,
    output: StageTrackSession[],
    scroll: ScrollSnapshot,
  ): void {
    for (let index = 0; index < definition.tracks.length; index += 1) {
      const track = definition.tracks[index]!;
      const view = views.get(track.view);
      if (!view) {
        throw new MiseError(
          "MISE_PLAN_INVALID",
          `MISE Track references unavailable View: ${track.view}`,
        );
      }
      const primary = index === 0;
      const changer = primary
        ? this.options.primaryChanger
        : this.requireFactories().createChanger(track.id);
      const trackRoot = track.root === "experience" ? root : view.anchor;
      output.push({
        runtime: this.createTrackRuntime(
          track,
          trackRoot,
          changer,
          scroll,
        ),
        view,
        primary,
        mounted: false,
        mounting: false,
        mountFailed: false,
      });
    }
  }

  private createTrackRuntime(
    track: StageExperienceDefinition["tracks"][number],
    root: HTMLElement,
    changer: SceneChanger,
    scroll: ScrollSnapshot,
  ): MiseTrackRuntime {
    return new MiseTrackRuntime(
      track,
      root,
      changer,
      this.options.plan,
      this.options.logger.child(`track:${track.id}`),
      this.options.health,
      () => this.options.frames.invalidate(),
      scroll,
      this.options.reducedMotion,
    );
  }

  private resolvePhysical(
    canvas: HTMLCanvasElement,
    activeStage: StageSession | null,
    created: Set<PhysicalSurface>,
  ): PhysicalSurface {
    const reusable = [...(activeStage?.surfaces.values() ?? [])].find(
      (surface) => surface.physical.canvas === canvas,
    )?.physical;
    if (reusable) return reusable;
    const factories = this.requireFactories();
    const renderer = factories.createRenderer();
    const physical = {
      canvas,
      renderer,
      viewport: factories.createViewport(renderer),
      primary: false,
      available: false,
      contextEpoch: 0,
    } satisfies PhysicalSurface;
    created.add(physical);
    this.options.mountSurface(physical);
    return physical;
  }

  private requireFactories(): MiseRuntimeFactories {
    if (this.options.factories) return this.options.factories;
    throw new MiseError(
      "MISE_PLAN_INVALID",
      "MISE Stage requires runtime Surface and Track factories.",
    );
  }
}

function normalizeExperience(
  definition: ExperienceDefinition,
): StageExperienceDefinition {
  if (isStageExperienceDefinition(definition)) return definition;
  return {
    id: definition.id,
    surfaces: [{
      id: "default",
      target: { kind: "default" },
      mode: "compositor",
    }],
    views: [{
      id: "default",
      surface: "default",
      target: { kind: "surface" },
      order: 0,
      clear: "all",
    }],
    tracks: [{
      id: "default",
      view: "default",
      root: "experience",
      activation: "always",
      scenes: definition.scenes,
    }],
  };
}

function resolveCanvas(
  definition: SurfaceDefinition,
  root: HTMLElement,
  defaultSurface: PhysicalSurface,
): HTMLCanvasElement {
  if (definition.target.kind === "default") return defaultSurface.canvas;
  const element = resolveElement(root, definition.target.selector, "Surface");
  if (element.tagName.toLowerCase() === "canvas") {
    return element as HTMLCanvasElement;
  }
  throw new MiseError(
    "MISE_SURFACE_MISSING",
    `MISE Surface target is not a canvas: ${definition.id}`,
  );
}

function resolveElement(
  root: HTMLElement,
  selector: string,
  kind: string,
): HTMLElement {
  const element = root.matches(selector)
    ? root
    : root.querySelector<HTMLElement>(selector);
  if (element) return element;
  throw new MiseError(
    "MISE_SURFACE_MISSING",
    `MISE ${kind} target was not found.`,
  );
}

function disposeBuiltCandidate(
  tracks: readonly StageTrackSession[],
  physicals: ReadonlySet<PhysicalSurface>,
): void {
  for (const track of [...tracks].reverse()) {
    track.runtime.dispose(!track.primary);
  }
  for (const surface of physicals) disposePhysicalSurface(surface);
}
