import { MiseError } from "../MiseError.js";

/** Invariant identity key that preserves the value type of one binding. */
export class MiseToken<TValue> {
  declare private readonly valueType: TValue;

  private constructor(
    /** Stable diagnostic ID; token identity remains the actual lookup key. */
    readonly id: string,
  ) {}

  /** Creates one validated token identity. */
  static create<T>(id: string): MiseToken<T> {
    if (id.trim().length === 0) {
      throw new MiseError(
        "MISE_DEFINITION_INVALID",
        "MISE Container token id must not be empty.",
      );
    }
    return Object.freeze(new MiseToken<T>(id)) as MiseToken<T>;
  }
}

/** Creates a typed Container token without exposing token construction. */
export function createMiseToken<TValue>(id: string): MiseToken<TValue> {
  return MiseToken.create<TValue>(id);
}
