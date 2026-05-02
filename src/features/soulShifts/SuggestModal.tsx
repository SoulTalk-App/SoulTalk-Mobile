import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';
import {
  ShiftSuggestionCandidate,
  ShiftSuggestionResponse,
  SoulpalVariant,
} from './types';
import { PINK, PURPLE, TEAL, Theme, ink, inkFaint, inkSub } from './tokens';

const SOULPAL_SRC: Record<SoulpalVariant, any> = {
  1: require('../../../assets/images/home-v2/soulpal-1.png'),
  2: require('../../../assets/images/home-v2/soulpal-2.png'),
  3: require('../../../assets/images/home-v2/soulpal-3.png'),
  4: require('../../../assets/images/home-v2/soulpal-4.png'),
  5: require('../../../assets/images/home-v2/soulpal-5.png'),
};

/** "New suggestions in N days" copy from `next_eligible_at`. Returns null
 *  when the date is past or unparseable. */
function formatCooldown(nextEligibleAt: string | null): string | null {
  if (!nextEligibleAt) return null;
  const target = Date.parse(nextEligibleAt);
  if (Number.isNaN(target)) return null;
  const days = Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return null;
  return days === 1 ? 'New suggestions tomorrow' : `New suggestions in ${days} days`;
}

type Props = {
  visible: boolean;
  response: ShiftSuggestionResponse | null;
  loading: boolean;
  theme: Theme;
  onClose: () => void;
  /** User picked a candidate and confirmed; parent calls accept service. */
  onAccept: (candidateIdx: number, candidate: ShiftSuggestionCandidate) => void;
  submitting?: boolean;
};

export function SuggestModal({
  visible,
  response,
  loading,
  theme,
  onClose,
  onAccept,
  submitting = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const candidates = response?.candidates ?? [];
  const cooldownCopy = formatCooldown(response?.next_eligible_at ?? null);

  useEffect(() => {
    if (!visible) {
      setSelectedIdx(null);
      return;
    }
    // Auto-select the first candidate so the CTA is immediately actionable.
    if (candidates.length > 0 && selectedIdx == null) {
      setSelectedIdx(0);
    }
  }, [visible, candidates.length, selectedIdx]);

  const handleAccept = () => {
    if (selectedIdx == null || submitting) return;
    const candidate = candidates[selectedIdx];
    if (!candidate) return;
    onAccept(selectedIdx, candidate);
  };

  const hasCandidates = candidates.length > 0;
  const ctaLabel = submitting
    ? 'Beginning…'
    : selectedIdx != null && candidates[selectedIdx]
      ? `Begin tending “${candidates[selectedIdx].title}”`
      : 'Begin this shift';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.fullScreen}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View
          style={[
            styles.sheetWrap,
            { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 24 },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? '#0E0820' : '#FFFFFF',
                borderColor: isDark
                  ? 'rgba(255,255,255,0.10)'
                  : 'rgba(58,14,102,0.08)',
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.headerCenter}>
                <Text style={[styles.eyebrow, { color: TEAL }]}>
                  SoulPal suggests
                </Text>
                <Text style={[styles.title, { color: ink(theme) }]}>
                  {hasCandidates
                    ? "A shift that's forming for you"
                    : 'Nothing new yet'}
                </Text>
                <Text style={[styles.subtitle, { color: ink(theme) }]}>
                  {hasCandidates
                    ? 'From the patterns in your last two weeks.'
                    : 'SoulPal hasn’t found patterns yet — keep tending and check back.'}
                </Text>
              </View>

              {loading && !hasCandidates ? (
                <Text
                  style={[
                    styles.loadingText,
                    { color: inkSub(theme) },
                  ]}
                >
                  Looking for patterns…
                </Text>
              ) : null}

              {hasCandidates ? (
                <View style={styles.candidatesCol}>
                  {candidates.map((c, i) => {
                    const sel = selectedIdx === i;
                    return (
                      <Pressable
                        key={`${c.title}-${i}`}
                        onPress={() => setSelectedIdx(i)}
                        style={[
                          styles.candidate,
                          sel
                            ? {
                                borderColor: c.tone,
                                borderWidth: 2,
                                backgroundColor: c.tone + '1F',
                                shadowColor: c.tone,
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.55,
                                shadowRadius: 12,
                                elevation: 6,
                              }
                            : {
                                borderColor: isDark
                                  ? 'rgba(255,255,255,0.10)'
                                  : 'rgba(58,14,102,0.08)',
                                borderWidth: 1,
                                backgroundColor: isDark
                                  ? 'rgba(255,255,255,0.04)'
                                  : '#FFFFFF',
                              },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: sel }}
                      >
                        <Image
                          source={SOULPAL_SRC[c.soulpal]}
                          style={styles.candidateAvatar}
                          resizeMode="contain"
                        />
                        <View style={styles.candidateBody}>
                          <Text style={[styles.candidateCat, { color: c.tone }]}>
                            {c.cat}
                          </Text>
                          <Text
                            style={[styles.candidateTitle, { color: ink(theme) }]}
                          >
                            {c.title}
                          </Text>
                          <Text
                            style={[
                              styles.candidateSrc,
                              { color: inkFaint(theme) },
                            ]}
                          >
                            Drawn from {c.source_summary}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.checkBubble,
                            sel
                              ? { backgroundColor: c.tone, borderWidth: 0 }
                              : {
                                  borderColor: isDark
                                    ? 'rgba(255,255,255,0.30)'
                                    : 'rgba(58,14,102,0.20)',
                                  borderWidth: 1.5,
                                },
                          ]}
                        >
                          {sel ? (
                            <Text style={styles.checkBubbleText}>✓</Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {hasCandidates ? (
                <Pressable
                  onPress={handleAccept}
                  disabled={submitting || selectedIdx == null}
                  style={[
                    styles.cta,
                    (submitting || selectedIdx == null) && styles.ctaDimmed,
                  ]}
                  accessibilityLabel="Begin this shift"
                  accessibilityState={{ disabled: submitting || selectedIdx == null }}
                >
                  <LinearGradient
                    colors={[PINK, PURPLE]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.ctaGradient}
                  >
                    <Text style={styles.ctaText} numberOfLines={1}>
                      {ctaLabel}
                    </Text>
                  </LinearGradient>
                </Pressable>
              ) : null}

              {/* Reroll affordance — inert per so-7e0 pattern until be_core
                  ships the regenerate-suggestions endpoint contract. */}
              <View style={styles.rerollRow}>
                <Text
                  style={[
                    styles.rerollText,
                    { color: inkSub(theme), opacity: 0.55 },
                  ]}
                >
                  Ask SoulPal for different ones
                </Text>
              </View>

              {cooldownCopy ? (
                <Text style={[styles.cooldown, { color: inkFaint(theme) }]}>
                  {cooldownCopy}
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheetWrap: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 16,
  },
  sheet: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 24,
  },
  headerCenter: {
    alignItems: 'center',
    marginBottom: 12,
  },
  eyebrow: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.edensor.regular,
    fontSize: 26,
    lineHeight: 26 * 1.15,
    textAlign: 'center',
  },
  // Body-length Edensor italic per so-6a7.
  subtitle: {
    marginTop: 6,
    fontFamily: fonts.edensor.italic,
    fontSize: 16,
    lineHeight: 16 * 1.45,
    letterSpacing: 0.2,
    textAlign: 'center',
    maxWidth: 300,
  },
  loadingText: {
    marginTop: 18,
    textAlign: 'center',
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
  },
  candidatesCol: {
    marginTop: 14,
    gap: 10,
  },
  candidate: {
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  candidateAvatar: {
    width: 36,
    height: 36,
    flexShrink: 0,
  },
  candidateBody: {
    flex: 1,
    minWidth: 0,
  },
  candidateCat: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  candidateTitle: {
    fontFamily: fonts.edensor.regular,
    fontSize: 17,
    lineHeight: 17 * 1.2,
  },
  candidateSrc: {
    marginTop: 4,
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
  },
  checkBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkBubbleText: {
    color: colors.white,
    fontSize: 13,
    lineHeight: 14,
    fontFamily: fonts.outfit.bold,
  },
  cta: {
    marginTop: 16,
    borderRadius: 999,
    overflow: 'hidden',
  },
  ctaDimmed: {
    opacity: 0.55,
  },
  ctaGradient: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: colors.white,
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  rerollRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  rerollText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
  },
  cooldown: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
  },
});
