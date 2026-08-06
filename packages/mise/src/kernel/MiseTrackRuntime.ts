import type { MiseLogger } from "../logging/MiseLogger.js";
import type {
  DriveController,
  DriveSample,
  FrameDemand,
  FrameState,
  FrameTick,
  QualityTier,
  ReducedMotionState,
  ScrollSnapshot,
  TrackDefinition,
  ViewportState,
} from "../Contracts.js";
import type { MiseHealthCheck } from "./MiseHealthCheck.js";
import type { MisePlan } from "./MisePlan.js";
import type { SceneChanger } from "./SceneChanger.js";
import { selectScene } from "./SceneSelection.js";

interface TrackSlot {
  readonly driver: DriveController;
}

/** Result produced by one active Track during the Stage update phase. */
export interface TrackFrameResult {
  readonly demand: FrameDemand;
  readonly renderState: ReturnType<SceneChanger["renderState"]>;
  readonly state: FrameState | null;
}

const INACTIVE_SAMPLE: DriveSample = {
  progress: 0,
  direction: 0,
  velocity: 0,
  active: false,
  demand: "idle",
};

/**
 * Owns one independently active Scene sequence and its Driver session.
 *
 * The Stage owns scheduling and rendering. This runtime owns only Track-local
 * selection, transitions, resize, and cleanup.
 */
export class MiseTrackRuntime {
  private readonly slots: readonly TrackSlot[];
  private readonly samples: DriveSample[];
  private activeIndex = 0;
  private switchingIndex: number | null = null;
  private blockedIndex: number | null = null;
  private disposed = false;

  /**
   * @param definition - Immutable Track compiled by the Plan.
   * @param root - View or Experience root supplied to Drivers and Scenes.
   * @param plan - Driver factory lookup.
   * @param changer - Track-local transactional Scene changer.
   * @param logger - Track-scoped lifecycle logger.
   * @param health - Shared capability evidence collector.
   * @param invalidate - Requests one application frame.
   * @param initialScroll - Latest Scroll snapshot applied to new Drivers.
   * @param reducedMotion - Shared live reduced-motion state.
   */
  constructor(
    readonly definition: TrackDefinition,
    readonly root: HTMLElement,
    readonly changer: SceneChanger,
    plan: MisePlan,
    private readonly logger: MiseLogger,
    health: MiseHealthCheck,
    private readonly invalidate: () => void,
    initialScroll: ScrollSnapshot,
    reducedMotion: ReducedMotionState,
  ) {
    const slots: TrackSlot[] = [];
    try {
      for (const scene of definition.scenes) {
        const factory = plan.driver(scene.drive.kind);
        const view = root.ownerDocument.defaultView ?? window;
        const driver = factory(scene.drive, {
          root,
          view,
          reducedMotion,
        });
        health.mark("runtime.driver");
        driver.setScroll(initialScroll);
        slots.push({ driver });
      }
    } catch (error) {
      disposeSlots(slots, logger);
      throw error;
    }
    this.slots = slots;
    this.samples = slots.map(() => INACTIVE_SAMPLE);
  }

  /** Active Scene ID, or `null` before initial Track commit. */
  get activeSceneId(): string | null {
    return this.changer.activeId;
  }

  /** Active Scene lifecycle state. */
  get lifecycle(): SceneChanger["state"] {
    return this.changer.state;
  }

  /** Driver kind controlling the active Scene. */
  get activeDriverKind(): TrackDefinition["scenes"][number]["drive"]["kind"] {
    return this.definition.scenes[this.activeIndex]!.drive.kind;
  }

  /** Activates the first declared Scene transactionally. */
  mount(): Promise<boolean> {
    return this.changer.switchTo(this.definition.scenes[0]!, this.root);
  }

  /**
   * Applies one Stage update to this Track.
   *
   * @param tick - Shared application frame time.
   * @param quality - Current adaptive quality tier.
   * @param reducedMotion - Live reduced-motion value.
   * @param active - Whether this Track may update and render.
   * @returns Frame demand, render state, and normalized Scene state.
   */
  frame(
    tick: FrameTick,
    quality: QualityTier,
    reducedMotion: boolean,
    active: boolean,
  ): TrackFrameResult {
    if (this.disposed || !active) return idleResult();
    this.sample(tick);
    this.scheduleSelection();
    const sample = this.samples[this.activeIndex]!;
    const state = {
      ...tick,
      progress: sample.progress,
      direction: sample.direction,
      velocity: sample.velocity,
      quality,
      reducedMotion,
    } satisfies FrameState;
    const sceneDemand = this.changer.frame(state);
    return {
      demand: sceneDemand === "next" || sample.demand === "next"
        ? "next"
        : "idle",
      renderState: this.changer.renderState(),
      state,
    };
  }

  /**
   * Receives the current application Scroll snapshot.
   *
   * @param snapshot - Shared normalized scroll state.
   */
  setScroll(snapshot: ScrollSnapshot): void {
    for (const slot of this.slots) slot.driver.setScroll(snapshot);
  }

  /** Re-measures Driver inputs and unblocks failed automatic selection. */
  refresh(): void {
    this.blockedIndex = null;
    for (const slot of this.slots) slot.driver.refresh();
  }

  /**
   * Applies the current logical View dimensions.
   *
   * @param viewport - View-local CSS and drawing-buffer dimensions.
   */
  resize(viewport: ViewportState): void {
    this.changer.resize(viewport);
  }

  /**
   * Recreates the active Scene after its Surface context is restored.
   *
   * @returns Whether an active Scene was recreated.
   */
  recreate(): Promise<boolean> {
    return this.changer.recreate();
  }

  /**
   * Releases Driver state and optionally the owned Scene changer.
   *
   * @param clearChanger - False only when a replacement Track reused the
   * primary changer and already committed its Scene.
   */
  dispose(clearChanger = true): void {
    if (this.disposed) return;
    this.disposed = true;
    disposeSlots(this.slots, this.logger);
    if (clearChanger) this.changer.dispose();
  }

  private sample(tick: FrameTick): void {
    for (let index = 0; index < this.slots.length; index += 1) {
      const spec = this.definition.scenes[index]!.drive;
      this.samples[index] = spec.kind === "auto" && index !== this.activeIndex
        ? INACTIVE_SAMPLE
        : this.slots[index]!.driver.sample(tick);
    }
  }

  private scheduleSelection(): void {
    const next = selectScene(
      this.definition,
      this.samples,
      this.activeIndex,
    );
    if (next === this.activeIndex) this.blockedIndex = null;
    if (next === this.activeIndex) return;
    if (this.switchingIndex !== null || this.blockedIndex === next) return;
    this.switchingIndex = next;
    void this.changer.switchTo(
      this.definition.scenes[next]!,
      this.root,
    ).then((committed) => this.commitSelection(next, committed))
      .catch(() => this.blockSelection(next))
      .finally(() => {
        this.switchingIndex = null;
        this.invalidate();
      });
  }

  private commitSelection(index: number, committed: boolean): void {
    if (!committed || this.disposed) {
      this.blockSelection(index);
      return;
    }
    this.activeIndex = index;
    this.blockedIndex = null;
  }

  private blockSelection(index: number): void {
    if (!this.disposed) this.blockedIndex = index;
  }
}

function idleResult(): TrackFrameResult {
  return {
    demand: "idle",
    renderState: null,
    state: null,
  };
}

function disposeSlots(
  slots: readonly TrackSlot[],
  logger: MiseLogger,
): void {
  let failures = 0;
  for (const slot of [...slots].reverse()) {
    try {
      slot.driver.dispose();
    } catch {
      failures += 1;
    }
  }
  if (failures > 0) logger.warning("driver.dispose_failed", { failures });
}
