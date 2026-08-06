const SURFACE_SELECTOR = "[data-mise-surface]";
const CANVAS_SELECTOR = "[data-mise-canvas]";
const DEFAULT_FALLBACK_TEXT =
  "WebGL is unavailable. Static content remains available.";

/** Host customization for a native MISE Surface. */
export interface MiseSurfaceOptions {
  /** Accessible text shown by a generated fallback element. */
  readonly fallbackText?: string;
}

/** Hydrates or creates the single browser canvas Surface. */
export class MiseSurface {
  private root: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private owned = false;

  /**
   * @param options - Optional fallback text customization.
   */
  constructor(private readonly options: MiseSurfaceOptions = {}) {}

  /**
   * Hydrates an existing Surface or creates a native canvas and fallback.
   *
   * @param documentRoot - Document that owns the Surface.
   * @returns The active canvas, or `null` when no body or valid canvas exists.
   */
  mount(documentRoot: Document): HTMLCanvasElement | null {
    if (this.canvas) return this.canvas;
    const existing = documentRoot.querySelector<HTMLElement>(SURFACE_SELECTOR);
    if (existing) return this.useExisting(existing);
    return this.create(documentRoot);
  }

  /** Removes only Surface markup created by this instance. */
  dispose(): void {
    if (this.owned) this.root?.remove();
    this.root = null;
    this.canvas = null;
    this.owned = false;
  }

  private useExisting(root: HTMLElement): HTMLCanvasElement | null {
    const canvas = root.tagName.toLowerCase() === "canvas"
      && root.matches(CANVAS_SELECTOR)
      ? root as HTMLCanvasElement
      : root.querySelector<HTMLCanvasElement>(`canvas${CANVAS_SELECTOR}`);
    if (!canvas) return null;
    this.root = root;
    this.canvas = canvas;
    return canvas;
  }

  private create(documentRoot: Document): HTMLCanvasElement | null {
    const body = documentRoot.body;
    if (!body) return null;
    const root = documentRoot.createElement("div");
    const canvas = documentRoot.createElement("canvas");
    const fallback = documentRoot.createElement("p");
    root.dataset["miseSurface"] = "";
    canvas.dataset["miseCanvas"] = "";
    canvas.setAttribute("aria-hidden", "true");
    fallback.dataset["miseFallback"] = "";
    fallback.setAttribute("role", "status");
    fallback.textContent = this.options.fallbackText ?? DEFAULT_FALLBACK_TEXT;
    root.append(canvas, fallback);
    body.prepend(root);
    this.root = root;
    this.canvas = canvas;
    this.owned = true;
    return canvas;
  }
}
