// so-piu2: shared social-signup age-gate. Social sign-in is unified (a NEW
// user tapping "Sign in with Google/Apple/FB" creates an account), so the BE's
// dob_required → age-confirmation step → same-token resubmit-with-is_18_plus
// flow must live on BOTH RegisterScreen and LoginScreen. This hook owns that
// logic once; screens render the step via <SocialDobStep {...dobStep} />.
//
// so-8nem: replaced DOB date-picker with a simple 18+ affirmation step.
// BE now accepts is_18_plus:bool (PREFERRED) instead of date_of_birth.
// is18PlusConfirmedRef lets RegisterScreen pass the checkbox state so the
// FIRST social call already carries is_18_plus:true (no round-trip needed).
// LoginScreen leaves is18PlusConfirmed undefined; new users hit DobRequiredError
// and see the modal, existing users get an AuthResponse and skip it entirely.
import { useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { useAppAlert } from '../../components/AppAlertProvider';
import { DobRequiredError } from '../../services/AuthService';

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
  submitting: boolean;
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
  opts?: { clearSetupOnFirstAttempt?: boolean; is18PlusConfirmed?: boolean },
): SocialDobGate {
  // so-piu2: Register treats every social tap as a signup, so it clears the
  // device-global setup flag on the first attempt (so-4maw). Login passes
  // false so an EXISTING returning user isn't re-routed through onboarding; the
  // 18+ resubmit (a confirmed-new user) always clears it regardless.
  const clearSetupOnFirstAttempt = opts?.clearSetupOnFirstAttempt ?? false;

  // so-8nem: track the latest is18Plus state from RegisterScreen's checkbox
  // so the FIRST social attempt carries is_18_plus:true upfront.
  const is18PlusConfirmedRef = useRef(opts?.is18PlusConfirmed ?? false);
  is18PlusConfirmedRef.current = opts?.is18PlusConfirmed ?? false;

  const { loginWithGoogle, loginWithFacebook, loginWithApple } = useAuth();
  const { showError } = useAppAlert();

  const [socialBusy, setSocialBusy] = useState(false);
  const [socialDobOpen, setSocialDobOpen] = useState(false);
  const [socialSubmitting, setSocialSubmitting] = useState(false);
  const pendingSocialRef = useRef<SocialCreds | null>(null);

  const callSocialLogin = (creds: SocialCreds, is18Plus?: boolean): Promise<void> => {
    if (creds.provider === 'Google') {
      return loginWithGoogle(creds.idToken as string, is18Plus);
    }
    if (creds.provider === 'Facebook') {
      return loginWithFacebook(creds.accessToken as string, is18Plus);
    }
    return loginWithApple(creds.identityToken as string, creds.fullName ?? null, is18Plus);
  };

  const runSocial = async (creds: SocialCreds, is18Plus?: boolean) => {
    try {
      setSocialBusy(true);
      // so-4maw / so-piu2: clear the device-global setup flag for confirmed-new
      // users (18+ resubmit) and, on Register, for every first attempt — so a
      // new social user on a previously-used device sees onboarding instead of
      // inheriting the prior account's "complete" state. Login's first attempt
      // does NOT clear it (an existing user must keep their completed state).
      if (is18Plus || clearSetupOnFirstAttempt) {
        await AsyncStorage.removeItem('@soultalk_setup_complete');
      }
      await callSocialLogin(creds, is18Plus);
      // Success → navigation handled by the auth state change.
    } catch (error: any) {
      if (error instanceof DobRequiredError) {
        // New social user on LoginScreen needs to confirm age — stash creds
        // and show the affirmation modal.
        pendingSocialRef.current = creds;
        setSocialDobOpen(true);
        return;
      }
      showError(error, { title: `Couldn't continue with ${creds.provider}` });
    } finally {
      setSocialBusy(false);
    }
  };

  const handleGoogleSignUp = (idToken: string) =>
    runSocial(
      { provider: 'Google', idToken },
      is18PlusConfirmedRef.current ? true : undefined,
    );
  const handleFacebookSignUp = (accessToken: string) =>
    runSocial(
      { provider: 'Facebook', accessToken },
      is18PlusConfirmedRef.current ? true : undefined,
    );
  const handleAppleSignUp = (identityToken: string, fullName: string | null) =>
    runSocial(
      { provider: 'Apple', identityToken, fullName },
      is18PlusConfirmedRef.current ? true : undefined,
    );

  const handleSocialDobContinue = async () => {
    const creds = pendingSocialRef.current;
    if (!creds) return;
    setSocialSubmitting(true);
    try {
      setSocialDobOpen(false);
      // User confirmed 18+ in the modal — resubmit with is_18_plus:true.
      await runSocial(creds, true);
    } finally {
      setSocialSubmitting(false);
    }
  };

  const handleSocialDobCancel = () => {
    setSocialDobOpen(false);
    pendingSocialRef.current = null;
  };

  return {
    handleGoogleSignUp,
    handleFacebookSignUp,
    handleAppleSignUp,
    socialBusy,
    dobStep: {
      visible: socialDobOpen,
      submitting: socialSubmitting,
      onContinue: handleSocialDobContinue,
      onCancel: handleSocialDobCancel,
    },
  };
}
