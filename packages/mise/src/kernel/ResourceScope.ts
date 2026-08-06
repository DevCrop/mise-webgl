import type {
  Disposable,
  ResourceCleanup,
  ResourceLease,
  ResourceOwner,
} from "../Contracts.js";
import {
  MiseAggregateError,
  MiseError,
} from "../MiseError.js";

/** Owns one lifecycle boundary and disposes registered resources in reverse order. */
export class ResourceScope implements ResourceOwner {
  private readonly cleanups: ResourceCleanup[] = [];
  private disposed = false;

  get active(): boolean {
    return !this.disposed;
  }

  use(cleanup: ResourceCleanup): ResourceCleanup {
    this.assertActive();
    this.cleanups.push(cleanup);
    return cleanup;
  }

  own<T extends Disposable>(resource: T): T {
    this.use(() => resource.dispose());
    return resource;
  }

  borrow<T>(resource: T): T {
    this.assertActive();
    return resource;
  }

  lease<T>(lease: ResourceLease<T>): T {
    this.use(() => lease.release());
    return lease.value;
  }

  child(): ResourceScope {
    const child = new ResourceScope();
    this.use(() => child.dispose());
    return child;
  }

  listen(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ): void {
    this.assertActive();
    target.addEventListener(type, listener, options);
    this.use(() => target.removeEventListener(type, listener, options));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const failures: unknown[] = [];
    for (let index = this.cleanups.length - 1; index >= 0; index -= 1) {
      try {
        this.cleanups[index]!();
      } catch (error) {
        failures.push(error);
      }
    }
    this.cleanups.length = 0;
    if (failures.length > 0) {
      throw new MiseAggregateError(
        failures,
        "MISE resource cleanup failed.",
      );
    }
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new MiseError(
        "MISE_RESOURCE_SCOPE_DISPOSED",
        "Cannot use a disposed ResourceScope.",
      );
    }
  }
}
