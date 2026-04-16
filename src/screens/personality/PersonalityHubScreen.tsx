import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fonts, surfaces } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../../components/GlassCard';
import { usePersonality } from '../../contexts/PersonalityContext';
import {
  PERSONALITY_TESTS,
  PERSONALITY_TEST_ORDER,
} from '../../data/personalityTests';
import { TestType } from '../../data/personalityTests/types';

const BackIcon = require('../../../assets/images/settings/BackButtonIcon.png');
const ProfileBackIcon = require('../../../assets/images/profile/ProfileBackIcon.png');
const LockIconDark = require('../../../assets/images/home/dark/LockIcon.png');
const LockIcon = require('../../../assets/images/home/LockIcon.png');

const PersonalityHubScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { latestByType, isLoading, hasLoadedOnce, refresh } = usePersonality();

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleTestPress = (testType: TestType, locked: boolean) => {
    if (locked) return;
    const latest = latestByType[testType];
    if (latest) {
      navigation.navigate('PersonalityResult', { resultId: latest.id });
    } else {
      navigation.navigate('PersonalityIntro', { testType });
    }
  };

  // ==============================
  // DARK MODE
  // ==============================
  if (isDarkMode) {
    return (
      <LinearGradient
        colors={[...surfaces.personalityGradient]}
        locations={[0, 0.3, 0.65, 1]}
        style={dk.container}
      >
        <View style={[dk.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={dk.backRow} onPress={() => navigation.goBack()}>
            <Image source={BackIcon} style={dk.backIcon} resizeMode="contain" />
            <Text style={dk.backText}>Back</Text>
          </Pressable>

          <Text style={dk.titleText}>Personality</Text>
          <Text style={dk.subtitleText}>
            A window into how your mind moves and makes sense of the world.
          </Text>

          {isLoading && !hasLoadedOnce ? (
            <ActivityIndicator color="#FFFFFF" size="large" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={dk.listContent}
            >
              {PERSONALITY_TEST_ORDER.map((testType) => {
                const def = PERSONALITY_TESTS[testType];
                const latest = latestByType[testType];
                const dominant = latest?.dominant_type;

                return (
                  <GlassCard
                    key={testType}
                    intensity="medium"
                    style={dk.testCard}
                    onPress={() => handleTestPress(testType, def.locked)}
                    disabled={def.locked}
                  >
                    <View style={dk.cardHeader}>
                      <Text style={dk.testTitle}>{def.title}</Text>
                      {def.locked ? (
                        <View style={dk.lockedChip}>
                          <Image
                            source={LockIconDark}
                            style={dk.lockIcon}
                            resizeMode="contain"
                          />
                          <Text style={dk.lockedChipText}>Coming soon</Text>
                        </View>
                      ) : dominant ? (
                        <View style={dk.completedChip}>
                          <Text style={dk.completedChipText}>Taken</Text>
                        </View>
                      ) : (
                        <View style={dk.newChip}>
                          <Text style={dk.newChipText}>Take test</Text>
                        </View>
                      )}
                    </View>

                    <Text style={dk.testTagline}>{def.tagline}</Text>

                    {!def.locked && dominant && (
                      <View style={dk.resultRow}>
                        <Text style={dk.resultLabel}>You are </Text>
                        <Text style={dk.resultValue}>{dominant}</Text>
                      </View>
                    )}

                    <Text style={dk.questionCountText}>
                      {def.questions.length} questions {'\u00B7'} ~5 min
                    </Text>
                  </GlassCard>
                );
              })}
            </ScrollView>
          )}

          <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }} />
        </View>
      </LinearGradient>
    );
  }

  // ==============================
  // LIGHT MODE
  // ==============================
  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#F5F2F9']}
      locations={[0.1, 0.6, 1]}
      style={lt.container}
    >
      <View style={[lt.content, { paddingTop: insets.top + 16 }]}>
        <Pressable style={lt.backRow} onPress={() => navigation.goBack()}>
          <Image source={ProfileBackIcon} style={lt.backIcon} resizeMode="contain" />
          <Text style={lt.backText}>Back</Text>
        </Pressable>

        <Text style={lt.titleText}>Personality</Text>
        <Text style={lt.subtitleText}>
          A window into how your mind moves and makes sense of the world.
        </Text>

        {isLoading && !hasLoadedOnce ? (
          <ActivityIndicator color={colors.white} size="large" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={lt.listContent}
          >
            {PERSONALITY_TEST_ORDER.map((testType) => {
              const def = PERSONALITY_TESTS[testType];
              const latest = latestByType[testType];
              const dominant = latest?.dominant_type;

              return (
                <Pressable
                  key={testType}
                  style={lt.testCard}
                  onPress={() => handleTestPress(testType, def.locked)}
                  disabled={def.locked}
                >
                  <View style={lt.testCardHeaderBand}>
                    <Text style={lt.testTitle}>{def.title}</Text>
                    {def.locked ? (
                      <View style={lt.lockedChip}>
                        <Image
                          source={LockIcon}
                          style={lt.lockIcon}
                          resizeMode="contain"
                        />
                        <Text style={lt.lockedChipText}>Coming soon</Text>
                      </View>
                    ) : dominant ? (
                      <View style={lt.completedChip}>
                        <Text style={lt.completedChipText}>Taken</Text>
                      </View>
                    ) : (
                      <View style={lt.newChip}>
                        <Text style={lt.newChipText}>Take test</Text>
                      </View>
                    )}
                  </View>

                  <View style={lt.testCardBody}>
                    <Text style={lt.testTagline}>{def.tagline}</Text>
                    {!def.locked && dominant && (
                      <View style={lt.resultRow}>
                        <Text style={lt.resultLabel}>You are </Text>
                        <Text style={lt.resultValue}>{dominant}</Text>
                      </View>
                    )}
                    <Text style={lt.questionCountText}>
                      {def.questions.length} questions {'\u00B7'} ~5 min
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }} />
      </View>
    </LinearGradient>
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
  backIcon: { width: 36, height: 36 },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: colors.white,
  },

  titleText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 32,
    color: colors.white,
    marginBottom: 8,
  },
  subtitleText: {
    fontFamily: fonts.outfit.light,
    fontSize: 14,
    lineHeight: 14 * 1.5,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 24,
  },

  listContent: {
    gap: 14,
    paddingBottom: 20,
  },
  testCard: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  testTitle: {
    fontFamily: fonts.edensor.medium,
    fontSize: 22,
    color: '#FFFFFF',
    flex: 1,
  },
  testTagline: {
    fontFamily: fonts.outfit.light,
    fontSize: 14,
    lineHeight: 14 * 1.5,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 12,
  },

  newChip: {
    backgroundColor: 'rgba(167, 139, 250, 0.25)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newChipText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: '#FFFFFF',
  },
  completedChip: {
    backgroundColor: 'rgba(112, 202, 207, 0.25)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(112, 202, 207, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedChipText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: '#FFFFFF',
  },
  lockedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lockedChipText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  lockIcon: {
    width: 10,
    height: 12,
    tintColor: 'rgba(255,255,255,0.7)',
  },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultLabel: {
    fontFamily: fonts.outfit.light,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  resultValue: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  questionCountText: {
    fontFamily: fonts.outfit.light,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
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
  backIcon: { width: 36, height: 36 },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: colors.white,
  },

  titleText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 32,
    color: colors.white,
    marginBottom: 8,
  },
  subtitleText: {
    fontFamily: fonts.outfit.light,
    fontSize: 14,
    lineHeight: 14 * 1.5,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 24,
  },

  listContent: {
    gap: 14,
    paddingBottom: 20,
  },
  testCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    overflow: 'hidden',
  },
  testCardHeaderBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(89, 22, 139, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  testCardBody: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  testTitle: {
    fontFamily: fonts.edensor.bold,
    fontSize: 18,
    color: '#59168B',
    flex: 1,
  },
  testTagline: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: '#59168B',
    marginBottom: 10,
  },

  newChip: {
    backgroundColor: '#59168B',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newChipText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  completedChip: {
    backgroundColor: 'rgba(89, 22, 139, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedChipText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    color: '#59168B',
  },
  lockedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(89, 22, 139, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lockedChipText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
    color: '#59168B',
  },
  lockIcon: {
    width: 10,
    height: 12,
    tintColor: '#59168B',
  },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: 'rgba(89, 22, 139, 0.7)',
  },
  resultValue: {
    fontFamily: fonts.outfit.bold,
    fontSize: 13,
    color: '#59168B',
  },

  questionCountText: {
    fontFamily: fonts.outfit.light,
    fontSize: 11,
    color: 'rgba(89, 22, 139, 0.6)',
  },
});

export default PersonalityHubScreen;
