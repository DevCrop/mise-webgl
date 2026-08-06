import { describe, expect, it, vi } from "vitest";
import {
  auto,
  MiseError,
  scroll,
  type FrameTick,
} from "../../src/Index.js";
import {
  createAutoDriver,
  createScrollDriver,
  registerCoreDrivers,
} from "../../src/kernel/Drivers.js";

describe("MISE drivers", () => {
  it("rejects a specification assigned to the wrong core factory", () => {
    const context = {
      root: {} as HTMLElement,
      view: {} as Window,
      reducedMotion: { active: false },
    };

    const scrollError = captureError(() => createScrollDriver({
      kind: "auto",
      duration: 1,
      loop: false,
      reducedMotion: { mode: "complete" },
    }, context));
    expect(scrollError).toBeInstanceOf(MiseError);
    expect(scrollError).toMatchObject({
      code: "MISE_DRIVER_SPEC_MISMATCH",
      message: "Scroll driver requires a scroll specification.",
    });
    const autoError = captureError(() => createAutoDriver({
      kind: "scroll",
      trigger: "main",
      start: "top top",
      end: "bottom bottom",
    }, context));
    expect(autoError).toBeInstanceOf(MiseError);
    expect(autoError).toMatchObject({
      code: "MISE_DRIVER_SPEC_MISMATCH",
      message: "Auto driver requires an auto specification.",
    });
  });

  it("registers exactly the two core driver factories", () => {
    const add = vi.fn();

    registerCoreDrivers({ drivers: { add } });

    expect(add.mock.calls).toEqual([
      ["scroll", createScrollDriver],
      ["auto", createAutoDriver],
    ]);
  });

  it("maps document position to local scene progress", () => {
    const root = {
      matches: () => true,
      querySelector: () => null,
      getBoundingClientRect: () => ({
        top: 0,
        height: 2000,
      }),
    } as unknown as HTMLElement;
    const driver = createScrollDriver({
      kind: "scroll",
      trigger: '[data-page="home"]',
      start: "top top",
      end: "bottom bottom",
    }, {
      root,
      view: { scrollY: 0, innerHeight: 1000 } as Window,
      reducedMotion: { active: false },
    });
    driver.setScroll({
      progress: 0.5,
      position: 500,
      velocity: 200,
      direction: 1,
    });

    const sample = driver.sample(tick(1, 0.016));
    expect(sample).toMatchObject({
      progress: 0.5,
      active: true,
      direction: 1,
    });
    driver.setScroll({
      progress: 0.75,
      position: 750,
      velocity: 100,
      direction: 1,
    });
    expect(driver.sample(tick(2, 0.016))).toBe(sample);
    expect(sample.progress).toBe(0.75);
    expect(sample).toEqual({
      progress: 0.75,
      active: true,
      direction: 1,
      velocity: 100,
      demand: "idle",
    });
  });

  it.each([
    ["top top", 100],
    ["top bottom", -900],
    ["bottom top", 2100],
    ["bottom bottom", 1100],
  ] as const)("resolves the %s scroll edge", (edge, expectedStart) => {
    const trigger = {
      getBoundingClientRect: () => ({ top: 50, height: 2000 }),
    } as HTMLElement;
    const root = {
      matches: () => false,
      querySelector: vi.fn(() => trigger),
    } as unknown as HTMLElement;
    const driver = createScrollDriver({
      kind: "scroll",
      trigger: ".scene",
      start: edge,
      end: edge,
    }, {
      root,
      view: { scrollY: 50, innerHeight: 1000 } as Window,
      reducedMotion: { active: false },
    });
    driver.setScroll({
      progress: 0,
      position: expectedStart,
      velocity: 0,
      direction: 0,
    });

    expect(root.querySelector).toHaveBeenCalledWith(".scene");
    expect(driver.sample(tick(0, 0))).toMatchObject({
      progress: 0,
      active: true,
    });
  });

  it("falls back to the root, clamps progress, and supports reversed ranges", () => {
    const root = {
      matches: () => false,
      querySelector: () => null,
      getBoundingClientRect: () => ({ top: 0, height: 1000 }),
    } as unknown as HTMLElement;
    const driver = createScrollDriver({
      kind: "scroll",
      trigger: ".missing",
      start: "bottom top",
      end: "top top",
    }, {
      root,
      view: { scrollY: 0, innerHeight: 1000 } as Window,
      reducedMotion: { active: false },
    });

    driver.setScroll({
      progress: 0,
      position: 1500,
      velocity: -20,
      direction: -1,
    });
    expect(driver.sample(tick(0, 0))).toEqual({
      progress: 0,
      active: false,
      direction: -1,
      velocity: -20,
      demand: "idle",
    });
    driver.setScroll({
      progress: 0,
      position: 500,
      velocity: 0,
      direction: 0,
    });
    expect(driver.sample(tick(0, 0))).toMatchObject({
      progress: 0.5,
      active: true,
    });
    driver.setScroll({
      progress: 0,
      position: -500,
      velocity: 0,
      direction: 0,
    });
    expect(driver.sample(tick(0, 0))).toMatchObject({
      progress: 1,
      active: false,
    });
  });

  it("pauses auto motion without requesting frames", () => {
    const reducedMotion = { active: true };
    const driver = createAutoDriver({
      kind: "auto",
      duration: 2,
      loop: true,
      reducedMotion: { mode: "pause" },
    }, {
      root: {} as HTMLElement,
      view: {} as Window,
      reducedMotion,
    });

    expect(driver.sample(tick(10, 0.016))).toMatchObject({
      progress: 0,
      demand: "idle",
      active: true,
    });

    reducedMotion.active = false;
    expect(driver.sample(tick(20, 0.016))).toMatchObject({
      progress: 0,
      demand: "next",
    });
  });

  it("completes auto motion immediately when requested", () => {
    const driver = createAutoDriver({
      kind: "auto",
      duration: 2,
      loop: false,
      reducedMotion: { mode: "complete" },
    }, {
      root: {} as HTMLElement,
      view: {} as Window,
      reducedMotion: { active: true },
    });

    expect(driver.sample(tick(10, 0.016))).toMatchObject({
      progress: 1,
      direction: 0,
      demand: "idle",
    });
  });

  it("shortens auto motion to one non-looping reduced-motion pass", () => {
    const driver = createAutoDriver({
      kind: "auto",
      duration: 8,
      loop: true,
      reducedMotion: { mode: "shorten", duration: 0.2 },
    }, {
      root: {} as HTMLElement,
      view: {} as Window,
      reducedMotion: { active: true },
    });

    expect(driver.sample(tick(10, 0.016))).toMatchObject({
      progress: 0,
      demand: "next",
    });
    expect(driver.sample(tick(10.2, 0.2))).toMatchObject({
      progress: 1,
      demand: "idle",
    });
  });

  it("does not catch up after a suspended RAF timestamp jump", () => {
    const driver = createAutoDriver({
      kind: "auto",
      duration: 5,
      loop: false,
      reducedMotion: { mode: "pause" },
    }, {
      root: {} as HTMLElement,
      view: {} as Window,
      reducedMotion: { active: false },
    });

    expect(driver.sample(tick(1, 0))).toMatchObject({ progress: 0 });
    expect(driver.sample(tick(2, 1))).toMatchObject({ progress: 0.2 });
    expect(driver.sample(tick(200, 0))).toMatchObject({
      progress: 0.2,
      demand: "next",
    });
  });

  it("pauses and resumes the normal timeline across live reduced motion", () => {
    const reducedMotion = { active: false };
    const driver = createAutoDriver({
      kind: "auto",
      duration: 4,
      loop: false,
      reducedMotion: { mode: "pause" },
    }, {
      root: {} as HTMLElement,
      view: {} as Window,
      reducedMotion,
    });

    driver.sample(tick(1, 0));
    expect(driver.sample(tick(2, 1))).toMatchObject({ progress: 0.25 });
    reducedMotion.active = true;
    expect(driver.sample(tick(3, 1))).toMatchObject({
      progress: 0,
      demand: "idle",
    });
    reducedMotion.active = false;
    expect(driver.sample(tick(20, 0))).toMatchObject({ progress: 0.25 });
    expect(driver.sample(tick(21, 1))).toMatchObject({ progress: 0.5 });
  });

  it("isolates and restarts shortened motion without advancing normal time", () => {
    const reducedMotion = { active: false };
    const driver = createAutoDriver({
      kind: "auto",
      duration: 4,
      loop: false,
      reducedMotion: { mode: "shorten", duration: 0.2 },
    }, {
      root: {} as HTMLElement,
      view: {} as Window,
      reducedMotion,
    });

    driver.sample(tick(1, 0));
    expect(driver.sample(tick(2, 1))).toMatchObject({ progress: 0.25 });
    reducedMotion.active = true;
    expect(driver.sample(tick(3, 0))).toMatchObject({ progress: 0 });
    expect(driver.sample(tick(3.1, 0.1))).toMatchObject({ progress: 0.5 });
    expect(driver.sample(tick(3.2, 0.1))).toMatchObject({ progress: 1 });
    reducedMotion.active = false;
    expect(driver.sample(tick(4, 0))).toMatchObject({ progress: 0.25 });
    reducedMotion.active = true;
    expect(driver.sample(tick(5, 0))).toMatchObject({ progress: 0 });
    expect(driver.sample(tick(5.1, 0.1))).toMatchObject({ progress: 0.5 });
  });

  it("loops normal auto motion and resets its clock on disposal", () => {
    const driver = createAutoDriver({
      kind: "auto",
      duration: 2,
      loop: true,
      reducedMotion: { mode: "complete" },
    }, {
      root: {} as HTMLElement,
      view: {} as Window,
      reducedMotion: { active: false },
    });

    expect(driver.sample(tick(10, 0))).toEqual({
      progress: 0,
      direction: 1,
      velocity: 0,
      active: true,
      demand: "next",
    });
    expect(driver.sample(tick(11, 1))).toMatchObject({
      progress: 0.5,
      demand: "next",
    });
    expect(driver.sample(tick(12.5, 1.5))).toMatchObject({
      progress: 0.25,
      demand: "next",
    });

    driver.dispose();
    expect(driver.sample(tick(20, 0))).toMatchObject({
      progress: 0,
      demand: "next",
    });
  });

  it("clamps a non-looping timeline and idles only at completion", () => {
    const driver = createAutoDriver({
      kind: "auto",
      duration: 2,
      loop: false,
      reducedMotion: { mode: "pause" },
    }, {
      root: {} as HTMLElement,
      view: {} as Window,
      reducedMotion: { active: false },
    });

    expect(driver.sample(tick(10, 0))).toMatchObject({
      progress: 0,
      demand: "next",
    });
    const nearlyComplete = driver.sample(tick(11.999, 1.999));
    expect(nearlyComplete.progress).toBeCloseTo(0.9995, 10);
    expect(nearlyComplete.demand).toBe("next");
    expect(driver.sample(tick(12, 0.001))).toMatchObject({
      progress: 1,
      demand: "idle",
    });
  });

  it("rejects non-finite duration and empty scroll triggers", () => {
    expect(() => auto({
      duration: Number.POSITIVE_INFINITY,
      loop: false,
      reducedMotion: { mode: "complete" },
    }))
      .toThrow("finite and positive");
    expect(() => auto({
      duration: 1,
      loop: false,
      reducedMotion: { mode: "shorten", duration: 0 },
    })).toThrow("reduced-motion duration");
    expect(() => auto({
      duration: 1,
      loop: "yes" as never,
      reducedMotion: { mode: "complete" },
    })).toThrow("loop must be boolean");
    expect(() => auto({
      duration: 1,
      loop: false,
      reducedMotion: { mode: "unknown" } as never,
    })).toThrow("mode is invalid");
    expect(() => scroll({
      trigger: " ",
      start: "top top",
      end: "bottom bottom",
    })).toThrow("must not be empty");
    expect(() => scroll({
      trigger: "main",
      start: "center center" as never,
      end: "bottom bottom",
    })).toThrow("edge is invalid");
  });

  it("keeps helper-owned core driver discriminators at runtime", () => {
    const scrollSpec = scroll({
      trigger: "main",
      start: "top top",
      end: "bottom bottom",
      kind: "auto",
    } as never);
    const autoSpec = auto({
      duration: 1,
      loop: false,
      reducedMotion: { mode: "complete" },
      kind: "scroll",
    } as never);

    expect(scrollSpec.kind).toBe("scroll");
    expect(autoSpec.kind).toBe("auto");
  });
});

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error("Expected action to throw.");
}

function tick(time: number, delta: number): FrameTick {
  return {
    time,
    delta,
    rawDelta: delta,
    elapsed: time,
    frame: Math.round(time * 1000),
  };
}
