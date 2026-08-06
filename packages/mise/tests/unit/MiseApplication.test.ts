import { describe, expect, it, vi } from "vitest";
import type { MiseProvider } from "../../src/Contracts.js";
import { MiseAggregateError } from "../../src/Index.js";
import { MiseApplication } from "../../src/kernel/MiseApplication.js";
import { MiseHealthCheck } from "../../src/kernel/MiseHealthCheck.js";

describe("MiseApplication", () => {
  it("rolls back preference, runtime and provider resources after mount failure", async () => {
    const cleanup = vi.fn();
    const provider: MiseProvider = {
      register: vi.fn(),
      boot: ({ scope }) => {
        scope.use(cleanup);
        throw new Error("boot failed");
      },
    };
    const runtime = {
      mount: vi.fn(),
      dispose: vi.fn(),
    };
    const preference = {
      mount: vi.fn(),
      dispose: vi.fn(),
    };
    const logger = {
      error: vi.fn(),
    };
    const health = {
      mark: vi.fn(),
      report: vi.fn(),
    };
    const application = new MiseApplication(
      [provider],
      runtime as never,
      preference as never,
      logger as never,
      health as never,
    );

    await expect(application.mount(
      {} as HTMLCanvasElement,
      {} as Document,
    )).rejects.toThrow("boot failed");
    application.dispose();

    expect(preference.mount).toHaveBeenCalledOnce();
    expect(preference.dispose).toHaveBeenCalledOnce();
    expect(runtime.mount).not.toHaveBeenCalled();
    expect(runtime.dispose).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      "mise.boot_failed",
      { type: "Error" },
    );
  });

  it("lets a Provider report an expected Host Health collaboration", async () => {
    const health = new MiseHealthCheck(["host.assets"]);
    const provider: MiseProvider = {
      register: vi.fn(),
      boot: ({ health: reporter }) => reporter.mark("host.assets"),
    };
    const application = new MiseApplication(
      [provider],
      {
        mount: vi.fn(),
        dispose: vi.fn(),
      } as never,
      {
        mount: vi.fn(),
        dispose: vi.fn(),
      } as never,
      { error: vi.fn() } as never,
      health,
    );

    await application.mount({} as HTMLCanvasElement, {} as Document);

    expect(application.health()).toEqual({
      status: "healthy",
      observed: ["host.assets"],
      missing: [],
      total: 1,
    });
  });

  it("attempts every application cleanup before reporting failures", async () => {
    const providerCleanup = vi.fn(() => {
      throw new Error("provider cleanup failed");
    });
    const compositionDispose = vi.fn();
    const runtimeDispose = vi.fn(() => {
      throw new Error("runtime cleanup failed");
    });
    const preferenceDispose = vi.fn();
    const application = new MiseApplication(
      [{
        register: vi.fn(),
        boot: ({ scope }) => {
          scope.use(providerCleanup);
        },
      }],
      {
        mount: vi.fn(),
        dispose: runtimeDispose,
      } as never,
      {
        mount: vi.fn(),
        dispose: preferenceDispose,
      } as never,
      { error: vi.fn() } as never,
      new MiseHealthCheck([]),
      { dispose: compositionDispose },
    );
    await application.mount({} as HTMLCanvasElement, {} as Document);

    expect(() => application.dispose()).toThrow(MiseAggregateError);
    expect(preferenceDispose).toHaveBeenCalledOnce();
    expect(runtimeDispose).toHaveBeenCalledOnce();
    expect(providerCleanup).toHaveBeenCalledOnce();
    expect(compositionDispose).toHaveBeenCalledOnce();
    expect(() => application.dispose()).not.toThrow();
  });
});
