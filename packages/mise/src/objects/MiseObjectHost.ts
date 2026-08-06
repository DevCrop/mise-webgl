import { MiseError } from "../MiseError.js";
import type {
  MiseObject,
  MiseObjectFactory,
  MiseObjectFactoryContext,
  MiseObjectHostPort,
} from "../types/ObjectTypes.js";
import type { ReducedMotionState } from "../types/FrameTypes.js";
import type { ResourceOwner } from "../types/ResourceTypes.js";
import type { MiseHealthCheck } from "../kernel/MiseHealthCheck.js";

/** Scene-scoped, declaration-checked host for typed product Object factories. */
export class MiseObjectHost implements MiseObjectHostPort {
  private readonly allowed: ReadonlySet<string>;

  /** Creates a host for one candidate Scene lifecycle. */
  constructor(
    private readonly scope: ResourceOwner,
    factoryIds: readonly string[],
    private readonly signal: AbortSignal,
    private readonly reducedMotion: ReducedMotionState,
    private readonly debug: boolean,
    private readonly health: MiseHealthCheck,
  ) {
    this.allowed = new Set(factoryIds);
  }

  /** Creates, validates, and owns one declared product Object. */
  async create<TProps, TObject extends MiseObject>(
    factory: MiseObjectFactory<TProps, TObject>,
    props: TProps,
  ): Promise<TObject> {
    this.assertAllowed(factory.id);
    this.assertActive();
    const child = this.scope.child();
    const context = Object.freeze({
      scope: child,
      signal: this.signal,
      reducedMotion: this.reducedMotion,
      debug: this.debug,
    }) satisfies MiseObjectFactoryContext;
    let object: TObject | null = null;
    try {
      object = await factory.create(context, props);
      assertMiseObject(object, factory.id);
      this.assertActive();
    } catch (error) {
      try {
        object?.dispose();
      } finally {
        child.dispose();
      }
      throw error;
    }
    const ownedObject = object;
    this.scope.use(() => ownedObject.dispose());
    this.health.mark("scene.object-factory");
    return ownedObject;
  }

  private assertAllowed(id: string): void {
    if (this.allowed.has(id)) return;
    throw new MiseError(
      "MISE_OBJECT_FACTORY_UNDECLARED",
      `Undeclared MISE Object factory: ${id}`,
    );
  }

  private assertActive(): void {
    if (!this.signal.aborted && this.scope.active) return;
    throw new MiseError(
      "MISE_OBJECT_FACTORY_ABORTED",
      "MISE Object factory creation was aborted.",
    );
  }
}

function assertMiseObject(
  value: unknown,
  id: string,
): asserts value is MiseObject {
  if (
    typeof value === "object"
    && value !== null
    && "dispose" in value
    && typeof value.dispose === "function"
  ) return;
  throw new MiseError(
    "MISE_DEFINITION_INVALID",
    `MISE Object factory returned an invalid object: ${id}`,
  );
}
