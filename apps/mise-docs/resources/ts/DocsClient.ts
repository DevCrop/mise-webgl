import {
  copyController,
  createMiseUi,
  dialogController,
  disclosureController,
  searchController,
  tabsController,
  themeController,
  tocController,
} from "mise-ui";

const application = createMiseUi({
  root: document,
  controllers: [
    copyController,
    dialogController,
    disclosureController,
    searchController,
    tabsController,
    themeController,
    tocController,
  ],
});

application.start();
document.documentElement.dataset["miseUi"] = "ready";

let webglApplication: { dispose(): void } | null = null;
let disposed = false;

async function startWebglExample(): Promise<void> {
  const surface = document.querySelector<HTMLElement>("[data-mise-docs-webgl]");
  if (!surface) return;
  surface.dataset["miseExampleState"] = "loading";
  try {
    const { mountWebglExample } = await import("./WebglExample.js");
    const mounted = mountWebglExample(document);
    if (disposed) {
      mounted.dispose();
      return;
    }
    webglApplication = mounted;
    surface.dataset["miseExampleState"] = "ready";
  } catch {
    surface.dataset["miseExampleState"] = "fallback";
    surface.querySelector<HTMLCanvasElement>("[data-mise-canvas]")
      ?.setAttribute("data-mise-state", "fallback");
  }
}

void startWebglExample();
window.addEventListener("pagehide", () => {
  disposed = true;
  webglApplication?.dispose();
  application.dispose();
}, { once: true });
