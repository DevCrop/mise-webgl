export type LogLevel = "debug" | "info" | "warning" | "error" | "silent";
export type LogSeverity = Exclude<LogLevel, "silent"> | "success";
export type LogContext = Readonly<Record<string, unknown>>;

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogSeverity;
  readonly scope: string;
  readonly message: string;
  readonly context?: LogContext;
}

export interface LogSink {
  write(entry: LogEntry): void;
}

export interface Logger {
  getLevel(): LogLevel;
  setLevel(level: LogLevel): void;
  child(scope: string): Logger;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  success(message: string, context?: LogContext): void;
  warning(message: string, context?: LogContext): void;
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

const SENSITIVE_KEY = /authorization|cookie|password|passwd|secret|token|api[_-]?key|card|payload|body/i;
const SENSITIVE_VALUE = /(?:\bBearer\s+[A-Za-z0-9._~+/=-]+|\bBasic\s+[A-Za-z0-9+/=]+|\bsk_(?:live|test)_[A-Za-z0-9]+|\b(?:password|secret|token|api[_-]?key)\s*[=:]\s*\S+)/i;
const MAX_STRING_LENGTH = 2_048;

class LoggerState {
  constructor(public level: LogLevel) {}
}

export function resolveLogLevel(value: string | null | undefined): LogLevel {
  return value && Object.prototype.hasOwnProperty.call(PRIORITY, value)
    ? value as LogLevel
    : "warning";
}

export class AppLogger implements Logger {
  constructor(
    private readonly sink: LogSink,
    level: LogLevel,
    private readonly scope = "app",
    private readonly state = new LoggerState(level),
  ) {}

  getLevel(): LogLevel {
    return this.state.level;
  }

  setLevel(level: LogLevel): void {
    this.state.level = level;
  }

  child(scope: string): Logger {
    const normalized = scope.trim().replace(/^\.+|\.+$/g, "");
    return new AppLogger(
      this.sink,
      this.state.level,
      normalized ? `${this.scope}.${normalized}` : this.scope,
      this.state,
    );
  }

  debug(message: string, context?: LogContext): void {
    this.write("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  success(message: string, context?: LogContext): void {
    this.write("success", message, context);
  }

  warning(message: string, context?: LogContext): void {
    this.write("warning", message, context);
  }

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
    this.sink.write({
      timestamp: new Date().toISOString(),
      level,
      scope: this.scope,
      message,
      ...(context ? { context: sanitizeContext(context) } : {}),
    });
  }
}

function sanitizeContext(context: LogContext): LogContext {
  return sanitizeValue(context, 0, new WeakSet<object>()) as LogContext;
}

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (depth >= 5) return "[truncated]";
  if (typeof value === "string") {
    if (SENSITIVE_VALUE.test(value)) return "[redacted]";
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}[truncated]`
      : value;
  }
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY.test(key)
      ? "[redacted]"
      : sanitizeValue(item, depth + 1, seen);
  }
  return result;
}
