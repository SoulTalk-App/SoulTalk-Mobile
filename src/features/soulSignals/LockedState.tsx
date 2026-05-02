import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '../../theme';
import { Eligibility } from './types';
import {
  PINK,
  PURPLE,
  TEAL,
  Theme,
  ink,
  inkSub,
  surfaceBg,
  surfaceBorder,
} from './tokens';

type Props = {
  theme: Theme;
  eligibility?: Eligibility;
  onOpenJournal?: () => void;
};

export function LockedState({
  theme,
  eligibility = { current: 4, needed: 5 },
  onOpenJournal,
}: Props) {
  const isDark = theme === 'dark';
  const pct = Math.min(1, eligibility.current / eligibility.needed);
  const remaining = Math.max(0, eligibility.needed - eligibility.current);
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
        SoulPal is still listening
      </Text>
      <Text style={[styles.copy, { color: inkSub(theme) }]}>
        Signals appear once you've shared a few entries. Yours will start coming
        through soon.
      </Text>

      <View style={styles.progressWrap}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabelStrong, { color: ink(theme) }]}>
            {eligibility.current} of {eligibility.needed} entries
          </Text>
          <Text style={[styles.progressLabelMuted, { color: inkSub(theme) }]}>
            {remaining} more
          </Text>
        </View>
        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(79,23,134,0.1)',
            },
          ]}
        >
          <LinearGradient
            colors={[TEAL, PINK]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.progressFill, { width: `${pct * 100}%` }]}
          />
        </View>
      </View>

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
  progressWrap: {
    marginTop: 22,
    width: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabelStrong: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
  },
  progressLabelMuted: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
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
    // CTA pill bg is opaque PURPLE (#4F1786) — white text reads ~9:1 on
    // it in both themes, so theme-fork isn't needed. Tokenize via
    // colors.white instead of '#fff' literal per so-c2f audit.
    color: colors.white,
  },
});
