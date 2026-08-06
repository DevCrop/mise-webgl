/** Logger threshold, including the terminal `silent` level. */
export type LogLevel = "debug" | "info" | "warning" | "error" | "silent";
/** Severity attached to an emitted entry. */
export type LogSeverity = Exclude<LogLevel, "silent"> | "success";
/** Immutable structured metadata sanitized before emission. */
export type LogContext = Readonly<Record<string, unknown>>;

/** Immutable structured log entry delivered to a Sink. */
export interface LogEntry {
  /** ISO-8601 emission time. */
  readonly timestamp: string;
  /** Monotonic sequence shared by a logger tree. */
  readonly sequence: number;
  /** Emitted severity. */
  readonly level: LogSeverity;
  /** Dot-delimited logger scope. */
  readonly scope: string;
  /** Sanitized stable event code or message. */
  readonly message: string;
  /** Optional recursively sanitized metadata. */
  readonly context?: LogContext;
}

/** Destination for sanitized structured MISE entries. */
export interface LogSink {
  /**
   * Writes one entry.
   *
   * @param entry - Sanitized immutable entry.
   */
  write(entry: LogEntry): void;
}

/** Scoped structured logging API used by framework and adapters. */
export interface MiseLogger {
  /**
   * Reads the threshold shared by this logger tree.
   *
   * @returns The shared current threshold.
   */
  getLevel(): LogLevel;
  /**
   * Updates the shared threshold for this logger and all children.
   *
   * @param level - New threshold.
   */
  setLevel(level: LogLevel): void;
  /**
   * Creates a child scope sharing the same Sink and threshold state.
   *
   * @param scope - Dot-delimited scope suffix.
   * @returns A child logger.
   */
  child(scope: string): MiseLogger;
  /**
   * Emits a debug entry when the current threshold permits it.
   *
   * @param message - Stable event code.
   * @param context - Optional metadata.
   */
  debug(message: string, context?: LogContext): void;
  /**
   * Emits an informational entry when the current threshold permits it.
   *
   * @param message - Stable event code.
   * @param context - Optional metadata.
   */
  info(message: string, context?: LogContext): void;
  /**
   * Emits a successful-outcome entry when the current threshold permits it.
   *
   * @param message - Stable event code.
   * @param context - Optional metadata.
   */
  success(message: string, context?: LogContext): void;
  /**
   * Emits a warning entry when the current threshold permits it.
   *
   * @param message - Stable event code.
   * @param context - Optional metadata.
   */
  warning(message: string, context?: LogContext): void;
  /**
   * Emits an error entry when the current threshold permits it.
   *
   * @param message - Stable event code.
   * @param context - Optional metadata.
   */
  error(message: string, context?: LogContext): void;
}

const PRIORITY: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warning: 30,
  error: 40,
  silent: 100,
};

const SEVERITY_PRIORITY: Readonly<Record<LogSeverity, number>> = {
  debug: PRIORITY.debug,
  info: PRIORITY.info,
  success: PRIORITY.info,
  warning: PRIORITY.warning,
  error: PRIORITY.error,
};

const SENSITIVE_KEY = /authorization|cookie|password|passwd|secret|token|api[_-]?key|card|payload|body|session|email|phone|address|url|uri|path|query|user(?:name|id)?/i;
const SENSITIVE_VALUE = /(?:\bBearer\s+[A-Za-z0-9._~+/=-]+|\bBasic\s+[A-Za-z0-9+/=]+|\bsk_(?:live|test)_[A-Za-z0-9]+|\b(?:password|secret|token|api[_-]?key)\s*[=:]\s*\S+)/i;
const EMAIL_VALUE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const HTTP_URL_VALUE = /\bhttps?:\/\/\S+/i;
const ABSOLUTE_PATH_VALUE = /(?:[A-Z]:\\|\/(?:Users|home|var|etc|srv|opt|tmp)\/)\S+/i;
const MAX_STRING_LENGTH = 2_048;
const MAX_CONTEXT_NODES = 256;
const MAX_COLLECTION_ITEMS = 64;

interface SanitizeState {
  readonly seen: WeakSet<object>;
  nodes: number;
}

class LoggerState {
  public sequence = 0;

  constructor(public level: LogLevel) {}
}

/**
 * Normalizes untrusted text to a supported log threshold.
 *
 * @param value - Candidate level.
 * @returns The matching level, or `warning` when unsupported.
 */
export function resolveLogLevel(value: string | null | undefined): LogLevel {
  return value && Object.prototype.hasOwnProperty.call(PRIORITY, value)
    ? value as LogLevel
    : "warning";
}

/** Default sanitized, scoped implementation of `MiseLogger`. */
export class MiseLoggerCore implements MiseLogger {
  /**
   * Creates a logger backed by a sanitized Sink.
   *
   * @param sink - Destination for sanitized entries.
   * @param level - Initial shared threshold.
   * @param scope - Initial logger scope.
   * @param state - Internal shared threshold and sequence state.
   */
  constructor(
    private readonly sink: LogSink,
    level: LogLevel,
    private readonly scope = "mise",
    private readonly state: LoggerState = new LoggerState(level),
  ) {}

  /**
   * Reads the threshold shared by this logger tree.
   *
   * @returns The shared current threshold.
   */
  getLevel(): LogLevel {
    return this.state.level;
  }

  /**
   * Updates the threshold shared by this logger and all child loggers.
   *
   * @param level - New threshold.
   */
  setLevel(level: LogLevel): void {
    this.state.level = level;
  }

  /**
   * Creates a child logger with a normalized scope suffix.
   *
   * @param scope - Dot-delimited scope suffix.
   * @returns A child logger sharing the same Sink and threshold state.
   */
  child(scope: string): MiseLogger {
    const normalized = scope.trim().replace(/^\.+|\.+$/g, "");
    return new MiseLoggerCore(
      this.sink,
      this.state.level,
      normalized ? `${this.scope}.${normalized}` : this.scope,
      this.state,
    );
  }

  /**
   * Emits a debug entry when the current threshold permits it.
   *
   * @param message - Stable event code.
   * @param context - Optional metadata.
   */
  debug(message: string, context?: LogContext): void {
    this.write("debug", message, context);
  }

  /**
   * Emits an informational entry when the current threshold permits it.
   *
   * @param message - Stable event code.
   * @param context - Optional metadata.
   */
  info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  /**
   * Emits a successful-outcome entry when the current threshold permits it.
   *
   * @param message - Stable event code.
   * @param context - Optional metadata.
   */
  success(message: string, context?: LogContext): void {
    this.write("success", message, context);
  }

  /**
   * Emits a warning entry when the current threshold permits it.
   *
   * @param message - Stable event code.
   * @param context - Optional metadata.
   */
  warning(message: string, context?: LogContext): void {
    this.write("warning", message, context);
  }

  /**
   * Emits an error entry when the current threshold permits it.
   *
   * @param message - Stable event code.
   * @param context - Optional metadata.
   */
  error(message: string, context?: LogContext): void {
    this.write("error", message, context);
  }

  private write(
    level: LogSeverity,
    message: string,
    context?: LogContext,
  ): void {
    if (
      this.state.level === "silent"
      || SEVERITY_PRIORITY[level] < PRIORITY[this.state.level]
    ) return;
    const entry = {
      timestamp: new Date().toISOString(),
      sequence: ++this.state.sequence,
      level,
      scope: this.scope,
      message: sanitizeMessage(message),
      ...(context ? { context: safelySanitizeContext(context) } : {}),
    } satisfies LogEntry;
    try {
      this.sink.write(entry);
    } catch {
      // Logging is observational and must not break application lifecycle.
    }
  }
}

function sanitizeMessage(message: string): string {
  return sanitizeValue(message, 0, createSanitizeState()) as string;
}

function safelySanitizeContext(context: LogContext): LogContext {
  try {
    return sanitizeContext(context);
  } catch {
    return Object.freeze({ sanitization: "[failed]" });
  }
}

function sanitizeContext(context: LogContext): LogContext {
  return sanitizeValue(context, 0, createSanitizeState()) as LogContext;
}

function sanitizeValue(
  value: unknown,
  depth: number,
  state: SanitizeState,
): unknown {
  state.nodes += 1;
  if (state.nodes > MAX_CONTEXT_NODES) return "[truncated]";
  if (depth >= 5) return "[truncated]";
  if (typeof value === "string") {
    if (isSensitiveString(value)) return "[redacted]";
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}[truncated]`
      : value;
  }
  if (value === null || typeof value !== "object") return value;
  if (state.seen.has(value)) return "[circular]";
  state.seen.add(value);

  if (Array.isArray(value)) {
    const result = value
      .slice(0, MAX_COLLECTION_ITEMS)
      .map((item) => sanitizeValue(item, depth + 1, state));
    if (value.length > MAX_COLLECTION_ITEMS) result.push("[truncated]");
    return result;
  }

  const result: Record<string, unknown> = {};
  const entries = Object.entries(value);
  for (const [key, item] of entries.slice(0, MAX_COLLECTION_ITEMS)) {
    result[key] = SENSITIVE_KEY.test(key)
      ? "[redacted]"
      : sanitizeValue(item, depth + 1, state);
  }
  if (entries.length > MAX_COLLECTION_ITEMS) result["[truncated]"] = true;
  return result;
}

function createSanitizeState(): SanitizeState {
  return {
    seen: new WeakSet<object>(),
    nodes: 0,
  };
}

function isSensitiveString(value: string): boolean {
  return SENSITIVE_VALUE.test(value)
    || EMAIL_VALUE.test(value)
    || HTTP_URL_VALUE.test(value)
    || ABSOLUTE_PATH_VALUE.test(value);
}
