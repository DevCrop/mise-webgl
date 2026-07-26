import { BrowserApplication } from "../application/BrowserApplication.js";
import { FrameLoop } from "../graphics/FrameLoop.js";
import { GraphicsRuntime } from "../graphics/GraphicsRuntime.js";
import { QualityManager } from "../graphics/QualityManager.js";
import { SceneDirector } from "../graphics/SceneDirector.js";
import { ThreeRenderer } from "../graphics/ThreeRenderer.js";
import type { Logger } from "../logging/Logger.js";
import { MotionRuntime } from "../motion/MotionRuntime.js";
import { ScrollRuntime } from "../motion/ScrollRuntime.js";
import { PageRegistry } from "../pages/PageRegistry.js";

export function createBrowserApplication(logger: Logger): BrowserApplication {
  const frames = new FrameLoop();
  const graphics = new GraphicsRuntime(
    new ThreeRenderer(),
    new SceneDirector(logger.child("scenes")),
    frames,
    new QualityManager(),
    logger.child("graphics"),
  );
  const motion = new MotionRuntime(frames);
  const scroll = new ScrollRuntime(frames, (progress) =>
    graphics.setProgress(progress),
  );

  return new BrowserApplication(
    graphics,
    frames,
    new PageRegistry(graphics, motion),
    scroll,
    logger.child("application"),
  );
}
