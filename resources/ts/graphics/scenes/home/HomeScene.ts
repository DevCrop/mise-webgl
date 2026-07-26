import type { ScenePalette } from "../../SceneModule.js";
import { HOME_FRAGMENT_SHADER } from "../../shaders/proceduralShaders.js";
import { ShaderScene } from "../ShaderScene.js";

export class HomeScene extends ShaderScene {
  constructor(palette: ScenePalette) {
    super(palette, HOME_FRAGMENT_SHADER);
  }
}
