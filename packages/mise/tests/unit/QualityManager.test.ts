import { describe, expect, it } from "vitest";
import { QualityManager } from "../../src/kernel/QualityManager.js";

describe("QualityManager", () => {
  it("caps mobile and desktop pixel ratios", () => {
    const quality = new QualityManager();
    expect(quality.pixelRatio(390, 844, 3)).toBe(1.5);
    expect(quality.pixelRatio(1440, 900, 3)).toBe(2);
    expect(quality.pixelRatio(844, 390, 3)).toBe(1.5);
    expect(quality.pixelRatio(768, 1200, 3)).toBe(1.5);
    expect(quality.pixelRatio(769, 1200, 3)).toBe(2);
    expect(quality.pixelRatio(1, 1, 0.1)).toBe(0.75);
  });

  it("uses pointer capability and drawing-buffer budgets without UA checks", () => {
    const quality = new QualityManager();
    expect(quality.pixelRatio(1024, 1366, 3, true)).toBeCloseTo(
      Math.sqrt(2_073_600 / (1024 * 1366)),
    );
    expect(quality.pixelRatio(1024, 1366, 3, false)).toBeCloseTo(
      Math.sqrt(5_184_000 / (1024 * 1366)),
    );
    expect(quality.pixelRatio(3840, 2160, 2, false)).toBeCloseTo(
      Math.sqrt(5_184_000 / (3840 * 2160)),
    );
    expect(quality.pixelRatio(Number.NaN, -1, Number.NaN, true)).toBe(1);
    expect(quality.pixelRatio(390, 844, 0, true)).toBe(1);
    expect(quality.pixelRatio(390, 844, -1, true)).toBe(1);
    expect(quality.pixelRatio(390, 844, Number.POSITIVE_INFINITY, true)).toBe(1);
  });

  it("reduces scale after sustained slow frames", () => {
    const quality = new QualityManager();
    expect(observeWindow(quality, 0.03)).toBe(true);
    expect(quality.tier).toBe("medium");
    expect(quality.pixelRatio(1440, 900, 2)).toBe(1.5);
    expect(quality.pixelRatio(390, 844, 1, true)).toBe(0.75);
    expect(quality.pixelRatio(390, 844, 3, true)).toBe(1.125);
    expect(quality.pixelRatio(1024, 1366, 3, true)).toBeCloseTo(
      0.75 * Math.sqrt(2_073_600 / (1024 * 1366)),
    );
  });

  it("uses hysteresis and cooldown across all three tiers", () => {
    const quality = new QualityManager();
    expect(observeWindow(quality, 0.031)).toBe(true);
    expect(quality.tier).toBe("medium");

    expect(observeWindow(quality, 0.04)).toBe(false);
    expect(quality.tier).toBe("medium");
    expect(observeWindow(quality, 0.04)).toBe(true);
    expect(quality.tier).toBe("low");
    expect(quality.pixelRatio(1440, 900, 2)).toBe(1);

    expect(observeWindow(quality, 0.016)).toBe(false);
    expect(observeWindow(quality, 0.016)).toBe(true);
    expect(quality.tier).toBe("medium");

    expect(observeWindow(quality, 0.013)).toBe(false);
    expect(observeWindow(quality, 0.013)).toBe(true);
    expect(quality.tier).toBe("high");
  });

  it("ignores background-resume deltas and isolated spikes", () => {
    const quality = new QualityManager();
    expect(quality.observeFrame(Number.NaN)).toBe(false);
    expect(quality.observeFrame(Number.POSITIVE_INFINITY)).toBe(false);
    expect(quality.observeFrame(Number.NEGATIVE_INFINITY)).toBe(false);
    expect(quality.observeFrame(0)).toBe(false);
    expect(quality.observeFrame(-0.016)).toBe(false);
    expect(quality.observeFrame(0.25)).toBe(false);
    expect(quality.observeFrame(1)).toBe(false);
    for (let index = 0; index < 59; index += 1) {
      expect(quality.observeFrame(0.016)).toBe(false);
    }
    expect(quality.observeFrame(0.1)).toBe(false);

    expect(quality.tier).toBe("high");
  });

  it.each([
    ["zero", 0],
    ["negative", -0.016],
    ["NaN", Number.NaN],
    ["positive infinity", Number.POSITIVE_INFINITY],
    ["background boundary", 0.25],
  ])("does not count %s values toward the sample window", (_, invalid) => {
    const quality = new QualityManager();
    for (let index = 0; index < 59; index += 1) {
      expect(quality.observeFrame(invalid)).toBe(false);
    }
    expect(quality.observeFrame(0.04)).toBe(false);
    for (let index = 0; index < 58; index += 1) {
      expect(quality.observeFrame(0.04)).toBe(false);
    }
    expect(quality.observeFrame(0.04)).toBe(true);
    expect(quality.tier).toBe("medium");
  });

  it("honors every quality threshold boundary exactly", () => {
    const high = new QualityManager();
    expect(observeWindow(high, 0.022)).toBe(false);
    expect(high.tier).toBe("high");
    expect(observeWindow(high, 0.0220001)).toBe(true);
    expect(high.tier).toBe("medium");

    expect(observeWindow(high, 0.04)).toBe(false);
    expect(observeWindow(high, 0.03)).toBe(false);
    expect(high.tier).toBe("medium");
    expect(observeWindow(high, 0.0300001)).toBe(true);
    expect(high.tier).toBe("low");

    expect(observeWindow(high, 0.01)).toBe(false);
    expect(observeWindow(high, 0.018)).toBe(false);
    expect(high.tier).toBe("low");
    expect(observeWindow(high, 0.0179999)).toBe(true);
    expect(high.tier).toBe("medium");

    expect(observeWindow(high, 0.02)).toBe(false);
    expect(observeWindow(high, 0.014)).toBe(false);
    expect(high.tier).toBe("medium");
    expect(observeWindow(high, 0.0139999)).toBe(true);
    expect(high.tier).toBe("high");
  });

  it("evaluates a window only after exactly 60 valid samples", () => {
    const quality = new QualityManager();
    for (let index = 0; index < 59; index += 1) {
      expect(quality.observeFrame(0.04)).toBe(false);
      expect(quality.tier).toBe("high");
    }
    expect(quality.observeFrame(0.04)).toBe(true);
    expect(quality.tier).toBe("medium");
  });
});

function observeWindow(quality: QualityManager, delta: number): boolean {
  let changed = false;
  for (let index = 0; index < 60; index += 1) {
    changed = quality.observeFrame(delta) || changed;
  }
  return changed;
}
