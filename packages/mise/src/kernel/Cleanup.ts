import { MiseAggregateError } from "../MiseError.js";

/**
 * Runs every cleanup in declaration order and reports all failures afterward.
 *
 * @param cleanups - Cleanup operations that must all be attempted.
 * @param message - Sanitized aggregate failure description.
 */
export function runCleanups(
  cleanups: readonly (() => void)[],
  message: string,
): void {
  const failures: unknown[] = [];
  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length === 0) return;
  throw new MiseAggregateError(failures, message);
}
