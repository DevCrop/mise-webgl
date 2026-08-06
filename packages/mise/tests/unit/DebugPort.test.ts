import { describe, expect, it } from "vitest";
import { formatDebugSnapshot } from "../../src/playground/DebugPort.js";
import type { DebugSnapshot } from "../../src/Index.js";
import { REQUIRED_COLLABORATIONS } from "../../src/kernel/MiseHealthCheck.js";

describe("formatDebugSnapshot", () => {
  it("shows MISE collaboration health", () => {
    const snapshot = {
      scene: "home-journey",
      lifecycle: "active",
      driver: "scroll",
      progress: 0.5,
      velocity: 0,
      frameMs: 16,
      quality: "high",
      pixelRatio: 1,
      stats: {
        calls: 1,
        triangles: 2,
        geometries: 3,
        textures: 0,
        programs: 1,
      },
      health: {
        status: "healthy",
        observed: REQUIRED_COLLABORATIONS,
        missing: [],
        total: REQUIRED_COLLABORATIONS.length,
      },
    } satisfies DebugSnapshot;

    const output = formatDebugSnapshot(snapshot);
    expect(output).toContain("health     healthy 21/21");
    expect(output).not.toContain("missing");
  });

  it("shows missing collaboration keys for a pending profile", () => {
    const output = formatDebugSnapshot({
      scene: "none",
      lifecycle: "idle",
      driver: "auto",
      progress: 0,
      velocity: 0,
      frameMs: 0,
      quality: "high",
      pixelRatio: 1,
      stats: {
        calls: 0,
        triangles: 0,
        geometries: 0,
        textures: 0,
        programs: 0,
      },
      health: {
        status: "pending",
        observed: ["application.providers"],
        missing: ["scene.object-factory", "runtime.driver"],
        total: 3,
      },
    });

    expect(output).toContain(
      "missing    scene.object-factory,runtime.driver",
    );
  });

  it("shows multi-Surface Stage topology", () => {
    const output = formatDebugSnapshot({
      scene: "background",
      lifecycle: "active",
      driver: "auto",
      progress: 0,
      velocity: 0,
      frameMs: 16,
      quality: "high",
      pixelRatio: 1,
      stats: {
        calls: 1,
        triangles: 2,
        geometries: 3,
        textures: 0,
        programs: 1,
      },
      health: {
        status: "healthy",
        observed: REQUIRED_COLLABORATIONS,
        missing: [],
        total: REQUIRED_COLLABORATIONS.length,
      },
      stage: {
        id: "article",
        surfaces: [{
          id: "background",
          available: true,
          views: 2,
          stats: {
            calls: 2,
            triangles: 4,
            geometries: 3,
            textures: 0,
            programs: 1,
          },
        }],
        tracks: [{
          id: "chapter",
          surface: "background",
          view: "chapter",
          scene: "none",
          lifecycle: "disposed",
          driver: "scroll",
          visible: false,
          mounted: false,
          progress: 0,
        }],
      },
    });

    expect(output).toContain("stage      article s1 t1");
    expect(output).toContain("surface    background ready v2");
    expect(output).toContain("track      chapter deferred hidden");
  });
});
