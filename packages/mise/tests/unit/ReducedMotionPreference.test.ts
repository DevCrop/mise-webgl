import { describe, expect, it, vi } from "vitest";
import { ReducedMotionPreference } from "../../src/kernel/ReducedMotionPreference.js";

describe("ReducedMotionPreference", () => {
  it("reflects live media state and owns one change listener", () => {
    let listener: EventListener = () => undefined;
    const query = {
      matches: false,
      addEventListener: vi.fn((
        _type: string,
        value: EventListenerOrEventListenerObject,
      ) => {
        if (typeof value === "function") listener = value;
      }),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList;
    const invalidate = vi.fn();
    const preference = new ReducedMotionPreference(query, invalidate);

    preference.mount();
    preference.mount();
    expect(preference.active).toBe(false);

    (query as unknown as { matches: boolean }).matches = true;
    listener(new Event("change"));
    expect(preference.active).toBe(true);
    expect(invalidate).toHaveBeenCalledOnce();

    preference.dispose();
    preference.dispose();
    expect(query.addEventListener).toHaveBeenCalledOnce();
    expect(query.removeEventListener).toHaveBeenCalledOnce();
  });
});
