export interface MiseUiController {
  dispose(): void;
  mount(): void;
}

export interface MiseUiControllerDefinition {
  readonly create: (root: HTMLElement) => MiseUiController;
  readonly name: string;
}

export interface MiseUiApplication {
  dispose(): void;
  start(): void;
}

export interface CreateMiseUiOptions {
  readonly controllers: readonly MiseUiControllerDefinition[];
  readonly root: ParentNode;
}

const CONTROLLER_NAME = /^[a-z][a-z0-9-]*$/u;

export function defineController(
  definition: MiseUiControllerDefinition,
): MiseUiControllerDefinition {
  if (!CONTROLLER_NAME.test(definition.name)) {
    throw new TypeError("MISE UI controller name is invalid");
  }
  return Object.freeze(definition);
}

export function createMiseUi(options: CreateMiseUiOptions): MiseUiApplication {
  const definitions = new Map(
    options.controllers.map((definition) => [definition.name, definition]),
  );
  if (definitions.size !== options.controllers.length) {
    throw new TypeError("MISE UI controller names must be unique");
  }

  const mounted: MiseUiController[] = [];
  let disposed = false;
  let started = false;

  return {
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const controller of [...mounted].reverse()) controller.dispose();
      mounted.length = 0;
    },
    start(): void {
      if (disposed) throw new Error("MISE UI application is disposed");
      if (started) return;
      started = true;

      const roots = options.root.querySelectorAll<HTMLElement>("[data-mise-controller]");
      for (const root of roots) {
        const names = (root.dataset["miseController"] ?? "").split(/\s+/u).filter(Boolean);
        for (const name of names) {
          const definition = definitions.get(name);
          if (!definition) continue;
          const controller = definition.create(root);
          controller.mount();
          mounted.push(controller);
        }
      }
    },
  };
}
