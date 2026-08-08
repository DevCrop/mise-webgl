import {
  createMise,
  createMiseLogger,
  defineExperience,
  defineProvider,
  defineScene,
  scroll,
} from "mise-webgl";
import { ConsoleLogSink } from "mise-webgl/console";
import { ThreeRenderer } from "mise-webgl/three";
import { PerspectiveCamera, Scene } from "three";

const journey = defineExperience({
  id: "journey",
  scenes: [
    defineScene({
      id: "terrain",
      drive: scroll({
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
      }),
      create: () => {
        const scene = new Scene();
        const camera = new PerspectiveCamera(45, 1, 0.1, 100);
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
    }),
  ],
});

const provider = defineProvider({
  register(registry): void {
    registry.renderer.use(() => new ThreeRenderer());
    registry.experiences.add(journey);
  },
});

export function mountHost(): void {
  createMise({
    providers: [provider],
    initialExperience: "journey",
    initialExperienceRoot: "body",
    logger: createMiseLogger({ sink: new ConsoleLogSink() }),
    surface: {
      fallbackText: "WebGL을 사용할 수 없어 정적 화면을 표시합니다.",
    },
  }).mount();
}
