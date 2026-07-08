import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { CosmicScreen } from '../components/CosmicBackdrop';
import AuthService from '../services/AuthService';
import { privacyPolicy, termsOfService } from '../mocks/content';

// so-ei55: Post-signup consent wizard. Replaces onboarding slides 5/6/7
// (AI consent, note-from-AI, TOC) which are now shown after authentication
// so acceptance can be persisted to the backend immediately (compliance).
//
// Steps:
//   0 — AI consent ("A note on AI")
//   1 — Note from AI ("Not a substitute for care")
//   2 — Terms & Privacy (tabbed Privacy Policy / Terms of Service)
//
// On mount: getTermsStatus(). If !acceptance_required (existing accepted
// user who somehow landed here), skip straight to WelcomeSplash.
// On "I Accept" (step 2): acceptTerms(current_version, isoNow) persists
// to /auth/terms-accept, then AsyncStorage.setItem('@terms_accepted'),
// then navigate('WelcomeSplash').

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Copy from onboarding slides 5 & 6 (kept in sync with OnboardingScreen
// after so-ei55 removes those slides from the pre-auth flow).
const AI_CONSENT_PARAGRAPHS = [
  'SoulTalk is powered by AI. To create your reflections, the journal entries you write are sent to our AI partners, Anthropic and Voyage AI, who turn them into your insights, SoulSignals, and affirmations.',
  'They process your entries only to return your results. They never use them to train their models, and we never sell your data or use it for advertising.',
  'You can read the full details anytime in our Privacy Policy.',
];

const NOTE_FROM_AI_PARAGRAPHS = [
  'SoulTalk is a self-reflection tool. It is not therapy, medical advice, or a crisis service. If you are in crisis or considering harm to yourself or others, please contact your local emergency services or a crisis line right away.',
  'If you are working with a therapist or clinician, SoulTalk is designed to complement that work, not to replace it. Please share anything you learn here with them when it helps.',
];

interface Props {
  navigation: any;
}

const PostSignupConsentScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [activeLegalTab, setActiveLegalTab] = useState<'privacy' | 'terms'>('privacy');
  const legalScrollRef = useRef<ScrollView>(null);

  // Terms state for step 2
  const [termsVersion, setTermsVersion] = useState<number | null>(null);
  const [tocBusy, setTocBusy] = useState(false);
  const [tocError, setTocError] = useState<string | null>(null);

  // Mount: check if acceptance is still required. If the user already
  // accepted (e.g. social login on a device that completed onboarding),
  // skip the wizard entirely.
  useEffect(() => {
    let cancelled = false;
    AuthService.getTermsStatus()
      .then((status) => {
        if (cancelled) return;
        if (!status.acceptance_required) {
          // Already accepted — go straight to name screens.
          navigation.replace('WelcomeSplash');
        } else {
          setTermsVersion(status.current_version);
        }
      })
      .catch(() => {
        // Network error: let the user proceed; the TOC step will re-check.
      });
    return () => { cancelled = true; };
  }, []);

  const handleLegalTabSwitch = useCallback((tab: 'privacy' | 'terms') => {
    setActiveLegalTab(tab);
    legalScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const handleAiConsent = useCallback(async () => {
    try {
      await AsyncStorage.setItem('@ai_consent_granted', 'true');
    } catch {}
    setStep(1);
  }, []);

  const handleNoteAck = useCallback(() => {
    setStep(2);
  }, []);

  const handleAcceptTOC = useCallback(async () => {
    if (tocBusy) return;
    setTocBusy(true);
    setTocError(null);
    try {
      // If we didn't get the version yet (network error on mount), re-fetch.
      let version = termsVersion;
      if (version === null) {
        const status = await AuthService.getTermsStatus();
        version = status.current_version;
        setTermsVersion(version);
      }
      const now = new Date().toISOString();
      await AuthService.acceptTerms(version, now);
      await AsyncStorage.setItem('@terms_accepted', 'true');
      navigation.replace('WelcomeSplash');
    } catch (err: any) {
      setTocError('Could not record your acceptance. Please try again.');
    } finally {
      setTocBusy(false);
    }
  }, [tocBusy, termsVersion, navigation]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        content: {
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 16,
        },
        stepLabel: {
          fontFamily: fonts.outfit.medium,
          fontSize: 12,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(58,14,102,0.45)',
          marginBottom: 12,
          textAlign: 'center',
        },
        titleRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: 24,
        },
        titleStart: {
          fontFamily: fonts.edensor.medium,
          fontSize: 30,
          color: isDarkMode ? '#fff' : '#3A0E66',
          textAlign: 'center',
        },
        titleHighlight: {
          fontFamily: fonts.edensor.medium,
          fontSize: 30,
          color: '#C47ADB',
        },
        disclaimerCard: {
          flex: 1,
          backgroundColor: isDarkMode
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(255,255,255,0.70)',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: isDarkMode
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(58,14,102,0.10)',
          overflow: 'hidden',
          marginBottom: 24,
        },
        disclaimerBody: {
          padding: 20,
          paddingBottom: 32,
        },
        paragraph: {
          fontFamily: fonts.outfit.regular,
          fontSize: 15,
          lineHeight: 15 * 1.6,
          color: isDarkMode ? 'rgba(255,255,255,0.85)' : '#3A0E66',
        },
        // Terms slide
        termsTabRow: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 12,
        },
        termsTab: {
          flex: 1,
          paddingVertical: 10,
          borderRadius: 8,
          alignItems: 'center',
          backgroundColor: isDarkMode
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.7)',
          borderWidth: 1,
          borderColor: isDarkMode
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(58,14,102,0.10)',
        },
        termsTabActive: {
          backgroundColor: isDarkMode ? '#fff' : '#4F1786',
          borderColor: isDarkMode ? 'transparent' : '#4F1786',
        },
        termsTabText: {
          fontFamily: fonts.outfit.medium,
          fontSize: 13,
          color: isDarkMode ? 'rgba(255,255,255,0.78)' : '#3A0E66',
        },
        termsTabTextActive: {
          color: isDarkMode ? '#3A0E66' : '#fff',
          fontFamily: fonts.outfit.semiBold,
        },
        termsScrollFrame: {
          flex: 1,
          backgroundColor: isDarkMode
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(255,255,255,0.70)',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: isDarkMode
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(58,14,102,0.10)',
          overflow: 'hidden',
          marginBottom: 8,
        },
        termsScrollContent: {
          padding: 16,
          paddingBottom: 32,
        },
        termsEffective: {
          fontFamily: fonts.outfit.regular,
          fontSize: 12,
          color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(58,14,102,0.65)',
          marginBottom: 10,
        },
        termsBody: {
          fontFamily: fonts.outfit.regular,
          fontSize: 13,
          lineHeight: 13 * 1.55,
          color: isDarkMode ? 'rgba(255,255,255,0.85)' : '#3A0E66',
        },
        errorText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 13,
          color: '#E93478',
          textAlign: 'center',
          marginBottom: 12,
        },
        // Bottom bar
        bottomBar: {
          backgroundColor: isDarkMode ? 'rgba(15,8,32,0.88)' : '#4F1786',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingTop: 18,
          paddingHorizontal: 24,
          borderTopWidth: 1,
          borderTopColor: isDarkMode
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(255,255,255,0.15)',
        },
        ctaButton: {
          height: 50,
          borderRadius: 25,
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.20)',
          borderWidth: 1,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.20)' : 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        },
        ctaButtonPrimary: {
          backgroundColor: '#fff',
          borderColor: 'transparent',
        },
        ctaButtonDisabled: {
          opacity: 0.6,
        },
        ctaText: {
          fontFamily: fonts.outfit.bold,
          fontSize: 16,
          color: isDarkMode ? '#fff' : '#4F1786',
        },
        ctaTextPrimary: {
          color: '#4F1786',
        },
      }),
    [colors, isDarkMode],
  );

  const renderStep = () => {
    // ── Step 0: AI consent ──
    if (step === 0) {
      return (
        <>
          <Text style={styles.stepLabel}>Step 1 of 3</Text>
          <View style={styles.titleRow}>
            <Text style={styles.titleStart}>A note on </Text>
            <Text style={styles.titleHighlight}>AI</Text>
          </View>
          <View style={styles.disclaimerCard}>
            <ScrollView
              contentContainerStyle={styles.disclaimerBody}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {AI_CONSENT_PARAGRAPHS.map((p, i) => (
                <Text key={i} style={[styles.paragraph, i > 0 && { marginTop: 16 }]}>
                  {p}
                </Text>
              ))}
            </ScrollView>
          </View>
        </>
      );
    }

    // ── Step 1: Note from AI ──
    if (step === 1) {
      return (
        <>
          <Text style={styles.stepLabel}>Step 2 of 3</Text>
          <View style={styles.titleRow}>
            <Text style={styles.titleStart}>Not a substitute for </Text>
            <Text style={styles.titleHighlight}>care</Text>
          </View>
          <View style={styles.disclaimerCard}>
            <ScrollView
              contentContainerStyle={styles.disclaimerBody}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {NOTE_FROM_AI_PARAGRAPHS.map((p, i) => (
                <Text key={i} style={[styles.paragraph, i > 0 && { marginTop: 16 }]}>
                  {p}
                </Text>
              ))}
            </ScrollView>
          </View>
        </>
      );
    }

    // ── Step 2: Terms & Privacy ──
    const currentDoc = activeLegalTab === 'privacy' ? privacyPolicy : termsOfService;
    return (
      <>
        <Text style={styles.stepLabel}>Step 3 of 3</Text>
        <View style={styles.titleRow}>
          <Text style={styles.titleStart}>Terms & </Text>
          <Text style={styles.titleHighlight}>Privacy</Text>
        </View>
        <View style={styles.termsTabRow}>
          <Pressable
            style={[styles.termsTab, activeLegalTab === 'privacy' && styles.termsTabActive]}
            onPress={() => handleLegalTabSwitch('privacy')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeLegalTab === 'privacy' }}
          >
            <Text style={[styles.termsTabText, activeLegalTab === 'privacy' && styles.termsTabTextActive]}>
              Privacy Policy
            </Text>
          </Pressable>
          <Pressable
            style={[styles.termsTab, activeLegalTab === 'terms' && styles.termsTabActive]}
            onPress={() => handleLegalTabSwitch('terms')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeLegalTab === 'terms' }}
          >
            <Text style={[styles.termsTabText, activeLegalTab === 'terms' && styles.termsTabTextActive]}>
              Terms of Service
            </Text>
          </Pressable>
        </View>
        <View style={styles.termsScrollFrame}>
          <ScrollView
            ref={legalScrollRef}
            contentContainerStyle={styles.termsScrollContent}
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            <Text style={styles.termsEffective}>
              Effective: {currentDoc.effectiveDate}
            </Text>
            <Text style={styles.termsBody}>{currentDoc.content}</Text>
          </ScrollView>
        </View>
        {tocError ? <Text style={styles.errorText}>{tocError}</Text> : null}
      </>
    );
  };

  const renderCTA = () => {
    if (step === 0) {
      return (
        <Pressable
          style={[styles.ctaButton, styles.ctaButtonPrimary]}
          onPress={handleAiConsent}
          accessibilityRole="button"
          accessibilityLabel="I understand and agree to AI data processing"
        >
          <Text style={[styles.ctaText, styles.ctaTextPrimary]}>I understand and agree</Text>
        </Pressable>
      );
    }

    if (step === 1) {
      return (
        <Pressable
          style={[styles.ctaButton, styles.ctaButtonPrimary]}
          onPress={handleNoteAck}
          accessibilityRole="button"
          accessibilityLabel="Continue to Terms and Privacy"
        >
          <Text style={[styles.ctaText, styles.ctaTextPrimary]}>Continue</Text>
        </Pressable>
      );
    }

    // Step 2 — TOC acceptance
    return (
      <Pressable
        style={[styles.ctaButton, styles.ctaButtonPrimary, tocBusy && styles.ctaButtonDisabled]}
        onPress={handleAcceptTOC}
        disabled={tocBusy}
        accessibilityRole="button"
        accessibilityLabel="Accept Terms and Privacy Policy"
        accessibilityState={{ disabled: tocBusy, busy: tocBusy }}
      >
        {tocBusy ? (
          <ActivityIndicator size="small" color="#4F1786" />
        ) : (
          <Text style={[styles.ctaText, styles.ctaTextPrimary]}>I Accept</Text>
        )}
      </Pressable>
    );
  };

  return (
    <CosmicScreen tone="night">
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <View style={styles.content}>
          {renderStep()}
        </View>
      </View>
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {renderCTA()}
      </View>
    </CosmicScreen>
  );
};

export default PostSignupConsentScreen;
