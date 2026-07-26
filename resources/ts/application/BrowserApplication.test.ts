import { describe, expect, it, vi } from "vitest";
import { BrowserApplication } from "./BrowserApplication.js";

class FakeEventTarget {
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, event: Event): void {
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === "function") listener(event);
      else listener.handleEvent(event);
    }
  }
}

describe("BrowserApplication", () => {
  it("keeps visibility and BFCache suspensions independent", () => {
    const view = new FakeEventTarget();
    const documentRoot = new FakeEventTarget() as FakeEventTarget & {
      defaultView: FakeEventTarget;
      visibilityState: DocumentVisibilityState;
      querySelector: (selector: string) => unknown;
    };
    documentRoot.defaultView = view;
    documentRoot.visibilityState = "visible";
    documentRoot.querySelector = (selector) => selector === "#webgl-canvas" ? {} : null;

    const releases = [vi.fn(), vi.fn()];
    const frames = {
      acquireSuspension: vi.fn(() => releases.shift()!),
      invalidate: vi.fn(),
      dispose: vi.fn(),
    };
    const graphics = {
      mount: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
    };
    const scroll = {
      mount: vi.fn(),
      refresh: vi.fn(),
      dispose: vi.fn(),
    };
    const logger = {
      debug: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    };
    const pages = { resolve: vi.fn(), create: vi.fn() };
    const application = new BrowserApplication(
      graphics as never,
      frames as never,
      pages as never,
      scroll as never,
      logger as never,
    );

    application.mount(documentRoot as unknown as Document);
    documentRoot.visibilityState = "hidden";
    documentRoot.dispatch("visibilitychange", new Event("visibilitychange"));
    view.dispatch("pagehide", Object.assign(new Event("pagehide"), { persisted: true }));

    expect(frames.acquireSuspension).toHaveBeenCalledTimes(2);
    view.dispatch("pageshow", Object.assign(new Event("pageshow"), { persisted: true }));
    expect(scroll.refresh).not.toHaveBeenCalled();
    expect(frames.invalidate).not.toHaveBeenCalled();

    documentRoot.visibilityState = "visible";
    documentRoot.dispatch("visibilitychange", new Event("visibilitychange"));
    expect(scroll.refresh).toHaveBeenCalledOnce();
    expect(frames.invalidate).toHaveBeenCalledOnce();
    application.dispose();
  });
});
