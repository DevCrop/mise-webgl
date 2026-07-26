import { describe, expect, it } from "vitest";
import { AppLogger, type LogEntry, type LogSink } from "./Logger.js";

class MemorySink implements LogSink {
  readonly entries: LogEntry[] = [];

  write(entry: LogEntry): void {
    this.entries.push(entry);
  }
}

describe("AppLogger", () => {
  it("treats success as an info-priority state", () => {
    const sink = new MemorySink();
    const logger = new AppLogger(sink, "info");

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
    const logger = new AppLogger(sink, "warning");
    const graphics = logger.child("graphics");

    logger.setLevel("debug");
    graphics.debug("viewport.resized");

    expect(sink.entries[0]).toMatchObject({
      level: "debug",
      scope: "app.graphics",
      message: "viewport.resized",
    });
  });

  it("redacts sensitive context before it reaches the console sink", () => {
    const sink = new MemorySink();
    const logger = new AppLogger(sink, "debug");

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
});
