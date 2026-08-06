import type { FrameControl, MiseMotionPort } from "../../Contracts.js";
import { GsapPageTransition } from "./GsapPageTransition.js";

/** GSAP implementation of Page motion creation. */
export class GsapMotionPort implements MiseMotionPort {
  private readonly preference: MediaQueryList;

  /**
   * Creates a GSAP motion adapter bound to the shared frame scheduler.
   *
   * @param frames - Shared scheduler used for continuous animation leases.
   */
  constructor(private readonly frames: FrameControl) {
    this.preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  }

  /**
   * Creates one root-scoped GSAP transition.
   *
   * @param root - Page root used for selector scoping.
   * @returns A disposable Page transition.
   */
  createPageTransition(root: HTMLElement): GsapPageTransition {
    return new GsapPageTransition(root, this.frames, this.preference);
  }

  /** Releases adapter-level state; its MediaQueryList is borrowed. */
  dispose(): void {
    // MediaQueryList is borrowed and has no listeners in this adapter.
  }
}
