import { describe, expect, it, vi } from "vitest";
import {
  FrameLoop,
  type FrameRequest,
} from "../../src/kernel/FrameLoop.js";
import type { FrameTick } from "../../src/Contracts.js";
import { MiseClock } from "../../src/clock/MiseClock.js";

function harness(): {
  loop: FrameLoop;
  callbacks: Map<number, FrameRequestCallback>;
  cancel: ReturnType<typeof vi.fn>;
} {
  const callbacks = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  const request: FrameRequest = (callback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  };
  const cancel = vi.fn((id: number) => callbacks.delete(id));
  return { loop: new FrameLoop(request, cancel), callbacks, cancel };
}

function flush(callbacks: Map<number, FrameRequestCallback>, time = 16): void {
  const [id, callback] = callbacks.entries().next().value as [number, FrameRequestCallback];
  callbacks.delete(id);
  callback(time);
}

describe("FrameLoop", () => {
  it("coalesces one-shot invalidations", () => {
    const { loop, callbacks } = harness();
    const task = vi.fn();
    loop.subscribe(task);

    loop.invalidate();
    loop.invalidate();

    expect(callbacks.size).toBe(1);
    flush(callbacks);
    expect(task).toHaveBeenCalledTimes(1);
    expect(callbacks.size).toBe(0);
  });

  it("unsubscribes callbacks without affecting other subscribers", () => {
    const { loop, callbacks } = harness();
    const removed = vi.fn();
    const retained = vi.fn();
    const unsubscribe = loop.subscribe(removed);
    loop.subscribe(retained);
    unsubscribe();
    unsubscribe();

    loop.invalidate();
    flush(callbacks, 1000);

    expect(removed).not.toHaveBeenCalled();
    expect(retained).toHaveBeenCalledWith(expect.objectContaining({
      time: 1,
      delta: 0,
      rawDelta: 0,
      elapsed: 0,
      frame: 0,
    }));
  });

  it("runs continuously only while a lease is active", () => {
    const { loop, callbacks } = harness();
    const release = loop.acquireContinuous();

    flush(callbacks, 16);
    expect(callbacks.size).toBe(1);
    release();
    flush(callbacks, 32);
    expect(callbacks.size).toBe(0);
  });

  it("keeps scheduling until every continuous owner releases", () => {
    const { loop, callbacks } = harness();
    const releaseA = loop.acquireContinuous();
    const releaseB = loop.acquireContinuous();

    releaseA();
    releaseA();
    flush(callbacks, 16);
    expect(callbacks.size).toBe(1);
    releaseB();
    flush(callbacks, 32);
    expect(callbacks.size).toBe(0);
  });

  it("keeps subscribers and continuous scheduling alive after a callback fails", () => {
    const { loop, callbacks } = harness();
    const healthyTask = vi.fn();
    loop.subscribe(() => {
      throw new Error("frame callback failed");
    });
    loop.subscribe(healthyTask);
    loop.acquireContinuous();

    expect(() => flush(callbacks)).toThrow("frame callback failed");
    expect(healthyTask).toHaveBeenCalledOnce();
    expect(callbacks.size).toBe(1);
  });

  it("reports the first callback failure after invoking every subscriber", () => {
    const { loop, callbacks } = harness();
    const order: string[] = [];
    loop.subscribe(() => {
      order.push("first");
      throw new Error("first failure");
    });
    loop.subscribe(() => {
      order.push("second");
      throw new Error("second failure");
    });

    loop.invalidate();

    expect(() => flush(callbacks)).toThrow("first failure");
    expect(order).toEqual(["first", "second"]);
  });

  it("resumes only after every suspension owner releases", () => {
    const { loop, callbacks } = harness();
    const releasePage = loop.acquireSuspension();
    const releaseContext = loop.acquireSuspension();

    loop.invalidate();
    expect(callbacks.size).toBe(0);
    releasePage();
    expect(callbacks.size).toBe(0);
    releaseContext();
    expect(callbacks.size).toBe(1);
    releaseContext();
    expect(callbacks.size).toBe(1);
  });

  it("cancels a pending frame and resets elapsed time across suspension", () => {
    const { loop, callbacks, cancel } = harness();
    const frames: FrameTick[] = [];
    loop.subscribe((frame) => frames.push(frame));
    const continuous = loop.acquireContinuous();
    flush(callbacks, 1000);
    expect(callbacks.size).toBe(1);

    const resume = loop.acquireSuspension();
    expect(cancel).toHaveBeenCalledOnce();
    expect(callbacks.size).toBe(0);
    loop.invalidate();
    expect(callbacks.size).toBe(0);

    resume();
    expect(callbacks.size).toBe(1);
    flush(callbacks, 5000);
    expect(frames.map(({ time, delta }) => ({ time, delta }))).toEqual([
      { time: 1, delta: 0 },
      { time: 5, delta: 0 },
    ]);
    expect(frames[1]).toMatchObject({ rawDelta: 0, elapsed: 0, frame: 1 });
    continuous();
  });

  it("clamps frame delta to the zero-to-100ms contract", () => {
    const { loop, callbacks } = harness();
    const frames: FrameTick[] = [];
    loop.subscribe((frame) => frames.push(frame));
    const release = loop.acquireContinuous();

    flush(callbacks, 1000);
    flush(callbacks, 1016);
    flush(callbacks, 500);
    flush(callbacks, 5000);
    release();
    flush(callbacks, 5016);

    expect(frames.map(({ time, delta }) => ({ time, delta }))).toEqual([
      { time: 1, delta: 0 },
      { time: 1.016, delta: 0.016 },
      { time: 0.5, delta: 0 },
      { time: 5, delta: 0.1 },
      { time: 5.016, delta: 0.016 },
    ]);
    expect(frames[3]).toMatchObject({ rawDelta: 4.5, elapsed: 0.116 });
  });

  it("disposes pending frames idempotently", () => {
    const { loop, callbacks, cancel } = harness();
    loop.invalidate();
    loop.dispose();
    loop.dispose();

    expect(callbacks.size).toBe(0);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("does not retain subscribers or leases acquired after disposal", () => {
    const { loop, callbacks } = harness();
    const callback = vi.fn();
    loop.dispose();

    const unsubscribe = loop.subscribe(callback);
    const release = loop.acquireContinuous();
    const resume = loop.acquireSuspension();
    loop.invalidate();
    unsubscribe();
    release();
    resume();

    expect(callbacks.size).toBe(0);
    expect(callback).not.toHaveBeenCalled();
  });

  it("keeps cancellation and clock cleanup terminal after disposal", () => {
    const request = vi.fn((_callback: FrameRequestCallback) => 1);
    const cancel = vi.fn();
    const clock = new MiseClock();
    const pause = vi.spyOn(clock, "pause");
    const reset = vi.spyOn(clock, "reset");
    const loop = new FrameLoop(request, cancel, clock);

    loop.dispose();
    loop.dispose();
    const resume = loop.acquireSuspension();
    resume();

    expect(cancel).not.toHaveBeenCalled();
    expect(reset).toHaveBeenCalledOnce();
    expect(pause).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
});
