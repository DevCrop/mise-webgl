import { MiseError } from "../MiseError.js";
import type {
  CustomDriveSpec,
  MiseConfigValue,
} from "../types/DriverTypes.js";

const MAX_DRIVER_CONFIG_DEPTH = 100;
const MAX_DRIVER_CONFIG_NODES = 10_000;

interface ConfigSnapshotState {
  readonly ancestors: WeakSet<object>;
  nodes: number;
}

/** Creates a detached immutable snapshot of custom Driver configuration. */
export function snapshotDriverConfig(
  spec: CustomDriveSpec,
): CustomDriveSpec {
  return snapshotConfigValue(spec) as CustomDriveSpec;
}

function snapshotConfigValue(
  value: unknown,
  state: ConfigSnapshotState = {
    ancestors: new WeakSet<object>(),
    nodes: 0,
  },
  depth = 0,
): MiseConfigValue {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "number") {
    throw new MiseError(
      "MISE_DRIVER_INVALID",
      "MISE driver configuration numbers must be finite.",
    );
  }
  assertConfigDepth(depth);
  if (Array.isArray(value)) {
    return snapshotConfigArray(value, state, depth);
  }
  assertConfigRecord(value);
  return snapshotConfigRecord(value, state, depth);
}

function snapshotConfigArray(
  value: readonly unknown[],
  state: ConfigSnapshotState,
  depth: number,
): MiseConfigValue {
  enterConfigNode(value, state);
  try {
    return Object.freeze(
      value.map((item) => snapshotConfigValue(item, state, depth + 1)),
    );
  } finally {
    state.ancestors.delete(value);
  }
}

function snapshotConfigRecord(
  value: { readonly [key: string]: unknown },
  state: ConfigSnapshotState,
  depth: number,
): MiseConfigValue {
  enterConfigNode(value, state);
  try {
    const entries = Object.entries(value).map(([key, item]) => [
      key,
      snapshotConfigValue(item, state, depth + 1),
    ] as const);
    return Object.freeze(Object.fromEntries(entries));
  } finally {
    state.ancestors.delete(value);
  }
}

function enterConfigNode(
  value: object,
  state: ConfigSnapshotState,
): void {
  if (state.ancestors.has(value)) {
    throw new MiseError(
      "MISE_DRIVER_INVALID",
      "MISE driver configuration must not contain cyclic references.",
    );
  }
  state.nodes += 1;
  if (state.nodes > MAX_DRIVER_CONFIG_NODES) {
    throw new MiseError(
      "MISE_DRIVER_INVALID",
      "MISE driver configuration exceeds the supported size.",
    );
  }
  state.ancestors.add(value);
}

function assertConfigDepth(depth: number): void {
  if (depth <= MAX_DRIVER_CONFIG_DEPTH) return;
  throw new MiseError(
    "MISE_DRIVER_INVALID",
    "MISE driver configuration exceeds the supported depth.",
  );
}

function assertConfigRecord(
  value: unknown,
): asserts value is { readonly [key: string]: unknown } {
  if (typeof value !== "object" || value === null) {
    throw new MiseError(
      "MISE_DRIVER_INVALID",
      "MISE driver configuration must contain immutable data only.",
    );
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype === Object.prototype || prototype === null) return;
  throw new MiseError(
    "MISE_DRIVER_INVALID",
    "MISE driver configuration must contain plain objects and arrays only.",
  );
}
