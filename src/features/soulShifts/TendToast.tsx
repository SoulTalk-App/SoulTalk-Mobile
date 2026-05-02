import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';
import { Shift } from './types';
import { PINK, Theme, ink, inkSub } from './tokens';

const VISIBLE_MS = 2500;
const FADE_MS = 220;

type Props = {
  /** When `shift` is non-null the toast fades in; the parent should null it
   *  out after the auto-dismiss callback to retain re-fire on the next tend. */
  shift: Shift | null;
  theme: Theme;
  /** Called once the dismiss timer (visible + fade) elapses. */
  onDismiss: () => void;
  onUndo?: () => void;
  /** Optional copy for the lifetime tend count ("8th time"). */
  tendCountLabel?: string;
};

export function TendToast({
  shift,
  theme,
  onDismiss,
  onUndo,
  tendCountLabel,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (!shift) return;

    opacity.value = withTiming(1, { duration: FADE_MS, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.cubic) });

    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: FADE_MS });
      // The withTiming completion callback runs on the UI thread (worklet).
      // Calling JS APIs from a worklet without `runOnJS` is a hard crash
      // (so-0h5). runOnJS is the canonical cross-thread bridge.
      translateY.value = withTiming(20, { duration: FADE_MS }, (finished) => {
        if (finished) {
          runOnJS(onDismiss)();
        }
      });
    }, VISIBLE_MS);

    return () => {
      clearTimeout(timeout);
      opacity.value = 0;
      translateY.value = 20;
    };
  }, [shift, onDismiss, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!shift) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.root,
        { bottom: insets.bottom + 24 },
        animStyle,
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1A1235' : '#FFFFFF',
            borderColor: isDark
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(58,14,102,0.08)',
          },
        ]}
      >
        <LinearGradient
          colors={[shift.mood, PINK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.checkBubble}
        >
          <Text style={styles.checkBubbleText}>✓</Text>
        </LinearGradient>
        <View style={styles.body}>
          <Text style={[styles.headline, { color: ink(theme) }]}>
            Tended
            {tendCountLabel ? ` · ${tendCountLabel}` : ''}
          </Text>
          <Text
            style={[styles.subline, { color: ink(theme) }]}
            numberOfLines={1}
          >
            “{shift.title}”
          </Text>
        </View>
        {onUndo && (
          <Pressable onPress={onUndo} hitSlop={8} accessibilityLabel="Undo tend">
            <Text style={[styles.undo, { color: shift.mood }]}>Undo</Text>
          </Pressable>
        )}
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
    fontSize: 18,
    lineHeight: 20,
    fontFamily: fonts.outfit.bold,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  headline: {
    fontFamily: fonts.outfit.bold,
    fontSize: 13,
    lineHeight: 13 * 1.2,
  },
  // Toast is constrained vertically; bumped 12 → 14 + brightened color
  // (subline call site below uses ink instead of inkSub) per so-6a7's
  // "drop one font level if layout can't fit, but keep the brightening".
  subline: {
    marginTop: 1,
    fontFamily: fonts.edensor.italic,
    fontSize: 14,
    lineHeight: 14 * 1.35,
    letterSpacing: 0.2,
  },
  undo: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
  },
});
