import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../theme';
import { SightDetail } from './types';
import {
  PURPLE,
  Theme,
  ink,
  inkSub,
  surfaceBg,
  surfaceBorder,
} from './tokens';

type Props = {
  theme: Theme;
  sight: SightDetail;
  includeSignals?: boolean;
  accent: string;
  onSave?: () => void;
  onShare?: () => void;
  isArchived?: boolean;
  isArchiving?: boolean;
};

export function ReadingBody({
  theme,
  sight,
  includeSignals = true,
  accent,
  onSave,
  onShare,
  isArchived = false,
  isArchiving = false,
}: Props) {
  const isDark = theme === 'dark';
  const [opening, ...rest] = sight.reading_paragraphs;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: accent }]}>
        A reading from your SoulPal
      </Text>
      {opening ? (
        <Text style={[styles.opening, { color: ink(theme) }]}>{opening}</Text>
      ) : null}

      {rest.length > 0 ? (
        <View style={styles.bodyParagraphs}>
          {rest.map((p, i) => (
            <Text key={i} style={[styles.paragraph, { color: ink(theme) }]}>
              {p}
            </Text>
          ))}
        </View>
      ) : null}

      {/* pull quote */}
      <View style={styles.pullQuoteWrap}>
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,200,92,0.15)', 'rgba(233,54,120,0.10)']
              : ['#FFF6E1', '#FFE4F0']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.pullQuoteBg, { borderLeftColor: accent }]}
        >
          <Text style={[styles.pullQuoteText, { color: ink(theme) }]}>
            “{sight.pull_quote.text}”
          </Text>
          <Text style={[styles.pullQuoteTag, { color: inkSub(theme) }]}>
            {sight.pull_quote.tag}
          </Text>
        </LinearGradient>
      </View>

      {includeSignals && sight.signals_summary.length > 0 ? (
        <View style={styles.signalsBlock}>
          <Text style={[styles.sectionLabel, { color: accent, marginBottom: 10 }]}>
            Signals SoulPal noticed
          </Text>
          <View style={styles.signalsList}>
            {sight.signals_summary.map((s, i) => (
              <View
                key={i}
                style={[
                  styles.signalRow,
                  {
                    backgroundColor: surfaceBg(theme),
                    borderColor: surfaceBorder(theme),
                  },
                ]}
              >
                <View
                  style={[
                    styles.signalDot,
                    {
                      backgroundColor: accent,
                      shadowColor: accent,
                    },
                  ]}
                />
                <Text style={[styles.signalText, { color: ink(theme) }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={[
            styles.primaryBtn,
            (isArchived || isArchiving) && styles.primaryBtnDisabled,
          ]}
          onPress={isArchived || isArchiving ? undefined : onSave}
          disabled={isArchived || isArchiving}
        >
          <Text style={styles.primaryBtnText}>
            {isArchived
              ? 'Saved to your archive'
              : isArchiving
                ? 'Saving…'
                : 'Save to your archive'}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.secondaryBtn,
            {
              borderColor: isDark
                ? 'rgba(255,255,255,0.2)'
                : 'rgba(79,23,134,0.2)',
            },
          ]}
          onPress={onShare}
        >
          <Text style={[styles.secondaryBtnText, { color: ink(theme) }]}>
            Share with a friend
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 8,
    fontFamily: fonts.edensor.italic,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  opening: {
    fontFamily: fonts.edensor.regular,
    fontSize: 28,
    lineHeight: 28 * 1.15,
    letterSpacing: -0.3,
  },
  bodyParagraphs: {
    marginTop: 22,
    gap: 14,
  },
  paragraph: {
    fontFamily: fonts.outfit.light,
    fontSize: 15,
    lineHeight: 15 * 1.6,
  },
  pullQuoteWrap: {
    marginVertical: 22,
  },
  pullQuoteBg: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingRight: 18,
    paddingLeft: 22,
    borderLeftWidth: 3,
    borderRadius: 12,
  },
  pullQuoteText: {
    fontFamily: fonts.edensor.italic,
    fontSize: 18,
    lineHeight: 18 * 1.35,
  },
  pullQuoteTag: {
    marginTop: 8,
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  signalsBlock: {
    marginTop: 12,
  },
  signalsList: {
    gap: 8,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  signalText: {
    flex: 1,
    fontFamily: fonts.outfit.light,
    fontSize: 13,
    lineHeight: 13 * 1.4,
  },
  actions: {
    marginTop: 26,
    gap: 10,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: PURPLE,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: '#fff',
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
  },
});
