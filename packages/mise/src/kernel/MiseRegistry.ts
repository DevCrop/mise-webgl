import type {
  DebugPortFactory,
  DriveSpec,
  DriverFactory,
  ExperienceDefinition,
  MiseMotionFactory,
  MiseNavigationFactory,
  MisePageDefinition,
  MiseRendererFactory,
  MiseRegistryPort,
  MiseScrollFactory,
} from "../Contracts.js";
import { MiseError } from "../MiseError.js";
import { MisePlan } from "./MisePlan.js";

export class MiseRegistry implements MiseRegistryPort {
  private readonly experienceDefinitions = new Map<string, ExperienceDefinition>();
  private readonly driverFactories = new Map<DriveSpec["kind"], DriverFactory>();
  private readonly pageDefinitions = new Map<string, MisePageDefinition>();
  private motionFactory: MiseMotionFactory | null = null;
  private navigationPortFactory: MiseNavigationFactory | null = null;
  private scrollFactory: MiseScrollFactory | null = null;
  private rendererFactory: MiseRendererFactory | null = null;
  private debugFactory: DebugPortFactory | null = null;
  private sealed = false;

  readonly experiences = {
    add: (definition: ExperienceDefinition): void => {
      this.assertMutable();
      if (this.experienceDefinitions.has(definition.id)) {
        throw new MiseError(
          "MISE_PLAN_DUPLICATE_ID",
          `Duplicate MISE experience: ${definition.id}`,
        );
      }
      this.experienceDefinitions.set(definition.id, definition);
    },
  };

  readonly drivers = {
    add: (kind: DriveSpec["kind"], factory: DriverFactory): void => {
      this.assertMutable();
      if (this.driverFactories.has(kind)) {
        throw new MiseError(
          "MISE_PLAN_DUPLICATE_ID",
          `Duplicate MISE driver: ${kind}`,
        );
      }
      this.driverFactories.set(kind, factory);
    },
  };

  readonly pages = {
    add: (definition: MisePageDefinition): void => {
      this.assertMutable();
      if (this.pageDefinitions.has(definition.id)) {
        throw new MiseError(
          "MISE_PLAN_DUPLICATE_ID",
          `Duplicate MISE page: ${definition.id}`,
        );
      }
      this.pageDefinitions.set(definition.id, definition);
    },
  };

  readonly motion = {
    use: (factory: MiseMotionFactory): void => {
      this.assertMutable();
      if (this.motionFactory) {
        throw new MiseError(
          "MISE_ADAPTER_DUPLICATE",
          "Duplicate MISE motion adapter.",
        );
      }
      this.motionFactory = factory;
    },
  };

  readonly navigation = {
    use: (factory: MiseNavigationFactory): void => {
      this.assertMutable();
      if (this.navigationPortFactory) {
        throw new MiseError(
          "MISE_ADAPTER_DUPLICATE",
          "Duplicate MISE navigation adapter.",
        );
      }
      this.navigationPortFactory = factory;
    },
  };

  readonly scroll = {
    use: (factory: MiseScrollFactory): void => {
      this.assertMutable();
      if (this.scrollFactory) {
        throw new MiseError(
          "MISE_ADAPTER_DUPLICATE",
          "Duplicate MISE scroll adapter.",
        );
      }
      this.scrollFactory = factory;
    },
  };

  readonly renderer = {
    use: (factory: MiseRendererFactory): void => {
      this.assertMutable();
      if (this.rendererFactory) {
        throw new MiseError(
          "MISE_ADAPTER_DUPLICATE",
          "Duplicate MISE renderer adapter.",
        );
      }
      this.rendererFactory = factory;
    },
  };

  readonly debug = {
    use: (factory: DebugPortFactory): void => {
      this.assertMutable();
      if (this.debugFactory) {
        throw new MiseError(
          "MISE_ADAPTER_DUPLICATE",
          "Duplicate MISE debug adapter.",
        );
      }
      this.debugFactory = factory;
    },
  };

  compile(): MisePlan {
    this.assertMutable();
    this.sealed = true;
    return new MisePlan({
      experiences: this.experienceDefinitions,
      drivers: this.driverFactories,
      pages: this.pageDefinitions,
      motion: this.motionFactory,
      navigation: this.navigationPortFactory,
      scroll: this.scrollFactory,
      renderer: this.rendererFactory,
      debug: this.debugFactory,
    });
  }

  private assertMutable(): void {
    if (this.sealed) {
      throw new MiseError("MISE_REGISTRY_SEALED", "MISE registry is sealed.");
    }
  }
}
