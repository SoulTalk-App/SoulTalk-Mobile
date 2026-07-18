/**
 * so-uxww: <ScreenEnter> — ergonomic wrapper around useScreenEntrance.
 *
 * Wraps children in an Animated.View and applies the shared screen-entrance
 * animation (opacity fade + translateY rise) without boilerplate. Each
 * stagger group in a screen gets its own <ScreenEnter> with the appropriate
 * index:
 *
 *   <ScreenEnter index={0}><Hero /></ScreenEnter>
 *   <ScreenEnter index={1}><Cards /></ScreenEnter>
 *
 * All options from useScreenEntrance are forwarded as props. See
 * src/animations/useScreenEntrance.ts for full documentation.
 *
 * When to use the hook vs the component:
 *   - Prefer <ScreenEnter> when the animated wrapper IS the layout container
 *     (avoids a redundant Animated.View nesting).
 *   - Prefer useScreenEntrance when you need to merge the entrance style with
 *     an existing Animated.View (e.g. dark/light mode style arrays):
 *       <Animated.View style={[dk.chargeUpWrap, cardsStyle]}>
 */
import React from 'react';
import Animated from 'react-native-reanimated';
import {
  useScreenEntrance,
  ScreenEntranceOpts,
} from '../animations/useScreenEntrance';

export interface ScreenEnterProps extends ScreenEntranceOpts {
  children: React.ReactNode;
  /** Additional styles merged after the entrance animation styles. */
  style?: object | object[];
}

/**
 * Animated wrapper that plays the shared screen entrance animation
 * (opacity 0→1, translateY RISE_PX→0) once per arrival.
 *
 * Rules (see useScreenEntrance for the full set):
 *   - Max 3 groups per screen; index = 0, 1, 2.
 *   - Lists: one <ScreenEnter> around the list container, NOT per-row.
 *   - Never apply to screens with their own reveal (JournalEntry, Help, etc.).
 */
export const ScreenEnter: React.FC<ScreenEnterProps> = ({
  children,
  style,
  trigger,
  index,
  disabled,
  distance,
}) => {
  const entranceStyle = useScreenEntrance({ trigger, index, disabled, distance });

  return (
    <Animated.View style={[entranceStyle, style]}>
      {children}
    </Animated.View>
  );
};

export default ScreenEnter;
