import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '../../theme';
import {
  PURPLE,
  Theme,
  ink,
  inkSub,
  surfaceBg,
  surfaceBorder,
} from '../soulSignals/tokens';

type Props = {
  theme: Theme;
  onOpenJournal?: () => void;
};

export function LockedState({ theme, onOpenJournal }: Props) {
  const isDark = theme === 'dark';
  const stroke = inkSub(theme);

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
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(79,23,134,0.05)',
          },
        ]}
      >
        <Svg width={32} height={32} viewBox="0 0 32 32">
          <Path
            d="M16 4v3M16 25v3M28 16h-3M7 16H4M24.5 7.5l-2 2M9.5 22.5l-2 2M24.5 24.5l-2-2M9.5 9.5l-2-2"
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="2,3"
          />
          <Circle cx={16} cy={16} r={6} fill="none" stroke={stroke} strokeWidth={1.5} />
        </Svg>
      </View>

      <Text style={[styles.title, { color: ink(theme) }]}>
        Today's affirmation is waiting
      </Text>
      <Text style={[styles.copy, { color: inkSub(theme) }]}>
        Write your first journal entry to unlock today's affirmation.
      </Text>

      <Pressable style={styles.cta} onPress={onOpenJournal}>
        <Text style={styles.ctaText}>Open Journal</Text>
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
    width: 70,
    height: 70,
    borderRadius: 35,
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
    maxWidth: 290,
    marginTop: 10,
  },
  cta: {
    marginTop: 22,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: PURPLE,
  },
  ctaText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 13,
    color: colors.white,
  },
});
