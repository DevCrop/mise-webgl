import type {
  MiseApplicationHandle,
  MiseCollaboration,
  MiseProvider,
} from "../Contracts.js";
import type { MiseLogger } from "../logging/MiseLogger.js";
import {
  MiseSurface,
  type MiseSurfaceOptions,
} from "../dom/MiseSurface.js";
import {
  type CreateMiseOptions,
  MiseApplicationFactory,
} from "../factory/MiseApplicationFactory.js";
import { MiseBrowserApplication } from "./MiseBrowserApplication.js";
import { PageChanger } from "../kernel/PageChanger.js";

/** Composition options for creating a browser MISE application. */
export interface CreateMiseBrowserOptions {
  /** Registration and boot Providers, evaluated in declaration order. */
  readonly providers: readonly MiseProvider[];
  /** Root logger used to create scoped runtime loggers. */
  readonly logger: MiseLogger;
  /** Experience activated directly after mount when no Page owns activation. */
  readonly initialExperience?: string;
  /**
   * DOM root used by the initial Experience and its scoped Drivers.
   *
   * `surface` preserves canvas-local lookup. `body` enables document-flow
   * Scroll Drivers while the renderer Surface remains fixed.
   */
  readonly initialExperienceRoot?: "surface" | "body";
  /** Optional Host collaborations appended to the compiled Health profile. */
  readonly healthProfile?: readonly MiseCollaboration[];
  /** Native Surface and fallback text customization. */
  readonly surface?: MiseSurfaceOptions;
}

/**
 * Composes MISE core, adapters, browser lifecycle, and Surface.
 *
 * @param options - Providers, logger, initial Experience, and optional policies.
 * @returns An unmounted browser application handle.
 * @throws `MiseError` when registration or Plan compilation fails.
 */
export function createMise(
  options: CreateMiseBrowserOptions,
): MiseApplicationHandle {
  const assemblyOptions = {
    providers: options.providers,
    logger: options.logger.child("runtime"),
    ...(options.healthProfile ? { healthProfile: options.healthProfile } : {}),
    onHealthy: (report) => {
      options.logger.success("mise.health_ready", { checks: report.total });
    },
  } satisfies CreateMiseOptions;
  const { application, plan, health, frames } = new MiseApplicationFactory()
    .create(assemblyOptions);
  const motion = plan.createMotion(frames);
  const scroll = plan.createScroll(
    frames,
    (snapshot) => application.setScroll(snapshot),
    options.logger.child("scroll"),
  );
  const pages = new PageChanger(
    plan,
    application,
    motion,
    scroll,
    options.logger.child("pages"),
    health,
  );

  return new MiseBrowserApplication(
    application,
    frames,
    pages,
    scroll,
    motion,
    plan.navigationFactory(),
    options.logger.child("application"),
    health,
    new MiseSurface(options.surface),
    options.initialExperience,
    options.initialExperienceRoot,
  );
}
