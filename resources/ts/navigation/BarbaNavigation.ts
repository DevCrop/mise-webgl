import type { Barba } from "@barba/core";

export interface NavigationLifecycle {
  beforeRender(): Promise<void>;
  rendered(): void;
}

export class BarbaNavigation {
  private mounted = false;
  private barba: Barba | null = null;

  constructor(
    private readonly documentRoot: Document,
    private readonly lifecycle: NavigationLifecycle,
  ) {}

  mount(): void {
    if (this.mounted) return;
    if (typeof document === "undefined") return;
    if (this.documentRoot !== document) return;
    if (!this.documentRoot.querySelector('[data-barba="wrapper"]')) return;
    this.mounted = true;
    void import("@barba/core").then(({ default: barba }) => {
      if (!this.mounted) return;
      this.barba = barba;
      barba.init({
        preventRunning: true,
        prevent: ({ href }) =>
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          new URL(href, window.location.href).origin !== window.location.origin,
        transitions: [
          {
            name: "portfolio",
            leave: () => this.lifecycle.beforeRender(),
            afterEnter: () => this.lifecycle.rendered(),
          },
        ],
      });
    });
  }

  dispose(): void {
    if (!this.mounted) return;
    this.mounted = false;
    this.barba?.destroy();
    this.barba = null;
  }
}
