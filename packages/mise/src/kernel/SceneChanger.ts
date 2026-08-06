import type { MiseLogger } from "../logging/MiseLogger.js";
import type {
  FrameDemand,
  FrameState,
  ReducedMotionState,
  SceneDefinition,
  SceneHooks,
  SceneInstance,
  SceneTransitionContext,
  ViewportState,
} from "../Contracts.js";
import type { MiseHealthCheck } from "./MiseHealthCheck.js";
import { MiseCuePipeline } from "./MiseCuePipeline.js";
import { ResourceScope } from "./ResourceScope.js";
import { MiseObjectHost } from "../objects/MiseObjectHost.js";

export type SceneLifecycle =
  | "registered"
  | "preparing"
  | "ready"
  | "entering"
  | "active"
  | "leaving"
  | "disposed";

interface ActiveScene {
  readonly definition: SceneDefinition;
  readonly instance: SceneInstance;
  readonly root: HTMLElement;
  readonly scope: ResourceScope;
}

export class SceneChanger {
  private active: ActiveScene | null = null;
  private viewport: ViewportState | null = null;
  private transition: AbortController | null = null;
  private epoch = 0;
  private currentState: SceneLifecycle = "registered";

  constructor(
    private readonly logger: MiseLogger,
    private readonly reducedMotion: ReducedMotionState,
    private readonly debug: boolean,
    private readonly health: MiseHealthCheck,
  ) {}

  get state(): SceneLifecycle {
    return this.currentState;
  }

  get activeId(): string | null {
    return this.active?.definition.id ?? null;
  }

  async switchTo(
    definition: SceneDefinition,
    root: HTMLElement,
    force = false,
  ): Promise<boolean> {
    if (!force
      && this.active?.definition.id === definition.id
      && this.active.root === root) return true;

    this.transition?.abort();
    const transition = new AbortController();
    this.transition = transition;
    const epoch = ++this.epoch;
    const scope = new ResourceScope();
    const context = Object.freeze({
      signal: transition.signal,
      from: this.active?.definition.id ?? null,
      to: definition.id,
    }) satisfies SceneTransitionContext;
    const incomingCues = createIncomingCues(definition, context, (hook, value, scene) =>
      this.runAfterHook(hook, value, scene));
    this.currentState = "preparing";
    this.logger.debug("scene.prepare_started", { scene: definition.id });

    try {
      this.health.mark("scene.resource-scope");
      const objects = new MiseObjectHost(
        scope,
        (definition.objects ?? []).map((factory) => factory.id),
        transition.signal,
        this.reducedMotion,
        this.debug,
        this.health,
      );
      const instance = await definition.create({
        root,
        scope,
        signal: transition.signal,
        reducedMotion: this.reducedMotion,
        debug: this.debug,
        objects,
      });
      scope.use(() => instance.dispose());
      if (transition.signal.aborted || epoch !== this.epoch) {
        scope.dispose();
        this.logger.debug("scene.prepare_cancelled", { scene: definition.id });
        return false;
      }
      await incomingCues.before(context);
      if (transition.signal.aborted || epoch !== this.epoch) {
        scope.dispose();
        this.logger.debug("scene.prepare_cancelled", { scene: definition.id });
        return false;
      }

      this.currentState = "ready";
      instance.mount();
      this.health.mark("scene-changer.scene");
      if (this.viewport) instance.resize(this.viewport);
      this.currentState = "entering";

      const previous = this.active;
      const outgoingCues = previous
        ? createOutgoingCues(previous.definition, context, (hook, value, scene) =>
          this.runAfterHook(hook, value, scene))
        : null;
      if (previous) {
        this.currentState = "leaving";
        await outgoingCues?.before(context);
      }
      if (transition.signal.aborted || epoch !== this.epoch) {
        scope.dispose();
        return false;
      }

      this.active = { definition, instance, root, scope };
      this.currentState = "active";
      this.logger.success("scene.activated", { scene: definition.id });
      if (previous) {
        this.disposeScope(previous.scope, previous.definition.id);
        await outgoingCues?.after(context);
      }
      await incomingCues.after(context);
      return this.active?.instance === instance;
    } catch (error) {
      try {
        scope.dispose();
      } catch {
        // The original scene preparation error remains the public failure.
      }
      if (transition.signal.aborted || epoch !== this.epoch) return false;
      this.currentState = this.active ? "active" : "disposed";
      this.logger.error("scene.activate_failed", {
        scene: definition.id,
        type: error instanceof Error ? error.name : typeof error,
      });
      throw error;
    } finally {
      if (this.transition === transition) this.transition = null;
    }
  }

  recreate(): Promise<boolean> {
    const active = this.active;
    return active
      ? this.switchTo(active.definition, active.root, true)
      : Promise.resolve(false);
  }

  frame(state: FrameState): FrameDemand {
    return this.active?.instance.frame(state) ?? "idle";
  }

  resize(viewport: ViewportState): void {
    this.viewport = viewport;
    this.active?.instance.resize(viewport);
  }

  renderState(): Pick<SceneInstance, "scene" | "camera"> | null {
    return this.active?.instance ?? null;
  }

  clear(): void {
    this.transition?.abort();
    this.transition = null;
    this.epoch += 1;
    const scene = this.active?.definition.id;
    try {
      if (this.active) {
        this.disposeScope(this.active.scope, this.active.definition.id);
      }
    } finally {
      this.active = null;
      this.currentState = "disposed";
    }
    if (scene) this.logger.debug("scene.disposed", { scene });
  }

  dispose(): void {
    this.clear();
    this.viewport = null;
  }

  private disposeScope(scope: ResourceScope, scene: string): void {
    try {
      scope.dispose();
    } catch (error) {
      this.logger.warning("scene.dispose_failed", {
        scene,
        type: error instanceof Error ? error.name : typeof error,
      });
    }
  }

  private async runAfterHook(
    hook: SceneHook | undefined,
    context: SceneTransitionContext,
    scene: string,
  ): Promise<void> {
    try {
      await hook?.(context);
    } catch (error) {
      if (context.signal.aborted) return;
      this.logger.warning("scene.hook_failed", {
        scene,
        type: error instanceof Error ? error.name : typeof error,
      });
    }
  }
}

type SceneHook = NonNullable<SceneHooks[keyof SceneHooks]>;

function createIncomingCues(
  definition: SceneDefinition,
  context: SceneTransitionContext,
  runAfter: (
    hook: SceneHook | undefined,
    context: SceneTransitionContext,
    scene: string,
  ) => Promise<void>,
): MiseCuePipeline<SceneTransitionContext> {
  return new MiseCuePipeline({
    before: definition.beforeEnter
      ? [() => definition.beforeEnter?.(context)]
      : [],
    after: definition.afterEnter
      ? [() => runAfter(definition.afterEnter, context, definition.id)]
      : [],
  });
}

function createOutgoingCues(
  definition: SceneDefinition,
  context: SceneTransitionContext,
  runAfter: (
    hook: SceneHook | undefined,
    context: SceneTransitionContext,
    scene: string,
  ) => Promise<void>,
): MiseCuePipeline<SceneTransitionContext> {
  return new MiseCuePipeline({
    before: definition.beforeLeave
      ? [() => definition.beforeLeave?.(context)]
      : [],
    after: definition.afterLeave
      ? [() => runAfter(definition.afterLeave, context, definition.id)]
      : [],
  });
}
