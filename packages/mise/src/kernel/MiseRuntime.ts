import type {
  DebugPort,
  FrameControl,
  FrameDemand,
  FrameTick,
  MiseRendererPort,
  ReducedMotionState,
  ScrollSnapshot,
} from "../Contracts.js";
import type { MiseLogger } from "../logging/MiseLogger.js";
import { MiseError } from "../MiseError.js";
import {
  createStageDebugSnapshot,
  disposePhysicalSurface,
  measureStageViews,
  renderStageCommands,
  setSurfaceFallback,
  shouldMountTrack,
  trackWantsMount,
  uniquePhysicals,
} from "../objects/MiseStageLayout.js";
import { MiseStageBuilder } from "../objects/MiseStageBuilder.js";
import type {
  MiseRuntimeFactories,
  PhysicalSurface,
  RenderCommand,
  StageSession,
  StageTrackSession,
} from "../objects/MiseStageTypes.js";
import type { MiseHealthCheck } from "./MiseHealthCheck.js";
import type { MisePlan } from "./MisePlan.js";
import type { TrackFrameResult } from "./MiseTrackRuntime.js";
import type { QualityManager } from "./QualityManager.js";
import type { SceneChanger } from "./SceneChanger.js";
import type { ViewportManager } from "./ViewportManager.js";
import { runCleanups } from "./Cleanup.js";

export type { MiseRuntimeFactories } from "../objects/MiseStageTypes.js";

const INITIAL_SCROLL: ScrollSnapshot = Object.freeze({
  progress: 0,
  position: 0,
  velocity: 0,
  direction: 0,
});

/** Orchestrates active Stage lifecycle, frame demand, and context recovery. */
export class MiseRuntime {
  private readonly stageBuilder: MiseStageBuilder;
  private stage: StageSession | null = null;
  private defaultSurface: PhysicalSurface | null = null;
  private scroll = INITIAL_SCROLL;
  private unsubscribeFrame: (() => void) | null = null;
  private releaseDemand: (() => void) | null = null;
  private activationEpoch = 0;
  private mounted = false;
  private layoutDirty = true;

  constructor(
    private readonly plan: MisePlan,
    private readonly renderer: MiseRendererPort,
    private readonly changer: SceneChanger,
    private readonly frames: FrameControl,
    private readonly viewport: ViewportManager,
    private readonly quality: QualityManager,
    private readonly debug: DebugPort,
    private readonly logger: MiseLogger,
    private readonly reducedMotion: ReducedMotionState,
    private readonly health: MiseHealthCheck,
    factories: MiseRuntimeFactories | undefined = undefined,
  ) {
    this.stageBuilder = new MiseStageBuilder({
      plan,
      primaryChanger: changer,
      frames,
      logger,
      health,
      reducedMotion,
      ...(factories ? { factories } : {}),
      mountSurface: (surface) => this.mountSurface(surface),
    });
  }

  mount(canvas: HTMLCanvasElement, documentRoot: Document): boolean {
    if (this.mounted) return this.defaultSurface?.available ?? false;
    this.logger.debug("mise.mount_started");
    this.mounted = true;
    this.debug.mount(documentRoot);
    this.health.mark("runtime.debug");
    const surface = {
      canvas,
      renderer: this.renderer,
      viewport: this.viewport,
      primary: true,
      available: false,
      contextEpoch: 0,
    } satisfies PhysicalSurface;
    this.defaultSurface = surface;
    this.mountSurface(surface);
    this.unsubscribeFrame = this.frames.subscribe((frame) => this.frame(frame));
    this.health.mark("runtime.frame-loop");
    this.logger.success("mise.mounted");
    return surface.available;
  }

  async activate(id: string, root: HTMLElement): Promise<void> {
    if (!this.mounted) return;
    const definition = this.plan.experience(id);
    if (!definition) {
      throw new MiseError(
        "MISE_EXPERIENCE_UNREGISTERED",
        `Unregistered MISE experience: ${id}`,
      );
    }
    const epoch = ++this.activationEpoch;
    const candidate = this.stageBuilder.build(
      definition,
      root,
      this.requireDefaultSurface(),
      this.stage,
      this.scroll,
    );
    try {
      const committed = await this.mountStage(candidate);
      if (!committed || epoch !== this.activationEpoch || !this.mounted) {
        this.disposeCandidate(candidate);
        return;
      }
      const previous = this.stage;
      this.stage = candidate;
      this.layoutDirty = true;
      this.disposeStage(previous, candidate);
      this.frames.invalidate();
      this.logger.debug("mise.experience_activated", { experience: id });
    } catch (error) {
      this.disposeCandidate(candidate);
      throw error;
    }
  }

  setScroll(snapshot: ScrollSnapshot): void {
    this.scroll = snapshot;
    this.layoutDirty = true;
    for (const track of this.stage?.tracks ?? []) {
      track.runtime.setScroll(snapshot);
    }
    this.frames.invalidate();
  }

  refresh(): void {
    this.layoutDirty = true;
    for (const track of this.stage?.tracks ?? []) {
      track.mountFailed = false;
      track.runtime.refresh();
    }
    for (const surface of uniquePhysicals(this.stage)) {
      surface.viewport.sync(true);
    }
    this.frames.invalidate();
  }

  clear(): void {
    const experience = this.stage?.id;
    const stage = this.stage;
    const renderer = this.defaultSurface?.renderer;
    this.stage = null;
    this.activationEpoch += 1;
    runCleanups([
      () => this.disposeStage(stage, null),
      () => this.changer.clear(),
      () => renderer?.clear(),
      () => this.updateDemand("idle"),
      () => {
        if (experience) {
          this.logger.debug("mise.experience_cleared", { experience });
        }
      },
    ], "MISE active Experience cleanup failed.");
  }

  dispose(): void {
    if (!this.mounted) return;
    this.logger.debug("mise.dispose_started");
    this.mounted = false;
    const unsubscribeFrame = this.unsubscribeFrame;
    const defaultSurface = this.defaultSurface;
    this.unsubscribeFrame = null;
    this.defaultSurface = null;
    runCleanups([
      () => this.clear(),
      () => unsubscribeFrame?.(),
      () => {
        if (defaultSurface) disposePhysicalSurface(defaultSurface);
      },
      () => this.debug.dispose(),
      () => this.logger.debug("mise.disposed"),
    ], "MISE runtime cleanup failed.");
  }

  private async mountStage(stage: StageSession): Promise<boolean> {
    this.health.mark("runtime.scene-changer");
    measureStageViews(stage, true);
    const secondary = stage.tracks.filter((track) => !track.primary);
    for (const track of secondary) {
      if (!(await this.mountTrack(track))) return false;
    }
    const primary = stage.tracks.find((track) => track.primary);
    return primary ? this.mountTrack(primary) : false;
  }

  private async mountTrack(track: StageTrackSession): Promise<boolean> {
    if (!track.view.surface.physical.available) return true;
    if (!shouldMountTrack(track)) return true;
    track.mounting = true;
    track.mounted = await track.runtime.mount();
    track.mounting = false;
    track.mountFailed = !track.mounted;
    return track.mounted;
  }

  private frame(tick: FrameTick): void {
    if (this.quality.observeFrame(tick.delta)) {
      for (const surface of uniquePhysicals(this.stage)) {
        surface.viewport.sync(true);
      }
    }
    const stage = this.stage;
    if (!stage) {
      this.updateDemand("idle");
      return;
    }
    measureStageViews(stage, this.layoutDirty);
    this.layoutDirty = false;
    const commands: RenderCommand[] = [];
    let demand: FrameDemand = "idle";
    const debugResults = this.debug.enabled
      ? new Map<StageTrackSession, TrackFrameResult>()
      : null;
    for (const track of stage.tracks) {
      const measurement = track.view.measurement;
      this.ensureTrackMount(stage, track);
      const active = Boolean(
        track.mounted
        && measurement
        && track.view.surface.physical.available
        && (
          track.runtime.definition.activation === "always"
          || measurement.visible
        ),
      );
      if (measurement) track.runtime.resize(measurement.viewport);
      const result = track.runtime.frame(
        tick,
        this.quality.tier,
        this.reducedMotion.active,
        active,
      );
      debugResults?.set(track, result);
      if (result.demand === "next") demand = "next";
      if (measurement?.visible && result.renderState) {
        commands.push({
          order: track.view.definition.order,
          track,
          result,
          measurement,
        });
      }
    }
    renderStageCommands(commands);
    if (debugResults) this.updateDebug(stage, debugResults, tick);
    this.updateDemand(demand);
  }

  private ensureTrackMount(
    stage: StageSession,
    track: StageTrackSession,
  ): void {
    if (
      track.mounted
      || track.mounting
      || track.mountFailed
      || !shouldMountTrack(track)
    ) return;
    track.mounting = true;
    void track.runtime.mount()
      .then((mounted) => {
        if (this.stage !== stage || !this.mounted) return;
        track.mounted = mounted;
        track.mountFailed = !mounted;
      })
      .catch(() => {
        if (this.stage === stage) track.mountFailed = true;
      })
      .finally(() => {
        track.mounting = false;
        if (this.stage === stage) this.frames.invalidate();
      });
  }

  private updateDemand(demand: FrameDemand): void {
    if (demand === "next") {
      this.releaseDemand ??= this.frames.acquireContinuous();
      return;
    }
    this.releaseDemand?.();
    this.releaseDemand = null;
  }

  private mountSurface(surface: PhysicalSurface): void {
    setSurfaceFallback(surface.canvas, false);
    surface.available = surface.renderer.mount(surface.canvas, {
      lost: () => this.handleContextLost(surface),
      restored: () => this.handleContextRestored(surface),
    });
    if (!surface.available) {
      setSurfaceFallback(surface.canvas, true);
      this.logger.warning("webgl.unavailable");
      return;
    }
    this.health.mark("runtime.renderer");
    surface.viewport.mount(surface.canvas);
  }

  private handleContextLost(surface: PhysicalSurface): void {
    surface.available = false;
    surface.contextEpoch += 1;
    setSurfaceFallback(surface.canvas, true);
    this.logger.warning("webgl.context_lost");
    this.frames.invalidate();
  }

  private handleContextRestored(surface: PhysicalSurface): void {
    const epoch = ++surface.contextEpoch;
    void this.restoreSurface(surface, epoch);
    this.logger.success("webgl.context_restored");
  }

  private async restoreSurface(
    surface: PhysicalSurface,
    epoch: number,
  ): Promise<void> {
    const tracks = (this.stage?.tracks ?? []).filter(
      (track) => track.view.surface.physical === surface,
    );
    let restored = true;
    for (const track of tracks) {
      if (!track.mounted && !trackWantsMount(track)) continue;
      let result = false;
      try {
        result = track.mounted
          ? await track.runtime.recreate()
          : await track.runtime.mount();
      } catch {
        result = false;
      }
      track.mounted = result;
      track.mountFailed = !result;
      if (!result) restored = false;
    }
    if (epoch !== surface.contextEpoch || !this.mounted) return;
    surface.available = restored;
    setSurfaceFallback(surface.canvas, !restored);
    surface.viewport.sync(true);
    this.layoutDirty = true;
    this.frames.invalidate();
  }

  private requireDefaultSurface(): PhysicalSurface {
    if (this.defaultSurface) return this.defaultSurface;
    throw new MiseError(
      "MISE_SURFACE_MISSING",
      "MISE default Surface is not mounted.",
    );
  }

  private disposeCandidate(stage: StageSession): void {
    runCleanups([
      ...[...stage.tracks].reverse().map((track) =>
        () => track.runtime.dispose(!track.primary)),
      ...[...stage.createdPhysicals].map((surface) =>
        () => disposePhysicalSurface(surface)),
    ], "MISE candidate Stage cleanup failed.");
  }

  private disposeStage(
    stage: StageSession | null,
    replacement: StageSession | null,
  ): void {
    if (!stage) return;
    const replacementPhysicals = new Set(uniquePhysicals(replacement));
    const primaryReused = Boolean(
      replacement?.tracks.some((track) => track.primary),
    );
    const removableSurfaces = uniquePhysicals(stage).filter((surface) =>
      !surface.primary && !replacementPhysicals.has(surface));
    runCleanups([
      ...[...stage.tracks].reverse().map((track) =>
        () => track.runtime.dispose(!(track.primary && primaryReused))),
      ...removableSurfaces.map((surface) =>
        () => disposePhysicalSurface(surface)),
    ], "MISE Stage cleanup failed.");
  }

  private updateDebug(
    stage: StageSession,
    results: ReadonlyMap<StageTrackSession, TrackFrameResult>,
    tick: FrameTick,
  ): void {
    const snapshot = createStageDebugSnapshot(
      stage,
      results,
      tick,
      this.quality.tier,
      this.health.report(),
    );
    if (snapshot) this.debug.update(snapshot);
  }
}
