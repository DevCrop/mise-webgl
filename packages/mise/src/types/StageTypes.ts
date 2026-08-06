import type { SceneDefinition } from "./SceneTypes.js";

/** Physical canvas target resolved by the browser Surface boundary. */
export type MiseSurfaceTarget =
  | { readonly kind: "default" }
  | { readonly kind: "selector"; readonly selector: string };

/** Logical render-region target within an Experience root. */
export type MiseViewTarget =
  | { readonly kind: "surface" }
  | { readonly kind: "selector"; readonly selector: string };

/** Renderer clear operation applied before one View pass. */
export type MiseViewClear = "all" | "depth" | "none";

/** Physical canvas and Renderer context boundary. */
export interface SurfaceDefinition {
  /** Experience-local unique Surface ID. */
  readonly id: string;
  /** Existing default canvas or scoped canvas selector. */
  readonly target: MiseSurfaceTarget;
  /** Shared compositor or independently isolated canvas policy. */
  readonly mode: "compositor" | "isolated";
}

/** Logical viewport and scissor region inside one Surface. */
export interface ViewDefinition {
  /** Experience-local unique View ID. */
  readonly id: string;
  /** Surface receiving this View's render pass. */
  readonly surface: string;
  /** Whole Surface or scoped section anchor. */
  readonly target: MiseViewTarget;
  /** Stable ascending render order inside the Surface. */
  readonly order: number;
  /** Explicit buffer clear policy for this pass. */
  readonly clear: MiseViewClear;
}

/** Independently active Scene sequence bound to one View. */
export interface TrackDefinition {
  /** Experience-local unique Track ID. */
  readonly id: string;
  /** View receiving this Track's active Scene. */
  readonly view: string;
  /** DOM root supplied to Drivers and Scene creation. */
  readonly root: "experience" | "view";
  /** Whether the Track updates continuously or only while its View is visible. */
  readonly activation: "always" | "visible";
  /** Ordered immutable Scene definitions owned by this Track. */
  readonly scenes: readonly SceneDefinition[];
}

/** Existing single-Track Experience definition. */
export interface SimpleExperienceDefinition {
  /** Registry-wide unique Experience ID. */
  readonly id: string;
  /** Ordered immutable Scene definitions. */
  readonly scenes: readonly SceneDefinition[];
}

/** Concurrent Surface, View, and Track Stage definition. */
export interface StageExperienceDefinition {
  /** Registry-wide unique Experience ID. */
  readonly id: string;
  /** Physical canvas boundaries used by this Stage. */
  readonly surfaces: readonly SurfaceDefinition[];
  /** Logical render regions inside the declared Surfaces. */
  readonly views: readonly ViewDefinition[];
  /** Independently active Scene sequences. */
  readonly tracks: readonly TrackDefinition[];
}

/** Simple or concurrent Stage Experience accepted by the Plan compiler. */
export type ExperienceDefinition =
  | SimpleExperienceDefinition
  | StageExperienceDefinition;
