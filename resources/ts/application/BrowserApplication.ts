import type { GraphicsRuntime } from "../graphics/GraphicsRuntime.js";
import type { FrameLoop } from "../graphics/FrameLoop.js";
import type { Logger } from "../logging/Logger.js";
import { BarbaNavigation } from "../navigation/BarbaNavigation.js";
import type { PageModule } from "../pages/PageModule.js";
import type { PageRegistry } from "../pages/PageRegistry.js";
import type { ScrollRuntime } from "../motion/ScrollRuntime.js";

export class BrowserApplication {
  private navigation: BarbaNavigation | null = null;
  private activePage: PageModule | null = null;
  private activeRoot: HTMLElement | null = null;
  private documentRoot: Document | null = null;
  private view: Window | null = null;
  private releasePageSuspension: (() => void) | null = null;
  private releaseVisibilitySuspension: (() => void) | null = null;
  private mounted = false;
  private readonly handlePageHide = (event: PageTransitionEvent): void => {
    if (event.persisted) {
      this.suspendPageFrames();
      return;
    }
    this.dispose();
  };
  private readonly handlePageShow = (event: PageTransitionEvent): void => {
    if (!event.persisted) return;
    this.resumePageFrames();
    if (this.documentRoot?.visibilityState === "visible") this.resumeVisibilityFrames();
  };
  private readonly handleVisibilityChange = (): void => {
    if (this.documentRoot?.visibilityState === "hidden") {
      this.suspendVisibilityFrames();
      return;
    }
    if (this.documentRoot?.visibilityState === "visible") this.resumeVisibilityFrames();
  };

  constructor(
    private readonly graphics: GraphicsRuntime,
    private readonly frames: FrameLoop,
    private readonly pages: PageRegistry,
    private readonly scroll: ScrollRuntime,
    private readonly logger: Logger,
  ) {}

  mount(documentRoot: Document = document): void {
    if (this.mounted) return;
    const canvas = documentRoot.querySelector<HTMLCanvasElement>("#webgl-canvas");
    if (!canvas) {
      this.logger.error("application.canvas_missing");
      return;
    }

    const view = documentRoot.defaultView ?? window;
    this.mounted = true;
    this.documentRoot = documentRoot;
    this.view = view;
    this.graphics.mount(canvas);
    this.scroll.mount();
    this.navigation = new BarbaNavigation(documentRoot, {
      beforeRender: () => this.leavePage(),
      rendered: () => void this.mountPage(documentRoot),
    });
    this.navigation.mount();
    void this.mountPage(documentRoot);
    view.addEventListener("pagehide", this.handlePageHide);
    view.addEventListener("pageshow", this.handlePageShow);
    documentRoot.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.logger.success("application.mounted");
  }

  dispose(): void {
    if (!this.mounted) return;
    this.mounted = false;
    this.view?.removeEventListener("pagehide", this.handlePageHide);
    this.view?.removeEventListener("pageshow", this.handlePageShow);
    this.documentRoot?.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.releasePageSuspension?.();
    this.releasePageSuspension = null;
    this.releaseVisibilitySuspension?.();
    this.releaseVisibilitySuspension = null;
    this.view = null;
    this.documentRoot = null;
    this.navigation?.dispose();
    this.navigation = null;
    this.disposePage();
    this.scroll.dispose();
    this.graphics.dispose();
    this.frames.dispose();
    this.logger.debug("application.disposed");
  }

  private async mountPage(documentRoot: Document): Promise<void> {
    const root = documentRoot.querySelector<HTMLElement>("main[data-page]");
    if (!root || root === this.activeRoot) return;

    this.disposePage();
    const id = this.pages.resolve(root.dataset.page);
    if (!id) {
      this.graphics.clear();
      this.scroll.refresh();
      return;
    }

    const page = this.pages.create(id);
    this.activePage = page;
    this.activeRoot = root;
    try {
      await page.mount(root);
      this.scroll.refresh();
      this.logger.success("page.mounted", { page: id });
    } catch (error) {
      this.disposePage();
      this.logger.error("page.mount_failed", {
        page: id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async leavePage(): Promise<void> {
    try {
      await this.activePage?.leave();
    } catch (error) {
      this.logger.warning("page.leave_failed", {
        type: error instanceof Error ? error.name : typeof error,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.disposePage();
    }
  }

  private disposePage(): void {
    this.activePage?.dispose();
    this.activePage = null;
    this.activeRoot = null;
  }

  private suspendPageFrames(): void {
    if (!this.mounted || this.releasePageSuspension) return;
    this.releasePageSuspension = this.frames.acquireSuspension();
  }

  private resumePageFrames(): void {
    this.releasePageSuspension?.();
    this.releasePageSuspension = null;
    this.refreshAfterResume();
  }

  private suspendVisibilityFrames(): void {
    if (!this.mounted || this.releaseVisibilitySuspension) return;
    this.releaseVisibilitySuspension = this.frames.acquireSuspension();
  }

  private resumeVisibilityFrames(): void {
    this.releaseVisibilitySuspension?.();
    this.releaseVisibilitySuspension = null;
    this.refreshAfterResume();
  }

  private refreshAfterResume(): void {
    if (!this.mounted || this.releasePageSuspension || this.releaseVisibilitySuspension) return;
    this.scroll.refresh();
    this.frames.invalidate();
  }
}
