import { describe, expect, it, vi } from "vitest";
import type { FrameTick } from "../../src/Contracts.js";
import {
  createAutoDriver,
  createScrollDriver,
} from "../../src/kernel/Drivers.js";

describe("MISE driver boundaries", () => {
  it("starts with a stable zero scroll sample and short-circuits the root", () => {
    const querySelector = vi.fn(() => null);
    const root = {
      matches: () => true,
      querySelector,
      getBoundingClientRect: () => ({ top: 0, height: 100 }),
    } as unknown as HTMLElement;
    const driver = createScrollDriver({
      kind: "scroll",
      trigger: "body",
      start: "top top",
      end: "bottom top",
    }, {
      root,
      view: { scrollY: 0, innerHeight: 100 } as Window,
      reducedMotion: { active: false },
    });

    expect(driver.sample(tick(0, 0))).toEqual({
      progress: 0,
      direction: 0,
      velocity: 0,
      active: true,
      demand: "idle",
    });
    expect(querySelector).not.toHaveBeenCalled();
  });

  it("completes a non-loop timeline at the epsilon boundary", () => {
    const driver = createAutoDriver({
      kind: "auto",
      duration: 1,
      loop: false,
      reducedMotion: { mode: "pause" },
    }, {
      root: {} as HTMLElement,
      view: {} as Window,
      reducedMotion: { active: false },
    });

    driver.sample(tick(0, 0));

    expect(driver.sample(tick(1, 1 - 1e-9))).toMatchObject({
      progress: 1,
      demand: "idle",
    });
  });

  it("preserves a non-zero Number.EPSILON scroll range", () => {
    const root = {
      matches: () => true,
      querySelector: () => null,
      getBoundingClientRect: () => ({
        top: 0,
        height: Number.EPSILON,
      }),
    } as unknown as HTMLElement;
    const driver = createScrollDriver({
      kind: "scroll",
      trigger: "body",
      start: "top top",
      end: "bottom top",
    }, {
      root,
      view: { scrollY: 0, innerHeight: 1 } as Window,
      reducedMotion: { active: false },
    });
    driver.setScroll({
      progress: 1,
      position: Number.EPSILON,
      velocity: 0,
      direction: 1,
    });

    expect(driver.sample(tick(0, 0))).toMatchObject({
      progress: 1,
      active: true,
    });
  });
});

function tick(time: number, delta: number): FrameTick {
  return {
    time,
    delta,
    rawDelta: delta,
    elapsed: time,
    frame: Math.round(time * 1000),
  };
}
