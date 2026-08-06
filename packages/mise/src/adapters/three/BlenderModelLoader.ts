import {
  AnimationClip,
  BufferGeometry,
  LoadingManager,
  Material,
  Mesh,
  Object3D,
  Skeleton,
  SkinnedMesh,
  Texture,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MiseError } from "../../MiseError.js";

const MAX_MODEL_BYTES = 32 * 1024 * 1024;
const GLB_HEADER_BYTES = 12;
const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const ACCEPTED_MODEL_TYPES = new Set([
  "application/octet-stream",
  "model/gltf-binary",
]);

/** Loaded GLB Scene graph and animations with explicit GPU cleanup. */
export interface BlenderModel {
  /** Root Object3D from the default GLB Scene. */
  readonly root: Object3D;
  /** Animation clips embedded in the GLB. */
  readonly animations: readonly AnimationClip[];
  /** Disposes unique geometry, materials, textures, skeletons, and bitmaps. */
  dispose(): void;
}

/** Aggregate progress emitted by Three.js LoadingManager. */
export interface ModelLoadProgress {
  /** Number of manager items completed. */
  readonly loaded: number;
  /** Total manager items discovered. */
  readonly total: number;
  /** Completion ratio from zero through one. */
  readonly ratio: number;
  /** URL of the latest completed manager item. */
  readonly url: string;
}

/** Options controlling one GLB load. */
export interface ModelLoadOptions {
  /** Scene transition signal used to discard stale results. */
  readonly signal?: AbortSignal;
}

/** Same-origin GLB loader with deterministic Three.js resource disposal. */
export class BlenderModelLoader {
  private readonly onProgress: ((progress: ModelLoadProgress) => void) | undefined;

  /**
   * Creates a GLB loader with optional aggregate progress reporting.
   *
   * @param onProgress - Optional aggregate load progress observer.
   */
  constructor(onProgress?: (progress: ModelLoadProgress) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Loads one same-origin GLB and configures its Mesh defaults.
   *
   * @param url - Same-origin absolute or document-relative GLB URL.
   * @param options - Optional transition abort signal.
   * @returns A disposable model and its animation clips.
   * @throws `MiseError` when the URL is cross-origin or the result is stale.
   */
  async load(
    url: string,
    options: ModelLoadOptions = {},
  ): Promise<BlenderModel> {
    assertModelLoadActive(options.signal);
    const resolved = new URL(url, window.location.href);
    assertModelUrl(resolved);
    const bytes = await fetchModelBytes(resolved, options.signal);
    this.onProgress?.({
      loaded: 1,
      total: 1,
      ratio: 1,
      url: resolved.pathname,
    });
    assertModelLoadActive(options.signal);
    const manager = createRestrictedLoadingManager(resolved, this.onProgress);
    const loader = new GLTFLoader(manager);
    const gltf = await parseModel(loader, bytes, resolved, options.signal);
    const root = gltf.scene;
    if (options.signal?.aborted) {
      disposeBlenderModelRoot(root);
      throw modelLoadAborted();
    }

    root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
      object.frustumCulled = true;
    });

    return {
      root,
      animations: gltf.animations,
      dispose: () => disposeBlenderModelRoot(root),
    };
  }
}

function assertModelUrl(resolved: URL): void {
  const validProtocol = resolved.protocol === "https:"
    || resolved.protocol === "http:";
  const validPath = resolved.pathname.toLowerCase().endsWith(".glb");
  if (
    validProtocol
    && resolved.origin === window.location.origin
    && resolved.username.length === 0
    && resolved.password.length === 0
    && resolved.search.length === 0
    && resolved.hash.length === 0
    && validPath
  ) return;
  throw new MiseError(
    "MISE_MODEL_URL_INVALID",
    "MISE model URL must be a canonical same-origin GLB URL.",
  );
}

async function fetchModelBytes(
  resolved: URL,
  signal: AbortSignal | undefined,
): Promise<ArrayBuffer> {
  try {
    const response = await fetch(resolved.href, {
      credentials: "same-origin",
      redirect: "error",
      ...(signal ? { signal } : {}),
    });
    assertModelResponse(response);
    const bytes = await readLimitedBody(response);
    assertGlbHeader(bytes);
    return bytes;
  } catch (error) {
    if (error instanceof MiseError) throw error;
    if (signal?.aborted || isAbortError(error)) throw modelLoadAborted();
    throw new MiseError(
      "MISE_MODEL_INVALID",
      "MISE model response is invalid.",
      { cause: error },
    );
  }
}

function assertModelResponse(response: Response): void {
  if (!response.ok) {
    throw new MiseError(
      "MISE_MODEL_INVALID",
      "MISE model response is unavailable.",
    );
  }
  const contentType = response.headers.get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType && !ACCEPTED_MODEL_TYPES.has(contentType)) {
    throw new MiseError(
      "MISE_MODEL_INVALID",
      "MISE model response has an unsupported media type.",
    );
  }
  const contentLength = response.headers.get("content-length");
  if (!contentLength) return;
  if (!/^\d+$/.test(contentLength)) {
    throw new MiseError(
      "MISE_MODEL_INVALID",
      "MISE model response has an invalid content length.",
    );
  }
  if (Number(contentLength) > MAX_MODEL_BYTES) throw modelTooLarge();
}

async function readLimitedBody(response: Response): Promise<ArrayBuffer> {
  const reader = response.body?.getReader();
  if (!reader) return readFallbackBody(response);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > MAX_MODEL_BYTES) {
        await reader.cancel();
        throw modelTooLarge();
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}

async function readFallbackBody(response: Response): Promise<ArrayBuffer> {
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_MODEL_BYTES) throw modelTooLarge();
  return bytes;
}

function assertGlbHeader(bytes: ArrayBuffer): void {
  if (bytes.byteLength < GLB_HEADER_BYTES) throw modelInvalidFormat();
  const header = new DataView(bytes, 0, GLB_HEADER_BYTES);
  const valid = header.getUint32(0, true) === GLB_MAGIC
    && header.getUint32(4, true) === GLB_VERSION
    && header.getUint32(8, true) === bytes.byteLength;
  if (!valid) throw modelInvalidFormat();
}

function createRestrictedLoadingManager(
  model: URL,
  onProgress: ((progress: ModelLoadProgress) => void) | undefined,
): LoadingManager {
  const manager = new LoadingManager();
  manager.setURLModifier((url) => {
    const resource = new URL(url, model);
    if (resource.protocol === "blob:" || resource.protocol === "data:") {
      return url;
    }
    throw new MiseError(
      "MISE_MODEL_URL_INVALID",
      "MISE GLB must not reference external resources.",
    );
  });
  manager.onProgress = (_url, loaded, total) => {
    onProgress?.({
      loaded,
      total,
      ratio: total > 0 ? loaded / total : 0,
      url: model.pathname,
    });
  };
  return manager;
}

async function parseModel(
  loader: GLTFLoader,
  bytes: ArrayBuffer,
  model: URL,
  signal: AbortSignal | undefined,
) {
  try {
    const basePath = new URL(".", model).href;
    const gltf = await loader.parseAsync(bytes, basePath);
    assertModelLoadActive(signal);
    return gltf;
  } catch (error) {
    if (error instanceof MiseError) throw error;
    if (signal?.aborted || isAbortError(error)) throw modelLoadAborted();
    throw new MiseError(
      "MISE_MODEL_INVALID",
      "MISE GLB could not be parsed.",
      { cause: error },
    );
  }
}

function assertModelLoadActive(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw modelLoadAborted();
}

function modelLoadAborted(): MiseError {
  return new MiseError(
    "MISE_MODEL_LOAD_ABORTED",
    "MISE model load was superseded.",
  );
}

function modelTooLarge(): MiseError {
  return new MiseError(
    "MISE_MODEL_TOO_LARGE",
    "MISE GLB exceeds the 32 MiB safety budget.",
  );
}

function modelInvalidFormat(): MiseError {
  return new MiseError(
    "MISE_MODEL_INVALID",
    "MISE model response is not a valid GLB 2.0 binary.",
  );
}

function isAbortError(error: unknown): boolean {
  return typeof DOMException !== "undefined"
    && error instanceof DOMException
    && error.name === "AbortError";
}

/**
 * Disposes every unique GPU resource reachable from a model root.
 *
 * @param root - Model graph whose owned resources must be released.
 */
export function disposeBlenderModelRoot(root: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const skeletons = new Set<Skeleton>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    if (object instanceof SkinnedMesh) skeletons.add(object.skeleton);
    const meshMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of meshMaterials) {
      materials.add(material);
      collectTextures(material, textures);
    }
  });
  const imageBitmaps = new Set<ImageBitmap>();
  for (const texture of textures) {
    const image = texture.source.data;
    if (
      typeof ImageBitmap !== "undefined"
      && image instanceof ImageBitmap
    ) imageBitmaps.add(image);
    texture.dispose();
  }
  for (const imageBitmap of imageBitmaps) imageBitmap.close();
  for (const skeleton of skeletons) skeleton.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  root.removeFromParent();
}

function collectTextures(material: Material, textures: Set<Texture>): void {
  for (const value of Object.values(material)) {
    if (value instanceof Texture) textures.add(value);
  }
  const shaderMaterial = material as Material & {
    readonly uniforms?: Readonly<Record<string, { readonly value?: unknown }>>;
  };
  for (const uniform of Object.values(shaderMaterial.uniforms ?? {})) {
    collectTextureValue(uniform.value, textures);
  }
}

function collectTextureValue(value: unknown, textures: Set<Texture>): void {
  if (value instanceof Texture) {
    textures.add(value);
    return;
  }
  if (!Array.isArray(value)) return;
  for (const item of value) {
    if (item instanceof Texture) textures.add(item);
  }
}
