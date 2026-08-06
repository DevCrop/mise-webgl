import type { Camera, Scene } from "three";
import type { DriveSpec } from "./DriverTypes.js";
import type {
  FrameDemand,
  FrameState,
  ReducedMotionState,
  ViewportState,
} from "./FrameTypes.js";
import type {
  MiseObjectFactoryReference,
  MiseObjectHostPort,
} from "./ObjectTypes.js";
import type { ResourceOwner } from "./ResourceTypes.js";

/** Dependencies and lifecycle controls supplied while creating a Scene. */
export interface SceneCreateContext {
  /** Experience root passed to Scene and Driver factories. */
  readonly root: HTMLElement;
  /** Resource owner for the candidate Scene lifecycle. */
  readonly scope: ResourceOwner;
  /** Signal aborted when a newer transition supersedes this candidate. */
  readonly signal: AbortSignal;
  /** Live reduced-motion preference. */
  readonly reducedMotion: ReducedMotionState;
  /** Whether development diagnostics are enabled. */
  readonly debug: boolean;
  /** Typed factory host for declared product objects. */
  readonly objects: MiseObjectHostPort;
}

/** Runtime Three.js Scene unit managed by the Scene changer. */
export interface SceneInstance {
  /** Three.js Scene rendered while this instance is active. */
  readonly scene: Scene;
  /** Three.js Camera used with the active Scene. */
  readonly camera: Camera;
  /** Attaches the prepared object graph and starts local state. */
  mount(): void;
  /** Updates the Scene for one frame. */
  frame(state: FrameState): FrameDemand;
  /** Applies a viewport and drawing-buffer change. */
  resize(viewport: ViewportState): void;
  /** Detaches local graph state; GPU resources are also owned by the scope. */
  dispose(): void;
}

/** Frozen metadata shared by every hook in one Scene transition. */
export interface SceneTransitionContext {
  /** Signal aborted when a newer Scene transition supersedes this one. */
  readonly signal: AbortSignal;
  /** Outgoing Scene ID, or `null` for initial activation. */
  readonly from: string | null;
  /** Incoming Scene ID, or `null` when clearing. */
  readonly to: string | null;
}

/** Optional transactional hooks around Scene commit. */
export interface SceneHooks {
  /** Runs before the incoming Scene is mounted and committed. */
  beforeEnter?(context: SceneTransitionContext): Promise<void> | void;
  /** Runs after the incoming Scene is committed. */
  afterEnter?(context: SceneTransitionContext): Promise<void> | void;
  /** Runs before the outgoing Scene is replaced. */
  beforeLeave?(context: SceneTransitionContext): Promise<void> | void;
  /** Runs after the outgoing Scene is disposed. */
  afterLeave?(context: SceneTransitionContext): Promise<void> | void;
}

/** Immutable Scene registration with Driver, Object, and lifecycle policy. */
export interface SceneDefinition extends SceneHooks {
  /** Experience-local unique Scene ID. */
  readonly id: string;
  /** Progress and selection policy for this Scene. */
  readonly drive: DriveSpec;
  /** Product Object factories this Scene is allowed to create. */
  readonly objects?: readonly MiseObjectFactoryReference[];
  /** Creates a prepared Scene instance. */
  readonly create: (
    context: SceneCreateContext,
  ) => Promise<SceneInstance> | SceneInstance;
}
