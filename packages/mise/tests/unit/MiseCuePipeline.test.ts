import { describe, expect, it, vi } from "vitest";
import { MiseCuePipeline } from "../../src/kernel/MiseCuePipeline.js";

describe("MiseCuePipeline", () => {
  it("guarantees declared before → action → after order", async () => {
    const calls: string[] = [];
    const pipeline = new MiseCuePipeline({
      before: [
        () => {
          calls.push("before:1");
        },
        async () => {
          calls.push("before:2");
        },
      ],
      after: [
        () => {
          calls.push("after:1");
        },
        async () => {
          calls.push("after:2");
        },
      ],
    });

    const result = await pipeline.run(undefined, () => {
      calls.push("action");
      return 42;
    });

    expect(result).toBe(42);
    expect(calls).toEqual([
      "before:1",
      "before:2",
      "action",
      "after:1",
      "after:2",
    ]);
  });

  it("does not run action or after cues when a before cue fails", async () => {
    const action = vi.fn();
    const after = vi.fn();
    const pipeline = new MiseCuePipeline({
      before: [() => {
        throw new Error("blocked");
      }],
      after: [after],
    });

    await expect(pipeline.run(undefined, action)).rejects.toThrow("blocked");
    expect(action).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });
});
