import {
  AnimationClip,
  LoadingManager,
  Material,
  Mesh,
  Object3D,
  Texture,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export interface BlenderModel {
  readonly root: Object3D;
  readonly animations: readonly AnimationClip[];
  dispose(): void;
}

export interface ModelLoadProgress {
  readonly loaded: number;
  readonly total: number;
  readonly ratio: number;
  readonly url: string;
}

export class BlenderModelLoader {
  private readonly loader: GLTFLoader;

  constructor(onProgress?: (progress: ModelLoadProgress) => void) {
    const manager = new LoadingManager();
    manager.onProgress = (url, loaded, total) => {
      onProgress?.({
        loaded,
        total,
        ratio: total > 0 ? loaded / total : 0,
        url,
      });
    };
    this.loader = new GLTFLoader(manager);
  }

  async load(url: string): Promise<BlenderModel> {
    const resolved = new URL(url, window.location.href);
    if (resolved.origin !== window.location.origin) {
      throw new Error("Model URL must use the portfolio origin.");
    }

    const gltf = await this.loader.loadAsync(resolved.href);
    const root = gltf.scene;

    root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
      object.frustumCulled = true;
    });

    return {
      root,
      animations: gltf.animations,
      dispose: () => disposeObject(root),
    };
  }
}

function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(disposeMaterial);
  });
  root.removeFromParent();
}

function disposeMaterial(material: Material): void {
  Object.values(material).forEach((value: unknown) => {
    if (value instanceof Texture) value.dispose();
  });
  material.dispose();
}
