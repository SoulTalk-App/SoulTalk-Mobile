import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
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
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useFacebookAuth } from '../hooks/useFacebookAuth';
import { useAppleAuth } from '../hooks/useAppleAuth';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { TOUCH_HITSLOP_SMALL, TOUCH_HITSLOP_MED, TOUCH_PRESS_OPACITY } from '../components/touchPrimitives';
import { DateOfBirthField, CountryPickerField } from '../features/signup/SignupAgeFields';
import {
  parseMaskedDob,
  isValidDob,
  isAtLeast18,
  toIsoDate,
  isUnder18Error,
} from '../utils/ageGate';
import { getDeclaredAgeIs18Plus } from '../utils/declaredAgeRange';



interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
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
  // so-cbhq: age-gate + jurisdiction capture. dobMasked is the raw MM/DD/YYYY
  // string; countryCode is ISO 3166-1 alpha-2. dobError surfaces an invalid
  // date inline; the under-18 decision routes to the neutral block screen.
  const [dobMasked, setDobMasked] = useState('');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [dobError, setDobError] = useState<string | null>(null);
  // so-jokw: TOS is now an explicit slide-5 acceptance in onboarding. We
  // initialize true (the onboarding flow guarantees @terms_accepted=true
  // by the time we land here) but also hydrate from AsyncStorage on mount
  // for safety — covers users who reach Register via deep-link or fall
  // through some path that skipped onboarding.
  // so-xllj #10: default to false and hydrate from AsyncStorage on mount.
  // Defaulting true exposed a sub-frame window where the consent-gated
  // buttons read as accepted before hydration landed.
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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

  const { register, loginWithGoogle, loginWithFacebook, loginWithApple } = useAuth();

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

  // so-jokw: hydrate consent from AsyncStorage on mount only. The user no
  // longer navigates to a separate Terms screen and back, so per-focus
  // re-reads are unnecessary (and were the source of so-37a races).
  useEffect(() => {
    AsyncStorage.getItem('@terms_accepted')
      .then((value) => setAgreedToTerms(value === 'true'))
      .catch(() => {});
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingBottom: 20,
        },
        backButton: {
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
        },
        headerTitle: {
          fontFamily: fonts.edensor.bold,
          fontSize: 26,
          // Light path: page-bg ink for AA on the so-u1k lavender wash.
          color: isDarkMode ? colors.white : colors.text.primary,
        },
        contentContainer: {
          flex: 1,
          backgroundColor: colors.background,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
        },
        scrollContent: {
          flexGrow: 1,
          padding: 24,
        },
        title: {
          fontFamily: fonts.edensor.bold,
          fontSize: 28,
          color: colors.primary,
          textAlign: 'left',
          marginTop: 20,
          marginBottom: 4,
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
        passwordRequirements: {
          marginBottom: 16,
          padding: 16,
          backgroundColor: colors.overlay,
          borderRadius: 12,
        },
        requirementsTitle: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 16,
          color: colors.primary,
          marginBottom: 8,
        },
        requirement: {
          fontFamily: fonts.outfit.regular,
          fontSize: 14,
          color: colors.text.secondary,
          marginBottom: 4,
        },
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
      Alert.alert('Google Sign-Up Failed', googleResponse.error?.message || 'An error occurred');
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
      Alert.alert('Facebook Sign-Up Failed', facebookResponse.error?.message || 'An error occurred');
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
      Alert.alert('Apple Sign-Up Failed', appleResponse.error?.message || 'An error occurred');
    }
  }, [appleResponse]);

  const handleGoogleSignUp = async (idToken: string) => {
    try {
      setIsLoading(true);
      // so-4maw: mirror the email path — clear the device-global setup flag
      // so a new social user on a previously-used device sees onboarding
      // (SoulPalName / setup screens) instead of inheriting the prior
      // account's "complete" state and landing on Home empty.
      await AsyncStorage.removeItem('@soultalk_setup_complete');
      await loginWithGoogle(idToken);
      // Navigation will be handled by the auth state change
    } catch (error: any) {
      Alert.alert('Google Sign-Up Failed', normalizeError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignUp = async (accessToken: string) => {
    try {
      setIsLoading(true);
      // so-4maw: see handleGoogleSignUp.
      await AsyncStorage.removeItem('@soultalk_setup_complete');
      await loginWithFacebook(accessToken);
      // Navigation will be handled by the auth state change
    } catch (error: any) {
      Alert.alert('Facebook Sign-Up Failed', normalizeError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignUp = async (identityToken: string, fullName: string | null) => {
    try {
      setIsLoading(true);
      // so-4maw: see handleGoogleSignUp.
      await AsyncStorage.removeItem('@soultalk_setup_complete');
      await loginWithApple(identityToken, fullName);
      // Navigation will be handled by the auth state change
    } catch (error: any) {
      Alert.alert('Apple Sign-Up Failed', normalizeError(error));
    } finally {
      setIsLoading(false);
    }
  };

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

    // so-cbhq: DOB must be a real, in-range date and a country must be chosen.
    // The 18+ decision is NOT gated here — an under-18 user with a VALID date
    // can still tap Register so handleRegister can route them to the neutral
    // block screen (rather than silently disabling the button).
    const dobParts = parseMaskedDob(dobMasked);
    const dobValid = dobParts != null && isValidDob(dobParts);

    return (
      firstName.trim() !== '' &&
      lastName.trim() !== '' &&
      emailRegex.test(email) &&
      passwordValid &&
      password === confirmPassword &&
      dobValid &&
      countryCode != null &&
      agreedToTerms
    );
  }, [formData, agreedToTerms, dobMasked, countryCode]);

  const handleRegister = async () => {
    // so-cbhq: validate + age-gate before any network call.
    const dobParts = parseMaskedDob(dobMasked);
    if (!dobParts || !isValidDob(dobParts)) {
      setDobError('Enter a valid date of birth (MM/DD/YYYY).');
      return;
    }
    setDobError(null);
    if (!countryCode) return;

    try {
      setIsLoading(true);

      // Apple's Declared Age Range is the preferred 18+ signal where the
      // native module is available (iOS 17+); otherwise fall back to the DOB
      // the user entered. The backend (so-8544) re-checks DOB authoritatively.
      const declared = await getDeclaredAgeIs18Plus();
      const is18Plus = declared.available ? declared.isAtLeast18 : isAtLeast18(dobParts);
      if (!is18Plus) {
        navigation.navigate('UnderageBlock');
        return;
      }

      // Clear setup flag so the new account sees the welcome flow.
      await AsyncStorage.removeItem('@soultalk_setup_complete');
      await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        // so-8544: ISO date; backend computes is_18_plus then discards it.
        date_of_birth: toIsoDate(dobParts),
        country_code: countryCode,
      });

      // Navigate to verification sent screen with email
      navigation.navigate('OTPVerification', { email: formData.email });
    } catch (error: any) {
      // so-cbhq: backend hard-rejects under-18 (so-8544) with a neutral 400 —
      // route to the same block screen rather than an error alert.
      if (isUnder18Error(error?.message)) {
        navigation.navigate('UnderageBlock');
        return;
      }
      Alert.alert('Registration Failed', normalizeError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    // so-ebsm: gate the Sign In footer link on terms acceptance, matching
    // the Sign Up button + social buttons. Prevents users from sneaking
    // around the consent gate by tapping through to Login.
    if (!agreedToTerms) return;
    navigation.navigate('Login');
  };

  const handleBackToHome = () => {
    navigation.navigate('Welcome');
  };

  // so-jokw: tap toggles consent in-place. Terms content is no longer
  // reachable from this screen (it lives on onboarding slide 5 and in
  // Settings); unchecking here removes the AsyncStorage flag, re-checking
  // restores it. Sign Up + social buttons gate on this state.
  const handleTermsRowPress = useCallback(async () => {
    if (agreedToTerms) {
      setAgreedToTerms(false);
      try { await AsyncStorage.removeItem('@terms_accepted'); } catch {}
    } else {
      setAgreedToTerms(true);
      try { await AsyncStorage.setItem('@terms_accepted', 'true'); } catch {}
    }
  }, [agreedToTerms]);

  const handleSocialLogin = async (provider: string) => {
    // Buttons are hidden when !agreedToTerms (so-jokw); guard kept as
    // a defensive no-op for safety.
    if (!agreedToTerms) return;
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
      {/* Purple Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
          onPress={handleBackToHome}
          hitSlop={TOUCH_HITSLOP_SMALL}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="chevron-left" size={28} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>SoulTalk</Text>
        <View style={styles.backButton} />
      </View>

      {/* Content Area */}
      <KeyboardAvoidingView
        style={styles.contentContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Sign Up</Text>
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
                // so-cnqc: iOS Strong Password engine bails when it sees
                // two adjacent newPassword fields. Keep newPassword on the
                // primary input only; the confirm field uses 'password' so
                // Apple's chain semantics still fill both from the
                // suggestion bubble without aborting it.
                // autoComplete='new-password' stays on both — RN/HTML
                // spec doesn't have the same conflict at that layer.
                textContentType="password"
                autoComplete="new-password"
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

            {/* Password Requirements */}
            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>Password must contain:</Text>
              <Text style={styles.requirement}>• At least 8 characters</Text>
              <Text style={styles.requirement}>• One uppercase letter</Text>
              <Text style={styles.requirement}>• One lowercase letter</Text>
              <Text style={styles.requirement}>• One number</Text>
              <Text style={styles.requirement}>• One special character (e.g. !@#$%^&*)</Text>
            </View>

            {/* so-cbhq: age-gate (DOB) + jurisdiction (country) capture.
                so-7jzs: no wrapper gap/margin — each field carries the same
                marginBottom:16 as the sibling inputs, so the rhythm matches. */}
            <View>
              <DateOfBirthField
                value={dobMasked}
                onChange={(masked) => {
                  setDobMasked(masked);
                  if (dobError) setDobError(null);
                }}
                error={dobError}
              />
              <CountryPickerField
                selectedCode={countryCode}
                onSelect={setCountryCode}
              />
            </View>

            {/* so-jokw: Terms checkbox. Tap toggles in-place — no
                navigation. Acceptance is normally pre-set by onboarding
                slide 5; users who unchecked can re-check here without
                leaving the screen. Sign Up + social buttons gate on
                this state. */}
            <Pressable
              style={({ pressed }) => [styles.termsContainer, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
              onPress={handleTermsRowPress}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreedToTerms }}
              accessibilityLabel="I agree to the Terms and Privacy"
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && <Ionicons name="checkmark" size={16} color={colors.white} />}
              </View>
              <Text style={styles.termsText}>
                I agree to the Terms and Privacy
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

            {/* Social Login Section. so-jokw: entire block hidden when
                terms unchecked — overseer wants the buttons to disappear,
                not show as disabled. */}
            {agreedToTerms && (
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
                style={[styles.signinLink, !agreedToTerms && styles.signinLinkDisabled]}
                onPress={handleSignIn}
              >
                Sign In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </CosmicScreen>
  );
};

export default RegisterScreen;
