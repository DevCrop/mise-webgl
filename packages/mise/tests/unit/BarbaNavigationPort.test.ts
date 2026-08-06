import { describe, expect, it } from "vitest";
import { shouldPreventNavigation } from "../../src/adapters/barba/BarbaNavigationPort.js";

describe("BarbaNavigationPort", () => {
  it("accepts same-origin navigation and rejects unsafe targets", () => {
    const current = "https://example.com/work";

    expect(shouldPreventNavigation("/about", current)).toBe(false);
    expect(shouldPreventNavigation("https://example.com/about", current)).toBe(false);
    expect(shouldPreventNavigation("https://other.example/about", current)).toBe(true);
    expect(shouldPreventNavigation("#section", current)).toBe(true);
    expect(shouldPreventNavigation("mailto:test@example.com", current)).toBe(true);
    expect(shouldPreventNavigation("http://[invalid", current)).toBe(true);
  });
});
