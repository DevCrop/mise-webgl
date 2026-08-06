import type {
  MiseMotionFactory,
  MiseNavigationFactory,
  MiseScrollFactory,
  ScrollSnapshot,
} from "../Contracts.js";

const INITIAL_SCROLL: ScrollSnapshot = Object.freeze({
  progress: 0,
  position: 0,
  velocity: 0,
  direction: 0,
});

export const createNullMotion: MiseMotionFactory = () => ({
  createPageTransition: () => ({
    enter(): void {},
    leave: () => Promise.resolve(),
    dispose(): void {},
  }),
  dispose(): void {},
});

export const createNullNavigation: MiseNavigationFactory = () => ({
  mount(): void {},
  dispose(): void {},
});

export const createNullScroll: MiseScrollFactory = (_frames, onScroll) => {
  let mounted = false;
  const emit = (): void => onScroll(INITIAL_SCROLL);
  return {
    mount(): void {
      if (mounted) return;
      mounted = true;
      emit();
    },
    refresh(): void {
      if (mounted) emit();
    },
    dispose(): void {
      mounted = false;
    },
  };
};
