import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { fonts } from '../../theme';
import {
  TEAL,
  Theme,
  ink,
  inkSub,
  surfaceBg,
  surfaceBorder,
} from './tokens';

const Soulpal2 = require('../../../assets/images/home-v2/soulpal-2.png');

const RING_DURATION = 2400;
const RING_DELAYS = [0, 600, 1200];

function PulseRing({
  delayMs,
  borderColor,
}: {
  delayMs: number;
  borderColor: string;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(1, { duration: RING_DURATION, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, [delayMs, t]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.4 + t.value }],
    opacity: 0.7 * (1 - t.value),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { borderColor },
        style,
      ]}
    />
  );
}

function BlinkDot({ color }: { color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * t.value,
  }));
  return <Animated.View style={[styles.blinkDot, { backgroundColor: color }, style]} />;
}

type Props = {
  theme: Theme;
  meta?: { entries: number; patterns: number };
};

export function ListeningState({
  theme,
  meta = { entries: 9, patterns: 3 },
}: Props) {
  const isDark = theme === 'dark';
  const ringColor = isDark
    ? 'rgba(112,202,207,0.5)'
    : 'rgba(126,91,217,0.5)';
  const pillBg = isDark
    ? 'rgba(112,202,207,0.12)'
    : 'rgba(126,91,217,0.10)';
  const pillBorder = isDark
    ? 'rgba(112,202,207,0.30)'
    : 'rgba(126,91,217,0.20)';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: surfaceBg(theme),
          borderColor: surfaceBorder(theme),
        },
      ]}
    >
      <View style={styles.ringStage}>
        {RING_DELAYS.map((d, i) => (
          <PulseRing key={i} delayMs={d} borderColor={ringColor} />
        ))}
        <View style={styles.center}>
          <Svg width={70} height={70} viewBox="0 0 70 70" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="listening-glow" cx="50%" cy="50%" r="50%">
                <Stop
                  offset="0%"
                  stopColor={isDark ? '#70CACF' : '#7E5BD9'}
                  stopOpacity={isDark ? 0.5 : 0.3}
                />
                <Stop
                  offset="70%"
                  stopColor={isDark ? '#70CACF' : '#7E5BD9'}
                  stopOpacity={0}
                />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="70" height="70" fill="url(#listening-glow)" />
          </Svg>
          <Image source={Soulpal2} style={styles.soulpal} resizeMode="contain" />
        </View>
      </View>

      <Text style={[styles.title, { color: ink(theme) }]}>Listening to this week…</Text>
      <Text style={[styles.copy, { color: inkSub(theme) }]}>
        SoulPal is finding the threads. New signals will surface here as they
        form.
      </Text>

      <View
        style={[
          styles.indicator,
          { backgroundColor: pillBg, borderColor: pillBorder },
        ]}
      >
        <BlinkDot color={TEAL} />
        <Text style={[styles.indicatorText, { color: ink(theme) }]}>
          processing {meta.entries} entries · {meta.patterns} patterns
        </Text>
      </View>
    </View>
  );
}

const RING_SIZE = 130;

const styles = StyleSheet.create({
  card: {
    marginTop: 60,
    marginHorizontal: 20,
    padding: 28,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    overflow: 'hidden',
  },
  ringStage: {
    width: RING_SIZE,
    height: RING_SIZE,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
  },
  center: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  soulpal: {
    width: 50,
    height: 50,
  },
  title: {
    fontFamily: fonts.edensor.regular,
    fontSize: 24,
    lineHeight: 24 * 1.1,
    textAlign: 'center',
  },
  copy: {
    fontFamily: fonts.edensor.lightItalic,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    textAlign: 'center',
    maxWidth: 280,
    marginTop: 10,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 18,
  },
  indicatorText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
  },
  blinkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
