import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { CardShell } from './CardShell';
import { PINK, PURPLE_DEEP, Theme } from './tokens';

const AffirmationMirrorLight = require('../../../assets/images/home-v2/affirmation-mirror.png');
const AffirmationMirrorDark = require('../../../assets/images/home-v2/affirmation-mirror-dark.png');

type Props = {
  theme: Theme;
  onPress?: () => void;
};

export function MirrorCard({ theme, onPress }: Props) {
  const isDark = theme === 'dark';
  const source = isDark ? AffirmationMirrorDark : AffirmationMirrorLight;
  const bgColor = isDark ? PURPLE_DEEP : PINK;
  return (
    <CardShell
      theme={theme}
      aspectRatio={1}
      label="Affirmation Mirror"
      labelColor={PINK}
      onPress={onPress}
      info={{
        title: 'Affirmation Mirror',
        body:
          'A grounded daily affirmation generated from today\'s entry. Read it once, return when you need a steady reminder.',
      }}
    >
      <View style={[styles.fill, { backgroundColor: bgColor }]}>
        <Image
          source={source}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </CardShell>
  );
}

const CARD_RADIUS = 18;

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: CARD_RADIUS,
  },
});
