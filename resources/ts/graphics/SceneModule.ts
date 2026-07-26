import type { Camera, Scene } from "three";

export interface FrameInfo {
  readonly time: number;
  readonly delta: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly drawingBufferWidth: number;
  readonly drawingBufferHeight: number;
}

export interface ScenePalette {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
}

export type SceneId = "home";

export interface SceneDescriptor {
  readonly id: SceneId;
  readonly palette: ScenePalette;
}

export interface SceneModule {
  readonly scene: Scene;
  readonly camera: Camera;
  mount(): void;
  update(frame: FrameInfo): void;
  resize(viewport: Viewport): void;
  setProgress(progress: number): void;
  dispose(): void;
}

export function parseScenePalette(value: string | undefined): ScenePalette | null {
  const colors = value?.split(",");
  return colors?.length === 3
    ? { primary: colors[0]!, secondary: colors[1]!, accent: colors[2]! }
    : null;
}
