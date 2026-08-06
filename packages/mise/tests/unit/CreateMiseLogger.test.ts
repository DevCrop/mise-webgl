import { describe, expect, it } from "vitest";
import { resolveBrowserLogLevel } from "../../src/logging/CreateMiseLogger.js";

describe("resolveBrowserLogLevel", () => {
  it("enables lifecycle diagnostics in development and explicit debug sessions", () => {
    expect(resolveBrowserLogLevel("warning", true, "")).toBe("debug");
    expect(resolveBrowserLogLevel("warning", false, "?debug=1")).toBe("debug");
  });

  it("keeps production warning by default and respects a silent hard stop", () => {
    expect(resolveBrowserLogLevel("warning", false, "")).toBe("warning");
    expect(resolveBrowserLogLevel("silent", true, "?debug=1")).toBe("silent");
  });
});
