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
import { SocialDobStep } from '../features/signup/SocialDobStep';
import { useAuth } from '../contexts/AuthContext';
import AuthService from '../services/AuthService';
import { privacyPolicy, termsOfService } from '../mocks/content';

// so-9o1o: Post-signup consent wizard (updated for three-rule compliance model).
//
// THREE RULES:
//   1. RegisterScreen keeps the Terms checkbox (unchecked, gates submit) and
//      writes @terms_accepted='true' to AsyncStorage on check.
//   2. THIS SCREEN is a universal post-auth gate (server-driven via
//      getTermsStatus). It also reads @terms_accepted to detect signup-path
//      users who already accepted.
//   3. LoginScreen has NO Terms checkbox — OAuth users signing in are caught
//      by this screen's universal gate.
//
// Steps (provider-aware):
//   Email / OAuth-via-signup (local @terms_accepted flag present):
//     → silently call acceptTerms() fire-and-forget, then 2 steps:
//     0 — AI consent ("A note on AI")
//     1 — Note from AI ("Not a substitute for care") → WelcomeSplash
//
//   OAuth-via-signin (no local flag, acceptance_required=true on server):
//     → 3 steps:
//     0 — AI consent
//     1 — Note from AI
//     2 — Terms & Privacy (tabbed; I Accept → acceptTerms() → WelcomeSplash)
//
//   Returning user (acceptance_required=false): skip entire wizard → WelcomeSplash.

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
  // so-qg4o M-1: read user.is_18_plus to decide if the age gate is needed,
  // and use confirmAge() to record the affirmation server-side.
  const { user, confirmAge } = useAuth();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [activeLegalTab, setActiveLegalTab] = useState<'privacy' | 'terms'>('privacy');
  const legalScrollRef = useRef<ScrollView>(null);

  // Terms state for step 2
  const [termsVersion, setTermsVersion] = useState<number | null>(null);
  const [tocBusy, setTocBusy] = useState(false);
  const [tocError, setTocError] = useState<string | null>(null);

  // null = still loading; false = signup path (2 steps, no TOC); true = signin OAuth (3 steps with TOC)
  const [showTOC, setShowTOC] = useState<boolean | null>(null);

  // so-qg4o M-1: age gate shown after all consent steps when user.is_18_plus
  // is null (Login-origin social new-user who never confirmed age).
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [ageGateBusy, setAgeGateBusy] = useState(false);

  // Mount: check server status + local pre-acceptance flag in parallel.
  //   - acceptance_required=false → already accepted, skip wizard.
  //   - acceptance_required=true + @terms_accepted flag → user checked the box
  //     on RegisterScreen (email or OAuth-signup); silently record acceptance
  //     and show 2-step wizard (AI consent + note only, no TOC re-prompt).
  //   - acceptance_required=true + no flag → OAuth-from-signin; show full 3-step
  //     wizard so they see and accept the Terms & Privacy.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      AuthService.getTermsStatus(),
      AsyncStorage.getItem('@terms_accepted'),
    ])
      .then(([status, localFlag]) => {
        if (cancelled) return;
        if (!status.acceptance_required) {
          // so-qg4o fix: gate on is_18_plus even here — an interrupted user
          // (Terms accepted, app killed before the age-gate step) leaves
          // is_18_plus=null; next cold start sees acceptance_required=false
          // and would skip the age gate entirely (Apple 5.1.1 bypass).
          if (user?.is_18_plus == null) {
            setShowAgeGate(true);
          } else {
            navigation.replace('WelcomeSplash');
          }
          return;
        }
        setTermsVersion(status.current_version);
        if (localFlag === 'true') {
          // so-r2ts: consume the flag immediately — a stale flag from an
          // abandoned RegisterScreen session must not let a later OAuth-signin
          // user on the same device bypass the TOC (cross-session bypass).
          AsyncStorage.removeItem('@terms_accepted').catch(() => {});
          // Silently record acceptance to the backend, then show 2-step wizard.
          AuthService.acceptTerms(status.current_version, new Date().toISOString()).catch(() => {});
          setShowTOC(false);
        } else {
          // OAuth-from-signin: must read and accept Terms in this wizard.
          setShowTOC(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Network error: fall through to full 3-step (conservative).
        setShowTOC(true);
      });
    return () => { cancelled = true; };
  }, []);

  const handleLegalTabSwitch = useCallback((tab: 'privacy' | 'terms') => {
    setActiveLegalTab(tab);
    legalScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  // so-qg4o M-1: final step before WelcomeSplash — gate on is_18_plus.
  // Called by both the 2-step path (handleNoteAck) and the 3-step path
  // (handleAcceptTOC) instead of navigating directly to WelcomeSplash.
  // Returning users (acceptance_required=false early exit) bypass this —
  // they already have is_18_plus set.
  const completeWizard = useCallback(() => {
    if (user?.is_18_plus == null) {
      // New OAuth user from Login screen — must confirm age before Home.
      setShowAgeGate(true);
    } else {
      navigation.replace('WelcomeSplash');
    }
  }, [user, navigation]);

  const handleAgeConfirm = useCallback(async () => {
    if (ageGateBusy) return;
    setAgeGateBusy(true);
    try {
      await confirmAge();
      navigation.replace('WelcomeSplash');
    } catch (_e) {
      // confirmAge failed — allow retry (busy resets, modal stays open).
      setAgeGateBusy(false);
    }
  }, [ageGateBusy, confirmAge, navigation]);

  const handleAgeDecline = useCallback(() => {
    // User declined 18+ affirmation — block with the neutral under-age screen.
    // UnderageBlockScreen pops back to Welcome so they can't re-enter the app.
    navigation.navigate('UnderageBlock');
  }, [navigation]);

  const handleAiConsent = useCallback(async () => {
    try {
      await AsyncStorage.setItem('@ai_consent_granted', 'true');
    } catch {}
    setStep(1);
  }, []);

  const handleNoteAck = useCallback(() => {
    if (showTOC) {
      setStep(2);
    } else {
      // so-qg4o M-1: gate through age affirmation before WelcomeSplash.
      completeWizard();
    }
  }, [showTOC, completeWizard]);

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
      // so-ap3b M-2: removed @terms_accepted re-write here — server is
      // authoritative after this call; the flag has no remaining purpose and
      // re-writing it creates a cross-user silent-accept gap.
      // so-qg4o M-1: gate through age affirmation before WelcomeSplash.
      completeWizard();
    } catch (err: any) {
      setTocError('Could not record your acceptance. Please try again.');
    } finally {
      setTocBusy(false);
    }
  }, [tocBusy, termsVersion, completeWizard]);

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
    // Loading: waiting for getTermsStatus() + AsyncStorage to resolve.
    if (showTOC === null) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#C47ADB" />
        </View>
      );
    }

    const totalSteps = showTOC ? 3 : 2;

    // ── Step 0: AI consent ──
    if (step === 0) {
      return (
        <>
          <Text style={styles.stepLabel}>Step 1 of {totalSteps}</Text>
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
          <Text style={styles.stepLabel}>Step 2 of {totalSteps}</Text>
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
    // No CTA while loading (spinner fills the content area).
    if (showTOC === null) return null;

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
          accessibilityLabel={showTOC ? 'Continue to Terms and Privacy' : 'Get started'}
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

      {/* so-qg4o M-1: blocking 18+ affirmation overlay. Shown after all
          consent steps complete for users whose is_18_plus is null (Login-
          origin social new-users). Reuses the existing SocialDobStep sheet. */}
      <SocialDobStep
        visible={showAgeGate}
        submitting={ageGateBusy}
        onContinue={handleAgeConfirm}
        onCancel={handleAgeDecline}
      />
    </CosmicScreen>
  );
};

export default PostSignupConsentScreen;
