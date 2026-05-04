import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, G, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { CardShell } from './CardShell';
import { ORANGE, ORANGE_DEEP, Theme, YELLOW } from './tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_RADII = [34, 26, 18, 10];

type Props = { theme: Theme; onPress?: () => void };

function PulseRing({ baseR, index, stroke }: { baseR: number; index: number; stroke: string }) {
  const t = useSharedValue(0);

  useEffect(() => {
    const dur = 2000 + index * 400;
    t.value = withRepeat(
      withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [index, t]);

  const animatedProps = useAnimatedProps(() => {
    const baseOpacity = 1 - index * 0.18;
    return {
      r: baseR + 4 * t.value,
      opacity: baseOpacity + (0.3 - baseOpacity) * t.value,
    } as any;
  });

  return (
    <AnimatedCircle
      animatedProps={animatedProps}
      cx={0}
      cy={0}
      fill="none"
      stroke={stroke}
      strokeWidth={1}
    />
  );
}

export function SoulSignalsCard({ theme, onPress }: Props) {
  const isDark = theme === 'dark';
  const ringStroke = isDark ? 'rgba(255,138,76,0.55)' : 'rgba(194,90,31,0.5)';
  const dotColor = isDark ? ORANGE : ORANGE_DEEP;
  const blipColor = isDark ? YELLOW : ORANGE_DEEP;

  return (
    <CardShell
      theme={theme}
      aspectRatio={1 / 1.25}
      label="Soul Signals"
      labelColor={dotColor}
      onPress={onPress}
    >
      {isDark ? (
        <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 125">
          <Defs>
            <RadialGradient id="signals-bg" cx="50%" cy="30%" r="80%">
              <Stop offset="0%" stopColor="#2A1A4E" />
              <Stop offset="100%" stopColor="#0A0629" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="125" fill="url(#signals-bg)" />
        </Svg>
      ) : (
        <LinearGradient
          colors={['#FFF1E6', '#FFD6B9']}
          start={{ x: 0.329, y: 0.030 }}
          end={{ x: 0.671, y: 0.970 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 120 140"
        preserveAspectRatio="xMidYMid meet"
      >
        <G transform="translate(60 75)">
          {RING_RADII.map((r, i) => (
            <PulseRing key={i} baseR={r} index={i} stroke={ringStroke} />
          ))}
          <Circle r={4} fill={dotColor} />
          <Circle cx={22} cy={-14} r={1.6} fill={blipColor} />
          <Circle cx={-26} cy={8} r={1.4} fill={blipColor} />
          <Circle cx={14} cy={22} r={1.2} fill={blipColor} opacity={0.6} />
        </G>
      </Svg>
    </CardShell>
  );
}

