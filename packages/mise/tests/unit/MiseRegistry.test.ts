import { describe, expect, it, vi } from "vitest";
import {
  auto,
  defineDriver,
  defineExperience,
  definePage,
  defineScene,
  defineSurface,
  defineTrack,
  defineView,
  type FrameControl,
  type MiseMotionFactory,
} from "../../src/Index.js";
import { MiseRegistry } from "../../src/kernel/MiseRegistry.js";
import { createAutoDriver } from "../../src/kernel/Drivers.js";

const experience = defineExperience({
  id: "test",
  scenes: [
    defineScene({
      id: "scene",
      drive: auto({
        duration: 1,
        loop: false,
        reducedMotion: { mode: "complete" },
      }),
      create: () => {
        throw new Error("not mounted");
      },
    }),
  ],
});
const page = definePage({
  id: "test",
  create: () => ({
    mount: () => undefined,
    leave: () => Promise.resolve(),
    dispose: () => undefined,
  }),
});
const motionFactory: MiseMotionFactory = () => ({
  createPageTransition: () => ({
    enter: () => undefined,
    leave: () => Promise.resolve(),
    dispose: () => undefined,
  }),
  dispose: () => undefined,
});
const frames = {
  subscribe: () => () => undefined,
  invalidate: () => undefined,
  acquireContinuous: () => () => undefined,
  acquireSuspension: () => () => undefined,
} satisfies FrameControl;

describe("MiseRegistry", () => {
  it("compiles with an internal null debug port and seals registration", () => {
    const registry = new MiseRegistry();
    registry.experiences.add(experience);
    expect(() => registry.experiences.add(experience)).toThrow("Duplicate");
    registerRequiredAdapters(registry);
    const plan = registry.compile();
    expect(plan.experience("test")).toEqual(experience);
    expect(plan.experience("test")).not.toBe(experience);
    expect(plan.createDebugPort(frames).enabled).toBe(false);
    expect(() => registry.experiences.add({
      ...experience,
      id: "late",
    })).toThrow("sealed");
  });

  it("rejects an incomplete plan", () => {
    const registry = new MiseRegistry();
    expect(() => registry.compile()).toThrow(
      "MISE renderer adapter is not registered",
    );
  });

  it("injects the shared frame boundary into the debug factory", () => {
    const registry = new MiseRegistry();
    const createDebug = vi.fn(() => ({
      enabled: true,
      mount: () => undefined,
      update: () => undefined,
      dispose: () => undefined,
    }));
    registry.experiences.add(experience);
    registerRequiredAdapters(registry);
    registry.debug.use(createDebug);

    expect(registry.compile().createDebugPort(frames).enabled).toBe(true);
    expect(createDebug).toHaveBeenCalledWith(frames);
  });

  it("provides null motion, navigation, and scroll ports by default", () => {
    const registry = new MiseRegistry();
    registry.drivers.add("auto", createAutoDriver);
    registry.experiences.add(experience);
    registry.renderer.use(() => ({
      mount: () => true,
      resize() {},
      render() {},
      clear() {},
      stats: () => ({
        calls: 0,
        triangles: 0,
        geometries: 0,
        textures: 0,
        programs: 0,
      }),
      dispose() {},
    }));
    const plan = registry.compile();
    const onScroll = vi.fn();
    const scroll = plan.createScroll({} as never, onScroll, {} as never);

    expect(() => plan.createMotion({} as never).dispose()).not.toThrow();
    const navigation = plan.navigationFactory()(
      {} as Document,
      {
        beforeChange: () => Promise.resolve(),
        afterChange: () => Promise.resolve(),
      },
      {} as never,
    );
    expect(() => {
      navigation.mount();
      navigation.dispose();
      scroll.mount();
      scroll.refresh();
      scroll.dispose();
    }).not.toThrow();
    expect(onScroll).toHaveBeenCalledTimes(2);
  });

  it("rejects duplicate page and platform adapter registrations", () => {
    const registry = new MiseRegistry();
    registry.pages.add(page);
    registry.motion.use(motionFactory);

    expect(() => registry.pages.add(page)).toThrow("Duplicate MISE page");
    expect(() => registry.motion.use(motionFactory)).toThrow(
      "Duplicate MISE motion adapter",
    );
  });

  it("rejects duplicate scene ids during plan compilation", () => {
    const registry = new MiseRegistry();
    const scene = experience.scenes[0]!;
    registry.experiences.add({
      id: "duplicate-scenes",
      scenes: [scene, { ...scene }],
    });
    registerRequiredAdapters(registry);

    expect(() => registry.compile()).toThrow("Duplicate MISE scene");
  });

  it("compiles a detached Surface View Track stage", () => {
    const registry = new MiseRegistry();
    const stage = defineExperience({
      id: "stage",
      surfaces: [
        defineSurface({
          id: "background",
          target: { kind: "default" },
          mode: "compositor",
        }),
        defineSurface({
          id: "detail",
          target: { kind: "selector", selector: "#detail-canvas" },
          mode: "isolated",
        }),
      ],
      views: [
        defineView({
          id: "background",
          surface: "background",
          target: { kind: "surface" },
          order: 0,
          clear: "all",
        }),
        defineView({
          id: "detail",
          surface: "detail",
          target: { kind: "surface" },
          order: 0,
          clear: "all",
        }),
      ],
      tracks: [
        defineTrack({
          id: "background",
          view: "background",
          root: "experience",
          activation: "always",
          scenes: [experience.scenes[0]!],
        }),
        defineTrack({
          id: "detail",
          view: "detail",
          root: "view",
          activation: "visible",
          scenes: [experience.scenes[0]!],
        }),
      ],
    });
    registry.experiences.add(stage);
    registerRequiredAdapters(registry);

    const snapshot = registry.compile().experience("stage")!;
    expect("tracks" in snapshot && snapshot.tracks).toHaveLength(2);
    expect(Object.isFrozen(snapshot)).toBe(true);
    if (!("tracks" in snapshot)) throw new Error("Expected stage experience.");
    expect(Object.isFrozen(snapshot.surfaces)).toBe(true);
    expect(Object.isFrozen(snapshot.views)).toBe(true);
    expect(Object.isFrozen(snapshot.tracks)).toBe(true);
    expect(Object.isFrozen(snapshot.tracks[0]?.scenes)).toBe(true);
  });

  it("rejects broken Surface View Track references", () => {
    const createStage = () => ({
      id: "broken-stage",
      surfaces: [{
        id: "background",
        target: { kind: "default" as const },
        mode: "compositor" as const,
      }],
      views: [{
        id: "hero",
        surface: "missing",
        target: { kind: "surface" as const },
        order: 0,
        clear: "all" as const,
      }],
      tracks: [{
        id: "hero",
        view: "hero",
        root: "view" as const,
        activation: "visible" as const,
        scenes: [experience.scenes[0]!],
      }],
    });
    const registry = new MiseRegistry();
    registry.experiences.add(createStage());
    registerRequiredAdapters(registry);

    expect(() => registry.compile()).toThrow("unknown Surface");
  });

  it("rejects duplicate Track and Scene ids inside a stage", () => {
    const track = {
      id: "hero",
      view: "hero",
      root: "view" as const,
      activation: "visible" as const,
      scenes: [experience.scenes[0]!, { ...experience.scenes[0]! }],
    };
    const registry = new MiseRegistry();
    registry.experiences.add({
      id: "duplicate-stage",
      surfaces: [{
        id: "background",
        target: { kind: "default" },
        mode: "compositor",
      }],
      views: [{
        id: "hero",
        surface: "background",
        target: { kind: "surface" },
        order: 0,
        clear: "all",
      }],
      tracks: [track, { ...track }],
    });
    registerRequiredAdapters(registry);

    expect(() => registry.compile()).toThrow(/Duplicate MISE (track|scene)/);
  });

  it("rejects multiple Tracks assigned to one View", () => {
    const registry = new MiseRegistry();
    registry.experiences.add({
      id: "ambiguous-view-stage",
      surfaces: [{
        id: "background",
        target: { kind: "default" },
        mode: "compositor",
      }],
      views: [{
        id: "hero",
        surface: "background",
        target: { kind: "surface" },
        order: 0,
        clear: "all",
      }],
      tracks: ["first", "second"].map((id) => ({
        id,
        view: "hero",
        root: "view" as const,
        activation: "visible" as const,
        scenes: [experience.scenes[0]!],
      })),
    });
    registerRequiredAdapters(registry);

    expect(() => registry.compile()).toThrow("assigned to multiple Tracks");
  });

  it("rejects multiple Views inside an isolated Surface", () => {
    const registry = new MiseRegistry();
    registry.experiences.add({
      id: "invalid-isolated-stage",
      surfaces: [{
        id: "detail",
        target: { kind: "default" },
        mode: "isolated",
      }],
      views: ["first", "second"].map((id, order) => ({
        id,
        surface: "detail",
        target: { kind: "surface" as const },
        order,
        clear: "all" as const,
      })),
      tracks: ["first", "second"].map((id) => ({
        id,
        view: id,
        root: "view" as const,
        activation: "visible" as const,
        scenes: [experience.scenes[0]!],
      })),
    });
    registerRequiredAdapters(registry);

    expect(() => registry.compile()).toThrow("requires one whole-Surface View");
  });

  it("rejects an unregistered custom driver during plan compilation", () => {
    const registry = new MiseRegistry();
    registry.experiences.add({
      id: "custom-driver",
      scenes: [{
        ...experience.scenes[0]!,
        drive: { kind: "custom:missing" },
      }],
    });
    registerRequiredAdapters(registry);

    expect(() => registry.compile()).toThrow("Unregistered MISE driver");
  });

  it("rejects empty definition ids and non-data custom options", () => {
    const registry = new MiseRegistry();
    registry.experiences.add({
      id: " ",
      scenes: experience.scenes,
    });
    registerRequiredAdapters(registry);

    expect(() => registry.compile()).toThrow("experience id violates the security policy");
    expect(() => defineDriver({
      kind: "custom:invalid",
      option: new Date() as never,
    })).toThrow("plain objects and arrays");
  });

  it("rejects unsafe identifiers and oversized Plan graphs", () => {
    expect(() => defineScene({
      ...experience.scenes[0]!,
      id: "scene with spaces",
    })).toThrow("id violates the MISE security policy");

    const registry = new MiseRegistry();
    for (let index = 0; index < 65; index += 1) {
      registry.experiences.add({
        ...experience,
        id: `experience-${index}`,
      });
    }
    registerRequiredAdapters(registry);

    expect(() => registry.compile()).toThrow(
      "Experiences exceed the security budget",
    );
  });

  it("snapshots nested custom driver configuration", () => {
    const points = [0.25, 0.75];
    const options = { points };
    const drive = defineDriver({
      kind: "custom:pointer",
      options,
    });

    points[0] = 1;
    options.points.push(1);

    expect(drive.options).toEqual({ points: [0.25, 0.75] });
    expect(Object.isFrozen(drive)).toBe(true);
    expect(Object.isFrozen(drive.options)).toBe(true);
    expect(Object.isFrozen(drive.options.points)).toBe(true);
  });

  it("rejects cyclic and excessively deep custom driver configuration", () => {
    const self: { self?: unknown } = {};
    self.self = self;
    const left: { right?: unknown } = {};
    const right: { left?: unknown } = {};
    left.right = right;
    right.left = left;
    let deep: { child?: unknown } = {};
    const root = deep;
    for (let depth = 0; depth < 102; depth += 1) {
      const child = {};
      deep.child = child;
      deep = child;
    }

    for (const options of [self, left, root]) {
      expect(() => defineDriver({
        kind: "custom:invalid",
        options: options as never,
      })).toThrow(expect.objectContaining({
        code: "MISE_DRIVER_INVALID",
      }));
    }
  });

  it("allows shared non-cyclic custom driver configuration", () => {
    const shared = { gain: 0.5 };
    const drive = defineDriver({
      kind: "custom:shared",
      first: shared,
      second: shared,
    });

    expect(drive.first).toEqual({ gain: 0.5 });
    expect(drive.second).toEqual({ gain: 0.5 });
    expect(drive.first).not.toBe(drive.second);
  });

  it("snapshots and deeply freezes definitions during compilation", () => {
    const registry = new MiseRegistry();
    const reducedMotion = { mode: "shorten" as const, duration: 0.2 };
    const drive = {
      kind: "auto" as const,
      duration: 2,
      loop: false,
      reducedMotion,
    };
    const scene = {
      id: "mutable-scene",
      drive,
      create: experience.scenes[0]!.create,
    };
    const definition = {
      id: "mutable",
      scenes: [scene],
    };
    registry.experiences.add(definition);
    registerRequiredAdapters(registry);

    const plan = registry.compile();
    drive.duration = 99;
    reducedMotion.duration = 9;
    scene.id = "changed";
    definition.scenes.length = 0;

    const snapshot = plan.experience("mutable")!;
    if (!("scenes" in snapshot)) throw new Error("Expected a simple experience.");
    expect(snapshot.scenes).toHaveLength(1);
    expect(snapshot.scenes[0]).toMatchObject({
      id: "mutable-scene",
      drive: {
        duration: 2,
        reducedMotion: { mode: "shorten", duration: 0.2 },
      },
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.scenes)).toBe(true);
    expect(Object.isFrozen(snapshot.scenes[0])).toBe(true);
    const snapshotDrive = snapshot.scenes[0]!.drive;
    expect(Object.isFrozen(snapshotDrive)).toBe(true);
    if (snapshotDrive.kind !== "auto") throw new Error("Expected auto drive.");
    expect(Object.isFrozen(snapshotDrive.reducedMotion)).toBe(true);
  });

  it("does not require optional page motion evidence by default", () => {
    const registry = new MiseRegistry();
    registry.pages.add(page);
    registerRequiredAdapters(registry);

    const profile = registry.compile().healthProfile();
    expect(profile).toContain("page-changer.page");
    expect(profile).not.toContain("page.motion");
  });

  it("derives Object Factory Health expectations from compiled Scenes", () => {
    const registry = new MiseRegistry();
    registry.experiences.add({
      id: "objects",
      scenes: [{
        id: "object-scene",
        drive: {
          kind: "auto",
          duration: 1,
          loop: false,
          reducedMotion: { mode: "complete" },
        },
        objects: [{ id: "product.planet" }],
        create: experience.scenes[0]!.create,
      }],
    });
    registerRequiredAdapters(registry);

    expect(registry.compile().healthProfile())
      .toContain("scene.object-factory");
  });
});

function registerRequiredAdapters(registry: MiseRegistry): void {
  registry.drivers.add("auto", createAutoDriver);
  registry.motion.use(motionFactory);
  registry.navigation.use(() => ({ mount() {}, dispose() {} }));
  registry.scroll.use(() => ({ mount() {}, refresh() {}, dispose() {} }));
  registry.renderer.use(() => ({
    mount: () => true,
    resize() {},
    render() {},
    clear() {},
    stats: () => ({
      calls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      programs: 0,
    }),
    dispose() {},
  }));
}
