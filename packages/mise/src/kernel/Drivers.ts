import type {
  AutoDriveSpec,
  Direction,
  DriveContext,
  DriveController,
  DriveSample,
  DriverFactory,
  FrameDemand,
  FrameTick,
  ScrollDriveSpec,
  ScrollEdge,
  ScrollSnapshot,
} from "../Contracts.js";
import { MiseError } from "../MiseError.js";

const INITIAL_SCROLL: ScrollSnapshot = {
  progress: 0,
  position: 0,
  velocity: 0,
  direction: 0,
};

export const createScrollDriver: DriverFactory = (spec, context) => {
  if (spec.kind !== "scroll") {
    throw new MiseError(
      "MISE_DRIVER_SPEC_MISMATCH",
      "Scroll driver requires a scroll specification.",
    );
  }
  return new ScrollDriver(spec, context);
};

export const createAutoDriver: DriverFactory = (spec, context) => {
  if (spec.kind !== "auto") {
    throw new MiseError(
      "MISE_DRIVER_SPEC_MISMATCH",
      "Auto driver requires an auto specification.",
    );
  }
  return new AutoDriver(spec, context);
};

export function registerCoreDrivers(registry: {
  readonly drivers: {
    add(kind: "scroll" | "auto", factory: DriverFactory): void;
  };
}): void {
  registry.drivers.add("scroll", createScrollDriver);
  registry.drivers.add("auto", createAutoDriver);
}

class ScrollDriver implements DriveController {
  readonly kind = "scroll" as const;
  private scroll = INITIAL_SCROLL;
  private start = 0;
  private end = 1;
  private readonly output = {
    progress: 0,
    direction: 0 as Direction,
    velocity: 0,
    active: false,
    demand: "idle" as FrameDemand,
  };

  constructor(
    private readonly spec: ScrollDriveSpec,
    private readonly context: DriveContext,
  ) {
    this.refresh();
  }

  setScroll(snapshot: ScrollSnapshot): void {
    this.scroll = snapshot;
  }

  refresh(): void {
    const trigger = resolveTrigger(this.context.root, this.spec.trigger);
    const bounds = trigger.getBoundingClientRect();
    const top = bounds.top + this.context.view.scrollY;
    const bottom = top + bounds.height;
    this.start = resolveEdge(this.spec.start, top, bottom, this.context.view.innerHeight);
    this.end = resolveEdge(this.spec.end, top, bottom, this.context.view.innerHeight);
  }

  sample(_frame: FrameTick): DriveSample {
    const range = this.end - this.start;
    const lower = Math.min(this.start, this.end);
    const upper = Math.max(this.start, this.end);
    this.output.progress = clamp01(
      (this.scroll.position - this.start) / safeRange(range),
    );
    this.output.direction = this.scroll.direction;
    this.output.velocity = this.scroll.velocity;
    this.output.active = this.scroll.position >= lower
      && this.scroll.position <= upper;
    return this.output;
  }

  dispose(): void {}
}

class AutoDriver implements DriveController {
  readonly kind = "auto" as const;
  private activeTimeline: "normal" | "shorten" | null = null;
  private normalElapsed = 0;
  private shortenedElapsed = 0;
  private readonly output = {
    progress: 0,
    direction: 0 as Direction,
    velocity: 0,
    active: true,
    demand: "idle" as FrameDemand,
  };

  constructor(
    private readonly spec: AutoDriveSpec,
    private readonly context: DriveContext,
  ) {}

  setScroll(_snapshot: ScrollSnapshot): void {}

  refresh(): void {}

  sample(frame: FrameTick): DriveSample {
    if (!this.context.reducedMotion.active) {
      return this.sampleTimeline(
        frame,
        this.spec.duration,
        this.spec.loop,
        "normal",
      );
    }
    const policy = this.spec.reducedMotion;
    if (policy.mode === "pause") return this.sampleStatic(0);
    if (policy.mode === "complete") return this.sampleStatic(1);
    return this.sampleTimeline(frame, policy.duration, false, "shorten");
  }

  private sampleTimeline(
    frame: FrameTick,
    duration: number,
    loop: boolean,
    timeline: "normal" | "shorten",
  ): DriveSample {
    const entering = this.activeTimeline !== timeline;
    if (entering) this.enterTimeline(timeline);
    if (!entering) this.advanceTimeline(timeline, frame.delta);
    const elapsed = timeline === "normal"
      ? this.normalElapsed
      : this.shortenedElapsed;
    const rawProgress = elapsed / duration;
    const completed = !loop && rawProgress >= 1 - 1e-9;
    const progress = completed
      ? 1
      : loop
        ? rawProgress % 1
        : clamp01(rawProgress);
    const demand = completed ? "idle" : "next";
    return this.updateOutput(progress, 1, demand);
  }

  dispose(): void {
    this.activeTimeline = null;
    this.normalElapsed = 0;
    this.shortenedElapsed = 0;
  }

  private sampleStatic(progress: number): DriveSample {
    this.activeTimeline = null;
    return this.updateOutput(progress, 0, "idle");
  }

  private enterTimeline(timeline: "normal" | "shorten"): void {
    this.activeTimeline = timeline;
    if (timeline === "normal") return;
    this.shortenedElapsed = 0;
  }

  private advanceTimeline(
    timeline: "normal" | "shorten",
    delta: number,
  ): void {
    const elapsed = Math.max(0, delta);
    if (timeline === "shorten") {
      this.shortenedElapsed += elapsed;
      return;
    }
    this.normalElapsed += elapsed;
  }

  private updateOutput(
    progress: number,
    direction: Direction,
    demand: FrameDemand,
  ): DriveSample {
    this.output.progress = progress;
    this.output.direction = direction;
    this.output.demand = demand;
    return this.output;
  }
}

function resolveTrigger(root: HTMLElement, selector: string): HTMLElement {
  if (root.matches(selector)) return root;
  return root.querySelector<HTMLElement>(selector) ?? root;
}

function resolveEdge(
  edge: ScrollEdge,
  top: number,
  bottom: number,
  viewportHeight: number,
): number {
  switch (edge) {
    case "top top": return top;
    case "top bottom": return top - viewportHeight;
    case "bottom top": return bottom;
    case "bottom bottom": return bottom - viewportHeight;
  }
}

function safeRange(range: number): number {
  return Math.abs(range) < Number.EPSILON ? 1 : range;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
