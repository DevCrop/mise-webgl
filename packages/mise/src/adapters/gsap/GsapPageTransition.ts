import { gsap } from "gsap";
import type { FrameControl, MisePageMotion } from "../../Contracts.js";

/** Page-scoped GSAP transition with reduced-motion and frame-lease handling. */
export class GsapPageTransition implements MisePageMotion {
  private context: gsap.Context | null = null;
  private timeline: gsap.core.Timeline | null = null;
  private releaseFrame: (() => void) | null = null;
  private resolveLeave: (() => void) | null = null;
  private disposed = false;
  private readonly handlePreferenceChange = (): void => {
    if (this.preference.matches) this.disposeAnimation();
  };

  /**
   * Creates a Page-local transition controller.
   *
   * @param root - Page root used to scope selectors and GSAP context.
   * @param frames - Shared scheduler used during active animation.
   * @param preference - Live reduced-motion media query.
   */
  constructor(
    private readonly root: HTMLElement,
    private readonly frames: FrameControl,
    private readonly preference: MediaQueryList,
  ) {
    this.preference.addEventListener("change", this.handlePreferenceChange);
  }

  /** Starts the scoped enter animation unless reduced motion is active. */
  enter(): void {
    if (this.disposed) return;
    this.disposeAnimation();
    if (this.preference.matches) return;

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

  /**
   * Plays the Page leave animation while holding a frame lease.
   *
   * @returns A promise resolved after leave animation or immediate fallback.
   */
  leave(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.disposeAnimation();
    if (this.preference.matches) return Promise.resolve();

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

  /** Releases media listeners, GSAP context, timeline, and frame lease. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.preference.removeEventListener("change", this.handlePreferenceChange);
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
