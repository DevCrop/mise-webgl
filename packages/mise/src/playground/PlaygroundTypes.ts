/** Commit timing for a semantic Playground control. */
export type PlaygroundCommitMode = "change" | "finish";

/** Shared identity and commit policy for a semantic Playground control. */
export interface PlaygroundControlBase {
  /** Stable control identity within its folder. */
  readonly id: string;
  /** Human-readable control label. */
  readonly label: string;
  /** Chooses continuous or finish-only semantic updates. */
  readonly commit?: PlaygroundCommitMode;
}

/** Semantic numeric control without vendor object exposure. */
export interface PlaygroundNumberControl extends PlaygroundControlBase {
  /** Selects the numeric lil-gui controller. */
  readonly kind: "number";
  /** Reads the current product value during a throttled Inspector refresh. */
  readonly get: () => number;
  /** Applies a validated value through the product semantic boundary. */
  readonly set: (value: number) => void;
  /** Optional inclusive slider minimum. */
  readonly min?: number;
  /** Optional inclusive slider maximum. */
  readonly max?: number;
  /** Optional numeric step. */
  readonly step?: number;
}

/** Semantic boolean control without vendor object exposure. */
export interface PlaygroundBooleanControl extends PlaygroundControlBase {
  /** Selects the boolean lil-gui controller. */
  readonly kind: "boolean";
  /** Reads the current product value during a throttled Inspector refresh. */
  readonly get: () => boolean;
  /** Applies a validated value through the product semantic boundary. */
  readonly set: (value: boolean) => void;
}

/** Semantic text control without vendor object exposure. */
export interface PlaygroundStringControl extends PlaygroundControlBase {
  /** Selects the text lil-gui controller. */
  readonly kind: "string";
  /** Reads the current product value during a throttled Inspector refresh. */
  readonly get: () => string;
  /** Applies a validated value through the product semantic boundary. */
  readonly set: (value: string) => void;
}

/** Semantic CSS color control without Shader uniform exposure. */
export interface PlaygroundColorControl extends PlaygroundControlBase {
  /** Selects the CSS color lil-gui controller. */
  readonly kind: "color";
  /** Reads the current product color during a throttled Inspector refresh. */
  readonly get: () => string;
  /** Applies a validated CSS color through the product semantic boundary. */
  readonly set: (value: string) => void;
}

/** Supported semantic Playground control definitions. */
export type PlaygroundControlDefinition =
  | PlaygroundBooleanControl
  | PlaygroundColorControl
  | PlaygroundNumberControl
  | PlaygroundStringControl;

/** One named collection of semantic Playground controls. */
export interface PlaygroundFolderDefinition {
  /** Stable folder identity used by debug DOM diagnostics. */
  readonly id: string;
  /** Human-readable folder title. */
  readonly title: string;
  /** Ordered semantic controls in this folder. */
  readonly controls: readonly PlaygroundControlDefinition[];
}

/** Immutable development Inspector configuration. */
export interface DevInspectorOptions {
  /** Root GUI title. */
  readonly title?: string;
  /** Root GUI width in CSS pixels. */
  readonly width?: number;
  /** Host-defined semantic controls grouped by product responsibility. */
  readonly folders?: readonly PlaygroundFolderDefinition[];
  /** Requests a MISE frame after a semantic control commits. */
  readonly invalidate?: () => void;
}
