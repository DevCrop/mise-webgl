import { FrameLoop } from "../graphics/FrameLoop.js";
import { PageTransition } from "./PageTransition.js";

export class MotionRuntime {
  private readonly preference: MediaQueryList;

  constructor(private readonly frames: FrameLoop) {
    this.preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  }

  createPageTransition(root: HTMLElement): PageTransition {
    return new PageTransition(root, this.frames, this.preference.matches);
  }
}
