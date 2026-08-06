import type { Barba } from "@barba/core";
import type {
  MiseNavigationLifecycle,
  MiseNavigationPort,
} from "../../Contracts.js";
import type { MiseLogger } from "../../logging/MiseLogger.js";

/** Lazy Barba adapter that delegates document changes to MISE Page lifecycle. */
export class BarbaNavigationPort implements MiseNavigationPort {
  private mounted = false;
  private barba: Barba | null = null;

  /**
   * Creates an unmounted Barba navigation adapter.
   *
   * @param documentRoot - Document containing optional Barba markup.
   * @param lifecycle - Page lifecycle callbacks.
   * @param logger - Scoped lifecycle logger.
   */
  constructor(
    private readonly documentRoot: Document,
    private readonly lifecycle: MiseNavigationLifecycle,
    private readonly logger: MiseLogger,
  ) {}

  /** Lazily loads Barba when compatible markup and a browser document exist. */
  mount(): void {
    if (this.mounted) return;
    if (typeof document === "undefined" || this.documentRoot !== document) {
      this.logger.debug("navigation.skipped", {
        reason: "non_browser_document",
      });
      return;
    }
    if (!this.documentRoot.querySelector('[data-barba="wrapper"]')) {
      this.logger.debug("navigation.skipped", { reason: "wrapper_missing" });
      return;
    }
    this.mounted = true;
    this.logger.debug("navigation.load_started");
    void import("@barba/core")
      .then(({ default: barba }) => {
        if (!this.mounted) return;
        this.barba = barba;
        barba.init({
          preventRunning: true,
          prevent: ({ href }) => shouldPreventNavigation(
            href,
            window.location.href,
          ),
          transitions: [
            {
              name: "portfolio",
              leave: () => this.lifecycle.beforeChange(),
              afterEnter: () => this.lifecycle.afterChange(),
            },
          ],
        });
        this.logger.success("navigation.ready");
      })
      .catch((error: unknown) => {
        safelyDestroy(this.barba);
        this.mounted = false;
        this.barba = null;
        this.logger.warning("navigation.load_failed", {
          type: error instanceof Error ? error.name : typeof error,
        });
      });
  }

  /** Stops navigation interception and destroys Barba state. */
  dispose(): void {
    if (!this.mounted) return;
    this.mounted = false;
    this.barba?.destroy();
    this.barba = null;
    this.logger.debug("navigation.disposed");
  }
}

/**
 * Determines whether Barba must leave a link to the browser.
 *
 * @param href - Candidate link target.
 * @param currentUrl - Current absolute document URL.
 * @returns `true` for hashes, external origins, protocols, and invalid URLs.
 */
export function shouldPreventNavigation(
  href: string,
  currentUrl: string,
): boolean {
  if (
    href.startsWith("#")
    || href.startsWith("mailto:")
    || href.startsWith("tel:")
  ) return true;
  try {
    return new URL(href, currentUrl).origin !== new URL(currentUrl).origin;
  } catch {
    return true;
  }
}

function safelyDestroy(barba: Barba | null): void {
  try {
    barba?.destroy();
  } catch {
    // A partially initialized adapter must not escape cleanup failure.
  }
}
