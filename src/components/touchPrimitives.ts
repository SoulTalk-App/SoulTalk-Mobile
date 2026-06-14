/**
 * so-wgmp: shared touch-primitive standards for the SoulTalk-Mobile app.
 *
 * The touch feedback sweep traced sluggish-tap reports to four root causes:
 *
 *   1. TouchableOpacity has a built-in 100–150ms fade. Pressable + an
 *      explicit pressed-state style (or Reanimated worklet) reads as
 *      instant by comparison. The sweep migrated shared components; auth
 *      screens still hold ~55 TouchableOpacity sites for rn_features to
 *      mop up (sibling bead).
 *   2. Icon-sized targets (<44pt) without hitSlop. iOS users near the edge
 *      think the button is broken when it's actually just a miss. HitSlop
 *      extends the press region without disturbing layout.
 *   3. Pressable with no onPressIn feedback. The tap registers, but the
 *      only visual reaction (state change, navigation, an animation) lands
 *      well after the finger lifts.
 *   4. Heavy work inside onPress handlers blocking the JS thread before
 *      navigation commits — covered by the so-zzke perf sweep, not here.
 *
 * THIS FILE IS THE CONVENTION DOC. Import the constants below for buttons
 * that don't have a more specific reason to deviate. New components should
 * reach for one of:
 *
 *   import { TOUCH_HITSLOP_SMALL, TOUCH_PRESS_SCALE } from './touchPrimitives';
 *
 * and use Pressable + onPressIn for the press-down phase.
 */

/**
 * Default hitSlop for icon-sized targets (<40pt). Apple HIG says 44pt
 * minimum; this brings most 24–32pt icons to ~44–52pt of touch surface
 * without changing the visual layout.
 *
 * Use the SMALL variant for back-arrow / close-X / chevron / small chip
 * buttons. Use the MED variant for icon buttons that sit in tight
 * horizontal rows (mood bar, toolbar) where a larger slop would steal
 * touches from neighbors.
 */
export const TOUCH_HITSLOP_SMALL = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
} as const;

export const TOUCH_HITSLOP_MED = {
  top: 8,
  bottom: 8,
  left: 8,
  right: 8,
} as const;

export const TOUCH_HITSLOP_TIGHT = {
  top: 6,
  bottom: 6,
  left: 6,
  right: 6,
} as const;

/**
 * Reanimated press-feedback scale. Spring down on press-in, spring back on
 * press-out. Tuned to feel snappy (damping high enough to settle quickly,
 * stiffness high enough that the down-arc is perceptible immediately).
 *
 *   const scale = useSharedValue(1);
 *   const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
 *   const onPressIn = () => { scale.value = withSpring(TOUCH_PRESS_SCALE, TOUCH_PRESS_SPRING_IN); };
 *   const onPressOut = () => { scale.value = withSpring(1, TOUCH_PRESS_SPRING_OUT); };
 */
export const TOUCH_PRESS_SCALE = 0.94;

export const TOUCH_PRESS_SPRING_IN = {
  damping: 18,
  stiffness: 400,
} as const;

export const TOUCH_PRESS_SPRING_OUT = {
  damping: 12,
  stiffness: 300,
} as const;

/**
 * For non-animated press feedback, opacity 0.7 reads as a deliberate press
 * acknowledgment without disappearing the element. Use via the function
 * form of `style`:
 *
 *   <Pressable style={({ pressed }) => [base, pressed && { opacity: TOUCH_PRESS_OPACITY }]} />
 *
 * Avoid TouchableOpacity's default 0.2 — it overshoots on dark themes and
 * reads as a "broken" state instead of a confirmed tap.
 */
export const TOUCH_PRESS_OPACITY = 0.7;
