import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, fonts } from '../../theme';
import { cosmicTextShadow } from '../../components/CosmicText';
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

// so-9t3d MI-5: removed hardcoded default eligibility {current:5,needed:7}.
// Showing fabricated progress numbers is a trust issue. When eligibility is
// absent (Detail screen doesn't fetch it) the progress bar is simply hidden.
export function LockedState({
  theme,
  eligibility,
  onOpenJournal,
}: Props) {
  const colors = useThemeColors();
  const isDark = theme === 'dark';
  const pct = eligibility
    ? Math.max(0, Math.min(1, eligibility.current / eligibility.needed))
    : 0;
  const remaining = eligibility
    ? Math.max(0, eligibility.needed - eligibility.current)
    : 0;

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
          styles.lockBubble,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(79,23,134,0.06)',
          },
        ]}
      >
        <Text style={styles.lockEmoji}>🔒</Text>
      </View>

      {/* so-jkgo: dark-mode text sits over StarsBg; cosmic shadow halo
          separates glyphs from any star pixels behind them. */}
      <Text
        style={[
          styles.title,
          { color: ink(theme) },
          isDark && cosmicTextShadow,
        ]}
      >
        Your first SoulSight is forming
      </Text>
      <Text
        style={[
          styles.copy,
          { color: inkSub(theme) },
          isDark && cosmicTextShadow,
        ]}
      >
        SoulSights need a few entries to draw from. Keep journaling — yours
        unlocks soon.
      </Text>

      {/* so-9t3d MI-5: only show progress bar when real eligibility data is present. */}
      {eligibility ? (
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
      ) : null}

      <Pressable style={styles.cta} onPress={onOpenJournal}>
        <Text style={[styles.ctaText, { color: colors.white }]}>Open Journal</Text>
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
  lockBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockEmoji: {
    fontSize: 32,
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
    maxWidth: 280,
    marginTop: 10,
  },
  progressWrap: {
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 4,
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
    marginTop: 20,
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
    // colors.white (resolved via useThemeColors at the call site) instead
    // of '#fff' literal per so-c2f audit.
  },
});
