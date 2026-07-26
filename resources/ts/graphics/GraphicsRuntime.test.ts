import { afterEach, describe, expect, it, vi } from "vitest";
import type { Logger } from "../logging/Logger.js";
import { FrameLoop, type FrameRequest } from "./FrameLoop.js";
import { GraphicsRuntime } from "./GraphicsRuntime.js";
import { QualityManager } from "./QualityManager.js";

function flush(callbacks: Map<number, FrameRequestCallback>, time: number): void {
  const entry = callbacks.entries().next().value as [number, FrameRequestCallback];
  callbacks.delete(entry[0]);
  entry[1](time);
}

afterEach(() => vi.unstubAllGlobals());

describe("GraphicsRuntime", () => {
  it("keeps time-based scenes rendering until the scene is cleared", () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    const request: FrameRequest = (callback) => {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    };
    const frames = new FrameLoop(request, (id) => callbacks.delete(id));
    vi.stubGlobal("window", {
      devicePixelRatio: 1,
      visualViewport: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("ResizeObserver", undefined);

    const renderer = {
      mount: vi.fn(() => true),
      resize: vi.fn(),
      render: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
    };
    const scenes = {
      switchTo: vi.fn(),
      recreate: vi.fn(),
      update: vi.fn(),
      resize: vi.fn(),
      setProgress: vi.fn(),
      renderState: vi.fn(() => null),
      clear: vi.fn(),
      dispose: vi.fn(),
    };
    const logger = {
      debug: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
    } as unknown as Logger;
    const graphics = new GraphicsRuntime(
      renderer as never,
      scenes as never,
      frames,
      new QualityManager(),
      logger,
    );

    graphics.mount({ clientWidth: 100, clientHeight: 100 } as HTMLCanvasElement);
    graphics.activate({
      id: "home",
      palette: { primary: "#000000", secondary: "#111111", accent: "#ffffff" },
    });

    expect(callbacks.size).toBe(1);
    flush(callbacks, 16);
    expect(callbacks.size).toBe(1);

    graphics.clear();
    flush(callbacks, 32);
    expect(callbacks.size).toBe(0);
    graphics.dispose();
  });
});
