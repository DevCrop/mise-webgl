import { Camera, Scene } from "three";
import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../logging/Logger.js";
import { SceneDirector, type SceneFactories } from "./SceneDirector.js";
import type { FrameInfo, SceneModule, Viewport } from "./SceneModule.js";

class FakeScene implements SceneModule {
  readonly scene = new Scene();
  readonly camera = new Camera();
  readonly dispose = vi.fn();

  constructor(private readonly failMount = false) {}
  mount(): void {
    if (this.failMount) throw new Error("mount failed");
  }
  update(_frame: FrameInfo): void {}
  resize(_viewport: Viewport): void {}
  setProgress(_progress: number): void {}
}

const logger = {
  getLevel: () => "silent",
  setLevel: vi.fn(),
  child: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
} as unknown as Logger;

const palette = { primary: "#000000", secondary: "#111111", accent: "#ffffff" };

describe("SceneDirector", () => {
  it("keeps the current scene when the next scene fails", () => {
    const home = new FakeScene();
    const broken = new FakeScene(true);
    const homeFactory = vi.fn()
      .mockReturnValueOnce(home)
      .mockReturnValueOnce(broken);
    const factories: SceneFactories = {
      home: homeFactory,
    };
    const director = new SceneDirector(logger, factories);
    director.switchTo({ id: "home", palette });

    expect(() => director.switchTo({
      id: "home",
      palette: { ...palette, accent: "#eeeeee" },
    })).toThrow("mount failed");
    expect(director.renderState()?.scene).toBe(home.scene);
    expect(home.dispose).not.toHaveBeenCalled();
    expect(broken.dispose).toHaveBeenCalledOnce();
  });

  it("disposes the previous scene only after a successful commit", () => {
    const home = new FakeScene();
    const nextHome = new FakeScene();
    const homeFactory = vi.fn()
      .mockReturnValueOnce(home)
      .mockReturnValueOnce(nextHome);
    const director = new SceneDirector(logger, {
      home: homeFactory,
    });
    director.switchTo({ id: "home", palette });
    director.switchTo({
      id: "home",
      palette: { ...palette, accent: "#eeeeee" },
    });

    expect(home.dispose).toHaveBeenCalledOnce();
    expect(director.renderState()?.scene).toBe(nextHome.scene);
  });
});
