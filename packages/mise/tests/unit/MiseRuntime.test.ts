import { Camera, Scene } from "three";
import { describe, expect, it, vi } from "vitest";
import { MiseAggregateError } from "../../src/Index.js";
import type {
  DebugPort,
  FrameCallback,
  MiseRendererContextCallbacks,
  MiseRendererPort,
  SceneDefinition,
} from "../../src/Index.js";
import type { DriveController } from "../../src/Contracts.js";
import type { MiseLogger } from "../../src/logging/MiseLogger.js";
import type { QualityManager } from "../../src/kernel/QualityManager.js";
import type { MisePlan } from "../../src/kernel/MisePlan.js";
import { MiseHealthCheck } from "../../src/kernel/MiseHealthCheck.js";
import { MiseRuntime } from "../../src/kernel/MiseRuntime.js";
import type { SceneChanger } from "../../src/kernel/SceneChanger.js";
import type { ViewportManager } from "../../src/kernel/ViewportManager.js";

const root = {
  ownerDocument: {
    defaultView: {},
  },
} as unknown as HTMLElement;

describe("MiseRuntime", () => {
  it("skips debug-only stats and report work in production frames", async () => {
    const fixture = createFixture();
    fixture.runtime.mount(createCanvas(), {} as Document);
    await fixture.runtime.activate("home", root);

    fixture.frame({ time: 1, delta: 0.016 });

    expect(fixture.renderer.stats).not.toHaveBeenCalled();
    expect(fixture.debug.update).not.toHaveBeenCalled();
    expect(fixture.viewport.snapshot).toHaveBeenCalled();
    expect(fixture.healthReport).not.toHaveBeenCalled();
  });

  it("keeps the active driver session when an incoming scene is rejected", async () => {
    const fixture = createFixture([true, false]);
    fixture.runtime.mount(createCanvas(), {} as Document);
    await fixture.runtime.activate("home", root);
    await fixture.runtime.activate("next", root);

    expect(fixture.drivers[0]?.dispose).not.toHaveBeenCalled();
    expect(fixture.drivers[1]?.dispose).toHaveBeenCalledOnce();

    fixture.runtime.setScroll({
      progress: 0.5,
      position: 500,
      velocity: 100,
      direction: 1,
    });
    expect(fixture.drivers[0]?.setScroll).toHaveBeenCalledTimes(2);
    expect(fixture.drivers[1]?.setScroll).toHaveBeenCalledOnce();
  });

  it("continues driver cleanup after one adapter throws", async () => {
    const fixture = createFixture([true, true]);
    fixture.runtime.mount(createCanvas(), {} as Document);
    await fixture.runtime.activate("home", root);
    vi.mocked(fixture.drivers[0]!.dispose).mockImplementation(() => {
      throw new Error("dispose failed");
    });

    await expect(fixture.runtime.activate("next", root)).resolves.toBeUndefined();

    expect(fixture.logger.warning).toHaveBeenCalledWith(
      "driver.dispose_failed",
      { failures: 1 },
    );
  });

  it("restores one surface without globally suspending the frame loop", async () => {
    let finishRecreate = (): void => undefined;
    const recreate = new Promise<boolean>((resolve) => {
      finishRecreate = () => resolve(true);
    });
    const fixture = createFixture();
    fixture.changer.recreate.mockReturnValue(recreate);
    const canvas = createCanvas();
    fixture.runtime.mount(canvas, {} as Document);
    await fixture.runtime.activate("home", root);

    fixture.rendererCallbacks?.lost();
    expect(canvas.dataset["miseState"]).toBe("fallback");
    fixture.rendererCallbacks?.restored();
    expect(fixture.frames.acquireSuspension).not.toHaveBeenCalled();

    finishRecreate();
    await vi.waitFor(() => {
      expect(canvas.dataset["miseState"]).toBeUndefined();
    });
    expect(fixture.frames.invalidate).toHaveBeenCalled();
  });

  it("advances a non-loop auto scene after reduced-motion completion", async () => {
    const completed = {
      progress: 1,
      direction: 0 as const,
      velocity: 0,
      active: true,
      demand: "idle" as const,
    };
    const fixture = createFixture([true, true], {
      homeScenes: [createDefinition("intro"), createDefinition("content")],
      sample: completed,
    });
    fixture.runtime.mount(createCanvas(), {} as Document);
    await fixture.runtime.activate("home", root);

    fixture.frame({ time: 1, delta: 0.016 });

    await vi.waitFor(() => {
      expect(fixture.changer.switchTo).toHaveBeenCalledTimes(2);
    });
    expect(fixture.changer.switchTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "content" }),
      root,
    );
  });

  it("selects an active custom driver without Kernel specialization", async () => {
    const inactive = {
      progress: 0,
      direction: 0 as const,
      velocity: 0,
      active: false,
      demand: "idle" as const,
    };
    const active = {
      ...inactive,
      progress: 0.5,
      active: true,
    };
    const fixture = createFixture([true, true], {
      homeScenes: [
        createDefinition("pointer-idle", { kind: "custom:pointer", slot: 0 }),
        createDefinition("pointer-active", { kind: "custom:pointer", slot: 1 }),
      ],
      samples: [inactive, active],
    });
    fixture.runtime.mount(createCanvas(), {} as Document);
    await fixture.runtime.activate("home", root);

    fixture.frame({ time: 1, delta: 0.016 });

    await vi.waitFor(() => {
      expect(fixture.changer.switchTo).toHaveBeenCalledTimes(2);
    });
    expect(fixture.changer.switchTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "pointer-active" }),
      root,
    );
  });

  it("blocks failed automatic transitions until selection resets or refresh retries", async () => {
    const completed = {
      progress: 1,
      direction: 0 as const,
      velocity: 0,
      active: true,
      demand: "idle" as const,
    };
    const fixture = createFixture([true], {
      homeScenes: [createDefinition("intro"), createDefinition("content")],
      sample: completed,
    });
    fixture.runtime.mount(createCanvas(), {} as Document);
    await fixture.runtime.activate("home", root);
    fixture.changer.switchTo.mockRejectedValueOnce(
      new Error("transition failed"),
    );
    fixture.frames.invalidate.mockClear();

    fixture.frame({ time: 1, delta: 0.016 });
    await vi.waitFor(() => {
      expect(fixture.frames.invalidate).toHaveBeenCalledOnce();
    });
    fixture.frame({ time: 2, delta: 0.016 });

    expect(fixture.changer.switchTo).toHaveBeenCalledTimes(2);
    fixture.runtime.setScroll({
      progress: 0,
      position: 0,
      velocity: 0,
      direction: 0,
    });
    fixture.changer.switchTo.mockResolvedValueOnce(false);
    fixture.frame({ time: 3, delta: 0.016 });
    expect(fixture.changer.switchTo).toHaveBeenCalledTimes(2);

    fixture.runtime.refresh();
    fixture.frame({ time: 4, delta: 0.016 });
    expect(fixture.changer.switchTo).toHaveBeenCalledTimes(3);
  });

  it("continues terminal cleanup when a Surface cleanup throws", async () => {
    const fixture = createFixture();
    fixture.runtime.mount(createCanvas(), {} as Document);
    await fixture.runtime.activate("home", root);
    vi.mocked(fixture.viewport.dispose).mockImplementation(() => {
      throw new Error("viewport cleanup failed");
    });

    expect(() => fixture.runtime.dispose()).toThrow(MiseAggregateError);
    expect(fixture.renderer.dispose).toHaveBeenCalledOnce();
    expect(fixture.debug.dispose).toHaveBeenCalledOnce();
    expect(() => fixture.runtime.dispose()).not.toThrow();
  });
});

function createCanvas(): HTMLCanvasElement {
  return { dataset: {} } as HTMLCanvasElement;
}

function createFixture(
  switchResults: boolean[] = [true],
  options: {
    readonly homeScenes?: readonly SceneDefinition[];
    readonly sample?: ReturnType<DriveController["sample"]>;
    readonly samples?: readonly ReturnType<DriveController["sample"]>[];
  } = {},
) {
  let frameCallback: FrameCallback = () => undefined;
  let rendererCallbacks: MiseRendererContextCallbacks | null = null;
  const releaseSuspension = vi.fn();
  const frames = {
    subscribe: vi.fn((callback: FrameCallback) => {
      frameCallback = callback;
      return vi.fn();
    }),
    invalidate: vi.fn(),
    acquireContinuous: vi.fn(() => vi.fn()),
    acquireSuspension: vi.fn(() => releaseSuspension),
  };
  const definitions = new Map([
    ["home", {
      id: "home",
      scenes: options.homeScenes ?? [createDefinition("home")],
    }],
    ["next", { id: "next", scenes: [createDefinition("next")] }],
  ]);
  const drivers: DriveController[] = [];
  const plan = {
    experience: vi.fn((id: string) => definitions.get(id) ?? null),
    driver: vi.fn(() => (spec: SceneDefinition["drive"]) => {
      const driver = createDriver(
        options.samples?.[drivers.length] ?? options.sample,
        spec.kind,
      );
      drivers.push(driver);
      return driver;
    }),
  } as unknown as MisePlan;
  const renderer = {
    mount: vi.fn((
      _canvas: HTMLCanvasElement,
      callbacks: MiseRendererContextCallbacks,
    ) => {
      rendererCallbacks = callbacks;
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
  const switchTo = vi.fn();
  for (const result of switchResults) switchTo.mockResolvedValueOnce(result);
  const recreate = vi.fn(() => Promise.resolve(true));
  const changer = {
    switchTo,
    recreate,
    frame: vi.fn(() => "idle" as const),
    renderState: vi.fn(() => null),
    resize: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
  } as unknown as SceneChanger;
  const viewport = {
    mount: vi.fn(),
    sync: vi.fn(),
    snapshot: vi.fn(() => ({
      width: 800,
      height: 600,
      pixelRatio: 1,
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
    })),
    dispose: vi.fn(),
  } as unknown as ViewportManager;
  const quality = {
    tier: "high",
    observeFrame: vi.fn(() => false),
  } as unknown as QualityManager;
  const debug = {
    enabled: false,
    mount: vi.fn(),
    update: vi.fn(),
    dispose: vi.fn(),
  } satisfies DebugPort;
  const health = new MiseHealthCheck([]);
  const healthReport = vi.spyOn(health, "report");
  const logger = silentLogger();
  const runtime = new MiseRuntime(
    plan,
    renderer,
    changer,
    frames,
    viewport,
    quality,
    debug,
    logger,
    { active: false },
    health,
  );

  return {
    runtime,
    frames,
    renderer,
    changer: { recreate, switchTo },
    debug,
    viewport: viewport as unknown as {
      snapshot: ReturnType<typeof vi.fn>;
      dispose: ReturnType<typeof vi.fn>;
    },
    drivers,
    healthReport,
    logger,
    releaseSuspension,
    frame: (tick: { readonly time: number; readonly delta: number }) =>
      frameCallback({
        ...tick,
        rawDelta: tick.delta,
        elapsed: tick.time,
        frame: Math.round(tick.time * 1000),
      }),
    get rendererCallbacks(): MiseRendererContextCallbacks | null {
      return rendererCallbacks;
    },
  };
}

function createDefinition(
  id: string,
  drive: SceneDefinition["drive"] = {
    kind: "auto",
    duration: 1,
    loop: false,
    reducedMotion: { mode: "complete" },
  },
): SceneDefinition {
  return {
    id,
    drive,
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

function createDriver(
  sample: ReturnType<DriveController["sample"]> = {
    progress: 0,
    direction: 0,
    velocity: 0,
    active: true,
    demand: "idle",
  },
  kind: DriveController["kind"] = "auto",
): DriveController {
  return {
    kind,
    setScroll: vi.fn(),
    refresh: vi.fn(),
    sample: vi.fn(() => sample),
    dispose: vi.fn(),
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
