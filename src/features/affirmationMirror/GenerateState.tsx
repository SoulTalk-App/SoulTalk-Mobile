import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '../../theme';
import {
  PINK,
  PURPLE,
  TEAL,
  Theme,
  ink,
  inkSub,
  surfaceBg,
  surfaceBorder,
} from '../soulSignals/tokens';

type Props = {
  theme: Theme;
  onGenerate?: () => void;
  isGenerating?: boolean;
};

export function GenerateState({ theme, onGenerate, isGenerating = false }: Props) {
  const isDark = theme === 'dark';

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
      <View
        style={[
          styles.iconBubble,
          {
            backgroundColor: isDark
              ? 'rgba(255,200,92,0.10)'
              : 'rgba(233,54,120,0.08)',
          },
        ]}
      >
        <Svg width={36} height={36} viewBox="0 0 36 36">
          <Circle cx={18} cy={18} r={9} fill="none" stroke={isDark ? TEAL : PINK} strokeWidth={1.5} />
          <Path
            d="M18 2v4M18 30v4M34 18h-4M6 18H2M28.5 7.5l-2.8 2.8M10.3 25.7l-2.8 2.8M28.5 28.5l-2.8-2.8M10.3 10.3L7.5 7.5"
            stroke={isDark ? TEAL : PINK}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </Svg>
      </View>

      <Text style={[styles.title, { color: ink(theme) }]}>
        Your affirmation is ready
      </Text>
      <Text style={[styles.copy, { color: inkSub(theme) }]}>
        SoulPal has woven today's words from what you wrote. Tap to reveal.
      </Text>

      <Pressable
        onPress={isGenerating ? undefined : onGenerate}
        disabled={isGenerating}
        style={[styles.cta, isGenerating && styles.ctaDisabled]}
      >
        <LinearGradient
          colors={isDark ? [TEAL, PINK] : [PURPLE, PINK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {isGenerating ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.ctaText}>Generate today's affirmation</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 60,
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconBubble: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.edensor.regular,
    fontSize: 26,
    lineHeight: 26 * 1.1,
    textAlign: 'center',
  },
  copy: {
    fontFamily: fonts.edensor.lightItalic,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 10,
  },
  cta: {
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    minWidth: 240,
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: colors.white,
  },
});
