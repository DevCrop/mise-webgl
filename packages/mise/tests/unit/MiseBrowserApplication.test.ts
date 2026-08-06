import { describe, expect, it, vi } from "vitest";
import { MiseBrowserApplication } from "../../src/application/MiseBrowserApplication.js";
import type {
  MiseHealthReport,
  MiseNavigationLifecycle,
} from "../../src/Index.js";

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

function createFixture(
  initialExperience?: string,
  initialExperienceRoot?: "surface" | "body",
) {
  const view = new FakeEventTarget();
  const documentRoot = new FakeEventTarget() as FakeEventTarget & {
    body: HTMLElement;
    defaultView: FakeEventTarget;
    visibilityState: DocumentVisibilityState;
  };
  const body = {} as HTMLElement;
  documentRoot.body = body;
  documentRoot.defaultView = view;
  documentRoot.visibilityState = "visible";

  const releases = [vi.fn(), vi.fn()];
  const frames = {
    acquireSuspension: vi.fn(() => releases.shift()!),
    invalidate: vi.fn(),
    dispose: vi.fn(),
  };
  const mise = {
    mount: vi.fn(() => Promise.resolve()),
    activate: vi.fn(() => Promise.resolve(true)),
    refresh: vi.fn(),
    dispose: vi.fn(),
  };
  const pages = {
    mount: vi.fn(() => Promise.resolve()),
    leave: vi.fn(() => Promise.resolve()),
    dispose: vi.fn(),
  };
  const scroll = {
    mount: vi.fn(),
    refresh: vi.fn(),
    dispose: vi.fn(),
  };
  const motion = { dispose: vi.fn() };
  const navigation = { mount: vi.fn(), dispose: vi.fn() };
  let navigationLifecycle: MiseNavigationLifecycle | null = null;
  const createNavigation = vi.fn((
    _documentRoot: Document,
    lifecycle: MiseNavigationLifecycle,
  ) => {
    navigationLifecycle = lifecycle;
    return navigation;
  });
  const logger = {
    debug: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  };
  logger.child.mockReturnValue(logger);
  const health = {
    mark: vi.fn(),
    report: vi.fn<() => MiseHealthReport>(() => ({
      status: "healthy",
      observed: [],
      missing: [],
      total: 0,
    })),
  };
  const canvas = {} as HTMLCanvasElement;
  const surface = {
    mount: vi.fn(() => canvas),
    dispose: vi.fn(),
  };
  const application = new MiseBrowserApplication(
    mise as never,
    frames as never,
    pages as never,
    scroll as never,
    motion as never,
    createNavigation as never,
    logger as never,
    health as never,
    surface as never,
    initialExperience,
    initialExperienceRoot,
  );

  return {
    application,
    body,
    createNavigation,
    documentRoot,
    frames,
    health,
    logger,
    mise,
    navigation,
    getNavigationLifecycle: () => navigationLifecycle,
    pages,
    motion,
    scroll,
    surface,
    canvas,
    view,
  };
}

describe("MiseBrowserApplication", () => {
  it("keeps visibility and BFCache suspensions independent", async () => {
    const fixture = createFixture();
    fixture.application.mount(fixture.documentRoot as unknown as Document);
    await vi.waitFor(() => {
      expect(fixture.navigation.mount).toHaveBeenCalledOnce();
    });
    fixture.documentRoot.visibilityState = "hidden";
    fixture.documentRoot.dispatch("visibilitychange", new Event("visibilitychange"));
    fixture.view.dispatch(
      "pagehide",
      Object.assign(new Event("pagehide"), { persisted: true }),
    );

    expect(fixture.frames.acquireSuspension).toHaveBeenCalledTimes(2);
    fixture.view.dispatch(
      "pageshow",
      Object.assign(new Event("pageshow"), { persisted: true }),
    );
    expect(fixture.scroll.refresh).not.toHaveBeenCalled();
    expect(fixture.frames.invalidate).not.toHaveBeenCalled();

    fixture.documentRoot.visibilityState = "visible";
    fixture.documentRoot.dispatch("visibilitychange", new Event("visibilitychange"));
    expect(fixture.scroll.refresh).toHaveBeenCalledOnce();
    expect(fixture.frames.invalidate).toHaveBeenCalledOnce();
    fixture.application.dispose();
    expect(fixture.surface.dispose).toHaveBeenCalledOnce();
    expect(fixture.logger.debug).toHaveBeenCalledWith("application.disposed");
  });

  it("delegates navigation lifecycle to PageChanger", async () => {
    const fixture = createFixture();
    fixture.application.mount(fixture.documentRoot as unknown as Document);
    await vi.waitFor(() => {
      expect(fixture.navigation.mount).toHaveBeenCalledOnce();
    });

    const lifecycle = fixture.getNavigationLifecycle();
    await lifecycle?.beforeChange();
    await lifecycle?.afterChange();

    expect(fixture.pages.leave).toHaveBeenCalledOnce();
    expect(fixture.pages.mount).toHaveBeenCalled();
    expect(fixture.navigation.mount).toHaveBeenCalledOnce();
    expect(fixture.health.mark).toHaveBeenCalledWith(
      "browser-application.navigation",
    );
  });

  it("activates the configured initial experience before navigation", async () => {
    const fixture = createFixture("home");

    fixture.application.mount(fixture.documentRoot as unknown as Document);
    await vi.waitFor(() => {
      expect(fixture.navigation.mount).toHaveBeenCalledOnce();
    });

    expect(fixture.mise.activate).toHaveBeenCalledWith("home", fixture.canvas);
    expect(fixture.mise.activate.mock.invocationCallOrder[0]).toBeLessThan(
      fixture.navigation.mount.mock.invocationCallOrder[0]!,
    );
  });

  it("can scope the initial experience to document flow", async () => {
    const fixture = createFixture("home", "body");

    fixture.application.mount(fixture.documentRoot as unknown as Document);
    await vi.waitFor(() => {
      expect(fixture.navigation.mount).toHaveBeenCalledOnce();
    });

    expect(fixture.mise.activate).toHaveBeenCalledWith("home", fixture.body);
  });

  it("owns disposal even when it was never mounted", () => {
    const fixture = createFixture();

    fixture.application.dispose();
    fixture.application.dispose();
    fixture.application.mount(fixture.documentRoot as unknown as Document);

    expect(fixture.pages.dispose).toHaveBeenCalledOnce();
    expect(fixture.scroll.dispose).toHaveBeenCalledOnce();
    expect(fixture.frames.dispose).toHaveBeenCalledOnce();
    expect(fixture.surface.dispose).toHaveBeenCalledOnce();
    expect(fixture.surface.mount).not.toHaveBeenCalled();
  });

  it("attempts every browser cleanup after an adapter throws", () => {
    const fixture = createFixture();
    fixture.scroll.dispose.mockImplementation(() => {
      throw new Error("scroll cleanup failed");
    });

    expect(() => fixture.application.dispose()).toThrow(
      "MISE browser application cleanup failed.",
    );
    expect(fixture.motion.dispose).toHaveBeenCalledOnce();
    expect(fixture.mise.dispose).toHaveBeenCalledOnce();
    expect(fixture.frames.dispose).toHaveBeenCalledOnce();
    expect(fixture.surface.dispose).toHaveBeenCalledOnce();
    expect(fixture.logger.warning).toHaveBeenCalledWith(
      "application.dispose_failed",
      { type: "MiseAggregateError" },
    );
    expect(() => fixture.application.dispose()).not.toThrow();
  });

  it("reports stable missing Health keys after mount", async () => {
    const fixture = createFixture();
    fixture.health.report.mockReturnValue({
      status: "pending",
      observed: ["application.providers"],
      missing: ["scene.object-factory"],
      total: 2,
    });

    fixture.application.mount(fixture.documentRoot as unknown as Document);
    await vi.waitFor(() => {
      expect(fixture.logger.debug).toHaveBeenCalledWith(
        "mise.health_pending",
        {
          observed: 1,
          total: 2,
          missing: ["scene.object-factory"],
        },
      );
    });
  });
});
