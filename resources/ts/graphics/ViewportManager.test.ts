import { afterEach, describe, expect, it, vi } from "vitest";
import { FrameLoop, type FrameRequest } from "./FrameLoop.js";
import { QualityManager } from "./QualityManager.js";
import { ViewportManager } from "./ViewportManager.js";

class FakeEventTarget {
  private readonly listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener(new Event(type));
  }
}

afterEach(() => vi.unstubAllGlobals());

describe("ViewportManager", () => {
  it("coalesces browser viewport changes into one frame and keeps landscape mobile DPR", () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    const request: FrameRequest = (callback) => {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    };
    const frames = new FrameLoop(request, (id) => callbacks.delete(id));
    const windowEvents = new FakeEventTarget();
    const visualViewport = new FakeEventTarget();
    vi.stubGlobal("window", {
      devicePixelRatio: 3,
      visualViewport,
      addEventListener: windowEvents.addEventListener.bind(windowEvents),
      removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
    });

    const resizeCallback: { current?: ResizeObserverCallback } = {};
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback.current = callback;
      }

      observe(): void {}
      disconnect(): void {
        disconnect();
      }
    });

    const canvas = { clientWidth: 390, clientHeight: 844 };
    const onChange = vi.fn();
    const viewport = new ViewportManager(new QualityManager(), frames, onChange);
    viewport.mount(canvas as HTMLCanvasElement);

    expect(onChange).toHaveBeenCalledTimes(1);
    canvas.clientWidth = 844;
    canvas.clientHeight = 390;
    resizeCallback.current?.([], {} as ResizeObserver);
    windowEvents.dispatch("resize");
    visualViewport.dispatch("resize");

    expect(callbacks.size).toBe(1);
    const [id, callback] = callbacks.entries().next().value as [number, FrameRequestCallback];
    callbacks.delete(id);
    callback(16);

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(viewport.snapshot()?.pixelRatio).toBe(1.5);
    viewport.dispose();
    viewport.dispose();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
