import type { GraphicsRuntime } from "../graphics/GraphicsRuntime.js";
import type { MotionRuntime } from "../motion/MotionRuntime.js";
import { HomePage } from "./home/HomePage.js";
import type { PageId, PageModule } from "./PageModule.js";

type PageBuilder = () => PageModule;

export class PageRegistry {
  private readonly builders: Readonly<Record<PageId, PageBuilder>>;

  constructor(graphics: GraphicsRuntime, motion: MotionRuntime) {
    this.builders = {
      home: () => new HomePage(graphics, motion),
    };
  }

  resolve(value: string | undefined): PageId | null {
    return value && Object.prototype.hasOwnProperty.call(this.builders, value)
      ? value as PageId
      : null;
  }

  create(id: PageId): PageModule {
    return this.builders[id]();
  }
}
