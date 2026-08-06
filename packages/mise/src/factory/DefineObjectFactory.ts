import { MiseError } from "../MiseError.js";
import type {
  MiseObject,
  MiseObjectFactory,
} from "../types/ObjectTypes.js";

/** Validates and freezes a typed product Object factory. */
export function defineObjectFactory<
  TProps,
  TObject extends MiseObject,
  const TFactory extends MiseObjectFactory<TProps, TObject>,
>(factory: TFactory): TFactory {
  if (factory.id.trim().length === 0) {
    throw new MiseError(
      "MISE_DEFINITION_INVALID",
      "Object factory id must not be empty.",
    );
  }
  return Object.freeze(factory);
}
