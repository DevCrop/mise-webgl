import { describe, expect, it } from "vitest";
import { PageRegistry } from "./PageRegistry.js";

describe("PageRegistry", () => {
  it("resolves only registered page identifiers", () => {
    const registry = new PageRegistry({} as never, {} as never);
    expect(registry.resolve("home")).toBe("home");
    expect(registry.resolve("work")).toBeNull();
    expect(registry.resolve("unknown")).toBeNull();
  });
});
