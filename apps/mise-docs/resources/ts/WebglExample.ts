import {
  AmbientLight,
  Color,
  DirectionalLight,
  IcosahedronGeometry,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  Scene,
} from "three";
import {
  auto,
  createMise,
  createMiseLogger,
  defineExperience,
  defineProvider,
  defineScene,
  type FrameDemand,
  type FrameState,
  type MiseApplicationHandle,
  type SceneCreateContext,
  type SceneInstance,
  type ViewportState,
} from "mise-webgl";
import { ThreeRenderer } from "mise-webgl/three";

const exampleScene = defineScene({
  id: "docs-crystal",
  drive: auto({
    duration: 12,
    loop: true,
    reducedMotion: { mode: "pause" },
  }),
  create: createExampleScene,
});

const exampleExperience = defineExperience({
  id: "docs-webgl",
  scenes: [exampleScene],
});

const exampleProvider = defineProvider({
  register(registry): void {
    registry.renderer.use(() => new ThreeRenderer());
    registry.experiences.add(exampleExperience);
  },
});

export function mountWebglExample(documentRoot: Document = document): MiseApplicationHandle {
  const application = createMise({
    providers: [exampleProvider],
    initialExperience: "docs-webgl",
    logger: createMiseLogger({
      level: "error",
      sink: { write(): void {} },
    }),
    surface: {
      fallbackText: "WebGL을 사용할 수 없습니다. HTML 문서와 탐색은 계속 사용할 수 있습니다.",
    },
  });
  application.mount(documentRoot);
  return application;
}

function createExampleScene(context: SceneCreateContext): SceneInstance {
  const scene = new Scene();
  scene.background = new Color(0x08111f);
  const camera = new PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 5);
  const geometry = context.scope.own(new IcosahedronGeometry(1.25, 1));
  const material = context.scope.own(new MeshPhysicalMaterial({
    color: 0x92dcff,
    emissive: 0x081c35,
    emissiveIntensity: 1.4,
    metalness: 0.12,
    roughness: 0.08,
    transmission: 0.72,
    thickness: 1.5,
    ior: 1.8,
  }));
  const crystal = new Mesh(geometry, material);
  const ambient = new AmbientLight(0x7a9cff, 2.5);
  const key = new DirectionalLight(0xffffff, 8);
  key.position.set(3, 4, 5);
  let mounted = false;
  let disposed = false;

  return {
    scene,
    camera,
    mount(): void {
      if (mounted || disposed) return;
      mounted = true;
      scene.add(crystal, ambient, key);
    },
    frame(state: FrameState): FrameDemand {
      crystal.rotation.set(
        state.progress * Math.PI * 0.75,
        state.progress * Math.PI * 2,
        state.progress * Math.PI * 0.25,
      );
      return context.reducedMotion.active ? "idle" : "next";
    },
    resize(viewport: ViewportState): void {
      camera.aspect = viewport.width / Math.max(viewport.height, 1);
      camera.updateProjectionMatrix();
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      scene.remove(crystal, ambient, key);
    },
  };
}
