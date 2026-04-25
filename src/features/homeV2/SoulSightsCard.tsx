import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { fonts } from '../../theme';
import { CardShell } from './CardShell';
import { PURPLE, PURPLE_DEEP, Theme } from './tokens';

const Soulpal1 = require('../../../assets/images/home-v2/soulpal-1.png');

type Props = {
  theme: Theme;
  onPress?: () => void;
};

export function SoulSightsCard({ theme, onPress }: Props) {
  const isDark = theme === 'dark';

  return (
    <CardShell
      theme={theme}
      aspectRatio={1 / 1.25}
      label="Soul Sights"
      labelColor={PURPLE}
      onPress={onPress}
    >
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 125">
        <Defs>
          {isDark ? (
            <RadialGradient id="sights-bg" cx="50%" cy="35%" r="80%">
              <Stop offset="0%" stopColor="#E93678" stopOpacity={0.4} />
              <Stop offset="65%" stopColor={PURPLE_DEEP} />
              <Stop offset="100%" stopColor="#0A0629" />
            </RadialGradient>
          ) : (
            <RadialGradient id="sights-bg" cx="50%" cy="25%" r="80%">
              <Stop offset="0%" stopColor="#C8A6FF" />
              <Stop offset="100%" stopColor={PURPLE} />
            </RadialGradient>
          )}
        </Defs>
        <Rect x="0" y="0" width="100" height="125" fill="url(#sights-bg)" />
      </Svg>

      <Text style={styles.title}>Soul Sights</Text>

      {/* tilted diamond mirror motif: outer wrapper rotated -12deg, inner squares rotated 45deg */}
      <View pointerEvents="none" style={styles.diamondTilt}>
        <View style={styles.diamondOuter} />
        <View style={styles.diamondMid} />
        <View style={styles.diamondInner}>
          <View style={styles.diamondImageWrap}>
            <Image source={Soulpal1} style={styles.diamondImage} resizeMode="contain" />
          </View>
        </View>
      </View>

      {/* aztec base — 3 stacked bars near bottom */}
      <View pointerEvents="none" style={styles.aztecWrap}>
        {[80, 64, 48].map((w, i) => (
          <View
            key={i}
            style={{
              width: w,
              height: 6,
              backgroundColor: i % 2 === 0 ? '#fff' : '#000',
              borderWidth: 1,
              borderColor: '#000',
            }}
          />
        ))}
      </View>
    </CardShell>
  );
}

const DIAMOND = 64;

const styles = StyleSheet.create({
  title: {
    position: 'absolute',
    top: 10,
    left: 10,
    fontFamily: fonts.outfit.bold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: '#fff',
  },
  diamondTilt: {
    position: 'absolute',
    top: 26,
    left: '50%',
    width: DIAMOND,
    height: DIAMOND,
    marginLeft: -DIAMOND / 2,
    transform: [{ rotate: '-12deg' }],
  },
  diamondOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  diamondMid: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    backgroundColor: '#000',
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  diamondInner: {
    position: 'absolute',
    top: 11,
    left: 11,
    right: 11,
    bottom: 11,
    backgroundColor: '#A8B8E8',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  diamondImageWrap: {
    transform: [{ rotate: '-45deg' }],
    opacity: 0.45,
  },
  diamondImage: {
    width: 26,
    height: 26,
  },
  aztecWrap: {
    position: 'absolute',
    bottom: 38,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
