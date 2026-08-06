import type {
  Disposable,
  MiseCollaboration,
  MiseHealthReporter,
  MiseHealthReport,
  MiseProvider,
  ScrollSnapshot,
} from "../Contracts.js";
import type { MiseLogger } from "../logging/MiseLogger.js";
import { MiseHealthCheck } from "./MiseHealthCheck.js";
import { ReducedMotionPreference } from "./ReducedMotionPreference.js";
import { ResourceScope } from "./ResourceScope.js";
import { MiseRuntime } from "./MiseRuntime.js";
import { runCleanups } from "./Cleanup.js";

export class MiseApplication {
  private readonly providerScope = new ResourceScope();
  private booted = false;
  private mounted = false;
  private disposed = false;
  private readonly healthReporter: MiseHealthReporter;

  constructor(
    private readonly providers: readonly MiseProvider[],
    private readonly runtime: MiseRuntime,
    private readonly reducedMotion: ReducedMotionPreference,
    private readonly logger: MiseLogger,
    private readonly healthCheck: MiseHealthCheck,
    private readonly compositionScope: Disposable | undefined = undefined,
  ) {
    this.healthReporter = Object.freeze({
      mark: (collaboration: MiseCollaboration) =>
        this.healthCheck.mark(collaboration),
    });
  }

  async mount(canvas: HTMLCanvasElement, documentRoot: Document): Promise<void> {
    if (this.mounted || this.disposed) return;
    try {
      this.reducedMotion.mount();
      await this.bootProviders();
      if (this.disposed) return;
      this.healthCheck.mark("application.runtime");
      this.runtime.mount(canvas, documentRoot);
      this.mounted = true;
    } catch (error) {
      this.disposed = true;
      this.mounted = false;
      try {
        runCleanups([
          () => this.reducedMotion.dispose(),
          () => this.runtime.dispose(),
          () => this.providerScope.dispose(),
          () => this.compositionScope?.dispose(),
        ], "MISE mount rollback failed.");
      } catch {
        // Preserve the original mount or Provider boot error.
      }
      this.logger.error("mise.boot_failed", {
        type: error instanceof Error ? error.name : typeof error,
      });
      throw error;
    }
  }

  activate(id: string, root: HTMLElement): Promise<void> {
    return this.runtime.activate(id, root);
  }

  setScroll(snapshot: ScrollSnapshot): void {
    this.healthCheck.mark("scroll-port.mise");
    this.runtime.setScroll(snapshot);
  }

  health(): MiseHealthReport {
    return this.healthCheck.report();
  }

  refresh(): void {
    this.runtime.refresh();
  }

  clear(): void {
    this.runtime.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mounted = false;
    runCleanups([
      () => this.reducedMotion.dispose(),
      () => this.runtime.dispose(),
      () => this.providerScope.dispose(),
      () => this.compositionScope?.dispose(),
    ], "MISE application cleanup failed.");
  }

  private async bootProviders(): Promise<void> {
    if (this.booted || this.disposed) return;
    for (const provider of this.providers) {
      if (this.disposed) return;
      await provider.boot?.({
        scope: this.providerScope.child(),
        health: this.healthReporter,
      });
    }
    if (this.disposed) return;
    this.booted = true;
  }
}
