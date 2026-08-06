/** Monotonic timing values supplied by the shared frame scheduler. */
export interface FrameTick {
  /** Seconds represented by the requestAnimationFrame timestamp. */
  readonly time: number;
  /** Simulation seconds since the previous delivered frame, after clamping. */
  readonly delta: number;
  /** Actual seconds since the previous delivered frame, before clamping. */
  readonly rawDelta: number;
  /** Accumulated simulation seconds since the Clock was reset. */
  readonly elapsed: number;
  /** Delivered frame sequence starting at zero. */
  readonly frame: number;
}

/** Receives one scheduler tick. */
export type FrameCallback = (frame: FrameTick) => void;

/** Controls subscriptions and demand for the single application frame loop. */
export interface FrameControl {
  /** Registers a callback and returns an idempotent unsubscribe function. */
  subscribe(callback: FrameCallback): () => void;
  /** Requests one future frame. */
  invalidate(): void;
  /** Keeps frame scheduling active until the returned lease is released. */
  acquireContinuous(): () => void;
  /** Suspends frame scheduling until the returned lease is released. */
  acquireSuspension(): () => void;
}

/** Adaptive rendering quality selected by the runtime. */
export type QualityTier = "low" | "medium" | "high";

/** Whether a Scene needs another frame after the current frame. */
export type FrameDemand = "idle" | "next";

/** Normalized movement direction. */
export type Direction = -1 | 0 | 1;

/** Live operating-system reduced-motion preference. */
export interface ReducedMotionState {
  /** Whether motion reduction is currently requested. */
  readonly active: boolean;
}

/** CSS and drawing-buffer dimensions delivered to a Scene and Renderer. */
export interface ViewportState {
  /** CSS pixel width. */
  readonly width: number;
  /** CSS pixel height. */
  readonly height: number;
  /** Effective device pixel ratio after quality limits. */
  readonly pixelRatio: number;
  /** Physical drawing-buffer width. */
  readonly drawingBufferWidth: number;
  /** Physical drawing-buffer height. */
  readonly drawingBufferHeight: number;
}

/** Normalized scroll state emitted by a scroll adapter. */
export interface ScrollSnapshot {
  /** Document scroll progress clamped to zero through one. */
  readonly progress: number;
  /** Current scroll position in CSS pixels. */
  readonly position: number;
  /** Current scroll velocity in CSS pixels per second. */
  readonly velocity: number;
  /** Normalized movement direction. */
  readonly direction: Direction;
}

/** Complete runtime input delivered to an active Scene for one frame. */
export interface FrameState extends FrameTick {
  /** Active Driver progress clamped to zero through one. */
  readonly progress: number;
  /** Active Driver direction. */
  readonly direction: Direction;
  /** Active Driver velocity. */
  readonly velocity: number;
  /** Current adaptive rendering tier. */
  readonly quality: QualityTier;
  /** Current live reduced-motion value. */
  readonly reducedMotion: boolean;
}
