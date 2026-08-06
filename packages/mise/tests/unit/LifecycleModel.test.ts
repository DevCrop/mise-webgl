import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  FrameLoop,
  type FrameRequest,
} from "../../src/kernel/FrameLoop.js";
import { ResourceScope } from "../../src/kernel/ResourceScope.js";

const FRAME_COMMANDS = [
  "invalidate",
  "acquire",
  "release",
  "suspend",
  "resume",
  "tick",
  "dispose",
] as const;

describe("MISE lifecycle models", () => {
  it("keeps at most one scheduled frame under arbitrary commands", () => {
    fc.assert(fc.property(
      fc.array(fc.constantFrom(...FRAME_COMMANDS), {
        minLength: 1,
        maxLength: 200,
      }),
      (commands) => {
        const callbacks = new Map<number, FrameRequestCallback>();
        const continuous: Array<() => void> = [];
        const suspensions: Array<() => void> = [];
        let nextId = 1;
        const request: FrameRequest = (callback) => {
          const id = nextId++;
          callbacks.set(id, callback);
          return id;
        };
        const loop = new FrameLoop(
          request,
          (id) => callbacks.delete(id),
        );

        for (const command of commands) {
          runFrameCommand(command, loop, callbacks, continuous, suspensions);
          expect(callbacks.size).toBeLessThanOrEqual(1);
        }

        loop.dispose();
        expect(callbacks.size).toBe(0);
      },
    ), { numRuns: 250 });
  });

  it("always cleans resources in reverse order despite arbitrary failures", () => {
    fc.assert(fc.property(
      fc.array(fc.boolean(), { minLength: 0, maxLength: 100 }),
      (failures) => {
        const scope = new ResourceScope();
        const order: number[] = [];
        failures.forEach((fails, index) => {
          scope.use(() => {
            order.push(index);
            if (fails) throw new Error(`cleanup-${index}`);
          });
        });

        let thrown: unknown = null;
        try {
          scope.dispose();
        } catch (error) {
          thrown = error;
        }
        scope.dispose();

        expect(order).toEqual(
          failures.map((_value, index) => index).reverse(),
        );
        const failureCount = failures.filter(Boolean).length;
        if (failureCount === 0) {
          expect(thrown).toBeNull();
          return;
        }
        expect(thrown).toBeInstanceOf(AggregateError);
        expect((thrown as AggregateError).errors).toHaveLength(failureCount);
      },
    ), { numRuns: 250 });
  });
});

function runFrameCommand(
  command: typeof FRAME_COMMANDS[number],
  loop: FrameLoop,
  callbacks: Map<number, FrameRequestCallback>,
  continuous: Array<() => void>,
  suspensions: Array<() => void>,
): void {
  switch (command) {
    case "invalidate":
      loop.invalidate();
      return;
    case "acquire":
      continuous.push(loop.acquireContinuous());
      return;
    case "release":
      continuous.shift()?.();
      return;
    case "suspend":
      suspensions.push(loop.acquireSuspension());
      return;
    case "resume":
      suspensions.shift()?.();
      return;
    case "tick":
      flushFrame(callbacks);
      return;
    case "dispose":
      loop.dispose();
  }
}

function flushFrame(callbacks: Map<number, FrameRequestCallback>): void {
  const next = callbacks.entries().next();
  if (next.done) return;
  const [id, callback] = next.value;
  callbacks.delete(id);
  callback(16);
}
