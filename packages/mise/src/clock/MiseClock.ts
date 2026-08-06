import { MiseError } from "../MiseError.js";
import type { FrameTick } from "../types/FrameTypes.js";

/** Clock configuration for deterministic frame-time normalization. */
export interface MiseClockOptions {
  /** Maximum simulation delta in seconds. */
  readonly maxDelta?: number;
}

/** Deterministic Clock driven exclusively by scheduler timestamps. */
export class MiseClock {
  private readonly maxDelta: number;
  private previousTimestamp: number | null = null;
  private elapsed = 0;
  private frame = 0;

  /** Creates a Clock with a validated simulation delta ceiling. */
  constructor(options: MiseClockOptions = {}) {
    const maxDelta = options.maxDelta ?? 0.1;
    if (!Number.isFinite(maxDelta) || maxDelta <= 0) {
      throw new MiseError(
        "MISE_CLOCK_INVALID",
        "MISE Clock maxDelta must be finite and positive.",
      );
    }
    this.maxDelta = maxDelta;
  }

  /** Converts one requestAnimationFrame timestamp into an immutable tick. */
  sample(timestampMilliseconds: number): FrameTick {
    if (!Number.isFinite(timestampMilliseconds) || timestampMilliseconds < 0) {
      throw new MiseError(
        "MISE_CLOCK_INVALID",
        "MISE Clock timestamp must be finite and non-negative.",
      );
    }
    const time = timestampMilliseconds / 1000;
    const rawDelta = this.previousTimestamp === null
      ? 0
      : Math.max(0, timestampMilliseconds - this.previousTimestamp) / 1000;
    const delta = Math.min(this.maxDelta, rawDelta);
    this.previousTimestamp = timestampMilliseconds;
    this.elapsed += delta;
    const tick = Object.freeze({
      time,
      delta,
      rawDelta,
      elapsed: this.elapsed,
      frame: this.frame,
    });
    this.frame += 1;
    return tick;
  }

  /** Rebases the next sample without resetting elapsed time or frame count. */
  pause(): void {
    this.previousTimestamp = null;
  }

  /** Resets timestamp, elapsed simulation time, and frame sequence. */
  reset(): void {
    this.previousTimestamp = null;
    this.elapsed = 0;
    this.frame = 0;
  }
}
