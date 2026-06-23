/**
 * so-4j34: SoulPal-driven reflecting loader, theme-aware, two variants.
 *
 * Replaces the legacy rainbow `SaveAnimation` (eight hardcoded stars
 * converging on a generic green check) for the journal submission
 * flow, AND unifies the inline pending UI in JournalEntryScreen (was
 * a faint ActivityIndicator + "Preparing your reflection..." line with
 * a hardcoded #59168B in light mode and an inline TODO(theme)). One
 * component, one source of truth, both consumers theme-aware.
 *
 * Two variants:
 *   - `inline`  — bare SoulPal + writing dots + status text. Used in
 *                 JournalEntryScreen's `renderAiSection` pending
 *                 branch. No backdrop, no completion beat — when the
 *                 ai_processing_status flips to 'complete' the parent
 *                 swaps to the AI section render naturally.
 *   - `overlay` — full-screen themed scrim with SoulPal centered.
 *                 Used by CreateJournalScreen during submit so the
 *                 user sees the loader cover the editor while the BE
 *                 settles. On `done` flips true, runs a brief
 *                 SoulPal celebrating beat then fades out and fires
 *                 `onComplete` — matches the SaveAnimation contract so
 *                 the call-site state machine (showSaveAnimation +
 *                 analysisDone + handleSaveAnimationComplete) survives
 *                 the swap without changes.
 *
 * Looping, not one-shot. SoulPal breathes + writing dots pulse for the
 * full duration the AI works (handles both <2s WS fast-paths and the
 * 30s safety budget). Status lines rotate every ~3.5s through the
 * calm message bank; after ~8s the line softens to a single
 * "Still reflecting, almost there" so a long wait never reads as
 * stalled. After completion (overlay variant) SoulPal switches to its
 * celebrating pose for a short beat so the loader feels like SoulPal
 * handing the insight back, not an OS-style spinner stopping.
 *
 * Theme rules (all colors flow through useThemeColors + isDarkMode):
 *   - Dark: scrim rgba(10,10,20,0.92) (matches createGradient base),
 *     dot fill + accents colors.loaderAccent (#4DE8D4 teal), status
 *     text rgba(255,255,255,0.85) (NOT the legacy 0.45).
 *   - Light: scrim rgba(249,245,251,0.96) (matches lightColors.background),
 *     dot fill + accents colors.loaderAccent (#59168B purple), status
 *     text colors.text.primary.
 *
 * No em dashes in user-facing copy (Overseer style preference).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors, fonts } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import SoulPalAnimated from './SoulPalAnimated';

// Idle rotation — cycled at ~3.5s intervals while the BE is still
// chewing. Order is shuffled per session so two adjacent saves don't
// open with the same line.
const IDLE_MESSAGES = [
  'Flipping through your pages',
  'Gathering your thoughts',
  'Reading your reflections',
];

// After this many ms with no completion, the status line softens to a
// persistent "still reflecting" copy. The 30s budget on the
// CreateJournalScreen poll means most submits resolve well before this,
// but for slower paths the messaging never reads as stalled.
const SOFTEN_AFTER_MS = 8000;
const SOFTENED_MESSAGE = 'Still reflecting, almost there';

const ROTATE_EVERY_MS = 3500;

// Celebration beat timings — match the cadence the SaveAnimation had
// (~1.4s total) so the parent's onComplete fires at roughly the same
// rhythm and we don't introduce a perceptible delay in the submit →
// navigate handoff.
const CELEBRATE_FADE_IN_MS = 280;
const CELEBRATE_HOLD_MS = 700;
const CELEBRATE_FADE_OUT_MS = 300;

const SoulPalChar = require('../../assets/images/journal/JournalSoulPalChar.png');
const SoulPalArmLeft = require('../../assets/images/journal/SoulPalArmLeft.png');
const SoulPalArmRight = require('../../assets/images/journal/SoulPalArmRight.png');

export type JournalLoaderVariant = 'inline' | 'overlay';

export interface JournalLoaderProps {
  variant?: JournalLoaderVariant;
  /** Overlay variant only: parent gates mount. */
  visible?: boolean;
  /** Overlay variant only: parent flips true when AI work settles. */
  done?: boolean;
  /** Overlay variant only: fired after the celebration beat ends. */
  onComplete?: () => void;
}

/**
 * Internal idle scene — SoulPal bobbing + writing dots + rotating
 * status text. Used by both variants. Doesn't know about theme scrims,
 * completion beats, or onComplete callbacks.
 */
const IdleScene: React.FC<{ inline?: boolean }> = ({ inline }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();

  const bob = useSharedValue(0);
  const armRotate = useSharedValue(0);
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);
  const textOpacity = useSharedValue(1);

  // shuffleRef holds a per-mount permutation so back-to-back saves
  // don't open with the same line. Math.random is only read once at
  // mount via a ref-initialiser pattern.
  const shuffleRef = useRef<string[] | null>(null);
  if (shuffleRef.current === null) {
    const pool = [...IDLE_MESSAGES];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    shuffleRef.current = pool;
  }
  const messages = shuffleRef.current;
  const [messageIndex, setMessageIndex] = useState(0);
  const [softened, setSoftened] = useState(false);

  useEffect(() => {
    // Gentle body bob.
    bob.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );

    // Right arm "writing" wiggle (so-5u5 magnitudes preserved).
    armRotate.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(-3, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(3, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        withDelay(400, withTiming(0, { duration: 1 })),
      ),
      -1,
    );

    // Cascading writing dots.
    dot1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
        withTiming(0.3, { duration: 400, easing: Easing.in(Easing.ease) }),
      ),
      -1,
    );
    dot2.value = withRepeat(
      withSequence(
        withDelay(200, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })),
        withTiming(0.3, { duration: 400, easing: Easing.in(Easing.ease) }),
      ),
      -1,
    );
    dot3.value = withRepeat(
      withSequence(
        withDelay(400, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })),
        withTiming(0.3, { duration: 400, easing: Easing.in(Easing.ease) }),
      ),
      -1,
    );

    // Pulsing text — softer floor than the legacy 0.4 so the line
    // stays legible at its dim point.
    textOpacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );

    const rotateTimer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, ROTATE_EVERY_MS);
    const softenTimer = setTimeout(() => setSoftened(true), SOFTEN_AFTER_MS);

    return () => {
      clearInterval(rotateTimer);
      clearTimeout(softenTimer);
    };
  }, []);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));
  const armStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${armRotate.value}deg` }],
  }));
  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1.value,
    transform: [{ scale: dot1.value }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2.value,
    transform: [{ scale: dot2.value }],
  }));
  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3.value,
    transform: [{ scale: dot3.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const accent = colors.loaderAccent;
  // Dark-mode text wants 0.85 white (not the legacy 0.45 — see spec).
  // Light-mode text reuses the canonical primary ink so it lifts on
  // the lavender wash.
  const messageColor = isDarkMode
    ? 'rgba(255, 255, 255, 0.85)'
    : colors.text.primary;

  const message = softened
    ? SOFTENED_MESSAGE
    : messages[messageIndex] ?? messages[0];

  // Inline variant scales SoulPal down so the row fits naturally
  // inside the AI section. Overlay variant uses a roomier hero size.
  const characterScale = inline ? 0.72 : 1;
  const containerW = 80 * characterScale;
  const containerH = 110 * characterScale;
  const innerW = 60 * characterScale;
  const innerH = 84 * characterScale;

  return (
    <View
      style={[
        styles.idleContainer,
        inline ? styles.idleContainerInline : styles.idleContainerOverlay,
      ]}
    >
      <Animated.View
        style={[
          { width: containerW, height: containerH },
          styles.characterContainer,
          bobStyle,
        ]}
      >
        <Image
          source={SoulPalChar}
          style={{ width: innerW, height: innerH }}
          resizeMode="contain"
        />
        <Image
          source={SoulPalArmLeft}
          style={[
            styles.armLeft,
            {
              width: 24 * characterScale,
              height: 28 * characterScale,
              left: 6 * characterScale,
              top: 38 * characterScale,
            },
          ]}
          resizeMode="contain"
        />
        <Animated.Image
          source={SoulPalArmRight}
          style={[
            styles.armRight,
            {
              width: 26 * characterScale,
              height: 27 * characterScale,
              right: 6 * characterScale,
              top: 38 * characterScale,
            },
            armStyle,
          ]}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { backgroundColor: accent }, dot1Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: accent }, dot2Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: accent }, dot3Style]} />
      </View>

      <Animated.Text
        style={[styles.messageText, { color: messageColor }, textStyle]}
        numberOfLines={1}
      >
        {message}
      </Animated.Text>
    </View>
  );
};

/**
 * Overlay completion beat — SoulPal celebrating pose framed by a soft
 * on-palette halo, fades in over the still-visible scrim, holds, then
 * fades out + fires onComplete. Replaces the legacy harsh #4CAF50
 * check plate.
 */
const CelebrationBeat: React.FC<{ onComplete: () => void }> = ({
  onComplete,
}) => {
  const { isDarkMode } = useTheme();
  const fade = useSharedValue(0);
  const scale = useSharedValue(0.85);

  useEffect(() => {
    fade.value = withTiming(1, { duration: CELEBRATE_FADE_IN_MS });
    scale.value = withSpring(1, { damping: 10, stiffness: 180 });
    const fadeOutAt = CELEBRATE_FADE_IN_MS + CELEBRATE_HOLD_MS;
    const completeAt = fadeOutAt + CELEBRATE_FADE_OUT_MS;
    const fadeOutTimer = setTimeout(() => {
      fade.value = withTiming(0, { duration: CELEBRATE_FADE_OUT_MS });
    }, fadeOutAt);
    const completeTimer = setTimeout(() => onComplete(), completeAt);
    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: scale.value }],
  }));

  // Soft on-palette halo under the celebrating SoulPal — a brand-
  // coloured ring that replaces the legacy plate. Halo opacities are
  // intentionally low so the SoulPal art is the focus.
  const ringBorder = isDarkMode
    ? 'rgba(77, 232, 212, 0.45)'
    : 'rgba(89, 22, 139, 0.30)';
  const ringFill = isDarkMode
    ? 'rgba(77, 232, 212, 0.10)'
    : 'rgba(89, 22, 139, 0.06)';

  return (
    <Animated.View style={[styles.celebrateContainer, animStyle]}>
      <View
        style={[
          styles.celebrateRing,
          { borderColor: ringBorder, backgroundColor: ringFill },
        ]}
      >
        {/* SoulPalAnimated 'celebrating' pose was added in so-vwu1 —
            uses the cheerful arms-up artwork so the beat reads as
            SoulPal handing the insight back. animate={false} keeps the
            float/breathe idle off so the spring entry + fade-out
            drives the motion instead. */}
        <SoulPalAnimated pose="celebrating" size={72} animate={false} />
      </View>
    </Animated.View>
  );
};

export const JournalLoader: React.FC<JournalLoaderProps> = ({
  variant = 'inline',
  visible = true,
  done = false,
  onComplete,
}) => {
  const { isDarkMode } = useTheme();

  // Overlay-only: fade the scrim in on mount, hold while idle, then
  // CelebrationBeat owns the fade-out + onComplete handoff.
  const scrimOpacity = useSharedValue(0);
  useEffect(() => {
    if (variant !== 'overlay') return;
    if (visible) {
      scrimOpacity.value = withTiming(1, { duration: 220 });
    }
  }, [variant, visible]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  if (variant === 'inline') {
    return <IdleScene inline />;
  }

  if (!visible) return null;

  const scrimColor = isDarkMode
    ? 'rgba(10, 10, 20, 0.92)' // matches createGradient base
    : 'rgba(249, 245, 251, 0.96)'; // matches lightColors.background

  return (
    <Animated.View
      style={[
        styles.overlay,
        { backgroundColor: scrimColor },
        scrimStyle,
      ]}
      pointerEvents="auto"
    >
      <View style={styles.overlayCenter}>
        {done && onComplete ? (
          <CelebrationBeat onComplete={onComplete} />
        ) : (
          <IdleScene />
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  idleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleContainerInline: {
    paddingVertical: 12,
  },
  idleContainerOverlay: {
    paddingVertical: 40,
  },
  characterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // so-bxy + so-5u5 positioning preserved; arm offsets are computed
  // inline so they scale with the inline/overlay character size.
  armLeft: {
    position: 'absolute',
  },
  armRight: {
    position: 'absolute',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  messageText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  overlayCenter: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrateRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default JournalLoader;
