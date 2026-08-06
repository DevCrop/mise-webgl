import {
  isStageExperienceDefinition,
  validateAutoDriveSpec,
  validateScrollDriveSpec,
} from "../Contracts.js";
import { MiseError } from "../MiseError.js";
import {
  DEFINITION_LIMITS,
  isSafeDefinitionId,
  isSafeSelector,
} from "../definitions/DefinitionPolicy.js";
import type {
  DriveSpec,
  DriverFactory,
  ExperienceDefinition,
  MisePageDefinition,
  SceneDefinition,
  StageExperienceDefinition,
  ViewDefinition,
} from "../Contracts.js";

/** Validates cross-definition invariants before a Plan becomes executable. */
export function validateMisePlan(
  experiences: ReadonlyMap<string, ExperienceDefinition>,
  drivers: ReadonlyMap<DriveSpec["kind"], DriverFactory>,
  pages: ReadonlyMap<string, MisePageDefinition>,
): void {
  assertPlanLimit(
    experiences.size,
    DEFINITION_LIMITS.experiences,
    "Experiences",
  );
  assertPlanLimit(pages.size, DEFINITION_LIMITS.pages, "Pages");
  validatePages(pages);
  validateExperiences(experiences, drivers);
}

/** Reports whether the compiled Plan declares any Scene Object factories. */
export function hasPlanObjectFactories(
  experiences: ReadonlyMap<string, ExperienceDefinition>,
): boolean {
  for (const experience of experiences.values()) {
    const tracks = isStageExperienceDefinition(experience)
      ? experience.tracks
      : [{ scenes: experience.scenes }];
    for (const track of tracks) {
      if (track.scenes.some((scene) => (scene.objects?.length ?? 0) > 0)) {
        return true;
      }
    }
  }
  return false;
}

function validateExperiences(
  experiences: ReadonlyMap<string, ExperienceDefinition>,
  drivers: ReadonlyMap<DriveSpec["kind"], DriverFactory>,
): void {
  for (const experience of experiences.values()) {
    validateIdentifier(experience.id, "experience");
    if (isStageExperienceDefinition(experience)) {
      validateStageExperience(experience, drivers);
      continue;
    }
    validateSceneList(experience.scenes, experience.id, drivers);
  }
}

function validateStageExperience(
  experience: StageExperienceDefinition,
  drivers: ReadonlyMap<DriveSpec["kind"], DriverFactory>,
): void {
  assertNonEmpty(experience.surfaces, experience.id, "Surfaces");
  assertNonEmpty(experience.views, experience.id, "Views");
  assertNonEmpty(experience.tracks, experience.id, "Tracks");
  assertPlanLimit(
    experience.surfaces.length,
    DEFINITION_LIMITS.surfacesPerExperience,
    "Surfaces",
  );
  assertPlanLimit(
    experience.views.length,
    DEFINITION_LIMITS.viewsPerExperience,
    "Views",
  );
  assertPlanLimit(
    experience.tracks.length,
    DEFINITION_LIMITS.tracksPerExperience,
    "Tracks",
  );
  const surfaces = collectIds(experience.surfaces, "surface", experience.id);
  const views = collectIds(experience.views, "view", experience.id);
  collectIds(experience.tracks, "track", experience.id);
  let defaultSurfaces = 0;

  for (const surface of experience.surfaces) {
    if (
      surface.target.kind !== "default"
      && surface.target.kind !== "selector"
    ) {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE surface "${surface.id}" has an invalid target.`,
      );
    }
    if (surface.target.kind === "default") defaultSurfaces += 1;
    if (surface.mode !== "compositor" && surface.mode !== "isolated") {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE surface "${surface.id}" has an invalid mode.`,
      );
    }
    if (
      surface.target.kind === "selector"
      && !isSafeSelector(surface.target.selector)
    ) {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE surface "${surface.id}" selector violates the security policy.`,
      );
    }
  }
  if (defaultSurfaces > 1) {
    throw new MiseError(
      "MISE_PLAN_INVALID",
      `MISE experience "${experience.id}" has multiple default Surfaces.`,
    );
  }
  const surfaceViews = new Map<string, ViewDefinition[]>();
  for (const view of experience.views) {
    if (
      view.target.kind !== "surface"
      && view.target.kind !== "selector"
    ) {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE view "${view.id}" has an invalid target.`,
      );
    }
    if (!surfaces.has(view.surface)) {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE view "${view.id}" references unknown Surface "${view.surface}".`,
      );
    }
    const assigned = surfaceViews.get(view.surface) ?? [];
    assigned.push(view);
    surfaceViews.set(view.surface, assigned);
    if (
      view.target.kind === "selector"
      && !isSafeSelector(view.target.selector)
    ) {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE view "${view.id}" selector violates the security policy.`,
      );
    }
    if (!Number.isSafeInteger(view.order)) {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE view "${view.id}" order must be a safe integer.`,
      );
    }
    if (view.clear !== "all" && view.clear !== "depth" && view.clear !== "none") {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE view "${view.id}" has an invalid clear policy.`,
      );
    }
  }
  for (const surface of experience.surfaces) {
    const assigned = surfaceViews.get(surface.id) ?? [];
    if (assigned.length === 0) {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE Surface "${surface.id}" has no Views.`,
      );
    }
    if (
      surface.mode === "isolated"
      && (
        assigned.length !== 1
        || assigned[0]?.target.kind !== "surface"
      )
    ) {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE isolated Surface "${surface.id}" requires one whole-Surface View.`,
      );
    }
  }
  const trackedViews = new Set<string>();
  for (const track of experience.tracks) {
    if (!views.has(track.view)) {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE track "${track.id}" references unknown View "${track.view}".`,
      );
    }
    if (trackedViews.has(track.view)) {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE View "${track.view}" is assigned to multiple Tracks.`,
      );
    }
    trackedViews.add(track.view);
    if (track.root !== "experience" && track.root !== "view") {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE track "${track.id}" has an invalid root policy.`,
      );
    }
    if (track.activation !== "always" && track.activation !== "visible") {
      throw new MiseError(
        "MISE_PLAN_INVALID",
        `MISE track "${track.id}" has an invalid activation policy.`,
      );
    }
    validateSceneList(
      track.scenes,
      `${experience.id}/${track.id}`,
      drivers,
    );
  }
}

function validateSceneList(
  scenes: readonly SceneDefinition[],
  owner: string,
  drivers: ReadonlyMap<DriveSpec["kind"], DriverFactory>,
): void {
  if (scenes.length === 0) {
    throw new MiseError(
      "MISE_PLAN_INVALID",
      `MISE experience track "${owner}" has no scenes.`,
    );
  }
  assertPlanLimit(
    scenes.length,
    DEFINITION_LIMITS.scenesPerTrack,
    "Scenes",
  );
  const sceneIds = new Set<string>();
  for (const scene of scenes) {
    validateIdentifier(scene.id, "scene");
    if (sceneIds.has(scene.id)) {
      throw new MiseError(
        "MISE_PLAN_DUPLICATE_ID",
        `Duplicate MISE scene "${scene.id}" in "${owner}".`,
      );
    }
    sceneIds.add(scene.id);
    validateObjectFactories(scene);
    if (!drivers.has(scene.drive.kind)) {
      throw new MiseError(
        "MISE_DRIVER_UNREGISTERED",
        `Unregistered MISE driver: ${scene.drive.kind}`,
      );
    }
    validateDrive(scene.drive);
  }
}

function validateObjectFactories(scene: SceneDefinition): void {
  assertPlanLimit(
    scene.objects?.length ?? 0,
    DEFINITION_LIMITS.objectsPerScene,
    "Object factories",
  );
  const ids = new Set<string>();
  for (const factory of scene.objects ?? []) {
    validateIdentifier(factory.id, "Object factory");
    if (!ids.has(factory.id)) {
      ids.add(factory.id);
      continue;
    }
    throw new MiseError(
      "MISE_PLAN_DUPLICATE_ID",
      `Duplicate MISE Object factory "${factory.id}" in Scene "${scene.id}".`,
    );
  }
}

function collectIds(
  definitions: readonly { readonly id: string }[],
  kind: string,
  experience: string,
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const definition of definitions) {
    validateIdentifier(definition.id, kind);
    if (ids.has(definition.id)) {
      throw new MiseError(
        "MISE_PLAN_DUPLICATE_ID",
        `Duplicate MISE ${kind} "${definition.id}" in experience "${experience}".`,
      );
    }
    ids.add(definition.id);
  }
  return ids;
}

function assertNonEmpty(
  values: readonly unknown[],
  experience: string,
  kind: string,
): void {
  if (values.length > 0) return;
  throw new MiseError(
    "MISE_PLAN_INVALID",
    `MISE experience "${experience}" has no ${kind}.`,
  );
}

function validatePages(pages: ReadonlyMap<string, MisePageDefinition>): void {
  for (const page of pages.values()) validateIdentifier(page.id, "page");
}

function validateIdentifier(value: string, kind: string): void {
  if (isSafeDefinitionId(value)) return;
  throw new MiseError(
    "MISE_PLAN_INVALID",
    `MISE ${kind} id violates the security policy.`,
  );
}

function assertPlanLimit(value: number, limit: number, kind: string): void {
  if (value <= limit) return;
  throw new MiseError(
    "MISE_PLAN_INVALID",
    `MISE ${kind} exceed the security budget.`,
  );
}

function validateDrive(drive: DriveSpec): void {
  switch (drive.kind) {
    case "auto":
      validateAutoDriveSpec(drive);
      return;
    case "scroll":
      validateScrollDriveSpec(drive);
      return;
    case "custom:":
      throw new MiseError(
        "MISE_DRIVER_INVALID",
        "MISE custom driver kind requires a name.",
      );
    default:
      return;
  }
}
