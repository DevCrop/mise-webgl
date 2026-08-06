import { describe, expect, it, vi } from "vitest";
import { ResourceScope } from "../../src/kernel/ResourceScope.js";

describe("ResourceScope", () => {
  it("disposes child and owned resources in reverse order", () => {
    const order: string[] = [];
    const scope = new ResourceScope();
    scope.use(() => order.push("first"));
    const child = scope.child();
    child.use(() => order.push("child"));
    scope.own({ dispose: () => order.push("owned") });

    scope.dispose();
    scope.dispose();

    expect(order).toEqual(["owned", "child", "first"]);
  });

  it("borrows without disposal and releases leases once", () => {
    const scope = new ResourceScope();
    const borrowed = { dispose: vi.fn() };
    const release = vi.fn();

    expect(scope.borrow(borrowed)).toBe(borrowed);
    expect(scope.lease({ value: "asset", release })).toBe("asset");
    scope.dispose();

    expect(borrowed.dispose).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledOnce();
  });

  it("never attaches a listener after disposal", () => {
    const scope = new ResourceScope();
    const target = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as EventTarget;
    scope.dispose();

    const listener = vi.fn() as EventListener;
    expect(() => scope.listen(target, "change", listener)).toThrow(
      "disposed ResourceScope",
    );
    try {
      scope.listen(target, "change", listener);
    } catch (error) {
      expect(error).toMatchObject({ code: "MISE_RESOURCE_SCOPE_DISPOSED" });
    }
    expect(target.addEventListener).not.toHaveBeenCalled();
  });

  it("owns listener attachment and removes it with identical options", () => {
    const scope = new ResourceScope();
    const target = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as EventTarget;
    const listener = vi.fn() as EventListener;
    const options = { capture: true, passive: true };

    scope.listen(target, "change", listener, options);
    expect(target.addEventListener).toHaveBeenCalledWith(
      "change",
      listener,
      options,
    );
    scope.dispose();
    expect(target.removeEventListener).toHaveBeenCalledWith(
      "change",
      listener,
      options,
    );
  });

  it("rejects every acquisition mode after disposal", () => {
    const scope = new ResourceScope();
    scope.dispose();

    expect(() => scope.use(() => undefined)).toThrow(
      "Cannot use a disposed ResourceScope.",
    );
    expect(() => scope.own({ dispose: vi.fn() })).toThrow(
      "Cannot use a disposed ResourceScope.",
    );
    expect(() => scope.borrow({})).toThrow(
      "Cannot use a disposed ResourceScope.",
    );
    expect(() => scope.lease({ value: 1, release: vi.fn() })).toThrow(
      "Cannot use a disposed ResourceScope.",
    );
    expect(() => scope.child()).toThrow(
      "Cannot use a disposed ResourceScope.",
    );
  });

  it("continues cleanup and reports every failure", () => {
    const order: string[] = [];
    const scope = new ResourceScope();
    scope.use(() => {
      order.push("first");
      throw new Error("first failed");
    });
    scope.use(() => {
      order.push("second");
      throw new Error("second failed");
    });
    scope.use(() => order.push("third"));

    let failure: unknown;
    try {
      scope.dispose();
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).message).toBe(
      "MISE resource cleanup failed.",
    );
    expect(failure).toMatchObject({ code: "MISE_RESOURCE_DISPOSE_FAILED" });
    expect((failure as AggregateError).errors).toHaveLength(2);
    expect(order).toEqual(["third", "second", "first"]);
    expect(scope.active).toBe(false);
  });
});
