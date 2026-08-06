import { describe, expect, it, vi } from "vitest";
import { MiseHealthCheck } from "../../src/kernel/MiseHealthCheck.js";
import { MisePlan } from "../../src/kernel/MisePlan.js";
import { PageChanger } from "../../src/kernel/PageChanger.js";

describe("PageChanger", () => {
  it("rejects a stale async page mount after disposal", async () => {
    let finishMount = (): void => undefined;
    const page = {
      mount: vi.fn(() => new Promise<void>((resolve) => {
        finishMount = resolve;
      })),
      leave: vi.fn(() => Promise.resolve()),
      dispose: vi.fn(() => {
        throw new Error("dispose failed");
      }),
    };
    const plan = new MisePlan({
      experiences: new Map(),
      drivers: new Map(),
      pages: new Map([["home", { id: "home", create: () => page }]]),
      motion: () => ({ createPageTransition: vi.fn(), dispose: vi.fn() }),
      navigation: () => ({ mount: vi.fn(), dispose: vi.fn() }),
      scroll: () => ({ mount: vi.fn(), refresh: vi.fn(), dispose: vi.fn() }),
      renderer: () => ({
        mount: () => true,
        resize: vi.fn(),
        render: vi.fn(),
        clear: vi.fn(),
        stats: () => ({
          calls: 0,
          triangles: 0,
          geometries: 0,
          textures: 0,
          programs: 0,
        }),
        dispose: vi.fn(),
      }),
      debug: () => ({
        enabled: false,
        mount: vi.fn(),
        update: vi.fn(),
        dispose: vi.fn(),
      }),
    });
    const scenes = {
      activate: vi.fn(() => Promise.resolve()),
      clear: vi.fn(),
      refresh: vi.fn(),
    };
    const motion = {
      createPageTransition: vi.fn(),
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
      warning: vi.fn(),
      error: vi.fn(),
    };
    const changer = new PageChanger(
      plan,
      scenes,
      motion,
      scroll,
      logger as never,
      new MiseHealthCheck(),
    );
    const root = { dataset: { page: "home" } };
    const documentRoot = {
      querySelector: vi.fn(() => root),
    } as unknown as Document;

    const mounting = changer.mount(documentRoot);
    await Promise.resolve();
    changer.dispose();
    finishMount();
    await mounting;

    expect(page.dispose).toHaveBeenCalledOnce();
    expect(logger.debug).toHaveBeenCalledWith(
      "page.mount_cancelled",
      { page: "home" },
    );
    expect(logger.success).not.toHaveBeenCalledWith(
      "page.mounted",
      { page: "home" },
    );
    expect(logger.warning).toHaveBeenCalledWith(
      "page.dispose_failed",
      { page: "home", type: "Error" },
    );
  });

  it("does not dispose a replacement page when a stale leave completes", async () => {
    let finishLeave = (): void => undefined;
    const first = {
      mount: vi.fn(),
      leave: vi.fn(() => new Promise<void>((resolve) => {
        finishLeave = resolve;
      })),
      dispose: vi.fn(),
    };
    const second = {
      mount: vi.fn(),
      leave: vi.fn(() => Promise.resolve()),
      dispose: vi.fn(),
    };
    const plan = {
      page: vi.fn((id: string | undefined) => {
        if (id === "first") return { id, create: () => first };
        if (id === "second") return { id, create: () => second };
        return null;
      }),
    } as unknown as MisePlan;
    const scenes = {
      activate: vi.fn(() => Promise.resolve()),
      clear: vi.fn(),
      refresh: vi.fn(),
    };
    const motion = {
      createPageTransition: vi.fn(),
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
      warning: vi.fn(),
      error: vi.fn(),
    };
    const changer = new PageChanger(
      plan,
      scenes,
      motion,
      scroll,
      logger as never,
      new MiseHealthCheck(),
    );
    let root = { dataset: { page: "first" } };
    const documentRoot = {
      querySelector: vi.fn(() => root),
    } as unknown as Document;
    await changer.mount(documentRoot);

    const leaving = changer.leave();
    await Promise.resolve();
    root = { dataset: { page: "second" } };
    await changer.mount(documentRoot);
    finishLeave();
    await leaving;

    expect(first.dispose).toHaveBeenCalledOnce();
    expect(second.dispose).not.toHaveBeenCalled();
  });
});
