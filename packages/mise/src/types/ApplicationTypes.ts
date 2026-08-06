import type { MiseHealthReport } from "./HealthTypes.js";

/** Public browser application handle returned by `createMise`. */
export interface MiseApplicationHandle {
  /** Mounts the browser runtime once. */
  mount(documentRoot?: Document): void;
  /** Evaluates the current runtime Health state. */
  health(): MiseHealthReport;
  /** Releases browser listeners, Scenes, adapters, renderer, and Surface. */
  dispose(): void;
}
