import type { LogEntry, LogSink } from "../logging/MiseLogger.js";

/** Immutable copy of entries captured by `MemoryLogSink`. */
export interface MemoryLogSnapshot {
  /** Captured entries in emission order. */
  readonly entries: readonly LogEntry[];
}

/** In-memory structured Log Sink for consumer and adapter tests. */
export class MemoryLogSink implements LogSink {
  private readonly values: LogEntry[] = [];

  /**
   * Captures one entry.
   *
   * @param entry - Sanitized structured log entry.
   */
  write(entry: LogEntry): void {
    this.values.push(entry);
  }

  /**
   * Copies all captured entries into an immutable snapshot.
   *
   * @returns A frozen detached copy of captured entries.
   */
  snapshot(): MemoryLogSnapshot {
    return Object.freeze({
      entries: Object.freeze([...this.values]),
    });
  }

  /** Removes all captured entries. */
  clear(): void {
    this.values.length = 0;
  }
}
