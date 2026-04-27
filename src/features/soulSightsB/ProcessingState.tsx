import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { fonts } from '../../theme';
import {
  PINK,
  TEAL,
  Theme,
  YELLOW,
  ink,
  inkSub,
  surfaceBg,
  surfaceBorder,
} from './tokens';

const Soulpal4 = require('../../../assets/images/home-v2/soulpal-4.png');

type Props = {
  theme: Theme;
  meta?: { entries: number; signals: number };
};

function BlinkDot({
  color,
  delayMs,
}: {
  color: string;
  delayMs: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    const start = setTimeout(() => {
      t.value = withRepeat(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }, delayMs);
    return () => clearTimeout(start);
  }, [delayMs, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * t.value,
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export function ProcessingState({ theme, meta = { entries: 9, signals: 3 } }: Props) {
  const isDark = theme === 'dark';
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [spin]);

  const haloRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const haloStroke = isDark ? 'rgba(255,200,92,0.6)' : 'rgba(126,91,217,0.6)';

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
      <View style={styles.haloWrap}>
        {/* radial gold halo */}
        <Svg width={110} height={110} viewBox="0 0 110 110" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="halo-fill" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFC85C" stopOpacity={0.5} />
              <Stop offset="70%" stopColor="#FFC85C" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={55} cy={55} r={55} fill="url(#halo-fill)" />
        </Svg>
        <Image source={Soulpal4} style={styles.soulpal} resizeMode="contain" />
        <Animated.View style={[StyleSheet.absoluteFill, haloRingStyle]}>
          <Svg width={110} height={110} viewBox="0 0 110 110">
            <Circle
              cx={55}
              cy={55}
              r={50}
              fill="none"
              stroke={haloStroke}
              strokeWidth={1}
              strokeDasharray="4,6"
            />
          </Svg>
        </Animated.View>
      </View>

      <Text style={[styles.title, { color: ink(theme) }]}>Sensing your week…</Text>
      <Text style={[styles.copy, { color: inkSub(theme) }]}>
        SoulPal is reading between the lines of your entries. This may take a
        moment.
      </Text>

      <View style={styles.dotsRow}>
        <BlinkDot color={TEAL} delayMs={0} />
        <BlinkDot color={PINK} delayMs={200} />
        <BlinkDot color={YELLOW} delayMs={400} />
        <Text style={[styles.dotsLabel, { color: inkSub(theme) }]}>
          Reading {meta.entries} entries · {meta.signals} signals
        </Text>
      </View>
    </View>
  );
}

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
  haloWrap: {
    width: 110,
    height: 110,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soulpal: {
    width: 70,
    height: 70,
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
  dotsRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotsLabel: {
    marginLeft: 6,
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
  },
});
