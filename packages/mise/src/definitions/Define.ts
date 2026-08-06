import { MiseError } from "../MiseError.js";
import type {
  AutoDriveSpec,
  CustomDriveSpec,
  DriveSpec,
  ScrollDriveSpec,
  ScrollEdge,
} from "../types/DriverTypes.js";
import type { MisePageDefinition } from "../types/PageTypes.js";
import type { MiseProvider } from "../types/ProviderTypes.js";
import type { SceneDefinition } from "../types/SceneTypes.js";
import type {
  ExperienceDefinition,
  MiseSurfaceTarget,
  MiseViewTarget,
  StageExperienceDefinition,
  SurfaceDefinition,
  TrackDefinition,
  ViewDefinition,
} from "../types/StageTypes.js";
import { snapshotDriverConfig } from "./DriverConfig.js";
import {
  DEFINITION_LIMITS,
  isSafeDefinitionId,
  isSafeSelector,
} from "./DefinitionPolicy.js";

/** Freezes a Provider while preserving its concrete type. */
export function defineProvider<const TProvider extends MiseProvider>(
  provider: TProvider,
): TProvider {
  return Object.freeze(provider);
}

/** Validates and snapshots an Experience definition. */
export function defineExperience<const TDefinition extends ExperienceDefinition>(
  definition: TDefinition,
): TDefinition {
  validateDefinitionId(definition.id, "Experience");
  if (isStageExperienceDefinition(definition)) {
    validateStageDefinition(definition);
    return snapshotExperienceDefinition(definition) as TDefinition;
  }
  if (definition.scenes.length === 0) {
    throw new MiseError(
      "MISE_DEFINITION_INVALID",
      `Experience "${definition.id}" requires at least one scene.`,
    );
  }
  assertDefinitionLimit(
    definition.scenes.length,
    DEFINITION_LIMITS.scenesPerTrack,
    "Experience Scenes",
  );
  return snapshotExperienceDefinition(definition) as TDefinition;
}

/** Validates and snapshots a physical Surface definition. */
export function defineSurface<const TDefinition extends SurfaceDefinition>(
  definition: TDefinition,
): TDefinition {
  validateDefinitionId(definition.id, "Surface");
  validateSelectorTarget(definition.target, "Surface");
  return snapshotSurfaceDefinition(definition) as TDefinition;
}

/** Validates and snapshots a logical View definition. */
export function defineView<const TDefinition extends ViewDefinition>(
  definition: TDefinition,
): TDefinition {
  validateDefinitionId(definition.id, "View");
  validateDefinitionId(definition.surface, "View Surface");
  validateSelectorTarget(definition.target, "View");
  if (!Number.isSafeInteger(definition.order)) {
    throw new MiseError(
      "MISE_DEFINITION_INVALID",
      `View "${definition.id}" order must be a safe integer.`,
    );
  }
  return snapshotViewDefinition(definition) as TDefinition;
}

/** Validates and snapshots an independently active Track definition. */
export function defineTrack<const TDefinition extends TrackDefinition>(
  definition: TDefinition,
): TDefinition {
  validateDefinitionId(definition.id, "Track");
  validateDefinitionId(definition.view, "Track View");
  if (definition.scenes.length === 0) {
    throw new MiseError(
      "MISE_DEFINITION_INVALID",
      `Track "${definition.id}" requires at least one scene.`,
    );
  }
  assertDefinitionLimit(
    definition.scenes.length,
    DEFINITION_LIMITS.scenesPerTrack,
    "Track Scenes",
  );
  return snapshotTrackDefinition(definition) as TDefinition;
}

/** Validates and snapshots a Scene definition. */
export function defineScene<const TDefinition extends SceneDefinition>(
  definition: TDefinition,
): TDefinition {
  validateDefinitionId(definition.id, "Scene");
  validateObjectFactoryReferences(definition);
  return snapshotSceneDefinition(definition) as TDefinition;
}

/** Validates and snapshots a Page definition. */
export function definePage<const TDefinition extends MisePageDefinition>(
  definition: TDefinition,
): TDefinition {
  validateDefinitionId(definition.id, "Page");
  return snapshotPageDefinition(definition) as TDefinition;
}

/** Validates and snapshots a custom Driver specification. */
export function defineDriver<const TSpec extends CustomDriveSpec>(
  spec: TSpec,
): TSpec {
  if (spec.kind === "custom:") {
    throw new MiseError(
      "MISE_DRIVER_INVALID",
      "Custom driver kind requires a name.",
    );
  }
  return snapshotDriveSpec(spec) as TSpec;
}

/** Creates a validated scroll Driver specification. */
export function scroll(
  spec: Omit<ScrollDriveSpec, "kind">,
): ScrollDriveSpec {
  validateScrollDriveSpec(spec);
  return Object.freeze({ ...spec, kind: "scroll" });
}

/** Creates a validated automatic Driver specification. */
export function auto(spec: Omit<AutoDriveSpec, "kind">): AutoDriveSpec {
  validateAutoDriveSpec(spec);
  return snapshotDriveSpec({ ...spec, kind: "auto" }) as AutoDriveSpec;
}

/** Creates a detached immutable Experience snapshot for Plan compilation. */
export function snapshotExperienceDefinition(
  definition: ExperienceDefinition,
): ExperienceDefinition {
  if (isStageExperienceDefinition(definition)) {
    return Object.freeze({
      ...definition,
      surfaces: Object.freeze(
        definition.surfaces.map(snapshotSurfaceDefinition),
      ),
      views: Object.freeze(definition.views.map(snapshotViewDefinition)),
      tracks: Object.freeze(definition.tracks.map(snapshotTrackDefinition)),
    });
  }
  return Object.freeze({
    ...definition,
    scenes: Object.freeze(definition.scenes.map(snapshotSceneDefinition)),
  });
}

/** Narrows an Experience to the concurrent Stage form. */
export function isStageExperienceDefinition(
  definition: ExperienceDefinition,
): definition is StageExperienceDefinition {
  return "tracks" in definition;
}

/** Creates a detached immutable Page snapshot for Plan compilation. */
export function snapshotPageDefinition(
  definition: MisePageDefinition,
): MisePageDefinition {
  return Object.freeze({ ...definition });
}

/** Validates automatic Driver configuration. */
export function validateAutoDriveSpec(
  spec: Pick<AutoDriveSpec, "duration" | "loop" | "reducedMotion">,
): void {
  if (!Number.isFinite(spec.duration) || spec.duration <= 0) {
    throw new MiseError(
      "MISE_DRIVER_INVALID",
      "Auto driver duration must be finite and positive.",
    );
  }
  if (typeof spec.loop !== "boolean") {
    throw new MiseError("MISE_DRIVER_INVALID", "Auto driver loop must be boolean.");
  }
  const mode = spec.reducedMotion?.mode as unknown;
  if (mode !== "pause" && mode !== "complete" && mode !== "shorten") {
    throw new MiseError(
      "MISE_DRIVER_INVALID",
      "Auto driver reduced-motion mode is invalid.",
    );
  }
  if (spec.reducedMotion.mode !== "shorten") return;
  if (
    !Number.isFinite(spec.reducedMotion.duration)
    || spec.reducedMotion.duration <= 0
  ) {
    throw new MiseError(
      "MISE_DRIVER_INVALID",
      "Auto driver reduced-motion duration must be finite and positive.",
    );
  }
}

/** Validates scroll Driver configuration. */
export function validateScrollDriveSpec(
  spec: Pick<ScrollDriveSpec, "trigger" | "start" | "end">,
): void {
  if (spec.trigger.trim().length === 0) {
    throw new MiseError(
      "MISE_DRIVER_INVALID",
      "Scroll driver trigger must not be empty.",
    );
  }
  const edges: readonly ScrollEdge[] = [
    "top top",
    "top bottom",
    "bottom top",
    "bottom bottom",
  ];
  if (!edges.includes(spec.start) || !edges.includes(spec.end)) {
    throw new MiseError("MISE_DRIVER_INVALID", "Scroll driver edge is invalid.");
  }
}

function snapshotSceneDefinition(
  definition: SceneDefinition,
): SceneDefinition {
  const objects = definition.objects
    ? Object.freeze(definition.objects.map((factory) => Object.freeze({
      id: factory.id,
    })))
    : undefined;
  return Object.freeze({
    ...definition,
    drive: snapshotDriveSpec(definition.drive),
    ...(objects ? { objects } : {}),
  });
}

function snapshotSurfaceDefinition(
  definition: SurfaceDefinition,
): SurfaceDefinition {
  return Object.freeze({
    ...definition,
    target: Object.freeze({ ...definition.target }),
  });
}

function snapshotViewDefinition(
  definition: ViewDefinition,
): ViewDefinition {
  return Object.freeze({
    ...definition,
    target: Object.freeze({ ...definition.target }),
  });
}

function snapshotTrackDefinition(
  definition: TrackDefinition,
): TrackDefinition {
  return Object.freeze({
    ...definition,
    scenes: Object.freeze(definition.scenes.map(snapshotSceneDefinition)),
  });
}

function validateObjectFactoryReferences(definition: SceneDefinition): void {
  assertDefinitionLimit(
    definition.objects?.length ?? 0,
    DEFINITION_LIMITS.objectsPerScene,
    "Scene Object factories",
  );
  const ids = new Set<string>();
  for (const factory of definition.objects ?? []) {
    validateDefinitionId(factory.id, "Object factory");
    if (ids.has(factory.id)) {
      throw new MiseError(
        "MISE_DEFINITION_INVALID",
        `Scene "${definition.id}" has duplicate Object factory "${factory.id}".`,
      );
    }
    ids.add(factory.id);
  }
}

function validateStageDefinition(
  definition: StageExperienceDefinition,
): void {
  if (
    definition.surfaces.length > 0
    && definition.views.length > 0
    && definition.tracks.length > 0
  ) {
    assertDefinitionLimit(
      definition.surfaces.length,
      DEFINITION_LIMITS.surfacesPerExperience,
      "Experience Surfaces",
    );
    assertDefinitionLimit(
      definition.views.length,
      DEFINITION_LIMITS.viewsPerExperience,
      "Experience Views",
    );
    assertDefinitionLimit(
      definition.tracks.length,
      DEFINITION_LIMITS.tracksPerExperience,
      "Experience Tracks",
    );
    return;
  }
  throw new MiseError(
    "MISE_DEFINITION_INVALID",
    `Experience "${definition.id}" requires Surface, View, and Track definitions.`,
  );
}

function validateSelectorTarget(
  target: MiseSurfaceTarget | MiseViewTarget,
  kind: string,
): void {
  if (target.kind !== "selector" || isSafeSelector(target.selector)) return;
  throw new MiseError(
    "MISE_DEFINITION_INVALID",
    `${kind} selector violates the MISE security policy.`,
  );
}

function snapshotDriveSpec(spec: DriveSpec): DriveSpec {
  switch (spec.kind) {
    case "auto":
      return Object.freeze({
        ...spec,
        reducedMotion: Object.freeze({ ...spec.reducedMotion }),
      });
    case "scroll":
      return Object.freeze({ ...spec });
    default:
      return snapshotDriverConfig(spec);
  }
}

function validateDefinitionId(value: string, kind: string): void {
  if (isSafeDefinitionId(value)) return;
  throw new MiseError(
    "MISE_DEFINITION_INVALID",
    `${kind} id violates the MISE security policy.`,
  );
}

function assertDefinitionLimit(
  value: number,
  limit: number,
  kind: string,
): void {
  if (value <= limit) return;
  throw new MiseError(
    "MISE_DEFINITION_INVALID",
    `${kind} exceed the MISE security budget.`,
  );
}
