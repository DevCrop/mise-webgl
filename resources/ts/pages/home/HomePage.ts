import Swiper from "swiper";
import { A11y, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/a11y";
import "swiper/css/navigation";
import "swiper/css/pagination";
import type { GraphicsRuntime } from "../../graphics/GraphicsRuntime.js";
import { parseScenePalette, type ScenePalette } from "../../graphics/SceneModule.js";
import type { MotionRuntime } from "../../motion/MotionRuntime.js";
import type { PageTransition } from "../../motion/PageTransition.js";
import type { PageModule } from "../PageModule.js";

const DEFAULT_PALETTE: ScenePalette = {
  primary: "#090b18",
  secondary: "#304d8f",
  accent: "#8ef0ff",
};

export class HomePage implements PageModule {
  private transition: PageTransition | null = null;
  private carousel: Swiper | null = null;

  constructor(
    private readonly graphics: GraphicsRuntime,
    private readonly motion: MotionRuntime,
  ) {}

  mount(root: HTMLElement): void {
    const content = root.querySelector<HTMLElement>("[data-page-content]");
    this.graphics.activate({
      id: "home",
      palette: parseScenePalette(content?.dataset.scenePalette) ?? DEFAULT_PALETTE,
    });
    this.transition = this.motion.createPageTransition(root);
    this.transition.enter();

    const carousel = root.querySelector<HTMLElement>("[data-project-carousel]");
    if (carousel) {
      this.carousel = new Swiper(carousel, {
        modules: [A11y, Navigation, Pagination],
        slidesPerView: 1,
        spaceBetween: 24,
        speed: 700,
        grabCursor: true,
        watchOverflow: true,
        a11y: {
          prevSlideMessage: "이전 프로젝트",
          nextSlideMessage: "다음 프로젝트",
          paginationBulletMessage: "{{index}}번 프로젝트로 이동",
        },
        navigation: {
          prevEl: root.querySelector<HTMLElement>("[data-swiper-prev]"),
          nextEl: root.querySelector<HTMLElement>("[data-swiper-next]"),
        },
        pagination: {
          el: root.querySelector<HTMLElement>("[data-swiper-pagination]"),
          clickable: true,
        },
        breakpoints: {
          768: { slidesPerView: 1.35, spaceBetween: 32 },
          1200: { slidesPerView: 1.65, spaceBetween: 48 },
        },
      });
    }
  }

  leave(): Promise<void> {
    return this.transition?.leave() ?? Promise.resolve();
  }

  dispose(): void {
    this.carousel?.destroy(true, true);
    this.carousel = null;
    this.transition?.dispose();
    this.transition = null;
  }
}
