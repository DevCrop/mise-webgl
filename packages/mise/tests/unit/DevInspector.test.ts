import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { DebugSnapshot } from "../../src/Index.js";
import {
  DevInspector,
  type PlaygroundFolderDefinition,
} from "../../src/Playground.js";

const guiState = vi.hoisted(() => ({
  roots: [] as Array<Record<string, unknown>>,
  controllers: [] as Array<{
    dataset: Record<string, string>;
    label: string;
    changed: ((value: unknown) => void) | null;
    finished: ((value: unknown) => void) | null;
    updates: number;
  }>,
  destroyed: 0,
}));

vi.mock("lil-gui", () => {
  interface ControllerDouble {
    readonly domElement: {
      readonly dataset: Record<string, string>;
    };
    name(label: string): ControllerDouble;
    disable(): ControllerDouble;
    onChange(callback: (value: unknown) => void): ControllerDouble;
    onFinishChange(callback: (value: unknown) => void): ControllerDouble;
    updateDisplay(): ControllerDouble;
  }

  class GuiDouble {
    readonly domElement = { dataset: {} as Record<string, string> };

    constructor(options: Record<string, unknown> = {}) {
      if (!options["parent"]) guiState.roots.push(options);
    }

    addFolder(): GuiDouble {
      return new GuiDouble({ parent: this });
    }

    add(): object {
      return createController();
    }

    addColor(): object {
      return createController();
    }

    destroy(): void {
      guiState.destroyed += 1;
    }
  }

  function createController(): object {
    const state = {
      dataset: {} as Record<string, string>,
      label: "",
      changed: null as ((value: unknown) => void) | null,
      finished: null as ((value: unknown) => void) | null,
      updates: 0,
    };
    guiState.controllers.push(state);
    const controller: ControllerDouble = {
      domElement: { dataset: state.dataset },
      name(label: string): typeof controller {
        state.label = label;
        return controller;
      },
      disable(): typeof controller {
        return controller;
      },
      onChange(callback: (value: unknown) => void): typeof controller {
        state.changed = callback;
        return controller;
      },
      onFinishChange(callback: (value: unknown) => void): typeof controller {
        state.finished = callback;
        return controller;
      },
      updateDisplay(): typeof controller {
        state.updates += 1;
        return controller;
      },
    };
    return controller;
  }

  return { default: GuiDouble };
});

class ElementDouble {
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly children: ElementDouble[] = [];
  parent: ElementDouble | null = null;

  append(...children: ElementDouble[]): void {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  remove(): void {
    const parent = this.parent;
    if (!parent) return;
    const index = parent.children.indexOf(this);
    if (index >= 0) parent.children.splice(index, 1);
    this.parent = null;
  }
}

function createDocument(): Document {
  const body = new ElementDouble();
  return {
    body,
    createElement: () => new ElementDouble(),
  } as unknown as Document;
}

const snapshot = {
  scene: "ocean",
  lifecycle: "active",
  driver: "scroll",
  progress: 0.5,
  velocity: 1,
  frameMs: 16,
  quality: "high",
  pixelRatio: 1,
  stats: {
    calls: 2,
    triangles: 4,
    geometries: 2,
    textures: 2,
    programs: 2,
  },
  health: {
    status: "healthy",
    observed: ["runtime.debug"],
    missing: [],
    total: 1,
  },
} satisfies DebugSnapshot;

describe("DevInspector", () => {
  beforeEach(() => {
    guiState.roots.length = 0;
    guiState.controllers.length = 0;
    guiState.destroyed = 0;
  });

  it("mounts lil-gui inside the MISE container without auto placement", () => {
    const documentRoot = createDocument();
    const inspector = new DevInspector();

    inspector.mount(documentRoot);

    expect(guiState.roots).toHaveLength(1);
    expect(guiState.roots[0]).toMatchObject({
      autoPlace: false,
      title: "MISE",
      width: 320,
    });
    expect(documentRoot.body.children).toHaveLength(1);
    const element = documentRoot.body.children[0] as HTMLElement | undefined;
    expect(element?.dataset["miseDebug"]).toBe("");

    inspector.update(snapshot);
    expect(guiState.controllers.some((value) => value.updates > 0)).toBe(true);

    inspector.dispose();
    expect(guiState.destroyed).toBe(1);
    expect(documentRoot.body.children).toHaveLength(0);
  });

  it("commits typed semantic controls and requests one MISE frame", () => {
    let distortion = 3.7;
    const invalidate = vi.fn();
    const set = vi.fn((value: number) => {
      distortion = value;
    });
    const folders = [{
      id: "ocean",
      title: "Ocean",
      controls: [{
        kind: "number",
        id: "distortion",
        label: "Distortion",
        get: () => distortion,
        set,
        min: 0,
        max: 8,
        step: 0.1,
        commit: "finish",
      }],
    }] as const satisfies readonly PlaygroundFolderDefinition[];
    const inspector = new DevInspector({ folders, invalidate });

    inspector.mount(createDocument());
    const control = guiState.controllers.find(
      (value) => value.dataset["misePlaygroundControl"] === "distortion",
    );
    control?.finished?.(4.2);

    expect(set).toHaveBeenCalledWith(4.2);
    expect(invalidate).toHaveBeenCalledOnce();
    expect(control?.changed).toBeNull();
  });

  it("rolls back GUI and container when a product control rejects mount", () => {
    const documentRoot = createDocument();
    const inspector = new DevInspector({
      folders: [{
        id: "broken",
        title: "Broken",
        controls: [{
          kind: "string",
          id: "value",
          label: "Value",
          get: () => {
            throw new Error("rejected");
          },
          set: () => undefined,
        }],
      }],
    });

    expect(() => inspector.mount(documentRoot)).toThrow("rejected");
    expect(guiState.destroyed).toBe(1);
    expect(documentRoot.body.children).toHaveLength(0);
  });
});
