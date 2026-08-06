import type {
  MiseCollaboration,
  MiseHealthReport,
  MiseProvider,
} from "../Contracts.js";
import {
  MiseContainerBuilder,
} from "../container/MiseContainerBuilder.js";
import { createMiseToken } from "../container/MiseToken.js";
import type { MiseLogger } from "../logging/MiseLogger.js";
import { registerCoreDrivers } from "../kernel/Drivers.js";
import { FrameLoop } from "../kernel/FrameLoop.js";
import { MiseClock } from "../clock/MiseClock.js";
import {
  MiseApplication,
} from "../kernel/MiseApplication.js";
import { MiseHealthCheck } from "../kernel/MiseHealthCheck.js";
import type { MisePlan } from "../kernel/MisePlan.js";
import { MiseRegistry } from "../kernel/MiseRegistry.js";
import {
  MiseRuntimeFactory,
  type MiseRuntimeAssembly,
} from "./MiseRuntimeFactory.js";

const PLAN = createMiseToken<MisePlan>("mise.plan");
const CLOCK = createMiseToken<MiseClock>("mise.clock");
const FRAMES = createMiseToken<FrameLoop>("mise.frames");
const LOGGER = createMiseToken<MiseLogger>("mise.logger");
const HEALTH = createMiseToken<MiseHealthCheck>("mise.health");
const RUNTIME_FACTORY = createMiseToken<MiseRuntimeFactory>(
  "mise.runtime-factory",
);
const RUNTIME = createMiseToken<MiseRuntimeAssembly>("mise.runtime");

/** Composition options accepted by the internal Application factory. */
export interface CreateMiseOptions {
  /** Registration and boot Providers. */
  readonly providers: readonly MiseProvider[];
  /** Root runtime logger. */
  readonly logger: MiseLogger;
  /** Optional Host collaborations appended to the compiled profile. */
  readonly healthProfile?: readonly MiseCollaboration[];
  /** Callback invoked once after every expected collaboration is observed. */
  readonly onHealthy?: (report: MiseHealthReport) => void;
}

/** Explicit graph returned by MISE application composition. */
export interface MiseAssembly {
  /** Lifecycle application used by the browser facade. */
  readonly application: MiseApplication;
  /** Immutable compiled Provider Plan. */
  readonly plan: MisePlan;
  /** Capability-derived Health observer. */
  readonly health: MiseHealthCheck;
  /** Application-wide scheduler composed with the shared Clock. */
  readonly frames: FrameLoop;
}

/** Composition Root factory for Provider, Plan, Container, and Runtime graphs. */
export class MiseApplicationFactory {
  /** Compiles and creates one isolated MISE application graph. */
  create(options: CreateMiseOptions): MiseAssembly {
    const providers = Object.freeze([...options.providers]);
    const plan = compilePlan(providers);
    const health = new MiseHealthCheck(
      mergeHealthProfile(plan, options.healthProfile),
      options.onHealthy,
    );
    markRegistrationHealth(health);
    const container = new MiseContainerBuilder()
      .value(PLAN, plan)
      .value(LOGGER, options.logger)
      .value(HEALTH, health)
      .singleton(CLOCK, () => new MiseClock())
      .singleton(FRAMES, (context) => new FrameLoop(
        window.requestAnimationFrame.bind(window),
        window.cancelAnimationFrame.bind(window),
        context.resolve(CLOCK),
      ))
      .singleton(RUNTIME_FACTORY, () => new MiseRuntimeFactory())
      .scoped(RUNTIME, (context) => context.resolve(RUNTIME_FACTORY).create({
        plan: context.resolve(PLAN),
        frames: context.resolve(FRAMES),
        logger: context.resolve(LOGGER),
        health: context.resolve(HEALTH),
      }))
      .compile();
    health.mark("application.container");
    const scope = container.createScope();
    const frames = scope.resolve(FRAMES);
    const runtime = scope.resolve(RUNTIME);
    health.mark("application.factory");
    health.mark("runtime.clock");
    return Object.freeze({
      application: new MiseApplication(
        providers,
        runtime.runtime,
        runtime.reducedMotion,
        options.logger,
        health,
        scope,
      ),
      plan,
      health,
      frames,
    });
  }
}

function compilePlan(providers: readonly MiseProvider[]): MisePlan {
  const registry = new MiseRegistry();
  registerCoreDrivers(registry);
  for (const provider of providers) provider.register(registry);
  return registry.compile();
}

function mergeHealthProfile(
  plan: MisePlan,
  additions: readonly MiseCollaboration[] | undefined,
): readonly MiseCollaboration[] {
  return Object.freeze([...plan.healthProfile(), ...(additions ?? [])]);
}

function markRegistrationHealth(health: MiseHealthCheck): void {
  health.mark("application.providers");
  health.mark("application.registry");
}
