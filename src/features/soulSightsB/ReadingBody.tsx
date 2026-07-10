import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../theme';
import { cosmicTextShadow } from '../../components/CosmicText';
import { useSoulPalName } from '../../contexts/SoulPalContext';
import AIGeneratedLabel from '../../components/AIGeneratedLabel';
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
  // so-nmqq: lazy-load state for deferred signal extraction.
  signalsLoading?: boolean;
  signalsFailed?: boolean;
  // so-9t3d MI-4: safety_redirect content targets at-risk users — crisis
  // hotline numbers/URLs must be tappable, and Share is suppressed so the
  // user can't share another person's crisis resource screen as if it were
  // their SoulSight reading.
  isSafetyRedirect?: boolean;
};

/**
 * so-9t3d MI-4: split a paragraph string into plain-text and tappable URL
 * parts so crisis hotline numbers and links in safety_redirect content are
 * pressable. Only used when isSafetyRedirect is true.
 */
function splitLinks(text: string): Array<{ text: string; url?: string }> {
  const urlPattern = /((?:https?:\/\/|tel:)[^\s,)[\]]+)/g;
  const parts: Array<{ text: string; url?: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index) });
    }
    parts.push({ text: match[1], url: match[1] });
    lastIndex = match.index + match[1].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }
  return parts;
}

/** Renders a paragraph with tappable tel:/https: links for crisis content. */
function CrisisParagraph({ text, textStyle }: { text: string; textStyle: any }) {
  const parts = splitLinks(text);
  return (
    <Text style={textStyle}>
      {parts.map((part, i) =>
        part.url ? (
          <Text
            key={i}
            style={styles.crisisLink}
            onPress={() => Linking.openURL(part.url!)}
            accessibilityRole="link"
            accessibilityLabel={part.text}
          >
            {part.text}
          </Text>
        ) : (
          <Text key={i}>{part.text}</Text>
        ),
      )}
    </Text>
  );
}

export function ReadingBody({
  theme,
  sight,
  includeSignals = true,
  accent,
  onSave,
  onShare,
  isArchived = false,
  isArchiving = false,
  signalsLoading = false,
  signalsFailed = false,
  isSafetyRedirect = false,
}: Props) {
  const isDark = theme === 'dark';
  const soulPalName = useSoulPalName();
  const [opening, ...rest] = sight.reading_paragraphs;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: accent }]}>
        A reading from {soulPalName}
      </Text>
      {/* so-7r4y: persistent AI-disclosure label on every SoulSight
          reading. tone follows the active theme so contrast is correct
          on both palettes. */}
      <AIGeneratedLabel
        size="compact"
        tone={isDark ? 'light' : 'dark'}
        style={{ marginBottom: 10 }}
      />
      {/* so-jkgo: opening + body paragraphs sit directly over StarsBg in dark
          theme. Apply cosmic shadow halo for dyslexic-readability.
          so-9t3d MI-4: safety_redirect paragraphs use CrisisParagraph so
          hotline numbers and URLs are tappable. */}
      {opening ? (
        isSafetyRedirect ? (
          <CrisisParagraph
            text={opening}
            textStyle={[styles.opening, { color: ink(theme) }, isDark && cosmicTextShadow]}
          />
        ) : (
          <Text
            style={[
              styles.opening,
              { color: ink(theme) },
              isDark && cosmicTextShadow,
            ]}
          >
            {opening}
          </Text>
        )
      ) : null}

      {rest.length > 0 ? (
        <View style={styles.bodyParagraphs}>
          {rest.map((p, i) =>
            isSafetyRedirect ? (
              <CrisisParagraph
                key={i}
                text={p}
                textStyle={[styles.paragraph, { color: ink(theme) }, isDark && cosmicTextShadow]}
              />
            ) : (
              <Text
                key={i}
                style={[
                  styles.paragraph,
                  { color: ink(theme) },
                  isDark && cosmicTextShadow,
                ]}
              >
                {p}
              </Text>
            ),
          )}
        </View>
      ) : null}

      {/* so-dwqk: pull quote only renders when the BE actually returned
          one. Previously the screen forced a hardcoded first-person
          fallback ("You stopped negotiating…") which read as the user's
          own reflection. No card is shown when pull_quote is null. */}
      {sight.pull_quote ? (
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
      ) : null}

      {includeSignals && (signalsLoading || signalsFailed || sight.signals_summary.length > 0) ? (
        <View style={styles.signalsBlock}>
          <Text style={[styles.sectionLabel, { color: accent, marginBottom: 10 }]}>
            Signals {soulPalName} noticed
          </Text>
          {signalsLoading ? (
            // so-nmqq: skeleton rows while deferred signal extraction is in
            // progress. Three bars at staggered widths give a natural reading
            // rhythm so the section doesn't feel frozen or empty.
            <View style={styles.signalsList}>
              {[76, 88, 62].map((pct, i) => (
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
                      { backgroundColor: accent, shadowColor: accent },
                    ]}
                  />
                  <View
                    style={[
                      styles.skeletonBar,
                      {
                        width: `${pct}%`,
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.10)'
                          : 'rgba(58,14,102,0.08)',
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
          ) : signalsFailed ? (
            // so-nmqq: extraction-failure empty-state. Non-alarming: the report
            // content is valid; only the signal tagging step had an issue.
            <View
              style={[
                styles.signalRow,
                {
                  backgroundColor: surfaceBg(theme),
                  borderColor: surfaceBorder(theme),
                },
              ]}
            >
              <Text style={[styles.signalText, { color: inkSub(theme) }]}>
                Signals couldn't be extracted this time.
              </Text>
            </View>
          ) : (
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
          )}
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
        {/* so-9t3d MI-4: suppress Share for safety_redirect — crisis content
            is for the user, not for sharing. */}
        {!isSafetyRedirect ? (
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
        ) : null}
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
  // so-nmqq: skeleton bar placeholder for a signal row while extraction runs.
  skeletonBar: {
    height: 12,
    borderRadius: 6,
    flex: 1,
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
  // so-9t3d MI-4: tappable link style for crisis hotlines/URLs.
  crisisLink: {
    color: '#70CACF',
    textDecorationLine: 'underline',
  },
});
