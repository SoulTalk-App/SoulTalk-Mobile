import React, { useState, useEffect, useMemo } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import AuthService from "../services/AuthService";
import { normalizeError } from "../utils/normalizeError";
import { useAppAlert } from "../components/AppAlertProvider";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { useFacebookAuth } from "../hooks/useFacebookAuth";
import { useAppleAuth } from "../hooks/useAppleAuth";
import { fonts, useThemeColors } from "../theme";
import { useTheme } from "../contexts/ThemeContext";
import { CosmicScreen } from "../components/CosmicBackdrop";
import { TOUCH_HITSLOP_SMALL, TOUCH_HITSLOP_MED, TOUCH_PRESS_OPACITY } from "../components/touchPrimitives";
import { useSocialDobGate } from "../features/signup/useSocialDobGate";
import { SocialDobStep } from "../features/signup/SocialDobStep";

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  // so-1zn0: themed alert hook replaces native Alert.alert across this
  // surface. showError(err, {title}) runs through normalizeError so social
  // SDK strings ("DEVELOPER_ERROR", "No ID token") never reach the user.
  const { showAlert, showError } = useAppAlert();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Focus states
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Validation states
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const { login } = useAuth();
  // so-piu2: social sign-in is unified — a NEW user tapping a social button on
  // LOGIN must get the same dob_required DOB step as RegisterScreen (else they
  // dead-end on "dob_required"). Shared hook owns that flow.
  const {
    handleGoogleSignUp,
    handleFacebookSignUp,
    handleAppleSignUp,
    dobStep: socialDobStep,
  } = useSocialDobGate(navigation);

  // Social auth hooks
  const {
    response: googleResponse,
    promptAsync: promptGoogleAsync,
    getIdToken: getGoogleIdToken,
    isLoading: isGoogleLoading,
  } = useGoogleAuth();

  const {
    response: facebookResponse,
    promptAsync: promptFacebookAsync,
    getAccessToken: getFacebookAccessToken,
    isLoading: isFacebookLoading,
  } = useFacebookAuth();

  const {
    response: appleResponse,
    promptAsync: promptAppleAsync,
    getIdentityToken: getAppleIdentityToken,
    getFullName: getAppleFullName,
    isAvailable: isAppleAvailable,
    isLoading: isAppleLoading,
  } = useAppleAuth();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          // so-xdpq: 20→4; zIndex so chevron stays tappable above the card.
          paddingBottom: 4,
          zIndex: 10,
        },
        backButton: {
          width: 40,
          height: 40,
          justifyContent: "center",
          alignItems: "center",
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
          // so-xdpq: pull card up close under the chevron; header zIndex:10
          // keeps the chevron tappable above the overlapping card.
          marginTop: -32,
        },
        scrollContent: {
          flexGrow: 1,
          padding: 24,
        },
        title: {
          fontFamily: fonts.edensor.bold,
          fontSize: 28,
          color: colors.primary,
          textAlign: "left",
          marginTop: 20,
          marginBottom: 4,
        },
        subtitle: {
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: colors.text.secondary,
          textAlign: "left",
          marginBottom: 30,
        },
        form: {
          marginBottom: 20,
        },
        inputContainer: {
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1.5,
          // Theme-aware surface (so-iao).
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
          position: "absolute",
          right: 12,
          padding: 4,
        },
        forgotPassword: {
          alignSelf: "flex-end",
          marginBottom: 24,
        },

        forgotPasswordText: {
          fontFamily: fonts.outfit.medium,
          fontSize: 14,
          color: colors.primary,
        },
        loginButton: {
          backgroundColor: colors.primary,
          borderRadius: 12,
          height: 48,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 16,
        },
        loginButtonDisabled: {
          backgroundColor: colors.button.disabled,
        },
        loginButtonText: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 16,
          color: colors.white,
        },
        biometricButton: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          borderWidth: 2,
          borderColor: colors.primary,
          borderRadius: 12,
          backgroundColor: colors.white,
          marginBottom: 24,
        },
        biometricButtonText: {
          fontFamily: fonts.outfit.medium,
          fontSize: 16,
          color: colors.primary,
          marginLeft: 8,
        },
        dividerContainer: {
          flexDirection: "row",
          alignItems: "center",
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
          flexDirection: "row",
          justifyContent: "center",
          gap: 20,
          marginBottom: 24,
        },
        socialButton: {
          width: 48,
          height: 48,
          borderRadius: 12,
          justifyContent: "center",
          alignItems: "center",
        },
        googleButton: {
          backgroundColor: "#EA4335",
        },
        facebookButton: {
          backgroundColor: "#1877F2",
        },
        // Apple HIG: black on light, white on dark; equal prominence to other socials.
        appleButton: {
          backgroundColor: isDarkMode ? "#FFFFFF" : "#000000",
        },
        footer: {
          alignItems: "center",
          marginTop: -30,
        },
        signupText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: colors.text.secondary,
        },
        signupLink: {
          fontFamily: fonts.outfit.semiBold,
          color: colors.primary,
        },
      }),
    [colors, isDarkMode]
  );

  useEffect(() => {
    checkBiometricStatus();
  }, []);

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
      // fallback / raw "DEVELOPER_ERROR" strings get re-mapped to the
      // friendly copy set by useGoogleAuth.ts (so-iiw8 #1).
      showError(googleResponse.error, { title: 'Google Sign-In Failed' });
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
      // so-iiw8: same routing fix as Google — kills the raw SDK string +
      // "An error occurred" fallback that used to leak through.
      showError(facebookResponse.error, { title: 'Facebook Login Failed' });
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
      // so-iiw8: friendly copy via showError; useAppleAuth.ts already
      // pre-normalizes its error.message to the user-safe phrase.
      showError(appleResponse.error, { title: 'Apple Sign-In Failed' });
    }
  }, [appleResponse]);

  // so-piu2: the social login handlers now live in useSocialDobGate (above),
  // shared with RegisterScreen — they consume the BE's dob_required and present
  // the DOB step instead of dead-ending a new user on the login screen.

  const checkBiometricStatus = async () => {
    const available = await AuthService.isBiometricAvailable();
    const enabled = await AuthService.isBiometricEnabled();
    setBiometricAvailable(available);
    setBiometricEnabled(enabled);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert({
        title: 'Missing details',
        message: 'Please enter both your email and password.',
      });
      return;
    }

    try {
      setIsLoading(true);

      // Navigation is handled by the auth state change.
      await login(email, password);
    } catch (error: any) {
      // so-fntk: friendly text via normalizeError. The unverified-email
      // regex below still wants a string to substring-test against; we
      // also keep error.message as the regex source because that's the
      // BE-shipped phrase we're sniffing (normalizeError might rewrite
      // it for the dialog), and the Alert separately renders the
      // normalized version.
      const msg = normalizeError(error);
      const rawMsg = (typeof error?.message === 'string' && error.message) || msg;
      // so-5lt7: stopgap detector for the "unverified account" funnel.
      // Previously a fragile substring on a single BE phrase
      // ("verify your email") — any BE copy rewording silently broke the
      // login → OTP path and stranded unverified users. Broaden to a
      // regex over common phrasings until be_core ships a stable
      // error_code field (filed alongside so-5lt7 as the proper fix).
      const isUnverified =
        /\b(verify|verification|not\s*verified|unverified|confirm)\b.*\bemail\b|\bemail\b.*\b(verify|verification|not\s*verified|unverified|confirm)\b/i
          .test(rawMsg);
      if (isUnverified) {
        navigation.navigate('OTPVerification', { email });
      } else {
        showAlert({ title: 'Login Failed', message: msg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const success = await AuthService.loginWithBiometrics();
      if (success) {
        // Navigation will be handled by the auth state change
      } else {
        // so-iiw8: "Biometric authentication was not successful" was
        // jargon; tell the user what to do next.
        showAlert({
          title: 'Biometric Sign-In',
          message:
            "Biometric sign-in didn't work. Use your password instead.",
        });
      }
    } catch (error: any) {
      showError(error, { title: 'Biometric Sign-In' });
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate("ForgotPassword");
  };

  const handleSignUp = () => {
    navigation.navigate("Register");
  };

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError("");
    } else if (!emailRegex.test(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const validatePassword = (_value: string) => {
    // so-xllj #1: sign-in validates presence only. Existing users may have
    // passwords that predate the current complexity rules, so enforcing the
    // full complexity check here showed spurious errors (e.g. "must include a
    // special character") while typing a perfectly valid password. Presence
    // is already gated by isFormValid on the submit button; complexity belongs
    // on Register/Reset only.
    setPasswordError("");
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    validateEmail(value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    validatePassword(value);
  };

  const handleBackToHome = () => {
    navigation.navigate("Welcome");
  };

  const handleSocialLogin = async (provider: string) => {
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
      <View style={[styles.header, { paddingTop: insets.top }]}>
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Sign in to your SoulTalk account</Text>

          <View style={styles.form}>
            <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={emailFocused ? colors.primary : colors.text.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={emailFocused ? colors.primary : colors.text.secondary}
                value={email}
                onChangeText={handleEmailChange}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <View style={[styles.inputContainer, passwordFocused && styles.inputContainerFocused]}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={passwordFocused ? colors.primary : colors.text.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Password"
                placeholderTextColor={passwordFocused ? colors.primary : colors.text.secondary}
                value={password}
                onChangeText={handlePasswordChange}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
              />
              <Pressable
                style={({ pressed }) => [styles.eyeIcon, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={TOUCH_HITSLOP_MED}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={passwordFocused ? colors.primary : colors.text.secondary}
                />
              </Pressable>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.forgotPassword, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
              onPress={handleForgotPassword}
              accessibilityRole="link"
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                isLoading && styles.loginButtonDisabled,
                pressed && !isLoading && { opacity: TOUCH_PRESS_OPACITY },
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading, busy: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </Pressable>

            {biometricAvailable && biometricEnabled && (
              <Pressable
                style={({ pressed }) => [styles.biometricButton, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
                onPress={handleBiometricLogin}
                accessibilityRole="button"
                accessibilityLabel="Use Biometric Authentication"
              >
                <Ionicons name="finger-print-outline" size={24} color={colors.primary} />
                <Text style={styles.biometricButtonText}>
                  Use Biometric Authentication
                </Text>
              </Pressable>
            )}

            {/* so-9o1o: social buttons always visible on sign-in — terms gate
                removed. New OAuth users who never saw Terms are caught by
                PostSignupConsentScreen's universal server-driven gate. */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialContainer}>
              <Pressable
                style={({ pressed }) => [styles.socialButton, styles.googleButton, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
                onPress={() => handleSocialLogin("Google")}
                accessibilityRole="button"
                accessibilityLabel="Sign in with Google"
              >
                <FontAwesome5 name="google" size={22} color="#FFFFFF" />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.socialButton, styles.facebookButton, pressed && { opacity: TOUCH_PRESS_OPACITY }]}
                onPress={() => handleSocialLogin("Facebook")}
                accessibilityRole="button"
                accessibilityLabel="Sign in with Facebook"
              >
                <FontAwesome5 name="facebook-f" size={22} color="#FFFFFF" />
              </Pressable>

              {isAppleAvailable && (
                <Pressable
                  style={({ pressed }) => [styles.socialButton, styles.appleButton, pressed && !isAppleLoading && { opacity: TOUCH_PRESS_OPACITY }]}
                  onPress={() => handleSocialLogin("Apple")}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in with Apple"
                  accessibilityState={{ disabled: isAppleLoading, busy: isAppleLoading }}
                  disabled={isAppleLoading}
                >
                  <FontAwesome5 name="apple" size={24} color={isDarkMode ? "#000000" : "#FFFFFF"} />
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.signupText}>
              Don't have an account?{" "}
              <Text style={styles.signupLink} onPress={handleSignUp}>
                Sign Up
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* so-piu2: shared social-signup DOB step — a NEW user via social on the
          login screen gets the DOB step instead of dead-ending on dob_required. */}
      <SocialDobStep {...socialDobStep} />
    </CosmicScreen>
  );
};

export default LoginScreen;
