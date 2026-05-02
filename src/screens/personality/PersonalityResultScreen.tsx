import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';
import { CosmicScreen } from '../../components/CosmicBackdrop';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../../components/GlassCard';
import PersonalityService, {
  PersonalityTestResult,
} from '../../services/PersonalityService';
import { getTest } from '../../data/personalityTests';
import { ResultProfile, WatchOut } from '../../data/personalityTests/types';
import { usePersonality } from '../../contexts/PersonalityContext';

const BackIcon = require('../../../assets/images/settings/BackButtonIcon.png');
const ProfileBackIcon = require('../../../assets/images/profile/ProfileBackIcon.png');

const PersonalityResultScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const resultId: string | undefined = route.params?.resultId;
  const { latestByType, setResult: cacheResult } = usePersonality();

  const [result, setResult] = useState<PersonalityTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWatchOut, setExpandedWatchOut] = useState<number | null>(0);

  useEffect(() => {
    if (!resultId) {
      setError('No result to show.');
      setIsLoading(false);
      return;
    }
    const cachedMatch = Object.values(latestByType).find((r) => r?.id === resultId);
    if (cachedMatch) {
      setResult(cachedMatch);
      setIsLoading(false);
      return;
    }
    PersonalityService.getById(resultId)
      .then((r) => {
        setResult(r);
        cacheResult(r);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || err?.message || 'Failed to load result.');
      })
      .finally(() => setIsLoading(false));
  }, [resultId]);

  const handleRetake = () => {
    if (!result) return;
    navigation.replace('PersonalityIntro', { testType: result.test_type });
  };

  const goHome = () => {
    if (navigation.canGoBack()) {
      navigation.popToTop();
    }
    navigation.navigate('PersonalityHub');
  };

  // ==============================
  // DARK MODE
  // ==============================
  if (isDarkMode) {
    const renderDarkShell = (message?: string) => (
      <CosmicScreen tone="dusk">
        <View style={[dk.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={dk.backRow} onPress={() => navigation.goBack()}>
            <Image source={BackIcon} style={dk.backIcon} resizeMode="contain" />
            <Text style={dk.backText}>Back</Text>
          </Pressable>
          {message ? (
            <Text style={dk.errorText}>{message}</Text>
          ) : (
            <ActivityIndicator color="#FFFFFF" size="large" style={{ flex: 1 }} />
          )}
        </View>
      </CosmicScreen>
    );

    if (isLoading) return renderDarkShell();
    if (error || !result) return renderDarkShell(error || 'Result not found.');

    const def = getTest(result.test_type);
    const primaryType = result.dominant_type.split('+')[0];
    const profile: ResultProfile | undefined = def.results[primaryType];

    if (!profile) {
      return renderDarkShell(
        `We couldn't load the profile for "${result.dominant_type}".`,
      );
    }

    return (
      <CosmicScreen tone="dusk">
        <View style={[dk.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={dk.backRow} onPress={goHome}>
            <Image source={BackIcon} style={dk.backIcon} resizeMode="contain" />
            <Text style={dk.backText}>Back</Text>
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={dk.scrollContent}
          >
            <View style={dk.hero}>
              <Text style={dk.eyebrow}>{def.title} {'\u00B7'} Your result</Text>
              <Text style={dk.archetype}>{result.dominant_type}</Text>
              <Text style={dk.motto}>"{profile.motto}"</Text>
              {result.is_tie && (
                <Text style={dk.tieNote}>
                  You came out evenly split. The profile below is for your first archetype —
                  the other facets show up in how you move through the world too.
                </Text>
              )}
            </View>

            <GlassCard intensity="medium" style={dk.atBestCard}>
              <Text style={dk.sectionEyebrow}>At your best</Text>
              <Text style={dk.atBestText}>{profile.atYourBest}</Text>
            </GlassCard>

            <GlassCard intensity="light" style={dk.card}>
              <Text style={dk.sectionHeader}>Who you are</Text>
              <Text style={dk.bodyText}>{profile.summary}</Text>
            </GlassCard>

            <GlassCard intensity="light" style={dk.card}>
              <Text style={dk.sectionHeader}>Your scores</Text>
              {def.categories.map((cat) => {
                const score = result.scores[cat] ?? 0;
                const total = Object.values(result.scores).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((score / total) * 100) : 0;
                const isDominant = result.dominant_type.split('+').includes(cat);
                return (
                  <View key={cat} style={dk.scoreRow}>
                    <View style={dk.scoreLabelRow}>
                      <Text
                        style={[
                          dk.scoreLabel,
                          isDominant && dk.scoreLabelDominant,
                        ]}
                      >
                        {cat}
                      </Text>
                      <Text style={dk.scoreValue}>{score}</Text>
                    </View>
                    <View style={dk.scoreTrack}>
                      <View
                        style={[
                          dk.scoreFill,
                          {
                            width: `${Math.min(pct, 100)}%`,
                            backgroundColor: isDominant
                              ? 'rgba(167, 139, 250, 0.9)'
                              : 'rgba(255,255,255,0.35)',
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </GlassCard>

            <GlassCard intensity="light" style={dk.card}>
              <Text style={dk.sectionHeader}>Work & Career</Text>
              <Text style={dk.bodyText}>{profile.work}</Text>
            </GlassCard>

            <GlassCard intensity="light" style={dk.card}>
              <Text style={dk.sectionHeader}>Relationships</Text>
              <Text style={dk.bodyText}>{profile.relationships}</Text>
            </GlassCard>

            <GlassCard intensity="light" style={dk.card}>
              <Text style={dk.sectionHeader}>Growth strategies</Text>
              {profile.growth.map((tip, idx) => (
                <View key={idx} style={dk.tipRow}>
                  <View style={dk.tipDot} />
                  <Text style={dk.tipText}>{tip}</Text>
                </View>
              ))}
            </GlassCard>

            <Text style={dk.watchOutHeader}>Watch out for</Text>
            {profile.watchOutFor.map((w, idx) => {
              const isExpanded = expandedWatchOut === idx;
              return (
                <WatchOutCardDark
                  key={idx}
                  watchOut={w}
                  expanded={isExpanded}
                  onToggle={() => setExpandedWatchOut(isExpanded ? null : idx)}
                />
              );
            })}

            <Pressable style={dk.retakeButton} onPress={handleRetake}>
              <Text style={dk.retakeButtonText}>Retake this test</Text>
            </Pressable>

            <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 24 }} />
          </ScrollView>
        </View>
      </CosmicScreen>
    );
  }

  // ==============================
  // LIGHT MODE
  // ==============================
  const renderLightShell = (message?: string) => (
    <CosmicScreen tone="dusk">
      <View style={[lt.content, { paddingTop: insets.top + 16 }]}>
        <Pressable style={lt.backRow} onPress={() => navigation.goBack()}>
          <Image source={ProfileBackIcon} style={lt.backIcon} resizeMode="contain" />
          <Text style={lt.backText}>Back</Text>
        </Pressable>
        {message ? (
          <Text style={lt.errorText}>{message}</Text>
        ) : (
          <ActivityIndicator color={colors.white} size="large" style={{ flex: 1 }} />
        )}
      </View>
    </CosmicScreen>
  );

  if (isLoading) return renderLightShell();
  if (error || !result) return renderLightShell(error || 'Result not found.');

  const def = getTest(result.test_type);
  const primaryType = result.dominant_type.split('+')[0];
  const profile: ResultProfile | undefined = def.results[primaryType];

  if (!profile) {
    return renderLightShell(
      `We couldn't load the profile for "${result.dominant_type}".`,
    );
  }

  return (
    <CosmicScreen tone="dusk">
      <View style={[lt.content, { paddingTop: insets.top + 16 }]}>
        <Pressable style={lt.backRow} onPress={goHome}>
          <Image source={ProfileBackIcon} style={lt.backIcon} resizeMode="contain" />
          <Text style={lt.backText}>Back</Text>
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={lt.scrollContent}
        >
          <View style={lt.hero}>
            <Text style={lt.eyebrow}>{def.title} {'\u00B7'} Your result</Text>
            <Text style={lt.archetype}>{result.dominant_type}</Text>
            <Text style={lt.motto}>"{profile.motto}"</Text>
            {result.is_tie && (
              <Text style={lt.tieNote}>
                You came out evenly split. The profile below is for your first archetype —
                the other facets show up in how you move through the world too.
              </Text>
            )}
          </View>

          <View style={lt.sectionCard}>
            <View style={lt.sectionHeaderBand}>
              <Text style={lt.sectionHeader}>At your best</Text>
            </View>
            <View style={lt.sectionBody}>
              <Text style={lt.atBestText}>{profile.atYourBest}</Text>
            </View>
          </View>

          <View style={lt.sectionCard}>
            <View style={lt.sectionHeaderBand}>
              <Text style={lt.sectionHeader}>Who you are</Text>
            </View>
            <View style={lt.sectionBody}>
              <Text style={lt.bodyText}>{profile.summary}</Text>
            </View>
          </View>

          <View style={lt.sectionCard}>
            <View style={lt.sectionHeaderBand}>
              <Text style={lt.sectionHeader}>Your scores</Text>
            </View>
            <View style={lt.sectionBody}>
              {def.categories.map((cat) => {
                const score = result.scores[cat] ?? 0;
                const total = Object.values(result.scores).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((score / total) * 100) : 0;
                const isDominant = result.dominant_type.split('+').includes(cat);
                return (
                  <View key={cat} style={lt.scoreRow}>
                    <View style={lt.scoreLabelRow}>
                      <Text
                        style={[
                          lt.scoreLabel,
                          isDominant && lt.scoreLabelDominant,
                        ]}
                      >
                        {cat}
                      </Text>
                      <Text style={lt.scoreValue}>{score}</Text>
                    </View>
                    <View style={lt.scoreTrack}>
                      <View
                        style={[
                          lt.scoreFill,
                          {
                            width: `${Math.min(pct, 100)}%`,
                            backgroundColor: isDominant
                              ? '#59168B'
                              : 'rgba(89, 22, 139, 0.25)',
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={lt.sectionCard}>
            <View style={lt.sectionHeaderBand}>
              <Text style={lt.sectionHeader}>Work & Career</Text>
            </View>
            <View style={lt.sectionBody}>
              <Text style={lt.bodyText}>{profile.work}</Text>
            </View>
          </View>

          <View style={lt.sectionCard}>
            <View style={lt.sectionHeaderBand}>
              <Text style={lt.sectionHeader}>Relationships</Text>
            </View>
            <View style={lt.sectionBody}>
              <Text style={lt.bodyText}>{profile.relationships}</Text>
            </View>
          </View>

          <View style={lt.sectionCard}>
            <View style={lt.sectionHeaderBand}>
              <Text style={lt.sectionHeader}>Growth strategies</Text>
            </View>
            <View style={lt.sectionBody}>
              {profile.growth.map((tip, idx) => (
                <View key={idx} style={lt.tipRow}>
                  <View style={lt.tipDot} />
                  <Text style={lt.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={lt.watchOutHeader}>Watch out for</Text>
          {profile.watchOutFor.map((w, idx) => {
            const isExpanded = expandedWatchOut === idx;
            return (
              <WatchOutCardLight
                key={idx}
                watchOut={w}
                expanded={isExpanded}
                onToggle={() => setExpandedWatchOut(isExpanded ? null : idx)}
              />
            );
          })}

          <Pressable style={lt.retakeButton} onPress={handleRetake}>
            <Text style={lt.retakeButtonText}>Retake this test</Text>
          </Pressable>

          <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 24 }} />
        </ScrollView>
      </View>
    </CosmicScreen>
  );
};

// ==============================
// Watch Out cards
// ==============================
const WatchOutCardDark = ({
  watchOut,
  expanded,
  onToggle,
}: {
  watchOut: WatchOut;
  expanded: boolean;
  onToggle: () => void;
}) => (
  <GlassCard intensity="light" style={dk.watchOutCard} onPress={onToggle}>
    <View style={dk.watchOutHeaderRow}>
      <Text style={dk.watchOutTitle}>{watchOut.title}</Text>
      <Text style={dk.watchOutToggle}>{expanded ? '\u2212' : '+'}</Text>
    </View>
    {expanded && (
      <View style={dk.watchOutBody}>
        <Text style={dk.watchOutInsight}>{watchOut.insight}</Text>
        <Text style={dk.watchOutTipsLabel}>What helps:</Text>
        {watchOut.tips.map((tip, i) => (
          <View key={i} style={dk.tipRow}>
            <View style={dk.tipDot} />
            <Text style={dk.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    )}
  </GlassCard>
);

const WatchOutCardLight = ({
  watchOut,
  expanded,
  onToggle,
}: {
  watchOut: WatchOut;
  expanded: boolean;
  onToggle: () => void;
}) => (
  <Pressable style={lt.watchOutCard} onPress={onToggle}>
    <View style={lt.watchOutHeaderBand}>
      <Text style={lt.watchOutTitle}>{watchOut.title}</Text>
      <Text style={lt.watchOutToggle}>{expanded ? '\u2212' : '+'}</Text>
    </View>
    {expanded && (
      <View style={lt.watchOutBody}>
        <Text style={lt.watchOutInsight}>{watchOut.insight}</Text>
        <Text style={lt.watchOutTipsLabel}>What helps:</Text>
        {watchOut.tips.map((tip, i) => (
          <View key={i} style={lt.tipRow}>
            <View style={lt.tipDot} />
            <Text style={lt.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    )}
  </Pressable>
);

// ==============================
// DARK MODE STYLES
// ==============================
const dk = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 22 },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  backIcon: { width: 36, height: 36 },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: colors.white,
  },

  scrollContent: { paddingBottom: 20 },

  hero: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  eyebrow: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    // lavender accent (so-9tg)
    color: colors.accent.lavenderSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  archetype: {
    fontFamily: fonts.edensor.bold,
    fontSize: 40,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  motto: {
    fontFamily: fonts.edensor.italic,
    fontSize: 18,
    // 0.75 → text.secondary (dark = 0.7) — slight drop, tokenized
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  tieNote: {
    // outfit.light at 13pt body was P1 illegible per audit. Bumped to regular.
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 8,
  },

  card: { padding: 20, marginBottom: 14 },
  atBestCard: {
    padding: 20,
    marginBottom: 14,
  },
  sectionHeader: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.white,
    marginBottom: 10,
  },
  sectionEyebrow: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    // lavender accent (so-9tg)
    color: colors.accent.lavenderSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  atBestText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 15 * 1.6,
    color: colors.white,
  },
  bodyText: {
    // outfit.light at 15pt body — P1 per audit. Bumped to regular.
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 15 * 1.6,
    color: 'rgba(255,255,255,0.88)',
  },

  scoreRow: { marginBottom: 12 },
  scoreLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scoreLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  scoreLabelDominant: {
    fontFamily: fonts.outfit.semiBold,
    color: colors.white,
  },
  scoreValue: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  scoreTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 4,
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(167, 139, 250, 0.9)',
    marginRight: 10,
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    // outfit.light at 14pt body — P1. Bumped to regular.
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.55,
    color: 'rgba(255,255,255,0.85)',
  },

  watchOutHeader: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.white,
    marginTop: 6,
    marginBottom: 12,
  },
  watchOutCard: {
    padding: 18,
    marginBottom: 10,
  },
  watchOutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  watchOutTitle: {
    flex: 1,
    fontFamily: fonts.outfit.medium,
    fontSize: 15,
    color: colors.white,
  },
  watchOutToggle: {
    // outfit.light at 22pt is decorative-large; light weight is fine here
    // since it's a chevron/+ glyph. Leaving outfit.light per typography
    // floor exception for >=20pt decorative.
    fontFamily: fonts.outfit.light,
    fontSize: 22,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 12,
  },
  watchOutBody: { marginTop: 10 },
  watchOutInsight: {
    // outfit.light at 14pt body — P1. Bumped to regular.
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.55,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 12,
  },
  watchOutTipsLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },

  retakeButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.6)',
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  retakeButtonText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.white,
  },

  errorText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
});

// ==============================
// LIGHT MODE STYLES
// ==============================
const lt = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 22 },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  backIcon: { width: 36, height: 36 },
  // Light path: page-bg ink for AA on the so-u1k lavender wash.
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    // #3A0E66 (PURPLE_INK) → colors.text.primary (#4F1786, brand canonical)
    color: colors.text.primary,
  },

  scrollContent: { paddingBottom: 20 },

  hero: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 10,
  },
  eyebrow: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: 'rgba(58,14,102,0.78)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
    opacity: 0.9,
  },
  archetype: {
    fontFamily: fonts.edensor.bold,
    fontSize: 36,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  motto: {
    fontFamily: fonts.edensor.italic,
    fontSize: 18,
    color: 'rgba(58,14,102,0.85)',
    textAlign: 'center',
  },
  tieNote: {
    // outfit.light at 13pt body — P1. Bumped to regular.
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: 'rgba(58,14,102,0.85)',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 8,
  },

  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
  },
  sectionHeaderBand: {
    backgroundColor: 'rgba(89, 22, 139, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionHeader: {
    fontFamily: fonts.edensor.bold,
    fontSize: 15,
    color: colors.primary,
  },

  atBestText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.6,
    color: colors.primary,
  },
  bodyText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: colors.primary,
  },

  scoreRow: { marginBottom: 12 },
  scoreLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scoreLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    // rgba(89,22,139,0.65) drift → primary RGB at same alpha
    color: 'rgba(79, 23, 134, 0.65)',
  },
  scoreLabelDominant: {
    fontFamily: fonts.outfit.bold,
    color: colors.primary,
  },
  scoreValue: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
  scoreTrack: {
    height: 8,
    backgroundColor: 'rgba(89, 22, 139, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 4,
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#59168B',
    marginRight: 10,
    marginTop: 7,
  },
  tipText: {
    flex: 1,
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: colors.primary,
  },

  watchOutHeader: {
    fontFamily: fonts.edensor.bold,
    fontSize: 16,
    color: colors.text.primary,
    marginTop: 6,
    marginBottom: 12,
  },
  watchOutCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  watchOutHeaderBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(89, 22, 139, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  watchOutTitle: {
    flex: 1,
    fontFamily: fonts.edensor.bold,
    fontSize: 14,
    color: colors.primary,
  },
  watchOutToggle: {
    // outfit.light at 22pt is decorative-large (chevron/+ glyph) — light
    // weight is fine here per typography floor exception for >=20pt.
    fontFamily: fonts.outfit.light,
    fontSize: 22,
    color: colors.primary,
    marginLeft: 12,
  },
  watchOutBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  watchOutInsight: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: colors.primary,
    marginBottom: 12,
  },
  watchOutTipsLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    color: colors.primary,
    marginBottom: 6,
  },

  retakeButton: {
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  retakeButtonText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 15,
    color: colors.primary,
  },

  errorText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
});

export default PersonalityResultScreen;
