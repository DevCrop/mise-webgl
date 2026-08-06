import { describe, expect, it } from "vitest";
import {
  MiseContainerBuilder,
} from "../../src/container/MiseContainerBuilder.js";
import { createMiseToken } from "../../src/container/MiseToken.js";
import { MiseError } from "../../src/MiseError.js";

describe("MiseContainer", () => {
  it("preserves typed value bindings", () => {
    const label = createMiseToken<string>("label");
    const scope = new MiseContainerBuilder()
      .value(label, "MISE")
      .compile()
      .createScope();

    expect(scope.resolve(label)).toBe("MISE");
  });

  it("enforces singleton, scoped, and transient identities", () => {
    const singleton = createMiseToken<object>("singleton");
    const scoped = createMiseToken<object>("scoped");
    const transient = createMiseToken<object>("transient");
    const container = new MiseContainerBuilder()
      .singleton(singleton, () => ({}))
      .scoped(scoped, () => ({}))
      .transient(transient, () => ({}))
      .compile();
    const first = container.createScope();
    const second = container.createScope();

    expect(first.resolve(singleton)).toBe(first.resolve(singleton));
    expect(first.resolve(singleton)).toBe(second.resolve(singleton));
    expect(first.resolve(scoped)).toBe(first.resolve(scoped));
    expect(first.resolve(scoped)).not.toBe(second.resolve(scoped));
    expect(first.resolve(transient)).not.toBe(first.resolve(transient));
  });

  it("rejects duplicate, missing, sealed, and disposed operations", () => {
    const token = createMiseToken<number>("number");
    const missing = createMiseToken<number>("missing");
    const builder = new MiseContainerBuilder().value(token, 1);
    expectMiseError(
      () => builder.value(token, 2),
      "MISE_CONTAINER_DUPLICATE",
      "Duplicate MISE Container binding",
    );
    const container = builder.compile();
    expectMiseError(
      () => builder.compile(),
      "MISE_CONTAINER_SEALED",
      "builder is sealed",
    );
    const scope = container.createScope();
    expectMiseError(
      () => scope.resolve(missing),
      "MISE_CONTAINER_MISSING",
      "Missing MISE Container binding",
    );
    scope.dispose();
    expectMiseError(
      () => scope.resolve(token),
      "MISE_CONTAINER_SEALED",
      "scope is disposed",
    );
    scope.dispose();
  });

  it("detects circular factory resolution with a stable path", () => {
    const left = createMiseToken<object>("left");
    const right = createMiseToken<object>("right");
    const container = new MiseContainerBuilder()
      .singleton(left, (context) => context.resolve(right))
      .singleton(right, (context) => context.resolve(left))
      .compile();

    expectMiseError(
      () => container.createScope().resolve(left),
      "MISE_CONTAINER_CYCLE",
      "left -> right -> left",
    );
  });

  it("reports bindings and resolved capabilities without values", () => {
    const first = createMiseToken<number>("b");
    const second = createMiseToken<number>("a");
    const container = new MiseContainerBuilder()
      .value(first, 1)
      .value(second, 2)
      .compile();

    container.createScope().resolve(first);

    expect(container.report()).toEqual({
      bindings: ["a", "b"],
      resolved: ["b"],
    });
  });

  it("sorts every resolved capability report deterministically", () => {
    const later = createMiseToken<number>("z-later");
    const earlier = createMiseToken<number>("a-earlier");
    const container = new MiseContainerBuilder()
      .value(later, 1)
      .value(earlier, 2)
      .compile();
    const scope = container.createScope();

    scope.resolve(later);
    scope.resolve(earlier);

    expect(container.report().resolved).toEqual(["a-earlier", "z-later"]);
    expect(Object.isFrozen(container.report().resolved)).toBe(true);
  });

  it("reports only the minimal dependency cycle from a larger graph", () => {
    const root = createMiseToken<object>("root");
    const left = createMiseToken<object>("left");
    const right = createMiseToken<object>("right");
    const container = new MiseContainerBuilder()
      .transient(root, (context) => context.resolve(left))
      .transient(left, (context) => context.resolve(right))
      .transient(right, (context) => context.resolve(left))
      .compile();

    const error = captureMiseError(() => container.createScope().resolve(root));

    expect(error).toMatchObject({
      code: "MISE_CONTAINER_CYCLE",
      message: "Circular MISE Container dependency: left -> right -> left",
    });
  });

  it("validates token ids", () => {
    expectMiseError(
      () => createMiseToken<unknown>(" "),
      "MISE_DEFINITION_INVALID",
      "must not be empty",
    );
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

function captureMiseError(action: () => unknown): MiseError {
  try {
    action();
  } catch (error) {
    if (error instanceof MiseError) return error;
    throw error;
  }
  throw new Error("Expected a MiseError.");
}
