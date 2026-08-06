import type {
  MiseMotionPort,
  MisePageContext,
  MisePageInstance,
  MiseScenePort,
  MiseScrollPort,
} from "../Contracts.js";
import type { MiseLogger } from "../logging/MiseLogger.js";
import type { MiseHealthCheck } from "./MiseHealthCheck.js";
import type { MisePlan } from "./MisePlan.js";

export class PageChanger {
  private activePage: MisePageInstance | null = null;
  private activePageId: string | null = null;
  private activeRoot: HTMLElement | null = null;
  private epoch = 0;
  private readonly context: MisePageContext;

  constructor(
    private readonly plan: MisePlan,
    scenes: MiseScenePort,
    motion: MiseMotionPort,
    private readonly scroll: MiseScrollPort,
    private readonly logger: MiseLogger,
    private readonly health: MiseHealthCheck,
  ) {
    this.context = {
      scenes,
      motion: new TrackedMotionPort(motion, health),
    };
  }

  async mount(documentRoot: Document): Promise<void> {
    const root = documentRoot.querySelector<HTMLElement>("main[data-page]");
    if (!root) return;
    if (root === this.activeRoot) return;

    this.disposeActive();
    const definition = this.plan.page(root.dataset["page"]);
    if (!definition) {
      this.logger.warning("page.unregistered");
      this.context.scenes.clear();
      this.scroll.refresh();
      return;
    }

    const page = definition.create(this.context);
    this.health.mark("page-changer.page");
    const epoch = ++this.epoch;
    this.activePage = page;
    this.activePageId = definition.id;
    this.activeRoot = root;
    this.logger.debug("page.mount_started", { page: definition.id });

    try {
      await page.mount(root);
      if (!this.isCurrent(page, epoch)) {
        this.logger.debug("page.mount_cancelled", { page: definition.id });
        return;
      }
      this.scroll.refresh();
      this.context.scenes.refresh();
      this.logger.success("page.mounted", { page: definition.id });
    } catch (error) {
      if (this.isCurrent(page, epoch)) this.disposeActive();
      this.logger.error("page.mount_failed", {
        page: definition.id,
        type: error instanceof Error ? error.name : typeof error,
      });
    }
  }

  async leave(): Promise<void> {
    const active = this.activePage;
    const page = this.activePageId;
    if (page) this.logger.debug("page.leave_started", { page });
    try {
      await active?.leave();
      if (page) this.logger.debug("page.leave_completed", { page });
    } catch (error) {
      this.logger.warning("page.leave_failed", {
        ...(page ? { page } : {}),
        type: error instanceof Error ? error.name : typeof error,
      });
    } finally {
      if (this.activePage === active) this.disposeActive();
    }
  }

  dispose(): void {
    this.disposeActive();
  }

  private isCurrent(page: MisePageInstance, epoch: number): boolean {
    return epoch === this.epoch && this.activePage === page;
  }

  private disposeActive(): void {
    this.epoch += 1;
    const active = this.activePage;
    const page = this.activePageId;
    this.activePage = null;
    this.activePageId = null;
    this.activeRoot = null;
    try {
      active?.dispose();
    } catch (error) {
      this.logger.warning("page.dispose_failed", {
        ...(page ? { page } : {}),
        type: error instanceof Error ? error.name : typeof error,
      });
    }
    if (page) this.logger.debug("page.disposed", { page });
  }
}

class TrackedMotionPort implements MiseMotionPort {
  constructor(
    private readonly motion: MiseMotionPort,
    private readonly health: MiseHealthCheck,
  ) {}

  createPageTransition(root: HTMLElement) {
    this.health.mark("page.motion");
    return this.motion.createPageTransition(root);
  }

  dispose(): void {
    this.motion.dispose();
  }
}
