/**
 * so-4j34: SoulPal-driven reflecting loader, inline variant.
 *
 * Replaces the legacy rainbow SaveAnimation and unifies the pending UI
 * in JournalEntryScreen. so-oevk: overlay variant removed — submit goes
 * straight to JES (navigation.replace), inline loader is the only loader.
 *
 * IdleScene: SoulPal bobbing + cascading writing dots + rotating status
 * text. so-oevk a11y: useReducedMotion guard suppresses all motion when
 * the system prefers reduced motion; message rotation + soften copy still
 * run (content, not motion). so-oevk: stable message order (no shuffle)
 * so the JES inline loader reads as a continuation of the save moment.
 *
 * Theme: loaderAccent teal (dark) / purple (light); text 0.85 white
 * (dark) / text.primary (light). No em dashes in user-facing copy.
 */
import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { useThemeColors, fonts } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

// Idle rotation — cycled at ~3.5s intervals while the BE is still
// chewing. so-oevk: stable order (no shuffle) so the overlay and the
// JES inline loader both start at index 0, reading as a continuous
// reflecting moment rather than two independent sessions.
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


const SoulPalChar = require('../../assets/images/journal/JournalSoulPalChar.png');
const SoulPalArmLeft = require('../../assets/images/journal/SoulPalArmLeft.png');
const SoulPalArmRight = require('../../assets/images/journal/SoulPalArmRight.png');

/**
 * Internal idle scene — SoulPal bobbing + writing dots + rotating
 * status text. Doesn't know about scrims or completion callbacks.
 */
const IdleScene: React.FC = () => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  // so-oevk: suppress all motion when the user prefers reduced motion.
  // Dots and text shared values are pre-initialised to their visible/
  // resting state so there is no empty-frame flash at mount.
  const prefersReducedMotion = useReducedMotion();

  const bob = useSharedValue(0);
  const armRotate = useSharedValue(0);
  const dot1 = useSharedValue(prefersReducedMotion ? 1 : 0);
  const dot2 = useSharedValue(prefersReducedMotion ? 1 : 0);
  const dot3 = useSharedValue(prefersReducedMotion ? 1 : 0);
  const textOpacity = useSharedValue(1);

  // so-oevk: stable message order (no shuffle). Both the overlay and the
  // JES inline loader start at index 0 so adjacent scenes read as
  // continuous rather than two independent random sessions.
  const messages = IDLE_MESSAGES;
  const [messageIndex, setMessageIndex] = useState(0);
  const [softened, setSoftened] = useState(false);

  useEffect(() => {
    // so-oevk: skip all motion animations when reduce-motion is preferred.
    // Message rotation and the soften timer are content, not motion — they
    // always run regardless of the setting.
    if (!prefersReducedMotion) {
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
    }

    const rotateTimer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, ROTATE_EVERY_MS);
    const softenTimer = setTimeout(() => setSoftened(true), SOFTEN_AFTER_MS);

    return () => {
      clearInterval(rotateTimer);
      clearTimeout(softenTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Scale SoulPal to fit naturally inside the JES AI section card.
  const characterScale = 0.72;
  const containerW = 80 * characterScale;
  const containerH = 110 * characterScale;
  const innerW = 60 * characterScale;
  const innerH = 84 * characterScale;

  return (
    <View style={[styles.idleContainer, styles.idleContainerInline]}>
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

// so-oevk: overlay variant removed from all callers (CreateJournalScreen
// now navigates directly to JES on 201 without mounting an overlay).
// JournalLoader is now inline-only. The variant prop is kept in the type
// for callers that still pass variant='inline' so they compile without
// changes; it has no effect on behaviour.
export type JournalLoaderVariant = 'inline';

export interface JournalLoaderProps {
  /** Reserved — only 'inline' is rendered. */
  variant?: JournalLoaderVariant;
}

export const JournalLoader: React.FC<JournalLoaderProps> = () => {
  return <IdleScene />;
};

const styles = StyleSheet.create({
  idleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleContainerInline: {
    paddingVertical: 12,
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
});

export default JournalLoader;
