import type { Logger } from "../logging/Logger.js";
import { HomeScene } from "./scenes/home/HomeScene.js";
import type {
  FrameInfo,
  SceneDescriptor,
  SceneId,
  SceneModule,
  ScenePalette,
  Viewport,
} from "./SceneModule.js";

export type SceneFactory = (palette: ScenePalette) => SceneModule;
export type SceneFactories = Readonly<Record<SceneId, SceneFactory>>;

const SCENE_FACTORIES: SceneFactories = {
  home: (palette) => new HomeScene(palette),
};

export class SceneDirector {
  private active: SceneModule | null = null;
  private descriptor: SceneDescriptor | null = null;
  private viewport: Viewport | null = null;

  constructor(
    private readonly logger: Logger,
    private readonly factories: SceneFactories = SCENE_FACTORIES,
  ) {}

  switchTo(descriptor: SceneDescriptor): void {
    if (this.descriptor && descriptorKey(this.descriptor) === descriptorKey(descriptor)) return;

    const next = this.factories[descriptor.id](descriptor.palette);
    try {
      next.mount();
      if (this.viewport) next.resize(this.viewport);
    } catch (error) {
      next.dispose();
      this.logger.error("scene.switch_failed", {
        scene: descriptor.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    const previous = this.active;
    this.active = next;
    this.descriptor = descriptor;
    previous?.dispose();
    this.logger.success("scene.switched", { scene: descriptor.id });
  }

  recreate(): void {
    const descriptor = this.descriptor;
    if (!descriptor) return;
    this.descriptor = null;
    this.switchTo(descriptor);
  }

  update(frame: FrameInfo): void {
    this.active?.update(frame);
  }

  resize(viewport: Viewport): void {
    this.viewport = viewport;
    this.active?.resize(viewport);
  }

  setProgress(progress: number): void {
    this.active?.setProgress(progress);
  }

  renderState(): Pick<SceneModule, "scene" | "camera"> | null {
    return this.active;
  }

  clear(): void {
    this.active?.dispose();
    this.active = null;
    this.descriptor = null;
  }

  dispose(): void {
    this.clear();
    this.viewport = null;
  }
}

function descriptorKey(descriptor: SceneDescriptor): string {
  const { primary, secondary, accent } = descriptor.palette;
  return `${descriptor.id}:${primary}:${secondary}:${accent}`;
}
