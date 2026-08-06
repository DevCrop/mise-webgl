/** Stable machine-readable failure codes emitted by public MISE APIs. */
export type MiseErrorCode =
  | "MISE_ADAPTER_DUPLICATE"
  | "MISE_ADAPTER_MISSING"
  | "MISE_CLOCK_INVALID"
  | "MISE_CONTAINER_CYCLE"
  | "MISE_CONTAINER_DUPLICATE"
  | "MISE_CONTAINER_MISSING"
  | "MISE_CONTAINER_SEALED"
  | "MISE_DEFINITION_INVALID"
  | "MISE_DRIVER_INVALID"
  | "MISE_DRIVER_SPEC_MISMATCH"
  | "MISE_DRIVER_UNREGISTERED"
  | "MISE_EXPERIENCE_UNREGISTERED"
  | "MISE_MODEL_INVALID"
  | "MISE_MODEL_LOAD_ABORTED"
  | "MISE_MODEL_TOO_LARGE"
  | "MISE_MODEL_URL_INVALID"
  | "MISE_OBJECT_FACTORY_ABORTED"
  | "MISE_OBJECT_FACTORY_UNDECLARED"
  | "MISE_PLAN_DUPLICATE_ID"
  | "MISE_PLAN_INVALID"
  | "MISE_REGISTRY_SEALED"
  | "MISE_RESOURCE_DISPOSE_FAILED"
  | "MISE_RESOURCE_SCOPE_DISPOSED"
  | "MISE_SURFACE_MISSING";

/** Public framework error with a stable code and optional causal error. */
export class MiseError extends Error {
  /** Standard error class name. */
  override readonly name = "MiseError";
  /** Stable machine-readable failure code. */
  readonly code: MiseErrorCode;

  /**
   * Creates a framework error with a stable machine-readable code.
   *
   * @param code - Stable MISE error code.
   * @param message - Sanitized developer-facing description.
   * @param options - Standard Error options, including an internal cause.
   */
  constructor(
    code: MiseErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.code = code;
  }
}

/** Cleanup error that preserves every failure while exposing one stable code. */
export class MiseAggregateError extends AggregateError {
  /** Standard aggregate error class name. */
  override readonly name = "MiseAggregateError";
  /** Stable cleanup failure code. */
  readonly code = "MISE_RESOURCE_DISPOSE_FAILED" as const;

  /**
   * Creates one aggregate error from resource cleanup failures.
   *
   * @param errors - Cleanup failures collected in execution order.
   * @param message - Sanitized aggregate description.
   */
  constructor(errors: Iterable<unknown>, message: string) {
    super(errors, message);
  }
}
