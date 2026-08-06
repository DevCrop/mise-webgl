import { Camera, Scene } from "three";
import { describe, expect, it, vi } from "vitest";
import type {
  FrameState,
  SceneDefinition,
  SceneInstance,
  ViewportState,
} from "../../src/Index.js";
import type { MiseLogger } from "../../src/logging/MiseLogger.js";
import { MiseHealthCheck } from "../../src/kernel/MiseHealthCheck.js";
import { SceneChanger } from "../../src/kernel/SceneChanger.js";

function fakeScene(): SceneInstance {
  return {
    scene: new Scene(),
    camera: new Camera(),
    mount: vi.fn(),
    frame: vi.fn((_state: FrameState): "idle" => "idle"),
    resize: vi.fn((_viewport: ViewportState) => undefined),
    dispose: vi.fn(),
  };
}

function definition(id: string, instance: SceneInstance): SceneDefinition {
  return {
    id,
    drive: {
      kind: "auto",
      duration: 1,
      loop: false,
      reducedMotion: { mode: "complete" },
    },
    create: () => instance,
  };
}

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

describe("SceneChanger", () => {
  it("keeps the current scene when incoming preparation fails", async () => {
    const current = fakeScene();
    const director = new SceneChanger(
      logger,
      { active: false },
      false,
      new MiseHealthCheck(),
    );
    const root = {} as HTMLElement;
    await director.switchTo(definition("current", current), root);

    await expect(director.switchTo({
      id: "broken",
      drive: {
        kind: "auto",
        duration: 1,
        loop: false,
        reducedMotion: { mode: "complete" },
      },
      create: () => {
        throw new Error("prepare failed");
      },
    }, root)).rejects.toThrow("prepare failed");

    expect(director.renderState()?.scene).toBe(current.scene);
    expect(current.dispose).not.toHaveBeenCalled();
  });

  it("rolls back the candidate when an async before-enter hook rejects", async () => {
    const current = fakeScene();
    const incoming = fakeScene();
    const director = new SceneChanger(
      logger,
      { active: false },
      false,
      new MiseHealthCheck(),
    );
    const root = {} as HTMLElement;
    await director.switchTo(definition("current", current), root);

    await expect(director.switchTo({
      ...definition("incoming", incoming),
      beforeEnter: async () => {
        await Promise.resolve();
        throw new TypeError("required preparation failed");
      },
    }, root)).rejects.toThrow("required preparation failed");

    expect(director.activeId).toBe("current");
    expect(current.dispose).not.toHaveBeenCalled();
    expect(incoming.dispose).toHaveBeenCalledOnce();
    expect(incoming.mount).not.toHaveBeenCalled();
  });

  it("commits incoming before disposing outgoing", async () => {
    const order: string[] = [];
    const current = fakeScene();
    const incoming = fakeScene();
    vi.mocked(incoming.mount).mockImplementation(() => order.push("mount incoming"));
    vi.mocked(current.dispose).mockImplementation(() => order.push("dispose current"));
    const director = new SceneChanger(
      logger,
      { active: false },
      false,
      new MiseHealthCheck(),
    );
    const root = {} as HTMLElement;
    await director.switchTo(definition("current", current), root);
    await director.switchTo(definition("incoming", incoming), root);

    expect(order).toEqual(["mount incoming", "dispose current"]);
    expect(director.activeId).toBe("incoming");
  });

  it("runs scene cues in deterministic before/commit/after order", async () => {
    const order: string[] = [];
    const current = fakeScene();
    const incoming = fakeScene();
    vi.mocked(current.dispose).mockImplementation(() => order.push("dispose current"));
    vi.mocked(incoming.mount).mockImplementation(() => order.push("mount incoming"));
    const director = new SceneChanger(
      logger,
      { active: false },
      false,
      new MiseHealthCheck(),
    );
    const root = {} as HTMLElement;
    await director.switchTo({
      ...definition("current", current),
      beforeLeave: () => {
        order.push("before leave");
      },
      afterLeave: () => {
        order.push("after leave");
      },
    }, root);
    order.length = 0;

    await director.switchTo({
      id: "incoming",
      drive: {
        kind: "auto",
        duration: 1,
        loop: false,
        reducedMotion: { mode: "complete" },
      },
      create: () => {
        order.push("create incoming");
        return incoming;
      },
      beforeEnter: () => {
        order.push("before enter");
      },
      afterEnter: () => {
        order.push("after enter");
      },
    }, root);

    expect(order).toEqual([
      "create incoming",
      "before enter",
      "mount incoming",
      "before leave",
      "dispose current",
      "after leave",
      "after enter",
    ]);
  });

  it("awaits promise hooks and shares a frozen transition context", async () => {
    const order: string[] = [];
    const contexts: unknown[] = [];
    const current = fakeScene();
    const incoming = fakeScene();
    const director = new SceneChanger(
      logger,
      { active: false },
      false,
      new MiseHealthCheck(),
    );
    const root = {} as HTMLElement;
    await director.switchTo({
      ...definition("current", current),
      beforeLeave: async (context) => {
        await Promise.resolve();
        contexts.push(context);
        order.push("before leave");
      },
      afterLeave: async (context) => {
        await Promise.resolve();
        contexts.push(context);
        order.push("after leave");
      },
    }, root);
    order.length = 0;

    await director.switchTo({
      ...definition("incoming", incoming),
      beforeEnter: async (context) => {
        await Promise.resolve();
        contexts.push(context);
        order.push("before enter");
      },
      afterEnter: async (context) => {
        await Promise.resolve();
        contexts.push(context);
        order.push("after enter");
      },
    }, root);

    expect(order).toEqual([
      "before enter",
      "before leave",
      "after leave",
      "after enter",
    ]);
    expect(contexts).toHaveLength(4);
    expect(contexts.every((context) => context === contexts[0])).toBe(true);
    expect(contexts[0]).toMatchObject({
      from: "current",
      to: "incoming",
    });
    expect(Object.isFrozen(contexts[0])).toBe(true);
  });

  it("keeps the committed scene active when an after hook rejects", async () => {
    const warning = vi.fn();
    const localLogger = {
      ...logger,
      warning,
    } as unknown as MiseLogger;
    const incoming = fakeScene();
    const director = new SceneChanger(
      localLogger,
      { active: false },
      false,
      new MiseHealthCheck(),
    );

    await expect(director.switchTo({
      ...definition("incoming", incoming),
      afterEnter: async () => {
        throw new TypeError("post-commit failure");
      },
    }, {} as HTMLElement)).resolves.toBe(true);

    expect(director.activeId).toBe("incoming");
    expect(director.state).toBe("active");
    expect(warning).toHaveBeenCalledWith("scene.hook_failed", {
      scene: "incoming",
      type: "TypeError",
    });
  });

  it("reports a committed scene when a newer pre-commit transition fails", async () => {
    const committed = fakeScene();
    const rejected = fakeScene();
    let finishAfterEnter = (): void => undefined;
    const afterEnter = new Promise<void>((resolve) => {
      finishAfterEnter = resolve;
    });
    const director = new SceneChanger(
      logger,
      { active: false },
      false,
      new MiseHealthCheck(),
    );
    const root = {} as HTMLElement;
    const committedTransition = director.switchTo({
      ...definition("committed", committed),
      afterEnter: () => afterEnter,
    }, root);

    await vi.waitFor(() => expect(director.activeId).toBe("committed"));
    await expect(director.switchTo({
      ...definition("rejected", rejected),
      beforeEnter: () => {
        throw new TypeError("replacement rejected");
      },
    }, root)).rejects.toThrow("replacement rejected");
    finishAfterEnter();

    await expect(committedTransition).resolves.toBe(true);
    expect(director.activeId).toBe("committed");
    expect(committed.dispose).not.toHaveBeenCalled();
    expect(rejected.dispose).toHaveBeenCalledOnce();
  });

  it("skips stale before-enter cues after asynchronous creation", async () => {
    const current = fakeScene();
    const stale = fakeScene();
    const latest = fakeScene();
    const beforeEnter = vi.fn();
    let finishCreate = (_instance: SceneInstance): void => undefined;
    const pendingCreate = new Promise<SceneInstance>((resolve) => {
      finishCreate = resolve;
    });
    const director = new SceneChanger(
      logger,
      { active: false },
      false,
      new MiseHealthCheck(),
    );
    const root = {} as HTMLElement;
    await director.switchTo(definition("current", current), root);

    const staleTransition = director.switchTo({
      ...definition("stale", stale),
      create: () => pendingCreate,
      beforeEnter,
    }, root);
    await director.switchTo(definition("latest", latest), root);
    finishCreate(stale);

    await expect(staleTransition).resolves.toBe(false);
    expect(beforeEnter).not.toHaveBeenCalled();
    expect(stale.dispose).toHaveBeenCalledOnce();
    expect(director.activeId).toBe("latest");
  });

  it("does not restore active state after after-enter clears the scene", async () => {
    const incoming = fakeScene();
    const director = new SceneChanger(
      logger,
      { active: false },
      false,
      new MiseHealthCheck(),
    );
    const root = {} as HTMLElement;

    const committed = await director.switchTo({
      ...definition("incoming", incoming),
      afterEnter: () => director.clear(),
    }, root);

    expect(committed).toBe(false);
    expect(director.activeId).toBeNull();
    expect(director.state).toBe("disposed");
    expect(incoming.dispose).toHaveBeenCalledOnce();
  });

  it("passes a live reduced-motion state into scene creation", async () => {
    const preference = { active: false };
    let received = { active: false } as { readonly active: boolean };
    const director = new SceneChanger(
      logger,
      preference,
      false,
      new MiseHealthCheck(),
    );
    const incoming = fakeScene();

    await director.switchTo({
      ...definition("incoming", incoming),
      create: (context) => {
        received = context.reducedMotion;
        return incoming;
      },
    }, {} as HTMLElement);
    preference.active = true;

    expect(received.active).toBe(true);
  });

  it("passes the active transition signal into scene creation", async () => {
    const signals: AbortSignal[] = [];
    const director = new SceneChanger(
      logger,
      { active: false },
      false,
      new MiseHealthCheck(),
    );

    await director.switchTo({
      ...definition("incoming", fakeScene()),
      create: (context) => {
        signals.push(context.signal);
        return fakeScene();
      },
    }, {} as HTMLElement);

    expect(signals).toHaveLength(1);
    expect(signals[0]?.aborted).toBe(false);
  });
});
