// Animation constants
export {
  SpringConfigs,
  TimingConfigs,
  EasingPresets,
  StaggerDelays,
  AnimationValues,
} from './constants';

// Animation hooks
export {
  useButtonAnimation,
  useFadeIn,
  useFloatingAnimation,
  useRotationAnimation,
  useScaleEntrance,
  useParallax,
  useDotAnimation,
  useStaggeredEntrance,
  usePulseAnimation,
  useSwipeAnimation,
} from './hooks';

// so-uxww: screen-entrance motion primitive
export {
  useScreenEntrance,
  ENTER_MS,
  ENTER_EASING,
  STAGGER_MS,
  RISE_PX,
} from './useScreenEntrance';
export type { EntranceTrigger, ScreenEntranceOpts } from './useScreenEntrance';
