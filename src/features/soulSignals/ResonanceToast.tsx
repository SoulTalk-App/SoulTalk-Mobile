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
import { colors, fonts } from '../../theme';
import { PINK, TEAL, Theme, ink, inkSub } from './tokens';

const VISIBLE_MS = 2500;
const FADE_MS = 220;

type Props = {
  /** Truthy → toast fades in. Parent should null it out from the dismiss
   *  callback so the next "yes" tap re-fires from a clean state. */
  visible: boolean;
  theme: Theme;
  onDismiss: () => void;
};

export function ResonanceToast({ visible, theme, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (!visible) return;

    opacity.value = withTiming(1, { duration: FADE_MS, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.cubic) });

    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: FADE_MS });
      // withTiming's completion callback runs on the UI thread; bridge to
      // the JS thread via runOnJS rather than setTimeout (so-0h5).
      translateY.value = withTiming(20, { duration: FADE_MS }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      });
    }, VISIBLE_MS);

    return () => {
      clearTimeout(timeout);
      opacity.value = 0;
      translateY.value = 20;
    };
  }, [visible, onDismiss, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.root, { bottom: insets.bottom + 24 }, animStyle]}
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
          colors={[TEAL, PINK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.checkBubble}
        >
          <Text style={styles.checkBubbleText}>✓</Text>
        </LinearGradient>
        <View style={styles.body}>
          <Text style={[styles.headline, { color: ink(theme) }]}>
            Thanks — that helps me listen better.
          </Text>
          <Text style={[styles.subline, { color: ink(theme) }]}>
            SoulPal will tune future signals.
          </Text>
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
  // Toast is constrained vertically; bumped 11 → 13 + letterSpacing per
  // so-6a7's "drop one font level if layout can't fit" guidance. Color
  // brightens at the call site (inkSub → ink).
  subline: {
    marginTop: 1,
    fontFamily: fonts.edensor.italic,
    fontSize: 13,
    lineHeight: 13 * 1.35,
    letterSpacing: 0.2,
  },
});
