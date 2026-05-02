import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { colors, fonts } from '../../theme';
import { CosmicScreen } from '../../components/CosmicBackdrop';
import { useTheme } from '../../contexts/ThemeContext';
import { getTest } from '../../data/personalityTests';
import {
  LIKERT_LABELS,
  LikertValue,
  TestType,
} from '../../data/personalityTests/types';
import PersonalityService from '../../services/PersonalityService';
import { usePersonality } from '../../contexts/PersonalityContext';

const BackIcon = require('../../../assets/images/settings/BackButtonIcon.png');
const ProfileBackIcon = require('../../../assets/images/profile/ProfileBackIcon.png');

const LIKERT_ORDER: LikertValue[] = [1, 2, 3, 4, 5];

const PersonalityQuestionScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const testType: TestType = route.params?.testType;
  const def = getTest(testType);
  const { setResult } = usePersonality();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LikertValue>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = def.questions[currentIndex];
  const selectedValue = answers[question.id];
  const isLastQuestion = currentIndex === def.questions.length - 1;
  const progress = (currentIndex + 1) / def.questions.length;

  // Fade/slide animation when transitioning between questions
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const goToIndex = useCallback((nextIndex: number, direction: 'forward' | 'backward') => {
    const slideOut = direction === 'forward' ? -40 : 40;
    const slideIn = direction === 'forward' ? 40 : -40;

    opacity.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.ease) });
    translateX.value = withTiming(
      slideOut,
      { duration: 150, easing: Easing.out(Easing.ease) },
      (finished) => {
        if (finished) {
          runOnJS(setCurrentIndex)(nextIndex);
          translateX.value = slideIn;
          opacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.ease) });
          translateX.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.ease) });
        }
      },
    );
  }, [opacity, translateX]);

  const submit = useCallback(
    async (finalAnswers: Record<string, LikertValue>) => {
      setIsSubmitting(true);
      try {
        const result = await PersonalityService.submit({
          test_type: testType,
          version: def.version,
          answers: finalAnswers,
        });
        setResult(result);
        navigation.replace('PersonalityResult', { resultId: result.id });
      } catch (err: any) {
        setIsSubmitting(false);
        const detail = err?.response?.data?.detail;
        Alert.alert(
          'Submission failed',
          detail || err?.message || 'Could not save your test. Please try again.',
        );
      }
    },
    [testType, def.version, navigation, setResult],
  );

  const handleSelect = (value: LikertValue) => {
    if (isSubmitting) return;
    const nextAnswers = { ...answers, [question.id]: value };
    setAnswers(nextAnswers);

    if (isLastQuestion) {
      // Don't auto-submit — wait for explicit Submit press on last question
      return;
    }

    // Auto-advance after short delay
    setTimeout(() => {
      goToIndex(currentIndex + 1, 'forward');
    }, 280);
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      navigation.goBack();
      return;
    }
    goToIndex(currentIndex - 1, 'backward');
  };

  const handleSubmit = () => {
    if (!selectedValue) return;
    submit(answers);
  };

  const handleExit = () => {
    Alert.alert(
      'Leave test?',
      'Your progress will be lost.',
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
      ],
    );
  };

  // ==============================
  // DARK MODE
  // ==============================
  if (isDarkMode) {
    return (
      <CosmicScreen tone="dusk">
        <View style={[dk.content, { paddingTop: insets.top + 16 }]}>
          {/* Header: back + progress + exit */}
          <View style={dk.headerRow}>
            <Pressable style={dk.backRow} onPress={handleBack}>
              <Image source={BackIcon} style={dk.backIcon} resizeMode="contain" />
            </Pressable>
            <Text style={dk.progressText}>
              {currentIndex + 1} of {def.questions.length}
            </Text>
            <Pressable onPress={handleExit} hitSlop={12}>
              <Text style={dk.exitText}>Exit</Text>
            </Pressable>
          </View>

          {/* Progress bar */}
          <View style={dk.progressTrack}>
            <View style={[dk.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={dk.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={animatedCardStyle}>
              {/* Question card — plain View styled like glass, no BlurView */}
              <View style={dk.questionCard}>
                <Text style={dk.questionNumber}>Question {currentIndex + 1}</Text>
                <Text style={dk.questionText}>{question.text}</Text>
              </View>

              {/* Likert buttons */}
              <View style={dk.likertStack}>
                {LIKERT_ORDER.map((value) => {
                  const isSelected = selectedValue === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => handleSelect(value)}
                      disabled={isSubmitting}
                      style={[
                        dk.likertButton,
                        isSelected && dk.likertButtonSelected,
                      ]}
                    >
                      <View
                        style={[
                          dk.likertRadio,
                          isSelected && dk.likertRadioSelected,
                        ]}
                      >
                        {isSelected && <View style={dk.likertRadioDot} />}
                      </View>
                      <Text
                        style={[
                          dk.likertLabel,
                          isSelected && dk.likertLabelSelected,
                        ]}
                      >
                        {LIKERT_LABELS[value]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          </ScrollView>

          {/* Submit button on last question */}
          <View style={[dk.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
            {isLastQuestion && (
              <Pressable
                onPress={handleSubmit}
                disabled={!selectedValue || isSubmitting}
                style={[
                  dk.submitButton,
                  (!selectedValue || isSubmitting) && dk.submitButtonDisabled,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={dk.submitButtonText}>See your results</Text>
                )}
              </Pressable>
            )}
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
        {/* Header: back + progress + exit */}
        <View style={lt.headerRow}>
          <Pressable style={lt.backRow} onPress={handleBack}>
            <Image source={ProfileBackIcon} style={lt.backIcon} resizeMode="contain" />
          </Pressable>
          <Text style={lt.progressText}>
            {currentIndex + 1} of {def.questions.length}
          </Text>
          <Pressable onPress={handleExit} hitSlop={12}>
            <Text style={lt.exitText}>Exit</Text>
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={lt.progressTrack}>
          <View style={[lt.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={lt.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={animatedCardStyle}>
            <View style={lt.questionCard}>
              <View style={lt.questionNumberBand}>
                <Text style={lt.questionNumber}>Question {currentIndex + 1}</Text>
              </View>
              <Text style={lt.questionText}>{question.text}</Text>
            </View>

            <View style={lt.likertStack}>
              {LIKERT_ORDER.map((value) => {
                const isSelected = selectedValue === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => handleSelect(value)}
                    disabled={isSubmitting}
                    style={[
                      lt.likertButton,
                      isSelected && lt.likertButtonSelected,
                    ]}
                  >
                    <View
                      style={[
                        lt.likertRadio,
                        isSelected && lt.likertRadioSelected,
                      ]}
                    >
                      {isSelected && <View style={lt.likertRadioDot} />}
                    </View>
                    <Text
                      style={[
                        lt.likertLabel,
                        isSelected && lt.likertLabelSelected,
                      ]}
                    >
                      {LIKERT_LABELS[value]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>

        <View style={[lt.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
          {isLastQuestion && (
            <Pressable
              onPress={handleSubmit}
              disabled={!selectedValue || isSubmitting}
              style={[
                lt.submitButton,
                (!selectedValue || isSubmitting) && lt.submitButtonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={lt.submitButtonText}>See your results</Text>
              )}
            </Pressable>
          )}
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

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backRow: { padding: 4 },
  backIcon: { width: 36, height: 36 },
  progressText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    // matches dark text.secondary exactly
    color: colors.text.secondary,
  },
  exitText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors.text.secondary,
  },

  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(167, 139, 250, 0.9)',
    borderRadius: 2,
  },

  scrollContent: { paddingBottom: 20 },

  questionCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  questionNumber: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    // lavender accent (so-9tg)
    color: colors.accent.lavenderSoft,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  questionText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 20,
    lineHeight: 20 * 1.4,
    color: colors.white,
  },

  likertStack: { gap: 10 },
  likertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  likertButtonSelected: {
    backgroundColor: 'rgba(167, 139, 250, 0.25)',
    borderColor: 'rgba(167, 139, 250, 0.7)',
  },
  likertRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likertRadioSelected: {
    borderColor: '#FFFFFF',
  },
  likertRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  likertLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
  },
  likertLabelSelected: {
    fontFamily: fonts.outfit.semiBold,
    color: colors.white,
  },

  footer: { paddingTop: 16 },
  submitButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(167, 139, 250, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(167, 139, 250, 0.35)',
  },
  submitButtonText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.white,
  },
});

// ==============================
// LIGHT MODE STYLES
// ==============================
const lt = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 22 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backRow: { padding: 4 },
  backIcon: { width: 36, height: 36 },
  // Light path: page-bg ink for AA on the so-u1k lavender wash.
  progressText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: 'rgba(58,14,102,0.85)',
  },
  exitText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    // #3A0E66 → colors.text.primary (#4F1786, brand canonical)
    color: colors.text.primary,
  },

  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(89,22,139,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#59168B',
    borderRadius: 2,
  },

  scrollContent: { paddingBottom: 20 },

  questionCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  questionNumberBand: {
    backgroundColor: 'rgba(89, 22, 139, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  questionNumber: {
    fontFamily: fonts.edensor.bold,
    fontSize: 13,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  questionText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 18,
    lineHeight: 18 * 1.45,
    color: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  likertStack: { gap: 10 },
  likertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  likertButtonSelected: {
    backgroundColor: '#59168B',
  },
  likertRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(89, 22, 139, 0.45)',
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likertRadioSelected: {
    borderColor: '#FFFFFF',
  },
  likertRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  likertLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: colors.primary,
  },
  likertLabelSelected: {
    fontFamily: fonts.outfit.semiBold,
    // White text on the selected purple pill — brand-canonical, opaque bg
    color: colors.white,
  },

  footer: { paddingTop: 16 },
  submitButton: {
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  submitButtonText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: colors.primary,
  },
});

export default PersonalityQuestionScreen;
