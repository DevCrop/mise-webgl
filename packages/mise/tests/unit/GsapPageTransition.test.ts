import { describe, expect, it, vi } from "vitest";
import { GsapPageTransition } from "../../src/adapters/gsap/GsapPageTransition.js";

describe("GsapPageTransition", () => {
  it("owns its preference listener and skips motion when reduction is active", async () => {
    const query = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList;
    const frames = {
      acquireContinuous: vi.fn(() => vi.fn()),
    };
    const transition = new GsapPageTransition(
      {} as HTMLElement,
      frames as never,
      query,
    );

    transition.enter();
    await expect(transition.leave()).resolves.toBeUndefined();
    transition.dispose();
    transition.dispose();
    transition.enter();

    expect(frames.acquireContinuous).not.toHaveBeenCalled();
    expect(query.addEventListener).toHaveBeenCalledOnce();
    expect(query.removeEventListener).toHaveBeenCalledOnce();
  });
});
