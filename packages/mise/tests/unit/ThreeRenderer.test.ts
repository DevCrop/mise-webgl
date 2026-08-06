import { beforeEach, describe, expect, it, vi } from "vitest";

interface RendererDouble {
  autoClear: boolean;
  toneMapping: number;
  toneMappingExposure: number;
  readonly options: unknown;
  readonly debug: { checkShaderErrors: boolean };
  readonly setPixelRatio: ReturnType<typeof vi.fn>;
  readonly setSize: ReturnType<typeof vi.fn>;
  readonly render: ReturnType<typeof vi.fn>;
  readonly clear: ReturnType<typeof vi.fn>;
  readonly setViewport: ReturnType<typeof vi.fn>;
  readonly setScissor: ReturnType<typeof vi.fn>;
  readonly setScissorTest: ReturnType<typeof vi.fn>;
  readonly setAnimationLoop: ReturnType<typeof vi.fn>;
  readonly dispose: ReturnType<typeof vi.fn>;
  readonly forceContextLoss: ReturnType<typeof vi.fn>;
  readonly info: {
    readonly render: { readonly calls: number; readonly triangles: number };
    readonly memory: { readonly geometries: number; readonly textures: number };
    readonly programs: readonly unknown[];
  };
}

const threeState = vi.hoisted(() => ({
  failConstruction: false,
  instances: [] as RendererDouble[],
}));

vi.mock("three", () => ({
  WebGLRenderer: class {
    autoClear = true;
    toneMapping = 0;
    toneMappingExposure = 1;
    readonly options: unknown;
    readonly debug = { checkShaderErrors: false };
    readonly setPixelRatio = vi.fn();
    readonly setSize = vi.fn();
    readonly render = vi.fn();
    readonly clear = vi.fn();
    readonly setViewport = vi.fn();
    readonly setScissor = vi.fn();
    readonly setScissorTest = vi.fn();
    readonly setAnimationLoop = vi.fn();
    readonly dispose = vi.fn();
    readonly forceContextLoss = vi.fn();
    readonly info = {
      render: { calls: 4, triangles: 120 },
      memory: { geometries: 3, textures: 2 },
      programs: [{}, {}],
    };

    constructor(options: unknown) {
      if (threeState.failConstruction) throw new Error("WebGL unavailable");
      this.options = options;
      threeState.instances.push(this);
    }
  },
}));

import { ThreeRenderer } from "../../src/adapters/three/ThreeRenderer.js";

describe("ThreeRenderer", () => {
  beforeEach(() => {
    threeState.failConstruction = false;
    threeState.instances.length = 0;
  });

  it("owns context events, renderer operations and terminal teardown", () => {
    const canvas = new EventTarget() as HTMLCanvasElement;
    const callbacks = { lost: vi.fn(), restored: vi.fn() };
    const renderer = new ThreeRenderer(true);

    expect(renderer.mount(canvas, callbacks)).toBe(true);
    expect(renderer.mount(canvas, callbacks)).toBe(true);
    const instance = threeState.instances[0]!;
    expect(threeState.instances).toHaveLength(1);
    expect(instance.options).toMatchObject({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    expect(instance.debug.checkShaderErrors).toBe(true);
    expect(instance.setPixelRatio).toHaveBeenCalledWith(1);

    const lost = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(lost);
    canvas.dispatchEvent(new Event("webglcontextrestored"));
    expect(lost.defaultPrevented).toBe(true);
    expect(callbacks.lost).toHaveBeenCalledOnce();
    expect(callbacks.restored).toHaveBeenCalledOnce();

    renderer.resize({
      width: 800,
      height: 600,
      drawingBufferWidth: 1200,
      drawingBufferHeight: 900,
      pixelRatio: 1.5,
    });
    const scene = {} as never;
    const camera = {} as never;
    renderer.render(scene, camera);
    renderer.render(scene, camera, {
      viewport: { x: 100, y: 50, width: 300, height: 200 },
      scissor: { x: 120, y: 70, width: 260, height: 160 },
      clear: "depth",
    });
    renderer.render(scene, camera);
    renderer.clear();
    expect(instance.setSize).toHaveBeenCalledWith(1200, 900, false);
    expect(instance.render).toHaveBeenCalledTimes(3);
    expect(instance.render).toHaveBeenCalledWith(scene, camera);
    expect(instance.setViewport).toHaveBeenCalledWith(150, 525, 450, 300);
    expect(instance.setViewport).toHaveBeenLastCalledWith(0, 0, 1200, 900);
    expect(instance.setScissor).toHaveBeenCalledWith(180, 555, 390, 240);
    expect(instance.setScissorTest).toHaveBeenCalledWith(true);
    expect(instance.clear).toHaveBeenCalledWith(false, true, false);
    expect(instance.clear).toHaveBeenCalledTimes(2);
    expect(renderer.stats()).toEqual({
      calls: 4,
      triangles: 120,
      geometries: 3,
      textures: 2,
      programs: 2,
    });

    renderer.dispose();
    renderer.dispose();
    expect(instance.setAnimationLoop).toHaveBeenCalledOnce();
    expect(instance.setAnimationLoop).toHaveBeenCalledWith(null);
    expect(instance.dispose).toHaveBeenCalledOnce();
    expect(instance.forceContextLoss).toHaveBeenCalledOnce();
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    expect(callbacks.lost).toHaveBeenCalledOnce();
    expect(renderer.stats()).toEqual({
      calls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      programs: 0,
    });
  });

  it("fails closed when WebGLRenderer construction throws", () => {
    threeState.failConstruction = true;
    const renderer = new ThreeRenderer();

    expect(renderer.mount(
      new EventTarget() as HTMLCanvasElement,
      { lost: vi.fn(), restored: vi.fn() },
    )).toBe(false);
    expect(threeState.instances).toHaveLength(0);
    expect(renderer.stats().calls).toBe(0);
    expect(() => renderer.dispose()).not.toThrow();
  });

  it("applies an explicit output buffer and tone-mapping policy", () => {
    const canvas = new EventTarget() as HTMLCanvasElement;
    const renderer = new ThreeRenderer({
      checkShaderErrors: true,
      outputBufferType: 1_016 as never,
      toneMapping: 4 as never,
      toneMappingExposure: 0.1,
    });

    expect(renderer.mount(
      canvas,
      { lost: vi.fn(), restored: vi.fn() },
    )).toBe(true);
    const instance = threeState.instances[0]!;
    expect(instance.options).toMatchObject({
      outputBufferType: 1_016,
    });
    expect(instance.debug.checkShaderErrors).toBe(true);
    expect(instance.toneMapping).toBe(4);
    expect(instance.toneMappingExposure).toBe(0.1);
  });
});
