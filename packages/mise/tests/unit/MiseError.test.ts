import { describe, expect, it } from "vitest";
import {
  MiseAggregateError,
  MiseError,
} from "../../src/Index.js";

describe("MISE errors", () => {
  it("exposes a stable code while preserving cause", () => {
    const cause = new Error("vendor detail");
    const error = new MiseError(
      "MISE_ADAPTER_MISSING",
      "MISE renderer adapter is not registered.",
      { cause },
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("MiseError");
    expect(error.code).toBe("MISE_ADAPTER_MISSING");
    expect(error.message).toBe("MISE renderer adapter is not registered.");
    expect(error.cause).toBe(cause);
  });

  it("preserves every cleanup failure under one stable code", () => {
    const errors = [new Error("first"), new Error("second")];
    const error = new MiseAggregateError(errors, "cleanup failed");

    expect(error).toBeInstanceOf(AggregateError);
    expect(error.name).toBe("MiseAggregateError");
    expect(error.code).toBe("MISE_RESOURCE_DISPOSE_FAILED");
    expect(error.errors).toEqual(errors);
  });
});
