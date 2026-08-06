import { MiseError } from "../MiseError.js";
import type { MiseToken } from "./MiseToken.js";

/** Supported Container cache policy. */
export type MiseBindingLifetime = "singleton" | "scoped" | "transient";

/** Binding-factory context restricted to dependency construction. */
export interface MiseBindingContext {
  /** Resolves one typed dependency during graph construction. */
  resolve<TValue>(token: MiseToken<TValue>): TValue;
}

/** Read-only diagnostics for one compiled Container. */
export interface MiseContainerReport {
  /** Sorted diagnostic IDs for every compiled binding. */
  readonly bindings: readonly string[];
  /** Sorted diagnostic IDs resolved at least once. */
  readonly resolved: readonly string[];
}

/** @internal */
export interface MiseBinding<TValue = unknown> {
  readonly lifetime: MiseBindingLifetime;
  readonly create: (context: MiseBindingContext) => TValue;
}

/** Immutable dependency graph used only by composition factories. */
export class MiseContainer {
  private readonly singletons = new Map<MiseToken<unknown>, unknown>();
  private readonly resolved = new Set<string>();

  /** @internal */
  constructor(
    private readonly bindings: ReadonlyMap<MiseToken<unknown>, MiseBinding>,
  ) {}

  /** Creates an isolated scoped cache for one composition lifecycle. */
  createScope(): MiseContainerScope {
    return new MiseContainerScope(this);
  }

  /** Returns immutable Container diagnostics without exposing instances. */
  report(): MiseContainerReport {
    return Object.freeze({
      bindings: Object.freeze(
        [...this.bindings.keys()].map((token) => token.id).sort(),
      ),
      resolved: Object.freeze([...this.resolved].sort()),
    });
  }

  /** @internal */
  binding<TValue>(token: MiseToken<TValue>): MiseBinding<TValue> {
    const binding = this.bindings.get(token as MiseToken<unknown>);
    if (binding) return binding as MiseBinding<TValue>;
    throw new MiseError(
      "MISE_CONTAINER_MISSING",
      `Missing MISE Container binding: ${token.id}`,
    );
  }

  /** @internal */
  singleton<TValue>(
    token: MiseToken<TValue>,
    create: () => TValue,
  ): TValue {
    if (this.singletons.has(token as MiseToken<unknown>)) {
      return this.singletons.get(token as MiseToken<unknown>) as TValue;
    }
    const value = create();
    this.singletons.set(token as MiseToken<unknown>, value);
    return value;
  }

  /** @internal */
  markResolved(token: MiseToken<unknown>): void {
    this.resolved.add(token.id);
  }
}

/**
 * Scoped Container view used only while a composition factory builds an
 * explicit constructor graph.
 */
export class MiseContainerScope implements MiseBindingContext {
  private readonly scoped = new Map<MiseToken<unknown>, unknown>();
  private readonly stack: MiseToken<unknown>[] = [];
  private disposed = false;

  /** @internal */
  constructor(private readonly container: MiseContainer) {}

  /** Resolves one typed dependency with cycle and scope protection. */
  resolve<TValue>(token: MiseToken<TValue>): TValue {
    if (this.disposed) {
      throw new MiseError(
        "MISE_CONTAINER_SEALED",
        "MISE Container scope is disposed.",
      );
    }
    const cycleStart = this.stack.indexOf(token as MiseToken<unknown>);
    if (cycleStart >= 0) {
      const cycle = [...this.stack.slice(cycleStart), token]
        .map((item) => item.id)
        .join(" -> ");
      throw new MiseError(
        "MISE_CONTAINER_CYCLE",
        `Circular MISE Container dependency: ${cycle}`,
      );
    }
    const binding = this.container.binding(token);
    this.stack.push(token as MiseToken<unknown>);
    try {
      const value = this.resolveBinding(token, binding);
      this.container.markResolved(token as MiseToken<unknown>);
      return value;
    } finally {
      this.stack.pop();
    }
  }

  /** Clears scoped caches and rejects future resolution. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scoped.clear();
    this.stack.length = 0;
  }

  private resolveBinding<TValue>(
    token: MiseToken<TValue>,
    binding: MiseBinding<TValue>,
  ): TValue {
    if (binding.lifetime === "transient") return binding.create(this);
    if (binding.lifetime === "singleton") {
      return this.container.singleton(token, () => binding.create(this));
    }
    if (this.scoped.has(token as MiseToken<unknown>)) {
      return this.scoped.get(token as MiseToken<unknown>) as TValue;
    }
    const value = binding.create(this);
    this.scoped.set(token as MiseToken<unknown>, value);
    return value;
  }
}
