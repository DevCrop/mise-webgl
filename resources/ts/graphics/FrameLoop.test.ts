import { describe, expect, it, vi } from "vitest";
import { FrameLoop, type FrameRequest } from "./FrameLoop.js";

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

  it("runs continuously only while a lease is active", () => {
    const { loop, callbacks } = harness();
    const release = loop.acquireContinuous();

    flush(callbacks, 16);
    expect(callbacks.size).toBe(1);
    release();
    flush(callbacks, 32);
    expect(callbacks.size).toBe(0);
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

  it("disposes pending frames idempotently", () => {
    const { loop, callbacks, cancel } = harness();
    loop.invalidate();
    loop.dispose();
    loop.dispose();

    expect(callbacks.size).toBe(0);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
