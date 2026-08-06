import { describe, expect, it } from "vitest";
import { MiseClock } from "../../src/clock/MiseClock.js";
import { MiseError } from "../../src/MiseError.js";

describe("MiseClock", () => {
  it("emits deterministic delta, raw delta, elapsed, and frame values", () => {
    const clock = new MiseClock({ maxDelta: 0.1 });

    expect(clock.sample(1000)).toEqual({
      time: 1,
      delta: 0,
      rawDelta: 0,
      elapsed: 0,
      frame: 0,
    });
    expect(clock.sample(1016)).toEqual({
      time: 1.016,
      delta: 0.016,
      rawDelta: 0.016,
      elapsed: 0.016,
      frame: 1,
    });
    expect(clock.sample(1516)).toEqual({
      time: 1.516,
      delta: 0.1,
      rawDelta: 0.5,
      elapsed: 0.116,
      frame: 2,
    });
  });

  it("rebases after pause and fully resets on demand", () => {
    const clock = new MiseClock();
    clock.sample(1000);
    clock.sample(1010);
    clock.pause();

    expect(clock.sample(5000)).toMatchObject({
      delta: 0,
      rawDelta: 0,
      elapsed: 0.01,
      frame: 2,
    });

    clock.reset();
    expect(clock.sample(6000)).toMatchObject({
      delta: 0,
      rawDelta: 0,
      elapsed: 0,
      frame: 0,
    });
  });

  it("rejects invalid configuration and timestamps", () => {
    expectMiseError(
      () => new MiseClock({ maxDelta: 0 }),
      "MISE_CLOCK_INVALID",
      "maxDelta",
    );
    expectMiseError(
      () => new MiseClock().sample(Number.NaN),
      "MISE_CLOCK_INVALID",
      "timestamp",
    );
    expectMiseError(
      () => new MiseClock().sample(-1),
      "MISE_CLOCK_INVALID",
      "timestamp",
    );
    expect(new MiseClock().sample(0).time).toBe(0);
  });
});

function expectMiseError(
  action: () => unknown,
  code: MiseError["code"],
  message: string,
): void {
  expect(action).toThrowError(MiseError);
  try {
    action();
  } catch (error) {
    expect(error).toMatchObject({ code });
    expect(error).toHaveProperty("message", expect.stringContaining(message));
  }
}
