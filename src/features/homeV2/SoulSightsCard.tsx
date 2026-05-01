import React, { useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { CardShell } from './CardShell';
import { PURPLE, Theme } from './tokens';

const Soulpal1 = require('../../../assets/images/home-v2/soulpal-1.png');

// Reuse the HeroOrb (Variant B detail screen) visual language at card scale:
// radial bg + sparse stars (dark only) + dotted orbit ring + glowing radial
// orb with soulpal anchored at center. Replaces the diamond/aztec frame
// where soulpal-1 was barely visible at ~26pt inside a tilted diamond.
const STAR_COUNT = 18;
const VB_W = 100;
const VB_H = 125;

type Props = {
  theme: Theme;
  onPress?: () => void;
};

export function SoulSightsCard({ theme, onPress }: Props) {
  const isDark = theme === 'dark';

  const stars = useMemo(() => {
    if (!isDark) return [];
    // Deterministic LCG so star positions stay stable per render.
    let s = 7919;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: STAR_COUNT }, (_, i) => ({
      i,
      cx: rand() * VB_W,
      cy: rand() * (VB_H - 28), // keep stars out of the label-chip strip
      r: rand() < 0.8 ? 0.5 : 0.9,
      op: 0.3 + rand() * 0.6,
    }));
  }, [isDark]);

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [pulse]);

  const orbAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.05 * pulse.value }],
  }));

  const ringStroke = isDark
    ? 'rgba(255,200,92,0.45)'
    : 'rgba(126,91,217,0.45)';

  return (
    <CardShell
      theme={theme}
      aspectRatio={1 / 1.25}
      label="Soul Sights"
      labelColor={PURPLE}
      onPress={onPress}
    >
      {/* radial bg — matches HeroOrb's hero-orb-bg fork by theme */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        <Defs>
          {isDark ? (
            <RadialGradient id="ss-card-bg" cx="50%" cy="42%" r="80%">
              <Stop offset="0%" stopColor="#1B0E58" />
              <Stop offset="70%" stopColor="#07041F" />
            </RadialGradient>
          ) : (
            <RadialGradient id="ss-card-bg" cx="50%" cy="35%" r="85%">
              <Stop offset="0%" stopColor="#ECE0FF" />
              <Stop offset="80%" stopColor="#C8A6FF" />
            </RadialGradient>
          )}
        </Defs>
        <Rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#ss-card-bg)" />

        {/* sparse stars — dark only */}
        {stars.map((star) => (
          <Circle
            key={star.i}
            cx={star.cx}
            cy={star.cy}
            r={star.r}
            fill="#fff"
            opacity={star.op}
          />
        ))}
      </Svg>

      {/* dotted orbit ellipse — cosmic-insight cue at card scale */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        pointerEvents="none"
      >
        <Ellipse
          cx={VB_W / 2}
          cy={VB_H / 2 - 8}
          rx={42}
          ry={11}
          fill="none"
          stroke={ringStroke}
          strokeWidth={0.6}
          strokeDasharray="1.5,2"
        />
      </Svg>

      {/* glowing orb — radial gradient via SVG, animated scale (pulse) */}
      <Animated.View style={[styles.orbWrap, orbAnimStyle]} pointerEvents="none">
        <Svg width={104} height={104} viewBox="0 0 104 104">
          <Defs>
            {isDark ? (
              <RadialGradient id="ss-card-orb" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FFD96B" stopOpacity={1} />
                <Stop offset="35%" stopColor="#FF9BC1" stopOpacity={1} />
                <Stop offset="70%" stopColor="rgba(233,54,120,0.7)" stopOpacity={0.7} />
                <Stop offset="100%" stopColor="#E93678" stopOpacity={0} />
              </RadialGradient>
            ) : (
              <RadialGradient id="ss-card-orb" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
                <Stop offset="35%" stopColor="#FFE4F0" stopOpacity={1} />
                <Stop offset="70%" stopColor="#FFA0C5" stopOpacity={1} />
                <Stop offset="100%" stopColor="#FFA0C5" stopOpacity={0} />
              </RadialGradient>
            )}
          </Defs>
          <Circle cx={52} cy={52} r={52} fill="url(#ss-card-orb)" />
        </Svg>
      </Animated.View>

      {/* soulpal anchored at orb center — small but legible (was lost
          inside the tilted diamond at ~45% opacity / 26pt) */}
      <View style={styles.soulpalWrap} pointerEvents="none">
        <Image source={Soulpal1} style={styles.soulpal} resizeMode="contain" />
      </View>
    </CardShell>
  );
}

const styles = StyleSheet.create({
  orbWrap: {
    position: 'absolute',
    left: '50%',
    top: '42%',
    width: 104,
    height: 104,
    marginLeft: -52,
    marginTop: -52,
  },
  soulpalWrap: {
    position: 'absolute',
    left: '50%',
    top: '42%',
    width: 36,
    height: 36,
    marginLeft: -18,
    marginTop: -18,
    shadowColor: '#FFC85C',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  soulpal: {
    width: 36,
    height: 36,
  },
});
