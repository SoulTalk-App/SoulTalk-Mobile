import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

/**
 * so-7r4y: persistent "AI-generated" disclosure label rendered next to every
 * AI surface in the app — SoulSight, journal analysis / response, Soul
 * Signals, affirmations, etc. Required for AI-transparency law compliance;
 * launch-gating.
 *
 * Visual rules:
 * - Always visible (NOT a toast or one-time hint).
 * - Reads as metadata, not action — small, low contrast, no chrome that
 *   competes with the AI content itself.
 * - Theme-aware via useThemeColors so contrast is correct on both palettes.
 *
 * Copy: placeholder "AI-generated" — final wording is pending Chey/Randy.
 * When the final string lands, swap LABEL_TEXT below.
 *
 * Sizes:
 * - `compact` — inline metadata, fits next to a timestamp or author line.
 * - `default` — own row, comfortable for cards and full-screen reveals.
 *
 * Tones:
 * - `light` — for use over the cosmic / dark backdrop (default app theme).
 * - `dark` — for use over light backdrops (e.g. modals, cards on light theme).
 *   Falls back to the active theme automatically when unspecified.
 */

// so-gozt: approved reword per client feedback (Chelsea ed66db3b). Prepends
// 'Soulcology-backed,' so the brand is foregrounded while 'AI-generated'
// remains visible for legal-disclosure compliance (so-7r4y).
const LABEL_TEXT = 'Soulcology-backed, AI-generated';

type AILabelSize = 'compact' | 'default';
type AILabelTone = 'light' | 'dark' | 'auto';

interface Props {
  size?: AILabelSize;
  tone?: AILabelTone;
  style?: StyleProp<ViewStyle>;
}

const AIGeneratedLabel: React.FC<Props> = ({
  size = 'default',
  tone = 'auto',
  style,
}) => {
  const themeColors = useThemeColors();
  const { isDarkMode } = useTheme();

  const resolvedTone: 'light' | 'dark' =
    tone === 'auto' ? (isDarkMode ? 'light' : 'dark') : tone;

  const palette =
    resolvedTone === 'light'
      ? {
          bg: 'rgba(255, 255, 255, 0.08)',
          border: 'rgba(255, 255, 255, 0.18)',
          text: 'rgba(255, 255, 255, 0.72)',
          iconColor: 'rgba(255, 255, 255, 0.72)',
        }
      : {
          bg: 'rgba(58, 14, 102, 0.06)',
          border: 'rgba(58, 14, 102, 0.18)',
          text: 'rgba(58, 14, 102, 0.72)',
          iconColor: themeColors.primary,
        };

  const sizes = size === 'compact'
    ? { iconSize: 10, fontSize: 10, paddingV: 2, paddingH: 6, radius: 4, gap: 4 }
    : { iconSize: 12, fontSize: 11, paddingV: 4, paddingH: 8, radius: 6, gap: 5 };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          paddingVertical: sizes.paddingV,
          paddingHorizontal: sizes.paddingH,
          borderRadius: sizes.radius,
          gap: sizes.gap,
        },
        style,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${LABEL_TEXT} content`}
    >
      <Feather name="cpu" size={sizes.iconSize} color={palette.iconColor} />
      <Text
        style={{
          fontFamily: fonts.outfit.medium,
          fontSize: sizes.fontSize,
          color: palette.text,
          letterSpacing: 0.3,
        }}
      >
        {LABEL_TEXT}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default AIGeneratedLabel;
