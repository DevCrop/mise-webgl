import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FrameLoop,
  type FrameRequest,
} from "../../src/kernel/FrameLoop.js";
import { QualityManager } from "../../src/kernel/QualityManager.js";
import { ViewportManager } from "../../src/kernel/ViewportManager.js";

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

class FakeMediaQueryList extends FakeEventTarget {
  constructor(public matches: boolean) {
    super();
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
    const coarsePointer = new FakeMediaQueryList(true);
    const screenOrientation = new FakeEventTarget();
    vi.stubGlobal("window", {
      devicePixelRatio: 3,
      visualViewport,
      matchMedia: () => coarsePointer,
      screen: { orientation: screenOrientation },
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
    screenOrientation.dispatch("change");

    expect(callbacks.size).toBe(1);
    const [id, callback] = callbacks.entries().next().value as [number, FrameRequestCallback];
    callbacks.delete(id);
    callback(16);

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(viewport.snapshot()?.pixelRatio).toBe(1.5);

    canvas.clientWidth = 1024;
    canvas.clientHeight = 1366;
    resizeCallback.current?.([], {} as ResizeObserver);
    const [coarseId, coarseCallback] = callbacks.entries().next().value as [
      number,
      FrameRequestCallback,
    ];
    callbacks.delete(coarseId);
    coarseCallback(32);
    expect(viewport.snapshot()?.pixelRatio).toBeCloseTo(
      Math.sqrt(2_073_600 / (1024 * 1366)),
    );

    coarsePointer.matches = false;
    coarsePointer.dispatch("change");
    const [fineId, fineCallback] = callbacks.entries().next().value as [
      number,
      FrameRequestCallback,
    ];
    callbacks.delete(fineId);
    fineCallback(48);
    expect(viewport.snapshot()?.pixelRatio).toBeCloseTo(
      Math.sqrt(5_184_000 / (1024 * 1366)),
    );

    viewport.dispose();
    viewport.dispose();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("uses the legacy orientation event when Screen Orientation is unavailable", () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    const frames = new FrameLoop(
      (callback) => {
        const id = nextId++;
        callbacks.set(id, callback);
        return id;
      },
      (id) => callbacks.delete(id),
    );
    const windowEvents = new FakeEventTarget();
    const coarsePointer = new FakeMediaQueryList(true);
    vi.stubGlobal("window", {
      devicePixelRatio: 3,
      visualViewport: null,
      matchMedia: () => coarsePointer,
      screen: {},
      addEventListener: windowEvents.addEventListener.bind(windowEvents),
      removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
    });
    vi.stubGlobal("ResizeObserver", undefined);

    const canvas = { clientWidth: 390, clientHeight: 844 };
    const onChange = vi.fn();
    const viewport = new ViewportManager(new QualityManager(), frames, onChange);
    viewport.mount(canvas as HTMLCanvasElement);
    canvas.clientWidth = 844;
    canvas.clientHeight = 390;
    windowEvents.dispatch("orientationchange");

    expect(callbacks.size).toBe(1);
    const [id, callback] = callbacks.entries().next().value as [
      number,
      FrameRequestCallback,
    ];
    callbacks.delete(id);
    callback(16);
    expect(viewport.snapshot()).toMatchObject({
      width: 844,
      height: 390,
      pixelRatio: 1.5,
    });
    viewport.dispose();
  });
});
