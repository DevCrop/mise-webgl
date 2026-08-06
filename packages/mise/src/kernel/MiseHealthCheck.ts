import type { MiseCollaboration, MiseHealthReport } from "../Contracts.js";

export const REQUIRED_COLLABORATIONS: readonly MiseCollaboration[] = Object.freeze([
  "application.providers",
  "application.registry",
  "application.container",
  "application.factory",
  "application.runtime",
  "browser-application.logging",
  "browser-application.mise",
  "browser-application.navigation",
  "browser-application.page-changer",
  "browser-application.scroll",
  "page-changer.page",
  "page.motion",
  "runtime.renderer",
  "runtime.frame-loop",
  "runtime.clock",
  "runtime.scene-changer",
  "runtime.driver",
  "runtime.debug",
  "scene-changer.scene",
  "scene.resource-scope",
  "scroll-port.mise",
] satisfies readonly MiseCollaboration[]);

export class MiseHealthCheck {
  private readonly observed = new Set<MiseCollaboration>();
  private readonly expected: readonly MiseCollaboration[];
  private readonly expectedSet: ReadonlySet<MiseCollaboration>;
  private announced = false;
  private currentReport: MiseHealthReport;

  constructor(
    expected: readonly MiseCollaboration[] = REQUIRED_COLLABORATIONS,
    private readonly onHealthy:
      | ((report: MiseHealthReport) => void)
      | undefined = undefined,
  ) {
    this.expected = Object.freeze([...new Set(expected)]);
    this.expectedSet = new Set(this.expected);
    this.currentReport = createReport(this.observed, this.expected);
  }

  mark(collaboration: MiseCollaboration): void {
    if (!this.expectedSet.has(collaboration)) return;
    if (this.observed.has(collaboration)) return;
    this.observed.add(collaboration);
    this.currentReport = createReport(this.observed, this.expected);
    if (this.currentReport.status !== "healthy") return;
    if (this.announced) return;
    this.announced = true;
    this.onHealthy?.(this.currentReport);
  }

  report(): MiseHealthReport {
    return this.currentReport;
  }
}

function createReport(
  observedKeys: ReadonlySet<MiseCollaboration>,
  expected: readonly MiseCollaboration[],
): MiseHealthReport {
  const observed = expected.filter((item) => observedKeys.has(item));
  const missing = expected.filter((item) => !observedKeys.has(item));
  return Object.freeze({
    status: missing.length === 0 ? "healthy" : "pending",
    observed: Object.freeze(observed),
    missing: Object.freeze(missing),
    total: expected.length,
  });
}
