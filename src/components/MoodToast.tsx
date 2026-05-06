import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

const VISIBLE_MS = 2500;
const FADE_MS = 220;

const TEAL = '#70CACF';
const PINK = '#E93678';
const ERROR = '#E5484D';

export type MoodToastKind = 'first-fill' | 'update' | 'error';

type Props = {
  /** Set to a kind to fade in; parent should null it out from onDismiss to
   *  retain re-fire on the next save. */
  kind: MoodToastKind | null;
  isDarkMode: boolean;
  onDismiss: () => void;
};

const COPY: Record<MoodToastKind, { headline: string; subline: string }> = {
  'first-fill': {
    headline: 'Mood saved',
    subline: 'SoulBar charged ✦',
  },
  update: {
    headline: 'Mood updated',
    subline: "Today's word refreshed.",
  },
  error: {
    headline: "Couldn't save mood",
    subline: 'Tap the field to try again.',
  },
};

export function MoodToast({ kind, isDarkMode, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (!kind) return;

    opacity.value = withTiming(1, { duration: FADE_MS, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.cubic) });

    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: FADE_MS });
      // withTiming completion runs on the UI thread; bridge via runOnJS
      // (so-0h5 — direct JS calls from a worklet crash).
      translateY.value = withTiming(20, { duration: FADE_MS }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      });
    }, VISIBLE_MS);

    return () => {
      clearTimeout(timeout);
      opacity.value = 0;
      translateY.value = 20;
    };
  }, [kind, onDismiss, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!kind) return null;

  const isError = kind === 'error';
  const gradient: [string, string] = isError ? [ERROR, ERROR] : [TEAL, PINK];
  const ink = isDarkMode ? '#F5F2F9' : '#3A0E66';
  const copy = COPY[kind];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.root, { bottom: insets.bottom + 96 }, animStyle]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDarkMode ? '#1A1235' : '#FFFFFF',
            borderColor: isDarkMode
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(58,14,102,0.08)',
          },
        ]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.checkBubble}
        >
          <Text style={styles.checkBubbleText}>{isError ? '!' : '✓'}</Text>
        </LinearGradient>
        <View style={styles.body}>
          <Text style={[styles.headline, { color: ink }]}>{copy.headline}</Text>
          <Text style={[styles.subline, { color: ink }]}>{copy.subline}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  checkBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkBubbleText: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 18,
    fontFamily: fonts.outfit.bold,
  },
  body: {
    flex: 1,
  },
  headline: {
    fontFamily: fonts.outfit.bold,
    fontSize: 13,
    lineHeight: 13 * 1.2,
  },
  subline: {
    marginTop: 1,
    fontFamily: fonts.edensor.italic,
    fontSize: 13,
    lineHeight: 13 * 1.35,
    letterSpacing: 0.2,
  },
});
