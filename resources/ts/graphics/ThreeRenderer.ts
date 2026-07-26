import { WebGLRenderer, type Camera, type Scene } from "three";
import type { Viewport } from "./SceneModule.js";

export interface ContextCallbacks {
  readonly lost: () => void;
  readonly restored: () => void;
}

export class ThreeRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private renderer: WebGLRenderer | null = null;
  private callbacks: ContextCallbacks | null = null;
  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.canvas?.classList.add("is-webgl-fallback");
    this.callbacks?.lost();
  };
  private readonly handleContextRestored = (): void => {
    this.canvas?.classList.remove("is-webgl-fallback");
    this.callbacks?.restored();
  };

  mount(canvas: HTMLCanvasElement, callbacks: ContextCallbacks): boolean {
    if (this.renderer !== null) return true;
    this.canvas = canvas;
    this.callbacks = callbacks;
    canvas.classList.remove("is-webgl-fallback");

    try {
      this.renderer = new WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
      });
      this.renderer.debug.checkShaderErrors = import.meta.env.DEV;
      canvas.addEventListener("webglcontextlost", this.handleContextLost);
      canvas.addEventListener("webglcontextrestored", this.handleContextRestored);
      return true;
    } catch {
      canvas.classList.add("is-webgl-fallback");
      this.renderer = null;
      return false;
    }
  }

  resize(viewport: Viewport): void {
    this.renderer?.setSize(viewport.drawingBufferWidth, viewport.drawingBufferHeight, false);
  }

  render(scene: Scene, camera: Camera): void {
    this.renderer?.render(scene, camera);
  }

  clear(): void {
    this.renderer?.clear();
  }

  dispose(): void {
    if (!this.canvas && !this.renderer) return;
    this.canvas?.removeEventListener("webglcontextlost", this.handleContextLost);
    this.canvas?.removeEventListener("webglcontextrestored", this.handleContextRestored);
    this.renderer?.setAnimationLoop(null);
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer = null;
    this.canvas = null;
    this.callbacks = null;
  }
}
