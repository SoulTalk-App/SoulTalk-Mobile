import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { fonts, useThemeColors } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { CosmicScreen } from '../../components/CosmicBackdrop';
import { usePersonality } from '../../contexts/PersonalityContext';
import {
  PERSONALITY_TESTS,
  PERSONALITY_TEST_ORDER,
} from '../../data/personalityTests';
import { TestType } from '../../data/personalityTests/types';

type SoulpalVariant = 1 | 2 | 3 | 4 | 5;
type GlyphLabel = 'eye' | 'spiral' | 'wave' | 'compass';
type CardStatus = 'taken' | 'available' | 'soon';

const TEAL = '#70CACF';
const PINK = '#E93678';
const YELLOW = '#FFC85C';
const LILAC = '#C8A6FF';
const PURPLE = '#4F1786';

const SOULPAL_SRC: Record<SoulpalVariant, any> = {
  1: require('../../../assets/images/home-v2/soulpal-1.png'),
  2: require('../../../assets/images/home-v2/soulpal-2.png'),
  3: require('../../../assets/images/home-v2/soulpal-3.png'),
  4: require('../../../assets/images/home-v2/soulpal-4.png'),
  5: require('../../../assets/images/home-v2/soulpal-5.png'),
};

/**
 * Per-test display tokens. Hardcoded by test type to keep the registry
 * (data/personalityTests) content-only; if a future test ships, add an
 * entry here. Mirrors the canonical list-screens.jsx TESTS array.
 */
const TEST_VISUALS: Record<TestType, {
  tone: string;
  soulpal: SoulpalVariant;
  glyph: GlyphLabel;
}> = {
  inner_lens: { tone: TEAL, soulpal: 1, glyph: 'eye' },
  focus_factor: { tone: PINK, soulpal: 5, glyph: 'spiral' },
};


function TestGlyph({
  label,
  tone,
  size = 56,
}: {
  label: GlyphLabel;
  tone: string;
  size?: number;
}) {
  const inner = size * 0.55;
  return (
    <View
      style={[
        glyphStyles.disc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone + '22',
          borderColor: tone + '55',
        },
      ]}
    >
      <Svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
        {label === 'eye' ? (
          <>
            <Path
              d="M2 12c2.5-4.5 5.5-7 10-7s7.5 2.5 10 7c-2.5 4.5-5.5 7-10 7s-7.5-2.5-10-7z"
              stroke={tone}
              strokeWidth={1.4}
              fill="none"
            />
            <Circle cx={12} cy={12} r={3} stroke={tone} strokeWidth={1.4} fill="none" />
            <Circle cx={12} cy={12} r={1.4} fill={tone} />
          </>
        ) : null}
        {label === 'spiral' ? (
          <Path
            d="M12 12 m-1 0 a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0
               M12 12 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0
               M12 12 m-7 0 a7 7 0 1 0 14 0"
            stroke={tone}
            strokeWidth={1.3}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
        {label === 'wave' ? (
          <>
            <Path
              d="M2 12 q3-6 6 0 t6 0 t6 0 t6 0"
              stroke={tone}
              strokeWidth={1.5}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M2 16 q3-4 6 0 t6 0 t6 0 t6 0"
              stroke={tone}
              strokeWidth={1.2}
              strokeLinecap="round"
              opacity={0.55}
              fill="none"
            />
          </>
        ) : null}
        {label === 'compass' ? (
          <>
            <Circle cx={12} cy={12} r={9} stroke={tone} strokeWidth={1.4} fill="none" />
            <Path d="M12 5l2.5 6.5L12 14l-2.5-2.5z" fill={tone} />
            <Path d="M12 14l2.5 2.5L12 19l-2.5-2.5z" fill={tone} opacity={0.4} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const glyphStyles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
});

const PersonalityHubScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const { latestByType, isLoading, hasLoadedOnce, refresh } = usePersonality();
  const isDark = isDarkMode;
  const styles = useMemo(() => buildStyles(colors, isDark), [colors, isDark]);

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const tests = PERSONALITY_TEST_ORDER;
  const taken = tests.filter((t) => latestByType[t]).length;

  const statusFor = (t: TestType): CardStatus => {
    const def = PERSONALITY_TESTS[t];
    if (def.locked) return 'soon';
    if (latestByType[t]) return 'taken';
    return 'available';
  };

  const handleCardPress = (t: TestType) => {
    const def = PERSONALITY_TESTS[t];
    if (def.locked) return;
    const latest = latestByType[t];
    if (latest) {
      navigation.navigate('PersonalityResult', { resultId: latest.id });
    } else {
      navigation.navigate('PersonalityIntro', { testType: t });
    }
  };

  // ─── Header progress ring ───────────────────────────
  const RING_SIZE = 56;
  const RING_R = 24;
  const RING_C = 2 * Math.PI * RING_R;
  const ringFillRatio = tests.length === 0 ? 0 : taken / tests.length;

  const renderHeader = () => (
    <View style={styles.heroBlock}>
      {/* Single-row header (so-rlz pattern): back chevron, title, progress ring
          on one line. Subtitle drops below to its own line. */}
      <View style={styles.heroTopRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backInline}
        >
          <Feather
            name="chevron-left"
            size={28}
            color={isDark ? '#FFFFFF' : '#3A0E66'}
          />
        </Pressable>
        <Text style={styles.heroTitle} numberOfLines={1}>
          Personality
        </Text>
        <View style={styles.ringWrap}>
          <Svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            // The native rotate prop on Svg's viewBox is awkward; rotating
            // via style on the wrapper View gives the same -90° start point.
            style={{ transform: [{ rotate: '-90deg' }] }}
          >
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(58,14,102,0.12)'}
              strokeWidth={3}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={TEAL}
              strokeWidth={3}
              fill="none"
              strokeDasharray={`${RING_C} ${RING_C}`}
              strokeDashoffset={RING_C * (1 - ringFillRatio)}
              strokeLinecap="round"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={styles.ringCount}>
              {taken}
              <Text style={styles.ringTotal}>/{tests.length}</Text>
            </Text>
            <Text style={styles.ringLabel}>Taken</Text>
          </View>
        </View>
      </View>
      <Text style={styles.heroSubtitle}>
        A window into how your mind moves and makes sense of the world.
      </Text>

      {/* Constellation hint row */}
      <View style={styles.constellationRow}>
        <View style={styles.constellationStack}>
          {[1, 5, 3, 4].map((v, i) => (
            <Image
              key={`${v}-${i}`}
              source={SOULPAL_SRC[v as SoulpalVariant]}
              style={[
                styles.constellationSoulpal,
                i === 0 ? null : { marginLeft: -10 },
              ]}
              resizeMode="contain"
            />
          ))}
        </View>
        <Text style={styles.constellationCopy}>
          Each test colors a different SoulPal in your constellation.
        </Text>
      </View>
    </View>
  );

  // ─── Test card ──────────────────────────────────────
  const renderTestCard = (t: TestType) => {
    const def = PERSONALITY_TESTS[t];
    const visuals = TEST_VISUALS[t];
    const status = statusFor(t);
    const latest = latestByType[t];
    const tone = visuals.tone;

    const badgeLabel =
      status === 'taken'
        ? 'Taken'
        : status === 'soon'
          ? '🔒 Coming soon'
          : 'Take it →';
    const badgeTone =
      status === 'taken' ? TEAL : status === 'soon' ? LILAC : PINK;

    const footerLeft =
      status === 'soon'
        ? 'Coming soon'
        : `${def.questions.length} questions · ~5 min`;

    return (
      <Pressable
        key={t}
        onPress={() => handleCardPress(t)}
        disabled={def.locked}
        style={[
          styles.testCard,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.04)'
              : 'rgba(255,255,255,0.95)',
            borderColor: isDark
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(58,14,102,0.06)',
            opacity: def.locked ? 0.78 : 1,
          },
        ]}
      >
        {/* Tone wash gradient at the surface */}
        <LinearGradient
          colors={[tone + '22', isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative soulpal tucked top-right */}
        <Image
          source={SOULPAL_SRC[visuals.soulpal]}
          style={[
            styles.testCardMascot,
            isDark
              ? {
                  shadowColor: tone,
                  shadowOpacity: 0.6,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 0 },
                }
              : null,
            def.locked ? { opacity: 0.35 } : null,
          ]}
          resizeMode="contain"
        />

        <View style={styles.testCardTopRow}>
          <TestGlyph label={visuals.glyph} tone={tone} />
          <View style={styles.testCardTextCol}>
            <Text style={styles.testCardTitle}>{def.title}</Text>
            <Text style={styles.testCardBlurb}>{def.tagline}</Text>
          </View>
        </View>

        {/* Result row when taken */}
        {status === 'taken' && latest?.dominant_type ? (
          <View
            style={[
              styles.resultRow,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FBF6FF',
                borderColor: isDark
                  ? 'rgba(255,255,255,0.10)'
                  : 'rgba(58,14,102,0.06)',
              },
            ]}
          >
            <View>
              <Text style={styles.resultLabel}>You are</Text>
              <Text style={styles.resultValue}>{latest.dominant_type}</Text>
            </View>
            <Text style={[styles.resultRetake, { color: tone }]}>
              Re-take →
            </Text>
          </View>
        ) : null}

        {/* Footer: question count + status badge */}
        <View style={styles.testCardFooter}>
          <Text style={styles.testCardFooterText}>{footerLeft}</Text>
          {status === 'available' ? (
            <LinearGradient
              colors={[PINK, PURPLE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badgePill}
            >
              <Text style={styles.badgePillTextWhite}>{badgeLabel}</Text>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor: status === 'soon'
                    ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(58,14,102,0.06)')
                    : badgeTone + '1F',
                  borderWidth: 1,
                  borderColor: status === 'soon'
                    ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(58,14,102,0.10)')
                    : badgeTone + '55',
                },
              ]}
            >
              <Text style={[styles.badgePillText, { color: badgeTone }]}>
                {badgeLabel}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <CosmicScreen tone="dusk">
      <View style={styles.content}>
        {isLoading && !hasLoadedOnce ? (
          <ActivityIndicator
            color={isDark ? '#FFFFFF' : '#FFFFFF'}
            size="large"
            style={{ flex: 1 }}
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 20 },
            ]}
          >
            {renderHeader()}
            <View style={styles.testList}>{tests.map(renderTestCard)}</View>
          </ScrollView>
        )}
      </View>
    </CosmicScreen>
  );
};

const buildStyles = (colors: ReturnType<typeof useThemeColors>, isDark: boolean) =>
  StyleSheet.create({
    root: { flex: 1 },
    content: { flex: 1 },
    backInline: {
      flexShrink: 0,
    },
    scrollContent: {
      paddingHorizontal: 20,
    },

    // Hero header — single-row [back, title, ring] (so-rlz pattern)
    heroBlock: { marginBottom: 12 },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    heroTitle: {
      flex: 1,
      minWidth: 0,
      fontFamily: fonts.edensor.regular,
      fontSize: 30,
      lineHeight: 32,
      letterSpacing: -0.4,
      color: isDark ? colors.white : colors.text.primary,
    },
    heroSubtitle: {
      marginTop: 8,
      fontFamily: fonts.edensor.italic,
      fontSize: 16,
      lineHeight: 16 * 1.45,
      letterSpacing: 0.2,
      color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(58,14,102,0.85)',
    },
    ringWrap: {
      width: 56,
      height: 56,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringCenter: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringCount: {
      fontFamily: fonts.edensor.regular,
      fontSize: 18,
      lineHeight: 18,
      color: isDark ? colors.white : colors.text.primary,
    },
    ringTotal: {
      fontSize: 11,
      color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(58,14,102,0.6)',
    },
    ringLabel: {
      fontFamily: fonts.outfit.semiBold,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(58,14,102,0.6)',
    },

    // Constellation hint row
    constellationRow: {
      marginTop: 14,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(58,14,102,0.06)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 18,
    },
    constellationStack: { flexDirection: 'row' },
    constellationSoulpal: { width: 28, height: 28 },
    constellationCopy: {
      flex: 1,
      fontFamily: fonts.edensor.italic,
      fontSize: 14,
      lineHeight: 14 * 1.35,
      letterSpacing: 0.2,
      color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(58,14,102,0.7)',
    },

    // Test list
    testList: { gap: 12 },
    testCard: {
      position: 'relative',
      paddingVertical: 18,
      paddingHorizontal: 18,
      borderRadius: 20,
      borderWidth: 1,
      overflow: 'hidden',
    },
    testCardMascot: {
      position: 'absolute',
      right: -10,
      top: -8,
      width: 70,
      height: 70,
      transform: [{ rotate: '8deg' }],
      opacity: 0.85,
    },
    testCardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    testCardTextCol: { flex: 1, minWidth: 0, paddingRight: 56 },
    testCardTitle: {
      fontFamily: fonts.edensor.regular,
      fontSize: 22,
      lineHeight: 22 * 1.1,
      letterSpacing: -0.3,
      color: isDark ? '#FFFFFF' : '#3A0E66',
      marginBottom: 4,
    },
    testCardBlurb: {
      fontFamily: fonts.edensor.italic,
      fontSize: 14,
      lineHeight: 14 * 1.4,
      letterSpacing: 0.2,
      color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(58,14,102,0.7)',
    },

    // Result row
    resultRow: {
      marginTop: 14,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    resultLabel: {
      fontFamily: fonts.outfit.medium,
      fontSize: 11,
      color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(58,14,102,0.55)',
    },
    resultValue: {
      marginTop: 1,
      fontFamily: fonts.edensor.regular,
      fontSize: 18,
      letterSpacing: -0.1,
      color: isDark ? '#FFFFFF' : '#3A0E66',
    },
    resultRetake: {
      fontFamily: fonts.outfit.semiBold,
      fontSize: 11,
      letterSpacing: 0.3,
    },

    // Footer
    testCardFooter: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    testCardFooterText: {
      fontFamily: fonts.outfit.medium,
      fontSize: 11,
      letterSpacing: 0.2,
      color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(58,14,102,0.55)',
    },
    badgePill: {
      paddingVertical: 4,
      paddingHorizontal: 11,
      borderRadius: 999,
    },
    badgePillText: {
      fontFamily: fonts.outfit.bold,
      fontSize: 10,
      letterSpacing: 0.4,
    },
    badgePillTextWhite: {
      fontFamily: fonts.outfit.bold,
      // 10pt → 11pt for badge legibility (audit floor; badge sits on
      // gradient pill so contrast is fine).
      fontSize: 11,
      letterSpacing: 0.4,
      color: colors.white,
    },
  });

export default PersonalityHubScreen;
