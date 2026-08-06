import type {
  DriveSpec,
  DriverFactory,
} from "./DriverTypes.js";
import type {
  DebugPortFactory,
  MiseHealthReporter,
} from "./HealthTypes.js";
import type {
  MiseMotionFactory,
  MiseNavigationFactory,
  MisePageDefinition,
  MiseScrollFactory,
} from "./PageTypes.js";
import type { MiseRendererFactory } from "./RendererTypes.js";
import type { ResourceOwner } from "./ResourceTypes.js";
import type { ExperienceDefinition } from "./StageTypes.js";

/** Lifecycle resources supplied to Provider boot hooks. */
export interface MiseBootContext {
  /** Owner for Provider boot resources and rollback cleanup. */
  readonly scope: ResourceOwner;
  /** Restricted reporter for expected Host Health collaborations. */
  readonly health: MiseHealthReporter;
}

/** Registration and optional post-compile boot unit. */
export interface MiseProvider {
  /** Registers definitions and adapter factories without runtime side effects. */
  register(registry: MiseRegistryPort): void;
  /** Starts optional Provider runtime state after Plan compilation. */
  boot?(context: MiseBootContext): Promise<void> | void;
}

/** Registration-only API exposed to Providers. */
export interface MiseRegistryPort {
  /** Experience definition registrar. */
  readonly experiences: {
    /** Registers an Experience definition. */
    add(definition: ExperienceDefinition): void;
  };
  /** Driver factory registrar. */
  readonly drivers: {
    /** Registers a Driver factory for one kind. */
    add(kind: DriveSpec["kind"], factory: DriverFactory): void;
  };
  /** Page definition registrar. */
  readonly pages: {
    /** Registers a Page definition. */
    add(definition: MisePageDefinition): void;
  };
  /** Optional Motion adapter registrar. */
  readonly motion: {
    /** Selects a Motion adapter factory. */
    use(factory: MiseMotionFactory): void;
  };
  /** Optional Navigation adapter registrar. */
  readonly navigation: {
    /** Selects a Navigation adapter factory. */
    use(factory: MiseNavigationFactory): void;
  };
  /** Optional Scroll adapter registrar. */
  readonly scroll: {
    /** Selects a Scroll adapter factory. */
    use(factory: MiseScrollFactory): void;
  };
  /** Required Renderer adapter registrar. */
  readonly renderer: {
    /** Selects the required Renderer adapter factory. */
    use(factory: MiseRendererFactory): void;
  };
  /** Optional Debug adapter registrar. */
  readonly debug: {
    /** Selects an optional Debug adapter factory. */
    use(factory: DebugPortFactory): void;
  };
}
