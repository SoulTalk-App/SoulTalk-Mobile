import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { normalizeError } from '../utils/normalizeError';
import { useAppAlert } from '../components/AppAlertProvider';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useFacebookAuth } from '../hooks/useFacebookAuth';
import { useAppleAuth } from '../hooks/useAppleAuth';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { getLocales } from 'expo-localization';
import { TOUCH_HITSLOP_SMALL, TOUCH_HITSLOP_MED, TOUCH_PRESS_OPACITY } from '../components/touchPrimitives';
import { useSocialDobGate } from '../features/signup/useSocialDobGate';
import { SocialDobStep } from '../features/signup/SocialDobStep';



interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  // so-1zn0: themed alert hook replaces native Alert across this surface.
  // showError(err, {title}) runs through normalizeError so social SDK
  // strings + "An error occurred" never leak to the user (so-iiw8).
  const { showError } = useAppAlert();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // so-8nem: is_18_plus affirmation checkbox replaces DOB date-picker
  // (Apple 5.1.1(v) rejection).
  // so-rl2u: countryCode manual picker removed — auto-detected at submit time
  // via expo-localization getLocales()[0].regionCode.
  const [is18Plus, setIs18Plus] = useState(false);
  // so-piu2: social-signup age-gate extracted to a shared hook so LoginScreen
  // reuses it verbatim. is18PlusConfirmed lets the hook carry is_18_plus:true
  // on the FIRST social attempt when the checkbox is already ticked.
  const {
    handleGoogleSignUp,
    handleFacebookSignUp,
    handleAppleSignUp,
    dobStep: socialDobStep,
  } = useSocialDobGate(navigation, { clearSetupOnFirstAttempt: true, is18PlusConfirmed: is18Plus });
  // so-kefw: terms checkbox default=false. Tapping navigates to the full
  // TermsScreen (Terms & Privacy). When the user taps Accept there, it
  // sets @terms_accepted='true' and calls goBack(). A focus listener below
  // re-hydrates this state on return so the checkbox reflects acceptance.
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // so-kefw: password hint (i) toggle — hidden by default.
  const [showPasswordHints, setShowPasswordHints] = useState(false);
  // so-kefw: newsletter opt-in — NOT required, GDPR explicit-consent.
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);

  // Ref to track latest password for cross-field validation during rapid autofill
  const passwordRef = useRef('');

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Error states
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const { register } = useAuth();

  // Social auth hooks
  const {
    response: googleResponse,
    promptAsync: promptGoogleAsync,
    getIdToken: getGoogleIdToken,
  } = useGoogleAuth();

  const {
    response: facebookResponse,
    promptAsync: promptFacebookAsync,
    getAccessToken: getFacebookAccessToken,
  } = useFacebookAuth();

  const {
    response: appleResponse,
    promptAsync: promptAppleAsync,
    getIdentityToken: getAppleIdentityToken,
    getFullName: getAppleFullName,
    isAvailable: isAppleAvailable,
    isLoading: isAppleLoading,
  } = useAppleAuth();

  // so-kefw: re-hydrate agreedToTerms when we return from TermsScreen (which
  // sets @terms_accepted='true' on Accept then calls goBack()). Using the
  // navigation focus listener so it fires on every return, not just mount.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      try {
        const stored = await AsyncStorage.getItem('@terms_accepted');
        setAgreedToTerms(stored === 'true');
      } catch {}
    });
    return unsubscribe;
  }, [navigation]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        // so-wzq9: chevron + title share one horizontal row inside the scroll
        // content. marginLeft:-8 pulls the chevron to ~16px from screen edge
        // (scrollContent padding=24, -8 → 16px), matching the original hitbox.
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginLeft: -8,
          marginBottom: 4,
        },
        titleRowChevron: {
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
        },
        // so-bz3j: full-bleed card — no top radius (nothing sits above it),
        // no marginTop (card starts at y=0 behind the status bar).
        contentContainer: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollContent: {
          flexGrow: 1,
          padding: 24,
        },
        title: {
          fontFamily: fonts.edensor.bold,
          fontSize: 28,
          color: colors.primary,
          // so-wzq9: flex:1 + marginLeft fill the row alongside the chevron;
          // marginTop/textAlign not needed in a flex row.
          flex: 1,
          marginLeft: 8,
        },
        subtitle: {
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: colors.text.secondary,
          textAlign: 'left',
          marginBottom: 30,
        },
        form: {
          marginBottom: 20,
        },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 16,
        },
        halfWidthWrapper: {
          width: '48%',
        },
        inputContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          // Theme-aware surface: white pill on light, frosted glass on dark
          // so the input chrome doesn't jar against the cosmic backdrop. (so-iao)
          borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : colors.border,
          borderRadius: 12,
          marginBottom: 16,
          paddingHorizontal: 12,
          height: 56,
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : colors.white,
        },
        inputContainerFocused: {
          borderColor: colors.primary,
          borderWidth: 2,
        },
        halfWidth: {
          width: '100%',
          marginBottom: 0,
        },
        errorText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 12,
          color: colors.error,
          marginBottom: 8,
          marginLeft: 4,
        },
        inputIcon: {
          marginRight: 12,
        },
        input: {
          flex: 1,
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: colors.text.dark,
        },
        passwordInput: {
          paddingRight: 40,
        },
        eyeIcon: {
          position: 'absolute',
          right: 12,
          padding: 4,
        },
        // so-kefw: passwordRequirements/requirementsTitle/requirement styles
        // replaced by hintsBlock/hintsTitle/hintsItem (collapsible toggle).
        termsContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 24,
          marginTop: 2,
        },
        checkbox: {
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: colors.primary,
          marginRight: 12,
          justifyContent: 'center',
          alignItems: 'center',
        },
        checkboxChecked: {
          backgroundColor: colors.primary,
        },
        termsText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 14,
          color: colors.text.secondary,
          flex: 1,
        },
        termsLink: {
          fontFamily: fonts.outfit.semiBold,
          color: '#2196F3',
          textDecorationLine: 'underline',
        },
        // so-kefw: password (i) hint toggle
        hintsToggleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
          marginTop: -4,
        },
        hintsToggleText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 13,
          color: colors.text.secondary,
          marginLeft: 6,
        },
        hintsBlock: {
          marginBottom: 16,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: colors.overlay,
          borderRadius: 10,
        },
        hintsTitle: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 13,
          color: colors.primary,
          marginBottom: 6,
        },
        hintsItem: {
          fontFamily: fonts.outfit.regular,
          fontSize: 13,
          color: colors.text.secondary,
          marginBottom: 3,
        },
        registerButton: {
          backgroundColor: colors.primary,
          borderRadius: 12,
          height: 48,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 24,
        },
        registerButtonDisabled: {
          backgroundColor: colors.button.disabled,
        },
        registerButtonText: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 16,
          color: colors.white,
        },
        dividerContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 24,
        },
        divider: {
          flex: 1,
          height: 1,
          backgroundColor: colors.border,
        },
        dividerText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 12,
          color: colors.text.secondary,
          marginHorizontal: 16,
        },
        socialContainer: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 20,
          marginBottom: 24,
        },
        socialButton: {
          width: 48,
          height: 48,
          borderRadius: 12,
          justifyContent: 'center',
          alignItems: 'center',
        },
        googleButton: {
          backgroundColor: '#EA4335',
        },
        facebookButton: {
          backgroundColor: '#1877F2',
        },
        // Apple HIG: black on light, white on dark; equal prominence to other socials.
        appleButton: {
          backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
        },
        footer: {
          alignItems: 'center',
          marginTop: -30,
        },
        signinText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: colors.text.secondary,
        },
        signinLink: {
          fontFamily: fonts.outfit.semiBold,
          color: colors.primary,
        },
        signinLinkDisabled: {
          opacity: 0.4,
        },
      }),
    [colors, isDarkMode]
  );

  // so-xllj #9: the three social-auth effects below intentionally depend only
  // on their *Response object — they should fire once per new auth response,
  // not on every render. The handlers are read from the current closure at
  // fire time; do NOT add them to the dep arrays (that would re-fire each
  // render since they aren't memoized).
  // Handle Google auth response
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = getGoogleIdToken();
      if (idToken) {
        handleGoogleSignUp(idToken);
      }
    } else if (googleResponse?.type === 'error') {
      // so-iiw8: route through showError so the SDK's "An error occurred"
      // fallback / raw status code strings get re-mapped to the friendly
      // copy set by useGoogleAuth.ts (so-iiw8 #1).
      showError(googleResponse.error, { title: 'Google Sign-Up Failed' });
    }
  }, [googleResponse]);

  // Handle Facebook auth response
  useEffect(() => {
    if (facebookResponse?.type === 'success') {
      const accessToken = getFacebookAccessToken();
      if (accessToken) {
        handleFacebookSignUp(accessToken);
      }
    } else if (facebookResponse?.type === 'error') {
      // so-iiw8: same routing fix as Google.
      showError(facebookResponse.error, { title: 'Facebook Sign-Up Failed' });
    }
  }, [facebookResponse]);

  // Handle Apple auth response
  useEffect(() => {
    if (appleResponse?.type === 'success') {
      const identityToken = getAppleIdentityToken();
      if (identityToken) {
        handleAppleSignUp(identityToken, getAppleFullName());
      }
    } else if (appleResponse?.type === 'error') {
      // so-iiw8: friendly copy via showError; useAppleAuth.ts pre-
      // normalizes its error.message.
      showError(appleResponse.error, { title: 'Apple Sign-Up Failed' });
    }
  }, [appleResponse]);

  // so-piu2: social signup handlers (handleGoogleSignUp / handleFacebookSignUp /
  // handleAppleSignUp) + the DOB step now live in useSocialDobGate (above),
  // shared with LoginScreen. The auth-response effects below call them directly.

  const validateField = (field: string, value: string) => {
    let error = '';

    switch (field) {
      case 'firstName':
        if (value && !/^[a-zA-Z\s'-]+$/.test(value)) {
          error = 'First name can only contain letters';
        }
        break;
      case 'lastName':
        if (value && !/^[a-zA-Z\s'-]+$/.test(value)) {
          error = 'Last name can only contain letters';
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'password':
        if (value) {
          if (value.length < 8) {
            error = 'Password must be at least 8 characters';
          } else if (!/(?=.*[a-z])/.test(value)) {
            error = 'Password must include a lowercase letter';
          } else if (!/(?=.*[A-Z])/.test(value)) {
            error = 'Password must include an uppercase letter';
          } else if (!/(?=.*\d)/.test(value)) {
            error = 'Password must include a number';
          } else if (!/(?=.*[^a-zA-Z0-9])/.test(value)) {
            error = 'Password must include a special character';
          }
        }
        break;
      case 'confirmPassword':
        if (value && value !== passwordRef.current) {
          error = 'Passwords do not match';
        }
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleInputChange = (field: string, value: string) => {
    // Keep ref in sync so cross-field validation always has the latest password
    if (field === 'password') {
      passwordRef.current = value;
    }

    // Use functional update to avoid stale state when iOS autofills both fields rapidly
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);

    // Cross-validate confirmPassword whenever password changes
    if (field === 'password') {
      setFormData(prev => {
        if (prev.confirmPassword && value !== prev.confirmPassword) {
          setErrors(errs => ({ ...errs, confirmPassword: 'Passwords do not match' }));
        } else if (prev.confirmPassword) {
          setErrors(errs => ({ ...errs, confirmPassword: '' }));
        }
        return prev;
      });
    }
  };

  const isFormValid = useMemo(() => {
    const { firstName, lastName, email, password, confirmPassword } = formData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordValid =
      password.length >= 8 &&
      /(?=.*[a-z])/.test(password) &&
      /(?=.*[A-Z])/.test(password) &&
      /(?=.*\d)/.test(password) &&
      /(?=.*[^a-zA-Z0-9])/.test(password);

    // so-8nem: is18Plus checkbox required. so-rl2u: countryCode removed from
    // validity gate — country auto-detected at submit, optional per so-ddxf.
    return (
      firstName.trim() !== '' &&
      lastName.trim() !== '' &&
      emailRegex.test(email) &&
      passwordValid &&
      password === confirmPassword &&
      is18Plus &&
      agreedToTerms
    );
  }, [formData, agreedToTerms, is18Plus]);

  const handleRegister = async () => {
    // so-8nem: is18Plus required for isFormValid — defensive guard.
    if (!is18Plus) return;
    // so-rl2u: auto-detect country from device locale at submit time.
    // Omit if unavailable — backend (so-ddxf) accepts country_code as optional.
    const detectedRegion = getLocales()?.[0]?.regionCode ?? undefined;

    try {
      setIsLoading(true);
      // Clear setup flag so the new account sees the welcome flow.
      await AsyncStorage.removeItem('@soultalk_setup_complete');
      await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        // so-8nem: send is_18_plus:true (checkbox confirmed); BE returns 422
        // age_confirmation_required if absent/false.
        is_18_plus: true,
        // so-kefw: explicit opt-in; GDPR/CAN-SPAM compliant (default=false).
        newsletter_opt_in: newsletterOptIn,
        ...(detectedRegion ? { country_code: detectedRegion } : {}),
      });
      // Navigate to verification screen with email.
      navigation.navigate('OTPVerification', { email: formData.email });
    } catch (error: any) {
      showError(error, { title: 'Registration Failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    // so-ei55: terms gate removed — Login is now directly reachable from
    // WelcomeScreen, so the RegisterScreen Sign In link needs no consent check.
    navigation.navigate('Login');
  };

  const handleBackToHome = () => {
    navigation.navigate('Welcome');
  };

  // so-kefw: tapping the terms row when unchecked opens the full TermsScreen
  // (Terms & Privacy tabbed viewer). TermsScreen.handleAccept sets
  // @terms_accepted='true' + goBack(); the focus listener above picks that up.
  // Tapping when already checked unchecks locally (user changed their mind).
  // so-eer8: mode:'accept' enables the Accept footer (this is the ONE signup
  // path that needs it). All other navigate('Terms') callers omit the param
  // and land in read-only view mode.
  const handleTermsRowPress = useCallback(async () => {
    if (!agreedToTerms) {
      navigation.navigate('Terms', { mode: 'accept' });
    } else {
      setAgreedToTerms(false);
      try { await AsyncStorage.removeItem('@terms_accepted'); } catch {}
    }
  }, [agreedToTerms, navigation]);

  const handleSocialLogin = async (provider: string) => {
    // Buttons are hidden when !agreedToTerms || !is18Plus; guard kept as
    // a defensive no-op for safety.
    if (!agreedToTerms || !is18Plus) return;
    if (provider === 'Google') {
      await promptGoogleAsync();
    } else if (provider === 'Facebook') {
      await promptFacebookAsync();
    } else if (provider === 'Apple') {
      await promptAppleAsync();
    }
  };

  return (
    <CosmicScreen tone="night">
      {/* so-bz3j: full-bleed card — no in-flow header row, no starry strip. */}
      <KeyboardAvoidingView
        style={styles.contentContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            // so-wzq9: paddingTop just clears safe area; the titleRow provides
            // its own visual spacing (no more 52px blank gap for the old overlay).
            { paddingTop: insets.top + 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* so-wzq9: chevron + title on one row — reclaim the empty top band. */}
          <View style={styles.titleRow}>
            <Pressable
              style={styles.titleRowChevron}
              onPress={handleBackToHome}
              hitSlop={TOUCH_HITSLOP_SMALL}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Feather name="chevron-left" size={28} color={isDarkMode ? colors.white : colors.primary} />
            </Pressable>
            <Text style={styles.title}>Sign Up</Text>
          </View>
          <Text style={styles.subtitle}>Join SoulTalk today</Text>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.halfWidthWrapper}>
                <View style={[styles.inputContainer, styles.halfWidth, focusedField === 'firstName' && styles.inputContainerFocused]}>
                  <Ionicons name="person-outline" size={20} color={focusedField === 'firstName' ? colors.primary : colors.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    placeholderTextColor={focusedField === 'firstName' ? colors.primary : colors.text.secondary}
                    value={formData.firstName}
                    onChangeText={(value) => handleInputChange('firstName', value)}
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    textContentType="givenName"
                    autoComplete="given-name"
                  />
                </View>
                {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
              </View>

              <View style={styles.halfWidthWrapper}>
                <View style={[styles.inputContainer, styles.halfWidth, focusedField === 'lastName' && styles.inputContainerFocused]}>
                  <Ionicons name="person-outline" size={20} color={focusedField === 'lastName' ? colors.primary : colors.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    placeholderTextColor={focusedField === 'lastName' ? colors.primary : colors.text.secondary}
                    value={formData.lastName}
                    onChangeText={(value) => handleInputChange('lastName', value)}
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    textContentType="familyName"
                    autoComplete="family-name"
                  />
                </View>
                {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
              </View>
            </View>

            <View style={[styles.inputContainer, focusedField === 'email' && styles.inputContainerFocused]}>
              <Ionicons name="mail-outline" size={20} color={focusedField === 'email' ? colors.primary : colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={focusedField === 'email' ? colors.primary : colors.text.secondary}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

            <View style={[styles.inputContainer, focusedField === 'password' && styles.inputContainerFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'password' ? colors.primary : colors.text.secondary} style={styles.inputIcon} />
              {/* so-2ohe: do NOT add a `key` to this TextInput or wrap it
                  in a conditional render that swaps component identity on
                  the show/hide eye toggle — that re-mount mid-AutoFill is
                  what Apple's docs flag as a cause of the field locking
                  yellow + unresponsive. Only `secureTextEntry` flips with
                  the toggle; React reuses the same native view. */}
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Password"
                placeholderTextColor={focusedField === 'password' ? colors.primary : colors.text.secondary}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                autoComplete="new-password"
                passwordRules="minlength: 8; required: lower; required: upper; required: digit; required: special;"
              />
              <Pressable
                style={({ pressed }) => [styles.eyeIcon, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={TOUCH_HITSLOP_MED}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={focusedField === 'password' ? colors.primary : colors.text.secondary}
                />
              </Pressable>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

            <View style={[styles.inputContainer, focusedField === 'confirmPassword' && styles.inputContainerFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'confirmPassword' ? colors.primary : colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirm Password"
                placeholderTextColor={focusedField === 'confirmPassword' ? colors.primary : colors.text.secondary}
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                // so-2ohe: reverts so-cnqc — the 'password' (sign-in)
                // textContentType on a confirm field next to a 'newPassword'
                // field is what Apple flags as a known cause of the
                // Strong-Password AutoFill lock-up (both fields go solid
                // yellow + unclickable). Apple's documented pattern for a
                // new-password + confirm pair is BOTH 'newPassword' so iOS
                // fills them as a pair from the same generated suggestion.
                // autoComplete='new-password' (RN/HTML) was already on
                // both — only the iOS textContentType disagreed.
                textContentType="newPassword"
                autoComplete="new-password"
                passwordRules="minlength: 8; required: lower; required: upper; required: digit; required: special;"
              />
              <Pressable
                style={({ pressed }) => [styles.eyeIcon, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={TOUCH_HITSLOP_MED}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={focusedField === 'confirmPassword' ? colors.primary : colors.text.secondary}
                />
              </Pressable>
            </View>
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

            {/* so-kefw: Password requirements collapsed behind an (i) toggle */}
            <Pressable
              style={({ pressed }) => [styles.hintsToggleRow, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
              onPress={() => setShowPasswordHints((v) => !v)}
              hitSlop={TOUCH_HITSLOP_SMALL}
              accessibilityRole="button"
              accessibilityLabel="Show password requirements"
              accessibilityState={{ expanded: showPasswordHints }}
            >
              <Ionicons
                name={showPasswordHints ? 'information-circle' : 'information-circle-outline'}
                size={18}
                color={colors.primary}
              />
              <Text style={styles.hintsToggleText}>Password requirements</Text>
            </Pressable>
            {showPasswordHints && (
              <View style={styles.hintsBlock}>
                <Text style={styles.hintsTitle}>Password must contain:</Text>
                <Text style={styles.hintsItem}>• At least 8 characters</Text>
                <Text style={styles.hintsItem}>• One uppercase letter</Text>
                <Text style={styles.hintsItem}>• One lowercase letter</Text>
                <Text style={styles.hintsItem}>• One number</Text>
                <Text style={styles.hintsItem}>• One special character (e.g. !@#$%^&*)</Text>
              </View>
            )}

            {/* so-8nem: 18+ affirmation checkbox.
                so-rl2u: CountryPickerField removed — country_code now
                auto-detected from device locale at submit time. Apple 5.1.1(v) replacement
                for the required DOB date-picker. Mirrors the terms checkbox
                row in style. Social buttons are also gated on this. */}
            <Pressable
              style={({ pressed }) => [styles.termsContainer, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
              onPress={() => setIs18Plus((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: is18Plus }}
              accessibilityLabel="I am 18 or older"
            >
              <View style={[styles.checkbox, is18Plus && styles.checkboxChecked]}>
                {is18Plus && <Ionicons name="checkmark" size={16} color={colors.white} />}
              </View>
              <Text style={styles.termsText}>
                I am 18 or older{'\n'}
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>
                  You must be 18 or older to use SoulTalk.
                </Text>
              </Text>
            </Pressable>

            {/* so-kefw: Terms row. Tapping when unchecked opens the full Terms &
                Privacy screen (TermsScreen). Tapping when checked unchecks.
                The focus listener re-hydrates agreedToTerms when returning. */}
            <Pressable
              style={({ pressed }) => [styles.termsContainer, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
              onPress={handleTermsRowPress}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreedToTerms }}
              accessibilityLabel={agreedToTerms ? 'Agreed to Terms and Privacy Policy, tap to uncheck' : 'Read and agree to Terms and Privacy Policy'}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && <Ionicons name="checkmark" size={16} color={colors.white} />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink}>Terms & Privacy Policy</Text>
              </Text>
            </Pressable>

            {/* so-kefw: Newsletter opt-in — explicit, GDPR/CAN-SPAM. */}
            <Pressable
              style={({ pressed }) => [styles.termsContainer, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
              onPress={() => setNewsletterOptIn((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: newsletterOptIn }}
              accessibilityLabel="Subscribe to newsletter"
            >
              <View style={[styles.checkbox, newsletterOptIn && styles.checkboxChecked]}>
                {newsletterOptIn && <Ionicons name="checkmark" size={16} color={colors.white} />}
              </View>
              <Text style={styles.termsText}>
                Send me tips and updates (optional)
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.registerButton,
                (!isFormValid || !agreedToTerms) && styles.registerButtonDisabled,
                pressed && isFormValid && agreedToTerms && !isLoading && { opacity: TOUCH_PRESS_OPACITY },
              ]}
              onPress={handleRegister}
              disabled={!isFormValid || !agreedToTerms || isLoading}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isFormValid || !agreedToTerms || isLoading, busy: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.registerButtonText}>Sign Up</Text>
              )}
            </Pressable>

            {/* Social Login Section. so-jokw: entire block hidden when terms
                unchecked. so-8nem: also hidden until 18+ confirmed — the
                social call must carry is_18_plus:true on first attempt. */}
            {agreedToTerms && is18Plus && (
              <>
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.divider} />
                </View>

                <View style={styles.socialContainer}>
                  <Pressable
                    style={({ pressed }) => [styles.socialButton, styles.googleButton, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
                    onPress={() => handleSocialLogin('Google')}
                    accessibilityRole="button"
                    accessibilityLabel="Sign up with Google"
                  >
                    <FontAwesome5 name="google" size={18} color="#FFFFFF" />
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.socialButton, styles.facebookButton, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
                    onPress={() => handleSocialLogin('Facebook')}
                    accessibilityRole="button"
                    accessibilityLabel="Sign up with Facebook"
                  >
                    <FontAwesome5 name="facebook-f" size={22} color="#FFFFFF" />
                  </Pressable>

                  {isAppleAvailable && (
                    <Pressable
                      style={({ pressed }) => [styles.socialButton, styles.appleButton, pressed && !isAppleLoading && { opacity: TOUCH_PRESS_OPACITY }]}
                      onPress={() => handleSocialLogin('Apple')}
                      accessibilityRole="button"
                      accessibilityLabel="Sign up with Apple"
                      accessibilityState={{ disabled: isAppleLoading, busy: isAppleLoading }}
                      disabled={isAppleLoading}
                    >
                      <FontAwesome5 name="apple" size={24} color={isDarkMode ? '#000000' : '#FFFFFF'} />
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.signinText}>
              Already have an account?{' '}
              <Text
                style={styles.signinLink}
                onPress={handleSignIn}
              >
                Sign In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* so-piu2: shared social-signup DOB step (also used by LoginScreen). */}
      <SocialDobStep {...socialDobStep} />

    </CosmicScreen>
  );
};

export default RegisterScreen;
