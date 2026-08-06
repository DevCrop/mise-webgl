import type { DebugPort, ViewportState } from "../Contracts.js";
import type { MiseLogger } from "../logging/MiseLogger.js";
import type { FrameLoop } from "../kernel/FrameLoop.js";
import type { MiseHealthCheck } from "../kernel/MiseHealthCheck.js";
import type { MisePlan } from "../kernel/MisePlan.js";
import { MiseRuntime } from "../kernel/MiseRuntime.js";
import { QualityManager } from "../kernel/QualityManager.js";
import { ReducedMotionPreference } from "../kernel/ReducedMotionPreference.js";
import { SceneChanger } from "../kernel/SceneChanger.js";
import { ViewportManager } from "../kernel/ViewportManager.js";

/** Explicit result graph created for one MISE application runtime. */
export interface MiseRuntimeAssembly {
  /** Main Experience runtime. */
  readonly runtime: MiseRuntime;
  /** Shared reduced-motion preference owner. */
  readonly reducedMotion: ReducedMotionPreference;
}

/** Inputs required to create one Runtime graph. */
export interface MiseRuntimeFactoryOptions {
  /** Immutable compiled application Plan. */
  readonly plan: MisePlan;
  /** Shared application frame loop. */
  readonly frames: FrameLoop;
  /** Root runtime logger. */
  readonly logger: MiseLogger;
  /** Capability-derived Health observer. */
  readonly health: MiseHealthCheck;
}

/** Creates Runtime collaborators without exposing a Container downstream. */
export class MiseRuntimeFactory {
  /** Creates one explicit Runtime dependency graph. */
  create(options: MiseRuntimeFactoryOptions): MiseRuntimeAssembly {
    const quality = new QualityManager();
    const renderer = options.plan.createRenderer();
    const debug = options.plan.createDebugPort(options.frames);
    const reducedMotion = createReducedMotion(options.frames);
    const changer = createChanger(
      options.logger,
      reducedMotion,
      debug,
      options.health,
      "scenes",
    );
    const viewport = createViewport(
      quality,
      options.frames,
      renderer,
    );
    const runtime = new MiseRuntime(
      options.plan,
      renderer,
      changer,
      options.frames,
      viewport,
      quality,
      debug,
      options.logger,
      reducedMotion,
      options.health,
      {
        createRenderer: () => options.plan.createRenderer(),
        createChanger: (track) => createChanger(
          options.logger,
          reducedMotion,
          debug,
          options.health,
          `tracks:${track}`,
        ),
        createViewport: (surfaceRenderer) => createViewport(
          quality,
          options.frames,
          surfaceRenderer,
        ),
      },
    );
    return Object.freeze({ runtime, reducedMotion });
  }
}

function createReducedMotion(frames: FrameLoop): ReducedMotionPreference {
  return new ReducedMotionPreference(
    window.matchMedia("(prefers-reduced-motion: reduce)"),
    () => frames.invalidate(),
  );
}

function createChanger(
  logger: MiseLogger,
  reducedMotion: ReducedMotionPreference,
  debug: DebugPort,
  health: MiseHealthCheck,
  scope: string,
): SceneChanger {
  return new SceneChanger(
    logger.child(scope),
    reducedMotion,
    debug.enabled,
    health,
  );
}

function createViewport(
  quality: QualityManager,
  frames: FrameLoop,
  renderer: ReturnType<MisePlan["createRenderer"]>,
): ViewportManager {
  return new ViewportManager(
    quality,
    frames,
    (value: ViewportState) => {
      renderer.resize(value);
      frames.invalidate();
    },
  );
}
