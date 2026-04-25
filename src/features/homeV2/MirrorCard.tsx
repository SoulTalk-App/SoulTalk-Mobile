import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { CardShell } from './CardShell';
import { PINK, Theme } from './tokens';

const AffirmationMirror = require('../../../assets/images/home-v2/affirmation-mirror.png');

type Props = {
  theme: Theme;
  onPress?: () => void;
};

export function MirrorCard({ theme, onPress }: Props) {
  return (
    <CardShell
      theme={theme}
      aspectRatio={1 / 1.15}
      label="Affirmation Mirror"
      labelColor={PINK}
      onPress={onPress}
    >
      <Image
        source={AffirmationMirror}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
    </CardShell>
  );
}
