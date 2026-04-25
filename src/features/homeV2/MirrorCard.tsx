import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { CardShell } from './CardShell';
import { PINK, Theme } from './tokens';

const AffirmationMirror = require('../../../assets/images/home-v2/affirmation-mirror.png');

type Props = {
  theme: Theme;
  onPress?: () => void;
};

export function MirrorCard({ theme, onPress }: Props) {
  const isDark = theme === 'dark';

  return (
    <CardShell
      theme={theme}
      aspectRatio={1 / 1.15}
      label="Affirmation Mirror"
      labelColor={PINK}
      onPress={onPress}
    >
      {/* Radial gradient bg */}
      <Svg
        style={StyleSheet.absoluteFill}
        preserveAspectRatio="none"
        viewBox="0 0 100 115"
      >
        <Defs>
          {isDark ? (
            <RadialGradient id="mirror-bg" cx="50%" cy="25%" r="80%">
              <Stop offset="0%" stopColor="#FF9BC1" />
              <Stop offset="55%" stopColor={PINK} />
              <Stop offset="100%" stopColor="#5A0E36" />
            </RadialGradient>
          ) : (
            <RadialGradient id="mirror-bg" cx="50%" cy="25%" r="80%">
              <Stop offset="0%" stopColor="#FFD0DF" />
              <Stop offset="45%" stopColor="#FFA0C5" />
              <Stop offset="100%" stopColor={PINK} />
            </RadialGradient>
          )}
        </Defs>
        <Rect x="0" y="0" width="100" height="115" fill="url(#mirror-bg)" />
        {/* sparkles in top 40% */}
        <Circle cx="15" cy="11" r="0.75" fill="#fff" opacity={0.85} />
        <Circle cx="82.5" cy="19" r="0.6" fill="#fff" opacity={0.7} />
        <Circle cx="68.75" cy="7.5" r="0.9" fill="#fff" opacity={0.9} />
        <Circle cx="36.25" cy="25" r="0.5" fill="#fff" opacity={0.6} />
      </Svg>

      <View style={styles.imageWrap} pointerEvents="none">
        <Image
          source={AffirmationMirror}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </CardShell>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    position: 'absolute',
    left: '6%',
    right: '6%',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
  },
  image: {
    width: '100%',
    height: '88%',
  },
});
