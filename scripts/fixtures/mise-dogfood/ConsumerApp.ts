import {
  createMise,
  createMiseLogger,
  defineDriver,
  defineExperience,
  defineProvider,
  defineScene,
  defineSurface,
  defineTrack,
  defineView,
  type CustomDriveSpec,
  type DebugSnapshot,
  type DriveController,
  type DriveSample,
  type DriveSpec,
  type MiseApplicationHandle,
  type ScrollSnapshot,
} from "mise-webgl";
import { ThreeRenderer } from "mise-webgl/three";
import "mise-webgl/styles.css";
import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
} from "three";

const fixtureDrive = (slot: number) => defineDriver({
  kind: "custom:fixture",
  slot,
});
const sceneZero = createFixtureScene(0);
const sceneOne = createFixtureScene(1);
const panelScene = createFixtureScene(2);
const isolatedScene = createFixtureScene(3);
let selectedSlot = 0;
let emitScroll = (): void => undefined;
let renderer: ThreeRenderer | null = null;
let snapshot: DebugSnapshot | null = null;
let resourcesCreated = 0;
let resourcesDisposed = 0;

const provider = defineProvider({
  register(registry): void {
    registry.drivers.add("custom:fixture", createFixtureDriver);
    registry.experiences.add(defineExperience({
      id: "fixture",
      surfaces: [
        defineSurface({
          id: "background",
          target: { kind: "default" },
          mode: "compositor",
        }),
        defineSurface({
          id: "isolated",
          target: {
            kind: "selector",
            selector: "[data-dogfood-local-canvas]",
          },
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
          id: "panel",
          surface: "background",
          target: { kind: "selector", selector: "[data-dogfood-panel]" },
          order: 1,
          clear: "depth",
        }),
        defineView({
          id: "isolated",
          surface: "isolated",
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
          scenes: [sceneZero, sceneOne],
        }),
        defineTrack({
          id: "panel",
          view: "panel",
          root: "view",
          activation: "visible",
          scenes: [panelScene],
        }),
        defineTrack({
          id: "isolated",
          view: "isolated",
          root: "view",
          activation: "visible",
          scenes: [isolatedScene],
        }),
      ],
    }));
    registry.scroll.use((_frames, onScroll) => ({
      mount(): void {
        emitScroll = () => onScroll(scrollSnapshot());
        emitScroll();
      },
      refresh(): void {
        emitScroll();
      },
      dispose(): void {
        emitScroll = (): void => undefined;
      },
    }));
    registry.renderer.use(() => {
      renderer = new ThreeRenderer(true);
      return renderer;
    });
    registry.debug.use(() => ({
      enabled: true,
      mount(): void {},
      update(value): void {
        snapshot = value;
      },
      dispose(): void {},
    }));
  },
});

const app = createMise({
  providers: [provider],
  initialExperience: "fixture",
  initialExperienceRoot: "body",
  logger: createMiseLogger({
    sink: { write: () => undefined },
    level: "silent",
  }),
});
app.mount();

window.__MISE_DOGFOOD__ = {
  app,
  select(slot): void {
    selectedSlot = slot;
    emitScroll();
  },
  scene(): string | null {
    return snapshot?.scene ?? null;
  },
  stats() {
    return renderer?.stats() ?? {
      calls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      programs: 0,
    };
  },
  resources() {
    return {
      created: resourcesCreated,
      disposed: resourcesDisposed,
      active: resourcesCreated - resourcesDisposed,
    };
  },
};

function createFixtureDriver(spec: DriveSpec): DriveController {
  const customSpec = spec as CustomDriveSpec;
  const slot = typeof customSpec["slot"] === "number"
    ? customSpec["slot"]
    : -1;
  return {
    kind: spec.kind,
    setScroll(): void {},
    refresh(): void {},
    sample(): DriveSample {
      return {
        progress: selectedSlot === slot ? 1 : 0,
        direction: 0,
        velocity: 0,
        active: selectedSlot === slot,
        demand: "idle",
      };
    },
    dispose(): void {},
  };
}

function createFixtureScene(slot: number) {
  return defineScene({
    id: `fixture-${slot}`,
    drive: fixtureDrive(slot),
    create: ({ scope }) => {
      const scene = new Scene();
      const camera = new PerspectiveCamera(45, 1, 0.1, 10);
      const geometry = scope.own(trackResource(new BoxGeometry(1, 1, 1)));
      const material = scope.own(trackResource(new MeshBasicMaterial({
        color: [0x55ccff, 0xff6699, 0xffcc55, 0x99ff88][slot] ?? 0xffffff,
      })));
      scene.add(new Mesh(geometry, material));
      camera.position.z = 3;
      return {
        scene,
        camera,
        mount(): void {},
        frame: () => "idle" as const,
        resize(viewport): void {
          camera.aspect = viewport.width / viewport.height;
          camera.updateProjectionMatrix();
        },
        dispose(): void {},
      };
    },
  });
}

function trackResource<TResource extends { dispose(): void }>(
  resource: TResource,
): TResource {
  resourcesCreated += 1;
  const dispose = resource.dispose.bind(resource);
  let disposed = false;
  resource.dispose = (): void => {
    if (disposed) return;
    disposed = true;
    resourcesDisposed += 1;
    dispose();
  };
  return resource;
}

function scrollSnapshot(): ScrollSnapshot {
  return {
    progress: selectedSlot,
    position: selectedSlot,
    velocity: 0,
    direction: 0,
  };
}

declare global {
  interface Window {
    __MISE_DOGFOOD__: {
      readonly app: MiseApplicationHandle;
      select(slot: number): void;
      scene(): string | null;
      stats(): ReturnType<ThreeRenderer["stats"]>;
      resources(): {
        readonly created: number;
        readonly disposed: number;
        readonly active: number;
      };
    };
  }
}
