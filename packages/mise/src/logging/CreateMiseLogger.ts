import {
  MiseLoggerCore,
  resolveLogLevel,
  type MiseLogger,
  type LogLevel,
  type LogSink,
} from "./MiseLogger.js";

/** Options for constructing a scoped MISE logger. */
export interface CreateMiseLoggerOptions {
  /** Destination for sanitized structured entries. */
  readonly sink: LogSink;
  /** Minimum emitted level; defaults to `warning`. */
  readonly level?: LogLevel;
}

/**
 * Creates a root MISE logger.
 *
 * @param options - Log sink and optional minimum level.
 * @returns A logger rooted at the `mise` scope.
 */
export function createMiseLogger(
  options: CreateMiseLoggerOptions,
): MiseLogger {
  return new MiseLoggerCore(options.sink, options.level ?? "warning");
}

/**
 * Resolves the effective browser log level.
 *
 * @param configured - Optional configured level.
 * @param development - Whether the current bundle is a development build.
 * @param search - Current URL search string used for the explicit debug flag.
 * @returns The effective sanitized log level.
 */
export function resolveBrowserLogLevel(
  configured: string | null | undefined,
  development: boolean,
  search: string,
): LogLevel {
  const level = resolveLogLevel(configured ?? (development ? "debug" : "warning"));
  if (level === "silent") return "silent";
  if (development || new URLSearchParams(search).get("debug") === "1") return "debug";
  return level;
}
