import { describe, expect, it, vi } from "vitest";
import {
  MiseHealthCheck,
  REQUIRED_COLLABORATIONS,
} from "../../src/kernel/MiseHealthCheck.js";

describe("MiseHealthCheck", () => {
  it("keeps the canonical collaboration contract exact and immutable", () => {
    expect(REQUIRED_COLLABORATIONS).toEqual([
      "application.providers",
      "application.registry",
      "application.container",
      "application.factory",
      "application.runtime",
      "browser-application.logging",
      "browser-application.mise",
      "browser-application.navigation",
      "browser-application.page-changer",
      "browser-application.scroll",
      "page-changer.page",
      "page.motion",
      "runtime.renderer",
      "runtime.frame-loop",
      "runtime.clock",
      "runtime.scene-changer",
      "runtime.driver",
      "runtime.debug",
      "scene-changer.scene",
      "scene.resource-scope",
      "scroll-port.mise",
    ]);
    expect(Object.isFrozen(REQUIRED_COLLABORATIONS)).toBe(true);
  });

  it("stays pending until every required collaboration is observed", () => {
    const health = new MiseHealthCheck();

    expect(health.report()).toMatchObject({
      status: "pending",
      observed: [],
      missing: REQUIRED_COLLABORATIONS,
      total: REQUIRED_COLLABORATIONS.length,
    });

    for (const collaboration of REQUIRED_COLLABORATIONS) health.mark(collaboration);

    expect(health.report()).toMatchObject({
      status: "healthy",
      observed: REQUIRED_COLLABORATIONS,
      missing: [],
      total: REQUIRED_COLLABORATIONS.length,
    });
  });

  it("records repeated collaboration evidence once", () => {
    const health = new MiseHealthCheck();

    health.mark("application.registry");
    const firstReport = health.report();
    health.mark("application.registry");

    expect(health.report()).toBe(firstReport);
    expect(health.report().observed).toEqual(["application.registry"]);
  });

  it("announces healthy exactly once", () => {
    const onHealthy = vi.fn();
    const health = new MiseHealthCheck(REQUIRED_COLLABORATIONS, onHealthy);

    for (const collaboration of REQUIRED_COLLABORATIONS) health.mark(collaboration);
    health.mark(REQUIRED_COLLABORATIONS[0]!);
    health.mark("host.optional.unexpected");

    expect(onHealthy).toHaveBeenCalledTimes(1);
    expect(onHealthy).toHaveBeenCalledWith(health.report());
  });

  it("uses the compiled host capability profile", () => {
    const health = new MiseHealthCheck([
      "application.registry",
      "runtime.renderer",
    ]);

    health.mark("application.registry");
    health.mark("runtime.debug");

    expect(health.report()).toMatchObject({
      status: "pending",
      observed: ["application.registry"],
      missing: ["runtime.renderer"],
      total: 2,
    });

    health.mark("runtime.renderer");
    expect(health.report().status).toBe("healthy");
  });

  it("deduplicates and freezes a custom profile and every report array", () => {
    const expected = [
      "application.registry",
      "application.registry",
      "runtime.renderer",
    ] as const;
    const health = new MiseHealthCheck(expected);

    expect(health.report()).toEqual({
      status: "pending",
      observed: [],
      missing: ["application.registry", "runtime.renderer"],
      total: 2,
    });
    expect(Object.isFrozen(health.report())).toBe(true);
    expect(Object.isFrozen(health.report().observed)).toBe(true);
    expect(Object.isFrozen(health.report().missing)).toBe(true);
  });

  it("is healthy immediately when the compiled profile is empty", () => {
    const health = new MiseHealthCheck([]);

    expect(health.report()).toEqual({
      status: "healthy",
      observed: [],
      missing: [],
      total: 0,
    });
  });

  it("ignores collaboration evidence outside the expected profile", () => {
    const health = new MiseHealthCheck(["application.registry"]);
    const initial = health.report();

    health.mark("runtime.debug");

    expect(health.report()).toBe(initial);
  });
});
