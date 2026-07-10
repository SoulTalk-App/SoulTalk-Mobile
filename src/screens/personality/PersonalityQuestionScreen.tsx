import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors, fonts } from '../../theme';
import { CosmicScreen } from '../../components/CosmicBackdrop';
import { TOUCH_HITSLOP_TIGHT } from '../../components/touchPrimitives';
import { useTheme } from '../../contexts/ThemeContext';
import { getTest } from '../../data/personalityTests';
import {
  LIKERT_LABELS,
  LikertValue,
  TestType,
} from '../../data/personalityTests/types';
import PersonalityService from '../../services/PersonalityService';
import { usePersonality } from '../../contexts/PersonalityContext';
import { useAppAlert } from '../../components/AppAlertProvider';
import { normalizeError } from '../../utils/normalizeError';

const LIKERT_ORDER: LikertValue[] = [1, 2, 3, 4, 5];

const PersonalityQuestionScreen = ({ navigation, route }: any) => {
  const colors = useThemeColors();
  const dk = useMemo(() => buildDkStyles(colors), [colors]);
  const lt = useMemo(() => buildLtStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const testType: TestType = route.params?.testType;
  const def = getTest(testType);
  const { setResult } = usePersonality();
  // so-1zn0: themed alert replaces native Alert.
  const { showAlert } = useAppAlert();

  // so-8hun M-1: gate used by the beforeRemove interceptor so the Exit
  // button's own confirm dialog doesn't trigger a second dialog when the
  // user confirms "Leave" (canLeaveRef → true → beforeRemove skips).
  const canLeaveRef = useRef(false);

  // so-ckkw: remote question-map from BE SSOT (so-rpof). On fetch success,
  // `remoteCategoryMap` overlays local categories and `remoteVersion` drives
  // the submission payload so the client is always in sync with the BE scorer.
  // Both fall back to local hard-coded values if the fetch fails or is still
  // in flight at submit time (v1 matches on both sides; graceful degradation).
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [remoteCategoryMap, setRemoteCategoryMap] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    // so-8hun MI-2: def may be null when testType is unknown; skip fetch.
    if (!def) return;
    let active = true;
    PersonalityService.getQuestionMap(testType)
      .then((data) => {
        if (!active) return;
        setRemoteVersion(data.current_version);
        setRemoteCategoryMap(data.question_map);
      })
      .catch(() => {
        // so-8hun MI-5: promote out of __DEV__-only so SSOT drift is
        // diagnosable in production crash reports / logging.
        console.warn('[PersonalityQuestionScreen] question-map fetch failed; using local data');
      });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testType]);

  // Merge remote categories (SSOT) into local question texts. Questions are
  // ordered by local def; remote map overlays the category for each qid.
  // so-8hun MI-2: guard def; return empty array when testType is unknown so
  // the early return below can handle the error shell safely.
  const questions = useMemo(() => {
    if (!def) return [];
    if (!remoteCategoryMap) return def.questions;
    return def.questions.map((q) => ({
      ...q,
      category: remoteCategoryMap[q.id] ?? q.category,
    }));
  }, [def, remoteCategoryMap]);

  // Version for submission: prefer remote SSOT, fall back to local.
  const localVersion = def?.version ?? '';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LikertValue>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = questions[currentIndex] ?? null;
  const selectedValue = question ? answers[question.id] : undefined;
  const isLastQuestion = questions.length > 0 && currentIndex === questions.length - 1;
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;

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

  // so-8hun MI-5: announce question transitions so screen readers don't
  // stay on the previous question's text while the new card slides in.
  useEffect(() => {
    if (!question?.text) return;
    AccessibilityInfo.announceForAccessibility(
      `Question ${currentIndex + 1} of ${questions.length}: ${question.text}`,
    );
  // Intentionally only track currentIndex — question.text is derived from it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // so-8hun M-1: intercept ALL navigation-away events (Android hardware back,
  // gesture swipe, programmatic goBack) and route them through the "Leave
  // test?" confirm dialog. iOS gesture-back is already disabled via
  // gestureEnabled:false on the route; this covers Android hardware back.
  // Without this listener, the user can discard up to 25 answers with no
  // warning by pressing the hardware back button.
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e: any) => {
      if (canLeaveRef.current) return; // already confirmed via Exit button
      e.preventDefault();
      showAlert({
        title: 'Leave test?',
        message: 'Your progress will be lost.',
        buttons: [
          { text: 'Keep going', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => {
              canLeaveRef.current = true;
              navigation.dispatch(e.data.action);
            },
          },
        ],
      });
    });
    return sub;
  }, [navigation, showAlert]);

  const submit = useCallback(
    async (finalAnswers: Record<string, LikertValue>) => {
      setIsSubmitting(true);
      try {
        // so-ckkw: use remote version if the question-map fetch already
        // settled, otherwise fall back to the local hard-coded version.
        const version = remoteVersion ?? localVersion;
        const result = await PersonalityService.submit({
          test_type: testType,
          version,
          answers: finalAnswers,
        });
        // Allow navigation.replace to proceed without the beforeRemove guard.
        canLeaveRef.current = true;
        setResult(result);
        navigation.replace('PersonalityResult', { resultId: result.id });
      } catch (err: any) {
        setIsSubmitting(false);
        // so-iiw8: drop raw err.message; normalizeError handles BE
        // detail/Pydantic/network so the message stays user-grade.
        showAlert({
          title: 'Submission failed',
          message: normalizeError(err),
        });
      }
    },
    [testType, localVersion, remoteVersion, navigation, setResult],
  );

  const handleSelect = (value: LikertValue) => {
    if (!question || isSubmitting) return;
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
      // Let navigation.goBack() trigger the beforeRemove guard above.
      navigation.goBack();
      return;
    }
    goToIndex(currentIndex - 1, 'backward');
  };

  const handleSubmit = () => {
    if (!selectedValue) return;
    submit(answers);
  };

  // so-8hun M-1: Exit button sets canLeaveRef before calling goBack so the
  // beforeRemove listener sees the confirmation has already happened and
  // doesn't show a second dialog.
  const handleExit = () => {
    showAlert({
      title: 'Leave test?',
      message: 'Your progress will be lost.',
      buttons: [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            canLeaveRef.current = true;
            navigation.goBack();
          },
        },
      ],
    });
  };

  // so-8hun MI-2: guard for unknown/stale testType (deep link, state
  // restoration, future test type shipped by BE before FE) — crash guard so
  // the screen shows an error shell instead of crashing on def.questions.
  // ALL hooks are declared above; the early return is safe here.
  if (!def || !question) {
    return (
      <CosmicScreen tone="dusk">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Pressable
            onPress={() => { canLeaveRef.current = true; navigation.goBack(); }}
            hitSlop={12}
            style={{ position: 'absolute', top: insets.top + 8, left: 16 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Feather name="chevron-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={{ color: '#FFFFFF', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
            This test isn't available yet.{'\n'}Please go back and try again.
          </Text>
        </View>
      </CosmicScreen>
    );
  }

  // ==============================
  // DARK MODE
  // ==============================
  if (isDarkMode) {
    return (
      <CosmicScreen tone="dusk">
        <View style={[dk.content, { paddingTop: insets.top + 16 }]}>
          {/* Header: back + progress + exit */}
          <View style={dk.headerRow}>
            <Pressable style={dk.backRow} onPress={handleBack} hitSlop={12}>
              <Feather name="chevron-left" size={28} color="#FFFFFF" />
            </Pressable>
            <Text style={dk.progressText}>
              {currentIndex + 1} of {questions.length}
            </Text>
            <Pressable onPress={handleExit} hitSlop={12}>
              <Text style={dk.exitText}>Exit</Text>
            </Pressable>
          </View>

          {/* so-8hun MI-5: progress bar with accessibilityRole + value */}
          <View
            style={dk.progressTrack}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: questions.length, now: currentIndex + 1 }}
            accessibilityLabel={`Question ${currentIndex + 1} of ${questions.length}`}
          >
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
                      hitSlop={TOUCH_HITSLOP_TIGHT}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected, disabled: isSubmitting }}
                      accessibilityLabel={LIKERT_LABELS[value]}
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
          <Pressable style={lt.backRow} onPress={handleBack} hitSlop={12}>
            <Feather name="chevron-left" size={28} color="#3A0E66" />
          </Pressable>
          <Text style={lt.progressText}>
            {currentIndex + 1} of {questions.length}
          </Text>
          <Pressable onPress={handleExit} hitSlop={12}>
            <Text style={lt.exitText}>Exit</Text>
          </Pressable>
        </View>

        {/* so-8hun MI-5: progress bar with accessibilityRole + value */}
        <View
          style={lt.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: questions.length, now: currentIndex + 1 }}
          accessibilityLabel={`Question ${currentIndex + 1} of ${questions.length}`}
        >
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
                    hitSlop={TOUCH_HITSLOP_TIGHT}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected, disabled: isSubmitting }}
                    accessibilityLabel={LIKERT_LABELS[value]}
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
const buildDkStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 22 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backRow: { padding: 4 },
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
const buildLtStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 22 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backRow: { padding: 4 },
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
