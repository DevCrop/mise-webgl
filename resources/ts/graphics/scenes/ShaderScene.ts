import {
  BufferGeometry,
  Camera,
  Color,
  Float32BufferAttribute,
  GLSL3,
  Mesh,
  Scene,
  ShaderMaterial,
  Vector2,
} from "three";
import type { FrameInfo, SceneModule, ScenePalette, Viewport } from "../SceneModule.js";
import { FULLSCREEN_VERTEX_SHADER } from "../shaders/proceduralShaders.js";

export abstract class ShaderScene implements SceneModule {
  readonly scene = new Scene();
  readonly camera = new Camera();
  private readonly resolution = new Vector2(1, 1);
  private readonly geometry = new BufferGeometry();
  private readonly material: ShaderMaterial;
  private readonly mesh: Mesh;
  private mounted = false;
  private disposed = false;

  protected constructor(palette: ScenePalette, fragmentShader: string) {
    this.geometry.setAttribute(
      "position",
      new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
    );
    this.material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: FULLSCREEN_VERTEX_SHADER,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uResolution: { value: this.resolution },
        uPrimary: { value: new Color(palette.primary) },
        uSecondary: { value: new Color(palette.secondary) },
        uAccent: { value: new Color(palette.accent) },
        uTime: { value: 0 },
        uProgress: { value: 0 },
      },
    });
    this.mesh = new Mesh(this.geometry, this.material);
  }

  mount(): void {
    if (this.mounted || this.disposed) return;
    this.mounted = true;
    this.scene.add(this.mesh);
  }

  update(frame: FrameInfo): void {
    this.material.uniforms.uTime.value = frame.time;
  }

  resize(viewport: Viewport): void {
    this.resolution.set(viewport.drawingBufferWidth, viewport.drawingBufferHeight);
  }

  setProgress(progress: number): void {
    this.material.uniforms.uProgress.value = Math.min(1, Math.max(0, progress));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
