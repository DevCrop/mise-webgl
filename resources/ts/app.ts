import "vite/modulepreload-polyfill";
import "../scss/style.scss";
import { createLogger } from "./logging/createLogger.js";

async function start(): Promise<void> {
  const logger = createLogger();
  try {
    logger.info("application.starting", { mode: import.meta.env.MODE });
    const { createBrowserApplication } = await import(
      "./bootstrap/createBrowserApplication.js"
    );
    createBrowserApplication(logger).mount();
  } catch (error) {
    logger.error("application.start_failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void start(), { once: true });
} else {
  void start();
}
