import type {
  Direction,
  FrameDemand,
  FrameTick,
  ReducedMotionState,
  ScrollSnapshot,
} from "./FrameTypes.js";

/** Supported element-to-viewport edge pair used by the scroll Driver. */
export type ScrollEdge =
  | "top top"
  | "top bottom"
  | "bottom top"
  | "bottom bottom";

/** Immutable configuration for a DOM scroll-driven Scene. */
export interface ScrollDriveSpec {
  /** Built-in Driver discriminator. */
  readonly kind: "scroll";
  /** Selector resolved within the Experience root. */
  readonly trigger: string;
  /** Trigger and viewport edges used as progress zero. */
  readonly start: ScrollEdge;
  /** Trigger and viewport edges used as progress one. */
  readonly end: ScrollEdge;
}

/** Required reduced-motion behavior for an automatic Driver. */
export type AutoReducedMotionPolicy =
  | { readonly mode: "pause" }
  | { readonly mode: "complete" }
  | { readonly mode: "shorten"; readonly duration: number };

/** Immutable configuration for a time-driven Scene. */
export interface AutoDriveSpec {
  /** Built-in Driver discriminator. */
  readonly kind: "auto";
  /** Normal completion duration in seconds. */
  readonly duration: number;
  /** Whether progress repeats after reaching one. */
  readonly loop: boolean;
  /** Required behavior while reduced motion is active. */
  readonly reducedMotion: AutoReducedMotionPolicy;
}

/** Serializable immutable data accepted by custom Driver specifications. */
export type MiseConfigValue =
  | string
  | number
  | boolean
  | null
  | readonly MiseConfigValue[]
  | { readonly [key: string]: MiseConfigValue };

/** Extensible specification for a registered custom Driver. */
export interface CustomDriveSpec {
  /** Named custom Driver discriminator. */
  readonly kind: `custom:${string}`;
  /** Serializable custom Driver configuration. */
  readonly [option: string]: MiseConfigValue;
}

/** Union of all built-in and custom Driver specifications. */
export type DriveSpec = ScrollDriveSpec | AutoDriveSpec | CustomDriveSpec;

/** Normalized Driver output sampled for one frame. */
export interface DriveSample {
  /** Current normalized Scene progress. */
  readonly progress: number;
  /** Current normalized direction. */
  readonly direction: Direction;
  /** Current input velocity. */
  readonly velocity: number;
  /** Whether this Driver selects its Scene. */
  readonly active: boolean;
  /** Whether this Driver requires another frame. */
  readonly demand: FrameDemand;
}

/** Browser and lifecycle dependencies supplied to a Driver factory. */
export interface DriveContext {
  /** Experience root used for scoped DOM lookup. */
  readonly root: HTMLElement;
  /** Window supplying viewport and browser events. */
  readonly view: Window;
  /** Live reduced-motion preference. */
  readonly reducedMotion: ReducedMotionState;
}

/** Runtime controller created for one Scene Driver specification. */
export interface DriveController {
  /** Driver kind handled by this controller. */
  readonly kind: DriveSpec["kind"];
  /** Receives the latest normalized scroll state. */
  setScroll(snapshot: ScrollSnapshot): void;
  /** Re-measures external state such as trigger bounds. */
  refresh(): void;
  /** Samples normalized progress for the current frame. */
  sample(frame: FrameTick): DriveSample;
  /** Releases Driver-owned listeners and frame leases. */
  dispose(): void;
}

/** Creates a Driver controller for one immutable specification. */
export type DriverFactory = (
  spec: DriveSpec,
  context: DriveContext,
) => DriveController;
