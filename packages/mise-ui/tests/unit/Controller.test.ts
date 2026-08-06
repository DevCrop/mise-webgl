import { describe, expect, it, vi } from "vitest";
import {
  createMiseUi,
  createFocusReturn,
  defineController,
  matchesSearch,
  resolveTabIndex,
} from "../../src/Index.js";

describe("MISE UI controller lifecycle", () => {
  it("mounts once and disposes once", () => {
    const mount = vi.fn();
    const dispose = vi.fn();
    const element = {
      dataset: { miseController: "tabs" },
    } as unknown as HTMLElement;
    const root = {
      querySelectorAll: () => [element],
    } as unknown as ParentNode;
    const application = createMiseUi({
      root,
      controllers: [defineController({
        name: "tabs",
        create: () => ({ mount, dispose }),
      })],
    });

    application.start();
    application.start();
    application.dispose();
    application.dispose();

    expect(mount).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicate names", () => {
    const definition = defineController({
      name: "tabs",
      create: () => ({ mount(): void {}, dispose(): void {} }),
    });
    const root = { querySelectorAll: () => [] } as unknown as ParentNode;

    expect(() => createMiseUi({ root, controllers: [definition, definition] })).toThrow(
      /unique/u,
    );
  });
});

describe("MISE UI tabs keyboard", () => {
  it("wraps horizontal arrows and supports boundary keys", () => {
    expect(resolveTabIndex("ArrowLeft", 0, 3)).toBe(2);
    expect(resolveTabIndex("ArrowRight", 2, 3)).toBe(0);
    expect(resolveTabIndex("Home", 2, 3)).toBe(0);
    expect(resolveTabIndex("End", 0, 3)).toBe(2);
    expect(resolveTabIndex("ArrowDown", 0, 3)).toBeNull();
  });
});

describe("MISE UI search normalization", () => {
  it("matches Unicode-compatible, case-insensitive text", () => {
    expect(matchesSearch("  WEBGL ", "MISE WebGL API")).toBe(true);
    expect(matchesSearch("ｍｉｓｅ", "MISE Component")).toBe(true);
    expect(matchesSearch("PHP", "SCSS System")).toBe(false);
    expect(matchesSearch("", "Any document")).toBe(true);
  });
});

describe("MISE UI dialog focus return", () => {
  it("returns focus once and remains idempotent", () => {
    const focus = vi.fn();
    const focusReturn = createFocusReturn();

    focusReturn.capture({ focus });
    focusReturn.restore();
    focusReturn.restore();

    expect(focus).toHaveBeenCalledTimes(1);
  });
});
