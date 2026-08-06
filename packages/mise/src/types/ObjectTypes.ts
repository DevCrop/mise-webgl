import type { ReducedMotionState } from "./FrameTypes.js";
import type { Disposable, ResourceOwner } from "./ResourceTypes.js";

/** Minimal lifecycle contract for a Scene-owned product object. */
export interface MiseObject extends Disposable {}

/** Stable metadata used to declare a Scene's allowed Object factories. */
export interface MiseObjectFactoryReference {
  /** Product-scoped unique factory ID. */
  readonly id: string;
}

/** Explicit lifecycle inputs supplied while creating one product object. */
export interface MiseObjectFactoryContext {
  /** Child resource owner dedicated to the candidate object. */
  readonly scope: ResourceOwner;
  /** Signal aborted when Scene preparation is superseded. */
  readonly signal: AbortSignal;
  /** Live reduced-motion preference. */
  readonly reducedMotion: ReducedMotionState;
  /** Whether development diagnostics are enabled. */
  readonly debug: boolean;
}

/** Typed creation strategy for one family of Scene-owned product objects. */
export interface MiseObjectFactory<TProps, TObject extends MiseObject>
  extends MiseObjectFactoryReference {
  /**
   * Creates one product object.
   *
   * @param context - Object-local lifecycle and runtime preferences.
   * @param props - Immutable product configuration.
   * @returns A candidate object or promise resolving to one.
   */
  create(
    context: MiseObjectFactoryContext,
    props: TProps,
  ): Promise<TObject> | TObject;
}

/** Scene-facing factory host without Container or registry access. */
export interface MiseObjectHostPort {
  /**
   * Creates and owns one declared product object.
   *
   * @param factory - Typed factory declared by the current Scene.
   * @param props - Immutable props accepted by the factory.
   * @returns The owned object after abort-safe preparation.
   */
  create<TProps, TObject extends MiseObject>(
    factory: MiseObjectFactory<TProps, TObject>,
    props: TProps,
  ): Promise<TObject>;
}
