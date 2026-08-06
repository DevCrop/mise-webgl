import { describe, expect, it } from "vitest";
import {
  MiseLoggerCore,
  type LogContext,
  type LogEntry,
  type LogSink,
} from "../../src/logging/MiseLogger.js";

class MemorySink implements LogSink {
  readonly entries: LogEntry[] = [];

  write(entry: LogEntry): void {
    this.entries.push(entry);
  }
}

describe("MiseLoggerCore", () => {
  it("treats success as an info-priority state", () => {
    const sink = new MemorySink();
    const logger = new MiseLoggerCore(sink, "info");

    logger.debug("debug.hidden");
    logger.success("runtime.ready");
    logger.setLevel("warning");
    logger.success("runtime.hidden");
    logger.warning("runtime.degraded");

    expect(sink.entries.map(({ level, message }) => [level, message])).toEqual([
      ["success", "runtime.ready"],
      ["warning", "runtime.degraded"],
    ]);
  });

  it("shares the configured level with child loggers", () => {
    const sink = new MemorySink();
    const logger = new MiseLoggerCore(sink, "warning");
    const graphics = logger.child("graphics");

    logger.setLevel("debug");
    graphics.debug("viewport.resized");
    logger.debug("application.resumed");

    expect(sink.entries[0]).toMatchObject({
      sequence: 1,
      level: "debug",
      scope: "mise.graphics",
      message: "viewport.resized",
    });
    expect(sink.entries[1]).toMatchObject({
      sequence: 2,
      scope: "mise",
      message: "application.resumed",
    });
  });

  it("redacts sensitive context before it reaches the console sink", () => {
    const sink = new MemorySink();
    const logger = new MiseLoggerCore(sink, "debug");

    logger.error("request.failed", {
      token: "private",
      request: { authorization: "Bearer private", status: 401 },
      diagnostic: "provider returned token=private",
    });

    expect(sink.entries[0]?.context).toEqual({
      token: "[redacted]",
      request: { authorization: "[redacted]", status: 401 },
      diagnostic: "[redacted]",
    });
  });

  it("never emits raw exception messages when the caller uses the lifecycle contract", () => {
    const sink = new MemorySink();
    const logger = new MiseLoggerCore(sink, "debug");

    logger.error("page.mount_failed", {
      page: "home",
      type: new Error("secret path C:\\private\\file.ts").name,
    });

    expect(sink.entries[0]?.context).toEqual({
      page: "home",
      type: "Error",
    });
  });

  it("redacts sensitive message content", () => {
    const sink = new MemorySink();
    const logger = new MiseLoggerCore(sink, "debug");

    logger.error("request failed token=private");

    expect(sink.entries[0]?.message).toBe("[redacted]");
  });

  it("redacts PII, full URLs, and absolute paths", () => {
    const sink = new MemorySink();
    const logger = new MiseLoggerCore(sink, "debug");

    logger.warning("request.rejected", {
      email: "person@example.com",
      requestUrl: "https://portfolio.test/private?token=secret",
      filePath: "C:\\private\\scene.ts",
      diagnostic: "contact person@example.com",
      status: 400,
    });

    expect(sink.entries[0]?.context).toEqual({
      email: "[redacted]",
      requestUrl: "[redacted]",
      filePath: "[redacted]",
      diagnostic: "[redacted]",
      status: 400,
    });
  });

  it("bounds broad log contexts before sending them to a sink", () => {
    const sink = new MemorySink();
    const logger = new MiseLoggerCore(sink, "debug");

    logger.debug("runtime.snapshot", {
      values: Array.from({ length: 100 }, (_, index) => index),
    });

    const values = sink.entries[0]?.context?.["values"];
    expect(values).toBeInstanceOf(Array);
    expect(values).toHaveLength(65);
    expect((values as unknown[]).at(-1)).toBe("[truncated]");
  });

  it("isolates sink and context-sanitization failures", () => {
    const throwingSink: LogSink = {
      write: () => {
        throw new Error("sink failed");
      },
    };
    const logger = new MiseLoggerCore(throwingSink, "debug");
    const context = Object.defineProperty({}, "broken", {
      enumerable: true,
      get: () => {
        throw new Error("getter failed");
      },
    }) as LogContext;

    expect(() => logger.error("runtime.error", context)).not.toThrow();
    expect(() => logger.error("runtime.error")).not.toThrow();
  });
});
