import { AppLogger, resolveLogLevel, type Logger } from "./Logger.js";
import { ConsoleLogSink } from "./ConsoleLogSink.js";

declare global {
  interface Window {
    __APP_LOGGER__?: Logger;
  }
}

export function createLogger(documentRoot: Document = document): Logger {
  const configured = documentRoot
    .querySelector<HTMLMetaElement>('meta[name="app-log-level"]')
    ?.content;
  const logger = new AppLogger(
    new ConsoleLogSink(),
    resolveLogLevel(configured ?? (import.meta.env.DEV ? "debug" : "warning")),
  );
  window.__APP_LOGGER__ = logger;
  return logger;
}
