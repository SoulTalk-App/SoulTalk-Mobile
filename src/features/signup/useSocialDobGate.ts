// so-piu2: shared social-signup age-gate. Social sign-in is unified (a NEW
// user tapping "Sign in with Google/Apple/FB" creates an account), so the BE's
// dob_required → DOB step → same-token resubmit-with-date_of_birth → 18+ reject
// flow must live on BOTH RegisterScreen and LoginScreen. This hook owns that
// logic once; screens render the DOB step via <SocialDobStep {...dobStep} />.
//
// Existing users never see the step (they get an AuthResponse, no
// DobRequiredError). The 402/paywall path is unaffected.
import { useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { useAppAlert } from '../../components/AppAlertProvider';
import { DobRequiredError } from '../../services/AuthService';
import {
  dobPartsFromDate,
  isValidDob,
  isAtLeast18,
  toIsoDate,
  isUnder18Error,
} from '../../utils/ageGate';

export type SocialProvider = 'Google' | 'Facebook' | 'Apple';

interface SocialCreds {
  provider: SocialProvider;
  idToken?: string;
  accessToken?: string;
  identityToken?: string;
  fullName?: string | null;
}

/** Props bundle for the shared <SocialDobStep> presentational component. */
export interface SocialDobStepProps {
  visible: boolean;
  value: Date | null;
  error: string | null;
  submitting: boolean;
  onChange: (d: Date) => void;
  onContinue: () => void;
  onCancel: () => void;
}

export interface SocialDobGate {
  handleGoogleSignUp: (idToken: string) => void;
  handleFacebookSignUp: (accessToken: string) => void;
  handleAppleSignUp: (identityToken: string, fullName: string | null) => void;
  /** True while a social login round-trip is in flight. */
  socialBusy: boolean;
  dobStep: SocialDobStepProps;
}

export function useSocialDobGate(
  navigation: any,
  opts?: { clearSetupOnFirstAttempt?: boolean },
): SocialDobGate {
  // so-piu2: Register treats every social tap as a signup, so it clears the
  // device-global setup flag on the first attempt (so-4maw). Login passes
  // false so an EXISTING returning user isn't re-routed through onboarding; the
  // DOB resubmit (a confirmed-new user) always clears it regardless.
  const clearSetupOnFirstAttempt = opts?.clearSetupOnFirstAttempt ?? false;
  const { loginWithGoogle, loginWithFacebook, loginWithApple } = useAuth();
  const { showError } = useAppAlert();

  const [socialBusy, setSocialBusy] = useState(false);
  const [socialDobOpen, setSocialDobOpen] = useState(false);
  const [socialDob, setSocialDob] = useState<Date | null>(null);
  const [socialDobError, setSocialDobError] = useState<string | null>(null);
  const [socialSubmitting, setSocialSubmitting] = useState(false);
  const pendingSocialRef = useRef<SocialCreds | null>(null);

  const callSocialLogin = (creds: SocialCreds, dateOfBirth?: string): Promise<void> => {
    if (creds.provider === 'Google') {
      return loginWithGoogle(creds.idToken as string, dateOfBirth);
    }
    if (creds.provider === 'Facebook') {
      return loginWithFacebook(creds.accessToken as string, dateOfBirth);
    }
    return loginWithApple(creds.identityToken as string, creds.fullName ?? null, dateOfBirth);
  };

  const runSocial = async (creds: SocialCreds, dateOfBirth?: string) => {
    try {
      setSocialBusy(true);
      // so-4maw / so-piu2: clear the device-global setup flag for confirmed-new
      // users (DOB resubmit) and, on Register, for every first attempt — so a
      // new social user on a previously-used device sees onboarding instead of
      // inheriting the prior account's "complete" state. Login's first attempt
      // does NOT clear it (an existing user must keep their completed state).
      if (dateOfBirth || clearSetupOnFirstAttempt) {
        await AsyncStorage.removeItem('@soultalk_setup_complete');
      }
      await callSocialLogin(creds, dateOfBirth);
      // Success → navigation handled by the auth state change.
    } catch (error: any) {
      if (error instanceof DobRequiredError) {
        // New social user needs a DOB — stash creds and present the step.
        pendingSocialRef.current = creds;
        setSocialDob(null);
        setSocialDobError(null);
        setSocialDobOpen(true);
        return;
      }
      if (isUnder18Error(error?.message)) {
        navigation.navigate('UnderageBlock');
        return;
      }
      showError(error, { title: `Couldn't continue with ${creds.provider}` });
    } finally {
      setSocialBusy(false);
    }
  };

  const handleGoogleSignUp = (idToken: string) =>
    runSocial({ provider: 'Google', idToken });
  const handleFacebookSignUp = (accessToken: string) =>
    runSocial({ provider: 'Facebook', accessToken });
  const handleAppleSignUp = (identityToken: string, fullName: string | null) =>
    runSocial({ provider: 'Apple', identityToken, fullName });

  const handleSocialDobContinue = async () => {
    const creds = pendingSocialRef.current;
    if (!creds) return;
    const parts = socialDob ? dobPartsFromDate(socialDob) : null;
    if (!parts || !isValidDob(parts)) {
      setSocialDobError('Please select a valid date of birth.');
      return;
    }
    if (!isAtLeast18(parts)) {
      setSocialDobOpen(false);
      navigation.navigate('UnderageBlock');
      return;
    }
    setSocialSubmitting(true);
    try {
      setSocialDobOpen(false);
      await runSocial(creds, toIsoDate(parts));
    } finally {
      setSocialSubmitting(false);
    }
  };

  const handleSocialDobCancel = () => {
    setSocialDobOpen(false);
    pendingSocialRef.current = null;
    setSocialDob(null);
    setSocialDobError(null);
  };

  return {
    handleGoogleSignUp,
    handleFacebookSignUp,
    handleAppleSignUp,
    socialBusy,
    dobStep: {
      visible: socialDobOpen,
      value: socialDob,
      error: socialDobError,
      submitting: socialSubmitting,
      onChange: (d: Date) => {
        setSocialDob(d);
        if (socialDobError) setSocialDobError(null);
      },
      onContinue: handleSocialDobContinue,
      onCancel: handleSocialDobCancel,
    },
  };
}
