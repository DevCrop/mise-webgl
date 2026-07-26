import { describe, expect, it } from "vitest";
import { QualityManager } from "./QualityManager.js";

describe("QualityManager", () => {
  it("caps mobile and desktop pixel ratios", () => {
    const quality = new QualityManager();
    expect(quality.pixelRatio(390, 844, 3)).toBe(1.5);
    expect(quality.pixelRatio(1440, 900, 3)).toBe(2);
    expect(quality.pixelRatio(844, 390, 3)).toBe(1.5);
  });

  it("reduces scale after sustained slow frames", () => {
    const quality = new QualityManager();
    for (let index = 0; index < 59; index += 1) quality.observeFrame(0.03);
    expect(quality.observeFrame(0.03)).toBe(true);
    expect(quality.pixelRatio(1440, 900, 2)).toBe(1.5);
  });
});
