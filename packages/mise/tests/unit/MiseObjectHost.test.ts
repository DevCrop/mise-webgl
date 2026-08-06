import { describe, expect, it, vi } from "vitest";
import { defineObjectFactory } from "../../src/factory/DefineObjectFactory.js";
import { MiseHealthCheck } from "../../src/kernel/MiseHealthCheck.js";
import { ResourceScope } from "../../src/kernel/ResourceScope.js";
import { MiseError } from "../../src/MiseError.js";
import { MiseObjectHost } from "../../src/objects/MiseObjectHost.js";

describe("MiseObjectHost", () => {
  it("creates declared typed objects and updates Health automatically", async () => {
    const scope = new ResourceScope();
    const health = new MiseHealthCheck(["scene.object-factory"]);
    const factory = defineObjectFactory({
      id: "test.object",
      create: (_context, props: { readonly label: string }) => ({
        label: props.label,
        dispose: vi.fn(),
      }),
    });
    const host = createHost(scope, health, [factory.id]);

    const object = await host.create(factory, { label: "MISE" });

    expect(object.label).toBe("MISE");
    expect(health.report().status).toBe("healthy");
    scope.dispose();
    expect(object.dispose).toHaveBeenCalledOnce();
  });

  it("rejects factories not declared by the Scene", async () => {
    const factory = defineObjectFactory({
      id: "test.undeclared",
      create: () => ({ dispose(): void {} }),
    });
    const host = createHost(
      new ResourceScope(),
      new MiseHealthCheck([]),
      [],
    );

    await expect(host.create(factory, undefined)).rejects.toMatchObject({
      code: "MISE_OBJECT_FACTORY_UNDECLARED",
      message: expect.stringContaining("Undeclared MISE Object factory"),
    } satisfies Partial<MiseError>);
  });

  it("rejects an invalid factory result before ownership commit", async () => {
    const scope = new ResourceScope();
    const events: string[] = [];
    const factory = defineObjectFactory({
      id: "test.invalid",
      create(context) {
        context.scope.use(() => events.push("resource"));
        return null as never;
      },
    });
    const host = createHost(
      scope,
      new MiseHealthCheck(["scene.object-factory"]),
      [factory.id],
    );

    await expect(host.create(factory, undefined)).rejects.toMatchObject({
      code: "MISE_DEFINITION_INVALID",
      message: expect.stringContaining("test.invalid"),
    } satisfies Partial<MiseError>);
    expect(events).toEqual(["resource"]);
    expect(scope.active).toBe(true);
    scope.dispose();
  });

  it("does not invoke a factory after the transition is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const create = vi.fn(() => ({ dispose(): void {} }));
    const factory = defineObjectFactory({
      id: "test.pre-aborted",
      create,
    });
    const host = new MiseObjectHost(
      new ResourceScope(),
      [factory.id],
      controller.signal,
      { active: false },
      false,
      new MiseHealthCheck(["scene.object-factory"]),
    );

    await expect(host.create(factory, undefined)).rejects.toMatchObject({
      code: "MISE_OBJECT_FACTORY_ABORTED",
    } satisfies Partial<MiseError>);
    expect(create).not.toHaveBeenCalled();
  });

  it("rolls back object and child resources when async creation is aborted", async () => {
    const events: string[] = [];
    const controller = new AbortController();
    let complete!: () => void;
    const ready = new Promise<void>((resolve) => {
      complete = resolve;
    });
    const factory = defineObjectFactory({
      id: "test.abort",
      async create(context) {
        context.scope.use(() => events.push("resource"));
        await ready;
        return {
          dispose(): void {
            events.push("object");
          },
        };
      },
    });
    const scope = new ResourceScope();
    const host = new MiseObjectHost(
      scope,
      [factory.id],
      controller.signal,
      { active: false },
      false,
      new MiseHealthCheck(["scene.object-factory"]),
    );

    const pending = host.create(factory, undefined);
    controller.abort();
    complete();

    await expect(pending).rejects.toMatchObject({
      code: "MISE_OBJECT_FACTORY_ABORTED",
      message: expect.stringContaining("creation was aborted"),
    } satisfies Partial<MiseError>);
    expect(events).toEqual(["object", "resource"]);
    expect(scope.active).toBe(true);
    scope.dispose();
  });

  it("disposes the Object before its child resources", async () => {
    const events: string[] = [];
    const factory = defineObjectFactory({
      id: "test.order",
      create(context) {
        context.scope.use(() => events.push("resource"));
        return {
          dispose(): void {
            events.push("object");
          },
        };
      },
    });
    const scope = new ResourceScope();
    const host = createHost(
      scope,
      new MiseHealthCheck(["scene.object-factory"]),
      [factory.id],
    );

    await host.create(factory, undefined);
    scope.dispose();

    expect(events).toEqual(["object", "resource"]);
  });
});

function createHost(
  scope: ResourceScope,
  health: MiseHealthCheck,
  factories: readonly string[],
): MiseObjectHost {
  return new MiseObjectHost(
    scope,
    factories,
    new AbortController().signal,
    { active: false },
    false,
    health,
  );
}
