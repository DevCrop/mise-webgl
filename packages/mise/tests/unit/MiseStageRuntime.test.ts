import { Camera, Scene } from "three";
import { describe, expect, it, vi } from "vitest";
import type {
  DriveController,
  FrameCallback,
  MiseRendererContextCallbacks,
  MiseRendererPort,
  SceneDefinition,
  StageExperienceDefinition,
  ViewportState,
} from "../../src/Index.js";
import type { MiseLogger } from "../../src/logging/MiseLogger.js";
import { MiseHealthCheck } from "../../src/kernel/MiseHealthCheck.js";
import type { MisePlan } from "../../src/kernel/MisePlan.js";
import type { QualityManager } from "../../src/kernel/QualityManager.js";
import { MiseRuntime } from "../../src/kernel/MiseRuntime.js";
import type { SceneChanger } from "../../src/kernel/SceneChanger.js";
import type { ViewportManager } from "../../src/kernel/ViewportManager.js";

describe("MiseRuntime Stage", () => {
  it("renders ordered compositor Views and one isolated Surface", async () => {
    const fixture = createStageFixture();

    fixture.runtime.mount(fixture.defaultCanvas, {} as Document);
    await fixture.runtime.activate("stage", fixture.root);
    fixture.frame({ time: 1, delta: 0.016 });

    expect(fixture.frames.subscribe).toHaveBeenCalledOnce();
    expect(fixture.defaultRenderer.render).toHaveBeenCalledTimes(2);
    expect(fixture.isolatedRenderer.render).toHaveBeenCalledOnce();
    expect(fixture.defaultRenderer.render.mock.calls[0]?.[2]).toMatchObject({
      viewport: { x: 0, y: 0, width: 1000, height: 800 },
      scissor: { x: 0, y: 0, width: 1000, height: 800 },
      clear: "all",
    });
    expect(fixture.defaultRenderer.render.mock.calls[1]?.[2]).toMatchObject({
      viewport: { x: 100, y: 200, width: 400, height: 300 },
      scissor: { x: 100, y: 200, width: 400, height: 300 },
      clear: "depth",
    });
  });

  it("isolates context loss and recreation to the affected Surface", async () => {
    const fixture = createStageFixture();
    fixture.runtime.mount(fixture.defaultCanvas, {} as Document);
    await fixture.runtime.activate("stage", fixture.root);
    fixture.defaultRenderer.render.mockClear();
    fixture.isolatedRenderer.render.mockClear();

    fixture.isolatedCallbacks?.lost();
    fixture.frame({ time: 1, delta: 0.016 });

    expect(fixture.isolatedCanvas.dataset["miseState"]).toBe("fallback");
    expect(fixture.defaultRenderer.render).toHaveBeenCalledTimes(2);
    expect(fixture.isolatedRenderer.render).not.toHaveBeenCalled();
    expect(fixture.frames.acquireSuspension).not.toHaveBeenCalled();

    fixture.isolatedCallbacks?.restored();
    await vi.waitFor(() => {
      expect(fixture.changers.get("isolated")?.recreate).toHaveBeenCalledOnce();
    });
    expect(fixture.primaryChanger.recreate).not.toHaveBeenCalled();
    expect(fixture.changers.get("panel")?.recreate).not.toHaveBeenCalled();
    expect(fixture.isolatedCanvas.dataset["miseState"]).toBeUndefined();
  });

  it("defers visible Track Scene creation until its View enters the viewport", async () => {
    const fixture = createStageFixture({ panelTop: 1_000 });
    fixture.runtime.mount(fixture.defaultCanvas, {} as Document);

    await fixture.runtime.activate("stage", fixture.root);

    expect(fixture.changers.get("panel")?.switchTo).not.toHaveBeenCalled();
    fixture.setPanelTop(100);
    fixture.frame({ time: 1, delta: 0.016 });
    await vi.waitFor(() => {
      expect(fixture.changers.get("panel")?.switchTo).toHaveBeenCalledOnce();
    });
    expect(fixture.frames.invalidate).toHaveBeenCalled();
  });

  it("keeps an isolated Surface in fallback when recreation rejects", async () => {
    const fixture = createStageFixture();
    fixture.runtime.mount(fixture.defaultCanvas, {} as Document);
    await fixture.runtime.activate("stage", fixture.root);
    fixture.changers.get("isolated")?.recreate.mockRejectedValueOnce(
      new Error("restore failed"),
    );

    fixture.isolatedCallbacks?.lost();
    fixture.isolatedCallbacks?.restored();

    await vi.waitFor(() => {
      expect(fixture.changers.get("isolated")?.recreate).toHaveBeenCalledOnce();
    });
    expect(fixture.isolatedCanvas.dataset["miseState"]).toBe("fallback");
  });

  it("reports Surface and Track topology to the Debug port", async () => {
    const fixture = createStageFixture({ debug: true });
    fixture.runtime.mount(fixture.defaultCanvas, {} as Document);
    await fixture.runtime.activate("stage", fixture.root);

    fixture.frame({ time: 1, delta: 0.016 });

    expect(fixture.debug.update).toHaveBeenCalledWith(expect.objectContaining({
      stage: expect.objectContaining({
        id: "stage",
        surfaces: expect.arrayContaining([
          expect.objectContaining({ id: "background", available: true }),
          expect.objectContaining({ id: "isolated", available: true }),
        ]),
        tracks: expect.arrayContaining([
          expect.objectContaining({
            id: "panel",
            mounted: true,
            visible: true,
          }),
        ]),
      }),
    }));
  });
});

function createStageFixture(
  options: {
    readonly panelTop?: number;
    readonly debug?: boolean;
  } = {},
) {
  let frameCallback: FrameCallback = () => undefined;
  let isolatedCallbacks: MiseRendererContextCallbacks | null = null;
  let panelTop = options.panelTop ?? 200;
  const documentView = {
    innerWidth: 1000,
    innerHeight: 800,
  };
  const ownerDocument = { defaultView: documentView };
  const defaultCanvas = createElement(
    "CANVAS",
    () => rect(0, 0, 1000, 800),
    ownerDocument,
  ) as HTMLCanvasElement;
  const isolatedCanvas = createElement(
    "CANVAS",
    () => rect(0, 100, 500, 400),
    ownerDocument,
  ) as HTMLCanvasElement;
  const panel = createElement(
    "SECTION",
    () => rect(100, panelTop, 400, 300),
    ownerDocument,
  );
  const elements = new Map<string, HTMLElement>([
    [".local-canvas", isolatedCanvas],
    [".panel", panel],
  ]);
  const root = {
    ownerDocument,
    matches: vi.fn(() => false),
    querySelector: vi.fn((selector: string) => elements.get(selector) ?? null),
  } as unknown as HTMLElement;
  const frames = {
    subscribe: vi.fn((callback: FrameCallback) => {
      frameCallback = callback;
      return vi.fn();
    }),
    invalidate: vi.fn(),
    acquireContinuous: vi.fn(() => vi.fn()),
    acquireSuspension: vi.fn(() => vi.fn()),
  };
  const definition: StageExperienceDefinition = {
    id: "stage",
    surfaces: [
      {
        id: "background",
        target: { kind: "default" },
        mode: "compositor",
      },
      {
        id: "isolated",
        target: { kind: "selector", selector: ".local-canvas" },
        mode: "isolated",
      },
    ],
    views: [
      {
        id: "background",
        surface: "background",
        target: { kind: "surface" },
        order: 0,
        clear: "all",
      },
      {
        id: "panel",
        surface: "background",
        target: { kind: "selector", selector: ".panel" },
        order: 1,
        clear: "depth",
      },
      {
        id: "isolated",
        surface: "isolated",
        target: { kind: "surface" },
        order: 0,
        clear: "all",
      },
    ],
    tracks: [
      createTrack("background", "background", "always"),
      createTrack("panel", "panel", "visible"),
      createTrack("isolated", "isolated", "visible"),
    ],
  };
  const plan = {
    experience: vi.fn((id: string) => id === "stage" ? definition : null),
    driver: vi.fn(() => () => createDriver()),
  } as unknown as MisePlan;
  const defaultRenderer = createRenderer();
  const isolatedRenderer = createRenderer((callbacks) => {
    isolatedCallbacks = callbacks;
  });
  const primaryChanger = createChanger();
  const changers = new Map<string, ReturnType<typeof createChanger>>();
  const defaultViewport = createViewport({
    width: 1000,
    height: 800,
    pixelRatio: 1,
    drawingBufferWidth: 1000,
    drawingBufferHeight: 800,
  });
  const isolatedViewport = createViewport({
    width: 500,
    height: 400,
    pixelRatio: 1,
    drawingBufferWidth: 500,
    drawingBufferHeight: 400,
  });
  const logger = silentLogger();
  const debug = {
    enabled: options.debug ?? false,
    mount: vi.fn(),
    update: vi.fn(),
    dispose: vi.fn(),
  };
  const runtime = new MiseRuntime(
    plan,
    defaultRenderer,
    primaryChanger as unknown as SceneChanger,
    frames,
    defaultViewport as unknown as ViewportManager,
    {
      tier: "high",
      observeFrame: vi.fn(() => false),
    } as unknown as QualityManager,
    debug,
    logger,
    { active: false },
    new MiseHealthCheck([]),
    {
      createRenderer: () => isolatedRenderer,
      createChanger: (track) => {
        const changer = createChanger();
        changers.set(track, changer);
        return changer as unknown as SceneChanger;
      },
      createViewport: () => isolatedViewport as unknown as ViewportManager,
    },
  );

  return {
    runtime,
    root,
    frames,
    defaultCanvas,
    isolatedCanvas,
    defaultRenderer,
    isolatedRenderer,
    primaryChanger,
    changers,
    debug,
    setPanelTop: (value: number) => {
      panelTop = value;
    },
    frame: (tick: { readonly time: number; readonly delta: number }) =>
      frameCallback({
        ...tick,
        rawDelta: tick.delta,
        elapsed: tick.time,
        frame: Math.round(tick.time * 1000),
      }),
    get isolatedCallbacks(): MiseRendererContextCallbacks | null {
      return isolatedCallbacks;
    },
  };
}

function createTrack(
  id: string,
  view: string,
  activation: "always" | "visible",
): StageExperienceDefinition["tracks"][number] {
  return {
    id,
    view,
    root: "view",
    activation,
    scenes: [createDefinition(id)],
  };
}

function createDefinition(id: string): SceneDefinition {
  return {
    id,
    drive: {
      kind: "auto",
      duration: 1,
      loop: true,
      reducedMotion: { mode: "complete" },
    },
    create: () => ({
      scene: new Scene(),
      camera: new Camera(),
      mount: vi.fn(),
      frame: vi.fn(() => "idle" as const),
      resize: vi.fn(),
      dispose: vi.fn(),
    }),
  };
}

function createDriver(): DriveController {
  return {
    kind: "auto",
    setScroll: vi.fn(),
    refresh: vi.fn(),
    sample: vi.fn(() => ({
      progress: 0,
      direction: 0 as const,
      velocity: 0,
      active: true,
      demand: "idle" as const,
    })),
    dispose: vi.fn(),
  };
}

function createRenderer(
  onMount?: (callbacks: MiseRendererContextCallbacks) => void,
) {
  return {
    mount: vi.fn((
      _canvas: HTMLCanvasElement,
      callbacks: MiseRendererContextCallbacks,
    ) => {
      onMount?.(callbacks);
      return true;
    }),
    resize: vi.fn(),
    render: vi.fn(),
    clear: vi.fn(),
    stats: vi.fn(() => ({
      calls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      programs: 0,
    })),
    dispose: vi.fn(),
  } satisfies MiseRendererPort;
}

function createChanger() {
  const state = {
    scene: new Scene(),
    camera: new Camera(),
  };
  return {
    activeId: "active",
    state: "active",
    switchTo: vi.fn(() => Promise.resolve(true)),
    recreate: vi.fn(() => Promise.resolve(true)),
    frame: vi.fn(() => "idle" as const),
    renderState: vi.fn(() => state),
    resize: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
  };
}

function createViewport(state: ViewportState) {
  return {
    mount: vi.fn(),
    sync: vi.fn(),
    snapshot: vi.fn(() => state),
    dispose: vi.fn(),
  };
}

function createElement(
  tagName: string,
  getRect: () => ReturnType<typeof rect>,
  ownerDocument: object,
): HTMLElement {
  return {
    tagName,
    dataset: {},
    clientWidth: getRect().width,
    clientHeight: getRect().height,
    ownerDocument,
    getBoundingClientRect: getRect,
  } as unknown as HTMLElement;
}

function rect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

function silentLogger(): MiseLogger {
  const logger = {
    getLevel: () => "silent",
    setLevel: vi.fn(),
    child: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  } as unknown as MiseLogger;
  vi.mocked(logger.child).mockReturnValue(logger);
  return logger;
}
