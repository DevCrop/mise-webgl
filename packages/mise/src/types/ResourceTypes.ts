/** Represents a resource with an idempotent terminal cleanup operation. */
export interface Disposable {
  /** Releases resources owned by this instance. */
  dispose(): void;
}

/** Couples a shared value with the release operation for one acquisition. */
export interface ResourceLease<T> {
  /** Shared value held by the lease. */
  readonly value: T;
  /** Releases this acquisition exactly once. */
  release(): void;
}

/** Idempotent cleanup callback registered with a resource owner. */
export type ResourceCleanup = () => void;

/** Owns, borrows, or leases resources for one lifecycle boundary. */
export interface ResourceOwner extends Disposable {
  /** Whether this owner still accepts resources. */
  readonly active: boolean;
  /** Registers a cleanup callback. */
  use(cleanup: ResourceCleanup): ResourceCleanup;
  /** Transfers a disposable resource to this owner. */
  own<T extends Disposable>(resource: T): T;
  /** Records that a resource is externally owned. */
  borrow<T>(resource: T): T;
  /** Acquires a shared resource until this owner is disposed. */
  lease<T>(lease: ResourceLease<T>): T;
  /** Creates a nested resource lifetime. */
  child(): ResourceOwner;
  /** Registers an event listener owned by this lifecycle. */
  listen(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ): void;
}
