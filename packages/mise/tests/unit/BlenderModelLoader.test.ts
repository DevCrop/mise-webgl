import {
  Bone,
  BufferGeometry,
  Group,
  MeshBasicMaterial,
  Skeleton,
  SkinnedMesh,
  Texture,
} from "three";
import type { LoadingManager } from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BlenderModelLoader,
  disposeBlenderModelRoot,
} from "../../src/adapters/three/BlenderModelLoader.js";

const loaderMock = vi.hoisted(() => ({
  manager: null as unknown,
  parseAsync: vi.fn(),
}));

vi.mock("three/addons/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    constructor(manager: unknown) {
      loaderMock.manager = manager;
    }

    parseAsync(bytes: ArrayBuffer, path: string): Promise<unknown> {
      return loaderMock.parseAsync(bytes, path);
    }
  },
}));

describe("BlenderModelLoader", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: new URL("https://portfolio.test/"),
    });
    vi.stubGlobal("fetch", vi.fn(async () => validGlbResponse()));
    loaderMock.parseAsync.mockReset();
    loaderMock.parseAsync.mockResolvedValue({
      scene: new Group(),
      animations: [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects an already-aborted transition before loading", async () => {
    const transition = new AbortController();
    transition.abort();
    const loader = new BlenderModelLoader();

    await expect(loader.load("/earth.glb", {
      signal: transition.signal,
    })).rejects.toMatchObject({
      name: "MiseError",
      code: "MISE_MODEL_LOAD_ABORTED",
    });
  });

  it("fetches and parses one canonical same-origin GLB", async () => {
    const progress = vi.fn();
    const loader = new BlenderModelLoader(progress);

    await expect(loader.load("/assets/earth.glb")).resolves.toMatchObject({
      animations: [],
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://portfolio.test/assets/earth.glb",
      {
        credentials: "same-origin",
        redirect: "error",
      },
    );
    expect(loaderMock.parseAsync).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      "https://portfolio.test/assets/",
    );
    expect(progress).toHaveBeenCalledWith({
      loaded: 1,
      total: 1,
      ratio: 1,
      url: "/assets/earth.glb",
    });
  });

  it("rejects cross-origin, query, and non-GLB model URLs", async () => {
    const loader = new BlenderModelLoader();

    for (const url of [
      "https://assets.example/earth.glb",
      "/earth.glb?v=1",
      "/earth.gltf",
    ]) {
      await expect(loader.load(url)).rejects.toMatchObject({
        code: "MISE_MODEL_URL_INVALID",
      });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects oversized and malformed GLB responses", async () => {
    const loader = new BlenderModelLoader();
    vi.mocked(fetch).mockResolvedValueOnce(validGlbResponse({
      "content-length": String(32 * 1024 * 1024 + 1),
    }));

    await expect(loader.load("/oversized.glb")).rejects.toMatchObject({
      code: "MISE_MODEL_TOO_LARGE",
    });

    vi.mocked(fetch).mockResolvedValueOnce(new Response(new Uint8Array(12), {
      headers: { "content-type": "model/gltf-binary" },
    }));
    await expect(loader.load("/malformed.glb")).rejects.toMatchObject({
      code: "MISE_MODEL_INVALID",
    });
    expect(loaderMock.parseAsync).not.toHaveBeenCalled();
  });

  it("rejects external resources referenced by a GLB", async () => {
    loaderMock.parseAsync.mockImplementationOnce(() => {
      const manager = loaderMock.manager as LoadingManager;
      manager.resolveURL("https://portfolio.test/assets/external.bin");
      return Promise.resolve({ scene: new Group(), animations: [] });
    });

    await expect(
      new BlenderModelLoader().load("/assets/earth.glb"),
    ).rejects.toMatchObject({ code: "MISE_MODEL_URL_INVALID" });
  });

  it("disposes shared GPU resources, skeletons and owned bitmaps once", () => {
    class OwnedImageBitmap {
      close = vi.fn();
    }
    vi.stubGlobal("ImageBitmap", OwnedImageBitmap);
    const bitmap = new OwnedImageBitmap();
    const geometry = new BufferGeometry();
    const texture = new Texture();
    texture.source.data = bitmap;
    const material = new MeshBasicMaterial({ map: texture });
    const skeleton = new Skeleton([new Bone()]);
    const first = new SkinnedMesh(geometry, material);
    const second = new SkinnedMesh(geometry, material);
    first.bind(skeleton);
    second.bind(skeleton);
    const parent = new Group();
    const root = new Group();
    root.add(first, second);
    parent.add(root);
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");
    const skeletonDispose = vi.spyOn(skeleton, "dispose");

    disposeBlenderModelRoot(root);

    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
    expect(skeletonDispose).toHaveBeenCalledOnce();
    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(root.parent).toBeNull();
  });
});

function validGlbResponse(headers: Record<string, string> = {}): Response {
  const bytes = new ArrayBuffer(12);
  const view = new DataView(bytes);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  return new Response(bytes, {
    headers: {
      "content-type": "model/gltf-binary",
      ...headers,
    },
  });
}
