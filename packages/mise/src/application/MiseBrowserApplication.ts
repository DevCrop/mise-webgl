import type {
  MiseApplicationHandle,
  MiseHealthReport,
  MiseMotionPort,
  MiseNavigationFactory,
  MiseNavigationPort,
  MiseScrollPort,
} from "../Contracts.js";
import type { MiseLogger } from "../logging/MiseLogger.js";
import type { MiseSurface } from "../dom/MiseSurface.js";
import type { FrameLoop } from "../kernel/FrameLoop.js";
import type { MiseApplication } from "../kernel/MiseApplication.js";
import type { MiseHealthCheck } from "../kernel/MiseHealthCheck.js";
import type { PageChanger } from "../kernel/PageChanger.js";
import { runCleanups } from "../kernel/Cleanup.js";

export class MiseBrowserApplication implements MiseApplicationHandle {
  private navigation: MiseNavigationPort | null = null;
  private documentRoot: Document | null = null;
  private view: Window | null = null;
  private releasePageSuspension: (() => void) | null = null;
  private releaseVisibilitySuspension: (() => void) | null = null;
  private mounted = false;
  private disposed = false;
  private readonly handlePageHide = (event: PageTransitionEvent): void => {
    if (event.persisted) {
      this.logger.debug("application.suspended", { source: "bfcache" });
      this.suspendPageFrames();
      return;
    }
    this.logger.debug("application.terminating", { source: "pagehide" });
    this.disposeFromBrowserLifecycle();
  };
  private readonly handlePageShow = (event: PageTransitionEvent): void => {
    if (!event.persisted) return;
    this.resumePageFrames();
    if (this.documentRoot?.visibilityState === "visible") {
      this.resumeVisibilityFrames();
    }
    this.logger.debug("application.resumed", { source: "bfcache" });
  };
  private readonly handleVisibilityChange = (): void => {
    const state = this.documentRoot?.visibilityState;
    if (state === "hidden") {
      this.logger.debug("application.suspended", { source: "visibility" });
      this.suspendVisibilityFrames();
      return;
    }
    if (state !== "visible") return;
    this.resumeVisibilityFrames();
    this.logger.debug("application.resumed", { source: "visibility" });
  };
  private readonly handleRuntimeError = (event: ErrorEvent): void => {
    this.logger.error("runtime.error", {
      type: event.error instanceof Error ? event.error.name : "ErrorEvent",
    });
  };
  private readonly handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    this.logger.error("runtime.unhandled_rejection", {
      type: event.reason instanceof Error ? event.reason.name : typeof event.reason,
    });
  };

  constructor(
    private readonly mise: MiseApplication,
    private readonly frames: FrameLoop,
    private readonly pages: PageChanger,
    private readonly scroll: MiseScrollPort,
    private readonly motion: MiseMotionPort,
    private readonly createNavigation: MiseNavigationFactory,
    private readonly logger: MiseLogger,
    private readonly healthCheck: MiseHealthCheck,
    private readonly surface: MiseSurface,
    private readonly initialExperience: string | undefined = undefined,
    private readonly initialExperienceRoot: "surface" | "body" = "surface",
  ) {}

  mount(documentRoot: Document = document): void {
    if (this.mounted || this.disposed) return;
    this.logger.debug("application.mount_started");
    this.healthCheck.mark("browser-application.logging");
    const canvas = this.surface.mount(documentRoot);
    if (!canvas) {
      this.logger.error("application.canvas_missing");
      return;
    }

    const view = documentRoot.defaultView ?? window;
    this.mounted = true;
    this.documentRoot = documentRoot;
    this.view = view;
    view.addEventListener("pagehide", this.handlePageHide);
    view.addEventListener("pageshow", this.handlePageShow);
    view.addEventListener("error", this.handleRuntimeError);
    view.addEventListener("unhandledrejection", this.handleUnhandledRejection);
    documentRoot.addEventListener("visibilitychange", this.handleVisibilityChange);
    void this.start(canvas, documentRoot);
  }

  health(): MiseHealthReport {
    return this.healthCheck.report();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.logger.debug("application.dispose_started");
    this.mounted = false;
    const navigation = this.navigation;
    this.navigation = null;
    try {
      runCleanups([
        () => this.removeBrowserListeners(),
        () => this.releaseSuspensions(),
        () => navigation?.dispose(),
        () => this.pages.dispose(),
        () => this.motion.dispose(),
        () => this.scroll.dispose(),
        () => this.mise.dispose(),
        () => this.frames.dispose(),
        () => this.surface.dispose(),
        () => this.logger.debug("application.disposed"),
      ], "MISE browser application cleanup failed.");
    } catch (error) {
      this.logger.warning("application.dispose_failed", {
        type: error instanceof Error ? error.name : typeof error,
      });
      throw error;
    }
  }

  private removeBrowserListeners(): void {
    const view = this.view;
    const documentRoot = this.documentRoot;
    this.view = null;
    this.documentRoot = null;
    runCleanups([
      () => view?.removeEventListener("pagehide", this.handlePageHide),
      () => view?.removeEventListener("pageshow", this.handlePageShow),
      () => view?.removeEventListener("error", this.handleRuntimeError),
      () => view?.removeEventListener(
        "unhandledrejection",
        this.handleUnhandledRejection,
      ),
      () => documentRoot?.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      ),
    ], "MISE browser listener cleanup failed.");
  }

  private releaseSuspensions(): void {
    const releasePage = this.releasePageSuspension;
    const releaseVisibility = this.releaseVisibilitySuspension;
    this.releasePageSuspension = null;
    this.releaseVisibilitySuspension = null;
    runCleanups([
      () => releasePage?.(),
      () => releaseVisibility?.(),
    ], "MISE frame suspension cleanup failed.");
  }

  private disposeFromBrowserLifecycle(): void {
    try {
      this.dispose();
    } catch {
      // Public dispose reports the fixed failure event; browser teardown stays safe.
    }
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
    if (!this.mounted) return;
    if (this.releasePageSuspension || this.releaseVisibilitySuspension) return;
    this.scroll.refresh();
    this.mise.refresh();
    this.frames.invalidate();
  }

  private async start(
    canvas: HTMLCanvasElement,
    documentRoot: Document,
  ): Promise<void> {
    try {
      this.scroll.mount();
      this.healthCheck.mark("browser-application.scroll");
      await this.mise.mount(canvas, documentRoot);
      this.healthCheck.mark("browser-application.mise");
      if (!this.mounted) return;
      if (!(await this.activateInitialExperience(
        canvas,
        documentRoot,
      ))) return;
      this.navigation = this.createNavigation(
        documentRoot,
        {
          beforeChange: () => this.pages.leave(),
          afterChange: () => this.pages.mount(documentRoot),
        },
        this.logger.child("navigation"),
      );
      this.healthCheck.mark("browser-application.page-changer");
      this.navigation.mount();
      this.healthCheck.mark("browser-application.navigation");
      await this.pages.mount(documentRoot);
      if (!this.mounted) return;
      this.reportPendingHealth();
      this.logger.success("application.mounted");
    } catch (error) {
      this.logger.error("application.mount_failed", {
        type: error instanceof Error ? error.name : typeof error,
      });
      this.disposeFromBrowserLifecycle();
    }
  }

  private reportPendingHealth(): void {
    const report = this.healthCheck.report();
    if (report.status === "healthy") return;
    this.logger.debug("mise.health_pending", {
      observed: report.observed.length,
      total: report.total,
      missing: report.missing,
    });
  }

  private async activateInitialExperience(
    canvas: HTMLCanvasElement,
    documentRoot: Document,
  ): Promise<boolean> {
    if (!this.initialExperience) return true;
    const root = this.initialExperienceRoot === "body"
      ? documentRoot.body
      : canvas;
    await this.mise.activate(this.initialExperience, root);
    return this.mounted;
  }
}
