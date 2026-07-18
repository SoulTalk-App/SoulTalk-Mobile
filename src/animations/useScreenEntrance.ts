/**
 * so-uxww: Shared screen-entrance motion primitive.
 *
 * Extracted from the so-5zrq HomeScreen hero/cards entrance and generalised
 * so every screen speaks the same motion vocabulary. Two surfaces:
 *
 *   useScreenEntrance(opts) — hook, returns an animated style to spread on an
 *     Animated.View. Each stagger group on a screen gets its own call:
 *       const heroStyle  = useScreenEntrance({ index: 0 });
 *       const cardsStyle = useScreenEntrance({ index: 1 });
 *
 *   <ScreenEnter ...> — ergonomic wrapper that calls the hook and wraps
 *     children in an Animated.View. Preferred for JSX-heavy screens.
 *
 * Shared vocabulary (exported constants):
 *   ENTER_MS = 300        — animation duration
 *   ENTER_EASING          — Easing.out(Easing.ease)
 *   STAGGER_MS = 50       — inter-group delay
 *   RISE_PX = 14          — default translateY start offset
 *
 * Pluggable triggers:
 *   'mount-after-settle' (DEFAULT) — fire after InteractionManager drains
 *     (nav push transition completes); prevents content-rise fighting card
 *     slide-in. Best for standard pushed destinations.
 *   'cold-open' — gate on ColdOpenContext (launch overlay cleared). Home only.
 *   { revealed: boolean } — fire when caller's boolean flips true. Use for
 *     data-arrival screens (e.g. SoulSightDetail: trigger={{revealed: status==='done'}}).
 *
 * Guardrails (enforced by convention):
 *   - Cap at 3 stagger groups per screen. Group semantically (header /
 *     content / secondary); never per-element.
 *   - Lists enter as ONE block. Never stagger FlatList rows.
 *   - Do NOT apply to screens with their own reveal (JournalEntry streaming,
 *     AffirmationMirror video, Splash/Loading screens).
 *   - Help screen: NEVER apply. Safety — instant access always.
 *   - reduce-motion (useReducedMotion): land at final state with no motion.
 *     MANDATORY — do not make it optional.
 */
import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { useColdOpenRevealed } from '../contexts/ColdOpenContext';

// ── Shared motion vocabulary ───────────────────────────────────────────────────

/** Entrance animation duration in ms. */
export const ENTER_MS = 300;

/** Entrance easing — matches the so-5zrq Home implementation. */
export const ENTER_EASING = Easing.out(Easing.ease);

/** Inter-group stagger delay in ms. Multiply by `index` for each group. */
export const STAGGER_MS = 50;

/** Default translateY start offset: content rises this many px into place. */
export const RISE_PX = 14;

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Pluggable trigger for the screen entrance animation.
 * See module doc for full description of each variant.
 */
export type EntranceTrigger =
  | 'mount-after-settle'
  | 'cold-open'
  | { revealed: boolean };

export interface ScreenEntranceOpts {
  /**
   * Which signal fires the entrance. Default: 'mount-after-settle'.
   * See EntranceTrigger for full documentation.
   */
  trigger?: EntranceTrigger;
  /**
   * Stagger index within the screen (0, 1, 2 …).
   * Effective delay = index * STAGGER_MS. Cap at 3 groups per screen.
   */
  index?: number;
  /**
   * When true: land at final state immediately (opacity 1, translateY 0)
   * and mark the entrance as done so it never fires. Use when the entrance
   * should be suppressed for this component instance (e.g. the caller will
   * handle the reveal itself or the content is behind a loader that owns the
   * reveal moment).
   */
  disabled?: boolean;
  /**
   * Rise distance in px. Defaults to RISE_PX (14). Override only when the
   * screen's visual context calls for a different feel.
   */
  distance?: number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns an animated style object for a single stagger group on this screen.
 * Spread the returned style onto an Animated.View that wraps the group:
 *
 *   const style = useScreenEntrance({ index: 0 });
 *   return <Animated.View style={style}>{children}</Animated.View>;
 *
 * Fires ONCE per arrival — back-navigation to a persisted screen does NOT
 * re-animate (protected by firstRunRef).
 */
export function useScreenEntrance({
  trigger = 'mount-after-settle',
  index = 0,
  disabled = false,
  distance = RISE_PX,
}: ScreenEntranceOpts = {}) {
  const prefersReducedMotion = useReducedMotion();

  // If disabled or reduce-motion: start at final state so content is
  // immediately visible and accessible. Never leave it at opacity 0
  // indefinitely.
  const skipMotion = disabled || prefersReducedMotion;
  const opacity = useSharedValue(skipMotion ? 1 : 0);
  const translateY = useSharedValue(skipMotion ? 0 : distance);

  // Once-per-arrival guard. Set to true on first run; prevents re-animation
  // on back-navigation, re-focus, or repeated trigger firings.
  const firstRunRef = useRef(false);

  // Always subscribe to ColdOpenContext (hooks cannot be conditional).
  // Only consumed when trigger === 'cold-open'.
  const coldOpenRevealed = useColdOpenRevealed();

  // ── Inner: fire the entrance ────────────────────────────────────────────────
  // Defined as a local function (not useCallback) because the effects that
  // call it each capture their own closure with the right values. The once-
  // per-arrival guard (firstRunRef) prevents multiple effects from doubling
  // up even if both conditions are true simultaneously.
  const fireEntrance = () => {
    if (firstRunRef.current) return;
    firstRunRef.current = true;

    if (prefersReducedMotion || disabled) {
      // Reduce-motion / disabled: snap to final state, no motion.
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    const delay = index * STAGGER_MS;
    const cfg = { duration: ENTER_MS, easing: ENTER_EASING };
    if (delay > 0) {
      opacity.value = withDelay(delay, withTiming(1, cfg));
      translateY.value = withDelay(delay, withTiming(0, cfg));
    } else {
      opacity.value = withTiming(1, cfg);
      translateY.value = withTiming(0, cfg);
    }
  };

  // ── Trigger: 'mount-after-settle' ──────────────────────────────────────────
  // InteractionManager.runAfterInteractions waits for the react-navigation
  // push animation to drain before firing, so the content-rise does not
  // fight the card slide-in. Empty deps — fires once at mount. Returns a
  // cancel handle for cleanup if the component unmounts before it fires.
  useEffect(() => {
    if (trigger !== 'mount-after-settle') return;
    const task = InteractionManager.runAfterInteractions(fireEntrance);
    return () => task.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Trigger: 'cold-open' ───────────────────────────────────────────────────
  // Fires when ColdOpenContext flips true (LoadingScreen overlay clears).
  // If already true at mount (e.g. navigating back to Home), fires immediately.
  // firstRunRef prevents re-animation on subsequent renders.
  useEffect(() => {
    if (trigger !== 'cold-open') return;
    if (!coldOpenRevealed) return;
    fireEntrance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coldOpenRevealed]);

  // ── Trigger: { revealed: boolean } ────────────────────────────────────────
  // Fires when the caller-owned boolean flips true. Used for data-arrival
  // screens where the "arrival" moment is not navigation but data settling.
  const revealedValue: boolean =
    typeof trigger === 'object' && trigger !== null && 'revealed' in trigger
      ? (trigger as { revealed: boolean }).revealed
      : false;

  useEffect(() => {
    if (typeof trigger !== 'object' || trigger === null || !('revealed' in trigger)) return;
    if (!revealedValue) return;
    fireEntrance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedValue]);

  // ── Animated style ─────────────────────────────────────────────────────────
  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}
