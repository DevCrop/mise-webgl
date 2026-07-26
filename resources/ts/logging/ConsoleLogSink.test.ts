import { describe, expect, it, vi } from "vitest";
import { ConsoleLogSink, type ConsoleTarget } from "./ConsoleLogSink.js";
import type { LogEntry, LogSeverity } from "./Logger.js";

function createTarget(): ConsoleTarget {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function entry(level: LogSeverity): LogEntry {
  return {
    timestamp: "2026-07-15T12:34:56.789Z",
    level,
    scope: "app.graphics",
    message: "runtime.state_changed",
  };
}

describe("ConsoleLogSink", () => {
  it.each([
    ["debug", "debug", "DEBUG"],
    ["info", "info", "INFO"],
    ["success", "info", "SUCCESS"],
    ["warning", "warn", "WARN"],
    ["error", "error", "ERROR"],
  ] as const)("renders %s through console.%s", (level, method, label) => {
    const target = createTarget();
    new ConsoleLogSink(target).write(entry(level));

    const output = vi.mocked(target[method]);
    expect(output).toHaveBeenCalledOnce();
    expect(output.mock.calls[0]?.[0]).toContain("%c PORTFOLIO %c");
    expect(output.mock.calls[0]?.[0]).toContain(label);
    expect(output.mock.calls[0]?.[0]).toContain("12:34:56.789Z");
    expect(output.mock.calls[0]?.[0]).toContain("app.graphics");
    expect(output.mock.calls[0]?.[0]).toContain("runtime.state_changed");
  });

  it("keeps structured context expandable without printing an empty object", () => {
    const target = createTarget();
    const sink = new ConsoleLogSink(target);
    const context = { scene: "home", viewport: { width: 1440, height: 900 } };

    sink.write({ ...entry("success"), context });
    sink.write(entry("info"));

    const successCall = vi.mocked(target.info).mock.calls[0];
    expect(successCall?.[successCall.length - 1]).toBe(context);
    expect(vi.mocked(target.info).mock.calls[1]).toHaveLength(6);
  });
});
