import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, {
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
import { fonts } from '../../theme';
import { StarsBg } from './StarsBg';
import { SightDetail, SoulpalVariant } from './types';
import { Theme } from './tokens';

const SOULPAL_SRC: Record<SoulpalVariant, any> = {
  1: require('../../../assets/images/home-v2/soulpal-1.png'),
  2: require('../../../assets/images/home-v2/soulpal-2.png'),
  3: require('../../../assets/images/home-v2/soulpal-3.png'),
  4: require('../../../assets/images/home-v2/soulpal-4.png'),
  5: require('../../../assets/images/home-v2/soulpal-5.png'),
};

const HERO_HEIGHT = 320;

type Props = {
  theme: Theme;
  sight: SightDetail;
};

export function HeroOrb({ theme, sight }: Props) {
  const isDark = theme === 'dark';
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [pulse]);

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.06 * pulse.value }],
  }));

  const ringStrokeOuter = isDark ? 'rgba(255,200,92,0.4)' : 'rgba(126,91,217,0.4)';
  const ringStrokeInner = isDark ? 'rgba(112,202,207,0.4)' : 'rgba(126,91,217,0.4)';
  const captionColor = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(58,14,102,0.95)';

  return (
    <View style={styles.hero}>
      {/* radial bg */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Defs>
          {isDark ? (
            <RadialGradient id="hero-orb-bg" cx="50%" cy="50%" r="70%">
              <Stop offset="0%" stopColor="#1B0E58" />
              <Stop offset="70%" stopColor="#07041F" />
            </RadialGradient>
          ) : (
            <RadialGradient id="hero-orb-bg" cx="50%" cy="50%" r="80%">
              <Stop offset="0%" stopColor="#ECE0FF" />
              <Stop offset="80%" stopColor="#C8A6FF" />
            </RadialGradient>
          )}
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#hero-orb-bg)" />
      </Svg>

      <StarsBg theme={theme} count={70} seed={5} />

      {/* glowing orb (radial gradient via SVG, animated scale via reanimated) */}
      <Animated.View style={[styles.orbWrap, orbAnimatedStyle]} pointerEvents="none">
        <Svg width={160} height={160} viewBox="0 0 160 160">
          <Defs>
            {isDark ? (
              <RadialGradient id="orb-fill" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FFD96B" stopOpacity={1} />
                <Stop offset="35%" stopColor="#FF9BC1" stopOpacity={1} />
                <Stop offset="70%" stopColor="rgba(233,54,120,0.7)" stopOpacity={0.7} />
                <Stop offset="100%" stopColor="#E93678" stopOpacity={0} />
              </RadialGradient>
            ) : (
              <RadialGradient id="orb-fill" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
                <Stop offset="35%" stopColor="#FFE4F0" stopOpacity={1} />
                <Stop offset="70%" stopColor="#FFA0C5" stopOpacity={1} />
                <Stop offset="100%" stopColor="#FFA0C5" stopOpacity={0} />
              </RadialGradient>
            )}
          </Defs>
          <Ellipse cx={80} cy={80} rx={80} ry={80} fill="url(#orb-fill)" />
        </Svg>
      </Animated.View>

      {/* orbiting dotted ellipses */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 393 320"
        preserveAspectRatio="xMidYMid slice"
      >
        <Ellipse
          cx={196.5}
          cy={160}
          rx={140}
          ry={36}
          fill="none"
          stroke={ringStrokeOuter}
          strokeWidth={1}
          strokeDasharray="2,4"
        />
        <Ellipse
          cx={196.5}
          cy={160}
          rx={100}
          ry={22}
          fill="none"
          stroke={ringStrokeInner}
          strokeWidth={0.8}
          strokeDasharray="2,4"
        />
      </Svg>

      {/* soulpal in orbit (78% / 34%) */}
      <View style={styles.soulpalWrap} pointerEvents="none">
        <Image
          source={SOULPAL_SRC[sight.soulpal]}
          style={styles.soulpal}
          resizeMode="contain"
        />
      </View>

      {/* caption */}
      <Text style={[styles.caption, { color: captionColor }]}>
        SOUL SIGHT · {sight.window}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: HERO_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  orbWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 160,
    height: 160,
    marginLeft: -80,
    marginTop: -80,
  },
  soulpalWrap: {
    position: 'absolute',
    left: '78%',
    top: '34%',
    width: 40,
    height: 40,
    marginLeft: -20,
    marginTop: -20,
    shadowColor: '#FFC85C',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  soulpal: {
    width: 40,
    height: 40,
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    textAlign: 'center',
    fontFamily: fonts.edensor.lightItalic,
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
