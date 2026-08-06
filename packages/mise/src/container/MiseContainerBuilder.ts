import { MiseError } from "../MiseError.js";
import {
  MiseContainer,
  type MiseBinding,
  type MiseBindingContext,
  type MiseBindingLifetime,
} from "./MiseContainer.js";
import type { MiseToken } from "./MiseToken.js";

/** Mutable composition-only builder that compiles into one sealed Container. */
export class MiseContainerBuilder {
  private readonly bindings = new Map<MiseToken<unknown>, MiseBinding>();
  private sealed = false;

  /** Binds an existing value as one Container singleton. */
  value<TValue>(token: MiseToken<TValue>, value: TValue): this {
    return this.bind(token, "singleton", () => value);
  }

  /** Binds a lazily created Container singleton. */
  singleton<TValue>(
    token: MiseToken<TValue>,
    create: (context: MiseBindingContext) => TValue,
  ): this {
    return this.bind(token, "singleton", create);
  }

  /** Binds one value per Container scope. */
  scoped<TValue>(
    token: MiseToken<TValue>,
    create: (context: MiseBindingContext) => TValue,
  ): this {
    return this.bind(token, "scoped", create);
  }

  /** Binds a new value for every resolve operation. */
  transient<TValue>(
    token: MiseToken<TValue>,
    create: (context: MiseBindingContext) => TValue,
  ): this {
    return this.bind(token, "transient", create);
  }

  /** Seals the builder and returns an immutable Container graph. */
  compile(): MiseContainer {
    this.assertMutable();
    this.sealed = true;
    return new MiseContainer(new Map(this.bindings));
  }

  private bind<TValue>(
    token: MiseToken<TValue>,
    lifetime: MiseBindingLifetime,
    create: (context: MiseBindingContext) => TValue,
  ): this {
    this.assertMutable();
    if (this.bindings.has(token as MiseToken<unknown>)) {
      throw new MiseError(
        "MISE_CONTAINER_DUPLICATE",
        `Duplicate MISE Container binding: ${token.id}`,
      );
    }
    this.bindings.set(
      token as MiseToken<unknown>,
      { lifetime, create } as MiseBinding,
    );
    return this;
  }

  private assertMutable(): void {
    if (!this.sealed) return;
    throw new MiseError(
      "MISE_CONTAINER_SEALED",
      "MISE Container builder is sealed.",
    );
  }
}
