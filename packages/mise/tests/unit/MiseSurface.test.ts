import { describe, expect, it } from "vitest";
import { MiseSurface } from "../../src/dom/MiseSurface.js";

class FakeElement {
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  textContent = "";
  parent: FakeElement | null = null;

  constructor(readonly tagName: string) {}

  append(...children: FakeElement[]): void {
    for (const child of children) {
      child.parent = this;
      this.children.push(child);
    }
  }

  prepend(child: FakeElement): void {
    child.parent = this;
    this.children.unshift(child);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  matches(selector: string): boolean {
    const key = this.dataKey(selector);
    return key in this.dataset;
  }

  querySelector(selector: string): FakeElement | null {
    const key = this.dataKey(selector);
    return this.children.find((child) => key in child.dataset) ?? null;
  }

  private dataKey(selector: string): string {
    const attributeStart = selector.indexOf("[data-");
    return selector.slice(attributeStart + "[data-".length, -1).replace(
      /-([a-z])/g,
      (_, letter: string) => letter.toUpperCase(),
    );
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
  const body = new FakeElement("body");
  return {
    body,
    createElement: (tagName: string) => new FakeElement(tagName),
    querySelector: (selector: string) => body.querySelector(selector),
  } as unknown as Document;
}

describe("MiseSurface", () => {
  it("owns native surface markup and removes only what it creates", () => {
    const documentRoot = createDocument();
    const surface = new MiseSurface({ fallbackText: "정적 화면" });

    const canvas = surface.mount(documentRoot);

    expect(canvas?.dataset["miseCanvas"]).toBe("");
    expect(documentRoot.body.children).toHaveLength(1);
    const root = documentRoot.body.children[0] as unknown as FakeElement;
    expect(root.dataset["miseSurface"]).toBe("");
    expect(root.children[1]?.textContent).toBe("정적 화면");

    surface.dispose();
    expect(documentRoot.body.children).toHaveLength(0);
  });

  it("hydrates but does not remove a Host-provided surface", () => {
    const documentRoot = createDocument();
    const root = documentRoot.createElement("div");
    const canvas = documentRoot.createElement("canvas");
    root.dataset["miseSurface"] = "";
    canvas.dataset["miseCanvas"] = "";
    root.append(canvas);
    documentRoot.body.prepend(root);
    const surface = new MiseSurface();

    expect(surface.mount(documentRoot)).toBe(canvas);
    surface.dispose();

    expect(documentRoot.body.children).toHaveLength(1);
  });

  it("hydrates a bare canvas that is also the Host surface", () => {
    const documentRoot = createDocument();
    const canvas = documentRoot.createElement("canvas");
    canvas.dataset["miseSurface"] = "";
    canvas.dataset["miseCanvas"] = "";
    documentRoot.body.prepend(canvas);
    const surface = new MiseSurface();

    expect(surface.mount(documentRoot)).toBe(canvas);
    surface.dispose();

    expect(documentRoot.body.children).toEqual([canvas]);
  });

  it("does not mistake a wrapper marker for a canvas", () => {
    const documentRoot = createDocument();
    const root = documentRoot.createElement("div");
    const canvas = documentRoot.createElement("canvas");
    root.dataset["miseSurface"] = "";
    root.dataset["miseCanvas"] = "";
    canvas.dataset["miseCanvas"] = "";
    root.append(canvas);
    documentRoot.body.prepend(root);

    expect(new MiseSurface().mount(documentRoot)).toBe(canvas);
  });
});
