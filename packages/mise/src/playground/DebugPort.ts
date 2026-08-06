import GUI, { type Controller } from "lil-gui";
import type { DebugPort, DebugSnapshot } from "../Contracts.js";
import type {
  DevInspectorOptions,
  PlaygroundControlDefinition,
  PlaygroundNumberControl,
} from "./PlaygroundTypes.js";

interface InspectorModel {
  scene: string;
  lifecycle: string;
  driver: string;
  progress: number;
  velocity: number;
  frameMs: number;
  quality: string;
  pixelRatio: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  health: string;
  missing: string;
  stage: string;
}

interface PlaygroundBinding {
  refresh(): void;
}

/** Side-effect-free Debug port used when Playground is disabled. */
export class NoopDebugPort implements DebugPort {
  /** Diagnostics are disabled. */
  readonly enabled = false;
  /**
   * Accepts the mount call without creating diagnostic UI.
   *
   * @param _documentRoot - Ignored because this port has no UI.
   */
  mount(_documentRoot: Document): void {}
  /**
   * Accepts a diagnostic snapshot without retaining it.
   *
   * @param _snapshot - Ignored because diagnostics are disabled.
   */
  update(_snapshot: DebugSnapshot): void {}
  /** Performs no cleanup. */
  dispose(): void {}
}

/** Development-only DOM Inspector for runtime and renderer snapshots. */
export class DevInspector implements DebugPort {
  /** Diagnostics are enabled. */
  readonly enabled = true;
  private readonly model: InspectorModel = {
    scene: "none",
    lifecycle: "idle",
    driver: "none",
    progress: 0,
    velocity: 0,
    frameMs: 0,
    quality: "high",
    pixelRatio: 1,
    calls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    programs: 0,
    health: "pending 0/0",
    missing: "none",
    stage: "single",
  };
  private readonly readonlyControllers: Controller[] = [];
  private readonly bindings: PlaygroundBinding[] = [];
  private element: HTMLElement | null = null;
  private gui: GUI | null = null;
  private lastUpdate = Number.NEGATIVE_INFINITY;

  /**
   * Creates a development-only lil-gui Inspector.
   *
   * @param options - Immutable title, semantic controls, and frame invalidator.
   */
  constructor(private readonly options: DevInspectorOptions = {}) {}

  /**
   * Creates the development Inspector.
   *
   * @param documentRoot - Document receiving the Inspector element.
   */
  mount(documentRoot: Document): void {
    if (this.element) return;
    const element = documentRoot.createElement("aside");
    element.dataset["miseDebug"] = "";
    element.setAttribute("aria-label", "MISE Playground");
    documentRoot.body.append(element);
    let gui: GUI | null = null;
    try {
      gui = new GUI({
        autoPlace: false,
        container: element,
        title: this.options.title ?? "MISE",
        width: this.options.width ?? 320,
      });
      this.mountDiagnostics(gui);
      this.mountProductControls(gui);
      this.element = element;
      this.gui = gui;
    } catch (error) {
      gui?.destroy();
      element.remove();
      throw error;
    }
  }

  /**
   * Throttles and displays one runtime snapshot.
   *
   * @param snapshot - Current runtime and renderer state.
   */
  update(snapshot: DebugSnapshot): void {
    const now = performance.now();
    if (!this.gui || now - this.lastUpdate < 200) return;
    this.lastUpdate = now;
    this.applySnapshot(snapshot);
    for (const controller of this.readonlyControllers) {
      controller.updateDisplay();
    }
    for (const binding of this.bindings) binding.refresh();
  }

  /** Removes the Inspector and clears retained state. */
  dispose(): void {
    try {
      this.gui?.destroy();
    } finally {
      this.element?.remove();
      this.gui = null;
      this.element = null;
      this.readonlyControllers.length = 0;
      this.bindings.length = 0;
      this.lastUpdate = Number.NEGATIVE_INFINITY;
    }
  }

  private mountDiagnostics(gui: GUI): void {
    const runtime = gui.addFolder("Runtime");
    this.addReadonly(runtime, "scene", "Scene");
    this.addReadonly(runtime, "lifecycle", "Lifecycle");
    this.addReadonly(runtime, "driver", "Driver");
    this.addReadonly(runtime, "progress", "Progress");
    this.addReadonly(runtime, "velocity", "Velocity");
    this.addReadonly(runtime, "frameMs", "Frame ms");
    this.addReadonly(runtime, "quality", "Quality");
    this.addReadonly(runtime, "pixelRatio", "DPR");

    const renderer = gui.addFolder("Renderer");
    this.addReadonly(renderer, "calls", "Calls");
    this.addReadonly(renderer, "triangles", "Triangles");
    this.addReadonly(renderer, "geometries", "Geometries");
    this.addReadonly(renderer, "textures", "Textures");
    this.addReadonly(renderer, "programs", "Programs");

    const health = gui.addFolder("Health");
    this.addReadonly(health, "health", "Status");
    this.addReadonly(health, "missing", "Missing");
    this.addReadonly(health, "stage", "Stage");
  }

  private addReadonly(
    folder: GUI,
    property: keyof InspectorModel,
    label: string,
  ): void {
    const controller = folder.add(this.model, property).name(label).disable();
    this.readonlyControllers.push(controller);
  }

  private mountProductControls(gui: GUI): void {
    for (const definition of this.options.folders ?? []) {
      const folder = gui.addFolder(definition.title);
      folder.domElement.dataset["misePlaygroundFolder"] = definition.id;
      for (const control of definition.controls) {
        this.bindControl(folder, control);
      }
    }
  }

  private bindControl(
    folder: GUI,
    definition: PlaygroundControlDefinition,
  ): void {
    if (definition.kind === "number") {
      this.bindNumberControl(folder, definition);
      return;
    }
    const holder = { value: definition.get() };
    const controller = definition.kind === "color"
      ? folder.addColor(holder, "value")
      : folder.add(holder, "value");
    controller.name(definition.label);
    this.commit(controller, definition, (value) => {
      if (definition.kind === "boolean" && typeof value === "boolean") {
        definition.set(value);
      }
      if (
        (definition.kind === "color" || definition.kind === "string")
        && typeof value === "string"
      ) {
        definition.set(value);
      }
    });
    this.bindings.push({
      refresh: (): void => {
        holder.value = definition.get();
        controller.updateDisplay();
      },
    });
  }

  private bindNumberControl(
    folder: GUI,
    definition: PlaygroundNumberControl,
  ): void {
    const holder = { value: definition.get() };
    const controller = folder.add(
      holder,
      "value",
      definition.min,
      definition.max,
      definition.step,
    ).name(definition.label);
    this.commit(controller, definition, (value) => {
      if (typeof value !== "number" || !Number.isFinite(value)) return;
      definition.set(value);
    });
    this.bindings.push({
      refresh: (): void => {
        holder.value = definition.get();
        controller.updateDisplay();
      },
    });
  }

  private commit(
    controller: Controller,
    definition: PlaygroundControlDefinition,
    apply: (value: unknown) => void,
  ): void {
    controller.domElement.dataset["misePlaygroundControl"] = definition.id;
    const commit = (value: unknown): void => {
      apply(value);
      this.options.invalidate?.();
    };
    if (definition.commit === "finish") {
      controller.onFinishChange(commit);
      return;
    }
    controller.onChange(commit);
  }

  private applySnapshot(snapshot: DebugSnapshot): void {
    const { stats } = snapshot;
    this.model.scene = snapshot.scene;
    this.model.lifecycle = snapshot.lifecycle;
    this.model.driver = snapshot.driver;
    this.model.progress = Number(snapshot.progress.toFixed(3));
    this.model.velocity = Number(snapshot.velocity.toFixed(2));
    this.model.frameMs = Number(snapshot.frameMs.toFixed(1));
    this.model.quality = snapshot.quality;
    this.model.pixelRatio = Number(snapshot.pixelRatio.toFixed(2));
    this.model.calls = stats.calls;
    this.model.triangles = stats.triangles;
    this.model.geometries = stats.geometries;
    this.model.textures = stats.textures;
    this.model.programs = stats.programs;
    this.model.health = `${snapshot.health.status} ${snapshot.health.observed.length}/${snapshot.health.total}`;
    this.model.missing = snapshot.health.missing.join(",") || "none";
    this.model.stage = formatStage(snapshot);
  }
}

function formatStage(snapshot: DebugSnapshot): string {
  if (!snapshot.stage) return "single";
  const ready = snapshot.stage.surfaces.filter(
    (surface) => surface.available,
  ).length;
  const mounted = snapshot.stage.tracks.filter(
    (track) => track.mounted,
  ).length;
  return `${snapshot.stage.id} s${ready}/${snapshot.stage.surfaces.length} t${mounted}/${snapshot.stage.tracks.length}`;
}

/**
 * Formats a compact deterministic Playground snapshot.
 *
 * @param snapshot - Current runtime and renderer state.
 * @returns Multiline text suitable for the development Inspector.
 */
export function formatDebugSnapshot(snapshot: DebugSnapshot): string {
  const { stats } = snapshot;
  const lines = [
    `scene      ${snapshot.scene}`,
    `state      ${snapshot.lifecycle}`,
    `driver     ${snapshot.driver}`,
    `progress   ${snapshot.progress.toFixed(3)}`,
    `velocity   ${snapshot.velocity.toFixed(2)}`,
    `frame      ${snapshot.frameMs.toFixed(1)}ms`,
    `quality    ${snapshot.quality} @${snapshot.pixelRatio.toFixed(2)}`,
    `health     ${snapshot.health.status} ${snapshot.health.observed.length}/${snapshot.health.total}`,
    `draw       ${stats.calls} / ${stats.triangles} tri`,
    `resources  g${stats.geometries} t${stats.textures} p${stats.programs}`,
  ];
  if (snapshot.health.missing.length > 0) {
    lines.push(`missing    ${snapshot.health.missing.join(",")}`);
  }
  if (snapshot.stage) {
    lines.push(
      `stage      ${snapshot.stage.id} s${snapshot.stage.surfaces.length} t${snapshot.stage.tracks.length}`,
      ...snapshot.stage.surfaces.map((surface) =>
        `surface    ${surface.id} ${surface.available ? "ready" : "fallback"} v${surface.views}`),
      ...snapshot.stage.tracks.map((track) =>
        `track      ${track.id} ${track.mounted ? track.scene : "deferred"} ${track.visible ? "visible" : "hidden"}`),
    );
  }
  return lines.join("\n");
}
