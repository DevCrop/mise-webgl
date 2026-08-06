import {
  snapshotExperienceDefinition,
  snapshotPageDefinition,
} from "../Contracts.js";
import { MiseError } from "../MiseError.js";
import type {
  DebugPort,
  DebugPortFactory,
  DriveSpec,
  DriverFactory,
  ExperienceDefinition,
  MiseCollaboration,
  MiseMotionFactory,
  MiseNavigationFactory,
  MisePageDefinition,
  MiseRendererFactory,
  MiseScrollFactory,
} from "../Contracts.js";
import {
  hasPlanObjectFactories,
  validateMisePlan,
} from "./MisePlanValidation.js";
import {
  createNullMotion,
  createNullNavigation,
  createNullScroll,
} from "./NullPorts.js";

export interface MisePlanOptions {
  readonly experiences: ReadonlyMap<string, ExperienceDefinition>;
  readonly drivers: ReadonlyMap<DriveSpec["kind"], DriverFactory>;
  readonly pages: ReadonlyMap<string, MisePageDefinition>;
  readonly motion: MiseMotionFactory | null;
  readonly navigation: MiseNavigationFactory | null;
  readonly scroll: MiseScrollFactory | null;
  readonly renderer: MiseRendererFactory | null;
  readonly debug: DebugPortFactory | null;
}

export class MisePlan {
  private readonly experiences: ReadonlyMap<string, ExperienceDefinition>;
  private readonly drivers: ReadonlyMap<DriveSpec["kind"], DriverFactory>;
  private readonly pages: ReadonlyMap<string, MisePageDefinition>;
  private readonly motion: MiseMotionFactory;
  private readonly navigation: MiseNavigationFactory;
  private readonly scroll: MiseScrollFactory;
  private readonly renderer: MiseRendererFactory;
  private readonly debug: DebugPortFactory;

  constructor(options: MisePlanOptions) {
    this.experiences = new Map(
      [...options.experiences].map(([id, definition]) => [
        id,
        snapshotExperienceDefinition(definition),
      ]),
    );
    this.drivers = new Map(options.drivers);
    this.pages = new Map(
      [...options.pages].map(([id, definition]) => [
        id,
        snapshotPageDefinition(definition),
      ]),
    );
    validateMisePlan(this.experiences, this.drivers, this.pages);
    this.motion = options.motion ?? createNullMotion;
    this.navigation = options.navigation ?? createNullNavigation;
    this.scroll = options.scroll ?? createNullScroll;
    this.renderer = requireAdapter(options.renderer, "renderer");
    this.debug = options.debug ?? createNullDebugPort;
  }

  experience(id: string): ExperienceDefinition | null {
    return this.experiences.get(id) ?? null;
  }

  driver(kind: DriveSpec["kind"]): DriverFactory {
    const factory = this.drivers.get(kind);
    if (!factory) {
      throw new MiseError(
        "MISE_DRIVER_UNREGISTERED",
        `Unregistered MISE driver: ${kind}`,
      );
    }
    return factory;
  }

  page(id: string | undefined): MisePageDefinition | null {
    return id ? this.pages.get(id) ?? null : null;
  }

  createMotion(...args: Parameters<MiseMotionFactory>): ReturnType<MiseMotionFactory> {
    return this.motion(...args);
  }

  navigationFactory(): MiseNavigationFactory {
    return this.navigation;
  }

  createScroll(...args: Parameters<MiseScrollFactory>): ReturnType<MiseScrollFactory> {
    return this.scroll(...args);
  }

  createRenderer(): ReturnType<MiseRendererFactory> {
    return this.renderer();
  }

  createDebugPort(
    ...args: Parameters<DebugPortFactory>
  ): ReturnType<DebugPortFactory> {
    return this.debug(...args);
  }

  healthProfile(): readonly MiseCollaboration[] {
    const profile: MiseCollaboration[] = [
      "application.providers",
      "application.registry",
      "application.container",
      "application.factory",
      "application.runtime",
      "browser-application.logging",
      "browser-application.mise",
      "browser-application.navigation",
      "browser-application.page-changer",
      "browser-application.scroll",
      "runtime.renderer",
      "runtime.frame-loop",
      "runtime.clock",
      "runtime.debug",
      "scroll-port.mise",
    ];
    if (this.pages.size > 0) {
      profile.push("page-changer.page");
    }
    if (this.experiences.size > 0) {
      profile.push(
        "runtime.scene-changer",
        "runtime.driver",
        "scene-changer.scene",
        "scene.resource-scope",
      );
    }
    if (hasPlanObjectFactories(this.experiences)) {
      profile.push("scene.object-factory");
    }
    return Object.freeze(profile);
  }
}

function createNullDebugPort(_frames: Parameters<DebugPortFactory>[0]): DebugPort {
  return {
    enabled: false,
    mount(): void {},
    update(): void {},
    dispose(): void {},
  };
}

function requireAdapter<TAdapter>(
  adapter: TAdapter | null,
  name: string,
): TAdapter {
  if (!adapter) {
    throw new MiseError(
      "MISE_ADAPTER_MISSING",
      `MISE ${name} adapter is not registered.`,
    );
  }
  return adapter;
}
