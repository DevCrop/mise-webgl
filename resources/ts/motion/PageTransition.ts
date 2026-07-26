import { gsap } from "gsap";
import { FrameLoop } from "../graphics/FrameLoop.js";

export class PageTransition {
  private context: gsap.Context | null = null;
  private timeline: gsap.core.Timeline | null = null;
  private releaseFrame: (() => void) | null = null;
  private resolveLeave: (() => void) | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly frames: FrameLoop,
    private readonly reducedMotion: boolean,
  ) {}

  enter(): void {
    this.disposeAnimation();
    if (this.reducedMotion) return;

    this.releaseFrame = this.frames.acquireContinuous();
    this.context = gsap.context(() => {
      this.timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => this.finishAnimation(),
        onInterrupt: () => this.finishAnimation(),
      }).fromTo(
        this.root.querySelectorAll<HTMLElement>("[data-reveal]"),
        { autoAlpha: 0, y: 44 },
        { autoAlpha: 1, y: 0, duration: 1.05, stagger: 0.08, clearProps: "all" },
      );
    }, this.root);
  }

  leave(): Promise<void> {
    this.disposeAnimation();
    if (this.reducedMotion) return Promise.resolve();

    this.releaseFrame = this.frames.acquireContinuous();
    return new Promise((resolve) => {
      this.resolveLeave = resolve;
      this.context = gsap.context(() => {
        this.timeline = gsap.timeline({
          onComplete: () => this.finishAnimation(),
          onInterrupt: () => this.finishAnimation(),
        }).to(this.root, {
          autoAlpha: 0,
          y: -18,
          duration: 0.42,
          ease: "power2.inOut",
        });
      }, this.root);
    });
  }

  dispose(): void {
    this.disposeAnimation();
  }

  private finishAnimation(): void {
    this.timeline = null;
    this.releaseFrame?.();
    this.releaseFrame = null;
    this.resolveLeave?.();
    this.resolveLeave = null;
  }

  private disposeAnimation(): void {
    const context = this.context;
    this.context = null;
    context?.revert();
    this.timeline?.kill();
    this.timeline = null;
    this.releaseFrame?.();
    this.releaseFrame = null;
    this.resolveLeave?.();
    this.resolveLeave = null;
  }
}
