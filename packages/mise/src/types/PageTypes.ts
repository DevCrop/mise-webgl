import type { MiseLogger } from "../logging/MiseLogger.js";
import type { FrameControl, ScrollSnapshot } from "./FrameTypes.js";

/** Narrow Page-facing API for activating and refreshing Experiences. */
export interface MiseScenePort {
  /** Activates an Experience for a root element. */
  activate(id: string, root: HTMLElement): Promise<void>;
  /** Clears the active Scene and Drivers. */
  clear(): void;
  /** Re-measures active Drivers and viewport state. */
  refresh(): void;
}

/** Page-local enter and leave animation contract. */
export interface MisePageMotion {
  /** Starts the Page enter animation. */
  enter(): void;
  /** Starts Page leave work and resolves when replacement is safe. */
  leave(): Promise<void>;
  /** Releases animation state and frame leases. */
  dispose(): void;
}

/** Factory-facing motion capability used by Pages. */
export interface MiseMotionPort {
  /** Creates a transition scoped to one Page root. */
  createPageTransition(root: HTMLElement): MisePageMotion;
  /** Releases adapter-level state. */
  dispose(): void;
}

/** Capabilities supplied when a registered Page instance is created. */
export interface MisePageContext {
  /** Experience activation capability. */
  readonly scenes: MiseScenePort;
  /** Page-local motion factory capability. */
  readonly motion: MiseMotionPort;
}

/** Runtime DOM Page lifecycle unit. */
export interface MisePageInstance {
  /** Mounts Page-local DOM behavior. */
  mount(root: HTMLElement): Promise<void> | void;
  /** Runs asynchronous Page leave work before disposal. */
  leave(): Promise<void>;
  /** Releases Page-local DOM and animation resources. */
  dispose(): void;
}

/** Immutable Page registration. */
export interface MisePageDefinition {
  /** Unique Page ID matching `main[data-page]`. */
  readonly id: string;
  /** Creates one Page instance. */
  readonly create: (context: MisePageContext) => MisePageInstance;
}

/** Callbacks invoked by a Navigation adapter around document replacement. */
export interface MiseNavigationLifecycle {
  /** Runs lifecycle work before the current document is replaced. */
  beforeChange(): Promise<void>;
  /** Runs lifecycle work after the incoming document is installed. */
  afterChange(): Promise<void>;
}

/** Browser navigation adapter lifecycle. */
export interface MiseNavigationPort {
  /** Starts intercepting supported navigation. */
  mount(): void;
  /** Stops interception and releases vendor state. */
  dispose(): void;
}

/** Creates a browser Navigation adapter. */
export type MiseNavigationFactory = (
  documentRoot: Document,
  lifecycle: MiseNavigationLifecycle,
  logger: MiseLogger,
) => MiseNavigationPort;

/** Scroll transport lifecycle used by the browser application. */
export interface MiseScrollPort {
  /** Attaches scroll transport and emits the initial snapshot. */
  mount(): void;
  /** Re-measures scroll bounds and emits a fresh snapshot. */
  refresh(): void;
  /** Releases listeners, vendor state, and frame leases. */
  dispose(): void;
}

/** Creates a scroll transport. */
export type MiseScrollFactory = (
  frames: FrameControl,
  onScroll: (snapshot: ScrollSnapshot) => void,
  logger: MiseLogger,
) => MiseScrollPort;

/** Creates a Page motion adapter. */
export type MiseMotionFactory = (frames: FrameControl) => MiseMotionPort;
