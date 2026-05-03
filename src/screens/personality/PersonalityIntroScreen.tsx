import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { CosmicScreen } from '../../components/CosmicBackdrop';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../../components/GlassCard';
import AnimatedButton from '../../components/AnimatedButton';
import { getTest } from '../../data/personalityTests';
import { TestType } from '../../data/personalityTests/types';

const PersonalityIntroScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const testType: TestType = route.params?.testType;
  const def = getTest(testType);

  // ==============================
  // DARK MODE
  // ==============================
  if (isDarkMode) {
    return (
      <CosmicScreen tone="dusk">
        <View style={[dk.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={dk.backRow} onPress={() => navigation.goBack()} hitSlop={12}>
            <Feather name="chevron-left" size={28} color="#FFFFFF" />
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={dk.scrollContent}
          >
            <Text style={dk.titleText}>{def.title}</Text>
            <Text style={dk.taglineText}>{def.tagline}</Text>

            <GlassCard intensity="medium" style={dk.aboutCard}>
              <Text style={dk.aboutText}>{def.about}</Text>
            </GlassCard>

            <GlassCard intensity="light" style={dk.howItWorksCard}>
              <Text style={dk.sectionHeader}>How it works</Text>
              <View style={dk.bulletRow}>
                <View style={dk.bulletDot} />
                <Text style={dk.bulletText}>
                  {def.questions.length} short statements
                </Text>
              </View>
              <View style={dk.bulletRow}>
                <View style={dk.bulletDot} />
                <Text style={dk.bulletText}>
                  Rate each from Strongly Disagree to Strongly Agree
                </Text>
              </View>
              <View style={dk.bulletRow}>
                <View style={dk.bulletDot} />
                <Text style={dk.bulletText}>
                  Takes about 5 minutes {'\u2014'} answer honestly, not aspirationally
                </Text>
              </View>
              <View style={dk.bulletRow}>
                <View style={dk.bulletDot} />
                <Text style={dk.bulletText}>You can retake anytime</Text>
              </View>
            </GlassCard>

            <GlassCard intensity="light" style={dk.categoriesCard}>
              <Text style={dk.sectionHeader}>Archetypes you might uncover</Text>
              <View style={dk.categoryRow}>
                {def.categories.map((cat) => (
                  <View key={cat} style={dk.categoryPill}>
                    <Text style={dk.categoryPillText}>{cat}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </ScrollView>

          <View style={[dk.ctaRow, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
            <AnimatedButton
              title="Start"
              onPress={() => navigation.replace('PersonalityQuestion', { testType })}
              variant="secondary"
              style={dk.startButton}
            />
          </View>
        </View>
      </CosmicScreen>
    );
  }

  // ==============================
  // LIGHT MODE
  // ==============================
  return (
    <CosmicScreen tone="dusk">
      <View style={[lt.content, { paddingTop: insets.top + 16 }]}>
        <Pressable style={lt.backRow} onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="chevron-left" size={28} color="#3A0E66" />
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={lt.scrollContent}
        >
          <Text style={lt.titleText}>{def.title}</Text>
          <Text style={lt.taglineText}>{def.tagline}</Text>

          <View style={lt.aboutCard}>
            <Text style={lt.aboutText}>{def.about}</Text>
          </View>

          <View style={lt.sectionCard}>
            <View style={lt.sectionHeaderBand}>
              <Text style={lt.sectionHeader}>How it works</Text>
            </View>
            <View style={lt.sectionBody}>
              <View style={lt.bulletRow}>
                <View style={lt.bulletDot} />
                <Text style={lt.bulletText}>
                  {def.questions.length} short statements
                </Text>
              </View>
              <View style={lt.bulletRow}>
                <View style={lt.bulletDot} />
                <Text style={lt.bulletText}>
                  Rate each from Strongly Disagree to Strongly Agree
                </Text>
              </View>
              <View style={lt.bulletRow}>
                <View style={lt.bulletDot} />
                <Text style={lt.bulletText}>
                  Takes about 5 minutes {'\u2014'} answer honestly, not aspirationally
                </Text>
              </View>
              <View style={lt.bulletRow}>
                <View style={lt.bulletDot} />
                <Text style={lt.bulletText}>You can retake anytime</Text>
              </View>
            </View>
          </View>

          <View style={lt.sectionCard}>
            <View style={lt.sectionHeaderBand}>
              <Text style={lt.sectionHeader}>Archetypes you might uncover</Text>
            </View>
            <View style={lt.sectionBody}>
              <View style={lt.categoryRow}>
                {def.categories.map((cat) => (
                  <View key={cat} style={lt.categoryPill}>
                    <Text style={lt.categoryPillText}>{cat}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[lt.ctaRow, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
          <Pressable
            style={lt.startButton}
            onPress={() => navigation.replace('PersonalityQuestion', { testType })}
          >
            <Text style={lt.startButtonText}>Start</Text>
          </Pressable>
        </View>
      </View>
    </CosmicScreen>
  );
};

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
    marginBottom: 20,
  },
  scrollContent: { paddingBottom: 20 },

  titleText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 34,
    color: colors.white,
    marginBottom: 4,
  },
  taglineText: {
    // outfit.light at 15pt body — P1. Bumped to regular.
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 15 * 1.5,
    // 0.75 → text.secondary (dark = 0.7) — slight drop, tokenized
    color: colors.text.secondary,
    marginBottom: 20,
  },

  aboutCard: { padding: 20, marginBottom: 14 },
  aboutText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 15 * 1.6,
    // 0.9 → ink (#fff) — slight lift, tokenized
    color: colors.white,
  },

  howItWorksCard: { padding: 18, marginBottom: 14 },
  categoriesCard: { padding: 18 },
  sectionHeader: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: colors.white,
    marginBottom: 10,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(167, 139, 250, 0.9)',
    marginRight: 10,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    // outfit.light at 14pt body — P1. Bumped to regular.
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.5,
    color: 'rgba(255,255,255,0.85)',
  },

  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryPillText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors.white,
  },

  ctaRow: {
    alignItems: 'center',
    paddingTop: 12,
  },
  startButton: {
    width: '100%',
    height: 52,
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
    marginBottom: 20,
  },
  scrollContent: { paddingBottom: 20 },

  titleText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 32,
    color: colors.text.primary,
    marginBottom: 6,
  },
  taglineText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.5,
    color: 'rgba(58,14,102,0.85)',
    marginBottom: 20,
  },

  aboutCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 14,
  },
  aboutText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: colors.primary,
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

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#59168B',
    marginRight: 10,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: colors.primary,
  },

  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: 'rgba(89, 22, 139, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryPillText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: colors.primary,
  },

  ctaRow: {
    alignItems: 'center',
    paddingTop: 12,
  },
  startButton: {
    width: '100%',
    height: 52,
    backgroundColor: colors.white,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: colors.primary,
  },
});

export default PersonalityIntroScreen;
