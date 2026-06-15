import React, { useState, useEffect, useMemo, useCallback } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../contexts/AuthContext";
import AuthService from "../services/AuthService";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { useFacebookAuth } from "../hooks/useFacebookAuth";
import { useAppleAuth } from "../hooks/useAppleAuth";
import { fonts, useThemeColors } from "../theme";
import { useTheme } from "../contexts/ThemeContext";
import { CosmicScreen } from "../components/CosmicBackdrop";
import { TOUCH_HITSLOP_SMALL, TOUCH_HITSLOP_MED, TOUCH_PRESS_OPACITY } from "../components/touchPrimitives";

const USE_LOCAL_AUTH = false;

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  // so-jokw: TOS checkbox parity with RegisterScreen. Default FALSE — a
  // user landing on Login directly (reinstall, deep link, never finished
  // onboarding) must explicitly check the box. Acceptance writes the
  // same @terms_accepted AsyncStorage key onboarding uses.
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@terms_accepted')
      .then((value) => setAgreedToTerms(value === 'true'))
      .catch(() => {});
  }, []);

  const handleTermsRowPress = useCallback(async () => {
    if (agreedToTerms) {
      setAgreedToTerms(false);
      try { await AsyncStorage.removeItem('@terms_accepted'); } catch {}
    } else {
      setAgreedToTerms(true);
      try { await AsyncStorage.setItem('@terms_accepted', 'true'); } catch {}
    }
  }, [agreedToTerms]);

  // Focus states
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Validation states
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const { login, loginWithGoogle, loginWithFacebook, loginWithApple } = useAuth();

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
          paddingBottom: 20,
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
        // so-jokw: TOS checkbox row, mirrors RegisterScreen pattern.
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

  // Handle Google auth response
  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = getGoogleIdToken();
      if (idToken) {
        handleGoogleLogin(idToken);
      }
    } else if (googleResponse?.type === 'error') {
      Alert.alert('Google Sign-In Failed', googleResponse.error?.message || 'An error occurred');
    }
  }, [googleResponse]);

  // Handle Facebook auth response
  useEffect(() => {
    if (facebookResponse?.type === 'success') {
      const accessToken = getFacebookAccessToken();
      if (accessToken) {
        handleFacebookLogin(accessToken);
      }
    } else if (facebookResponse?.type === 'error') {
      Alert.alert('Facebook Login Failed', facebookResponse.error?.message || 'An error occurred');
    }
  }, [facebookResponse]);

  // Handle Apple auth response
  useEffect(() => {
    if (appleResponse?.type === 'success') {
      const identityToken = getAppleIdentityToken();
      if (identityToken) {
        handleAppleLogin(identityToken, getAppleFullName());
      }
    } else if (appleResponse?.type === 'error') {
      Alert.alert('Apple Sign-In Failed', appleResponse.error?.message || 'An error occurred');
    }
  }, [appleResponse]);

  const handleGoogleLogin = async (idToken: string) => {
    try {
      setIsLoading(true);
      await loginWithGoogle(idToken);
      // Navigation will be handled by the auth state change
    } catch (error: any) {
      Alert.alert('Google Login Failed', error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async (accessToken: string) => {
    try {
      setIsLoading(true);
      await loginWithFacebook(accessToken);
      // Navigation will be handled by the auth state change
    } catch (error: any) {
      Alert.alert('Facebook Login Failed', error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async (identityToken: string, fullName: string | null) => {
    try {
      setIsLoading(true);
      await loginWithApple(identityToken, fullName);
      // Navigation will be handled by the auth state change
    } catch (error: any) {
      Alert.alert('Apple Sign-In Failed', error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const checkBiometricStatus = async () => {
    const available = await AuthService.isBiometricAvailable();
    const enabled = await AuthService.isBiometricEnabled();
    setBiometricAvailable(available);
    setBiometricEnabled(enabled);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    try {
      setIsLoading(true);

      if (USE_LOCAL_AUTH) {
        // Local testing mode - store email and proceed
        await AsyncStorage.setItem('@soultalk_user_email', email);
        navigation.navigate('WelcomeSplash');
      } else {
        // Backend mode
        await login(email, password);
        // Navigation will be handled by the auth state change
      }
    } catch (error: any) {
      const msg = error.message || "An error occurred during login";
      // so-5lt7: stopgap detector for the "unverified account" funnel.
      // Previously a fragile substring on a single BE phrase
      // ("verify your email") — any BE copy rewording silently broke the
      // login → OTP path and stranded unverified users. Broaden to a
      // regex over common phrasings until be_core ships a stable
      // error_code field (filed alongside so-5lt7 as the proper fix).
      const isUnverified =
        /\b(verify|verification|not\s*verified|unverified|confirm)\b.*\bemail\b|\bemail\b.*\b(verify|verification|not\s*verified|unverified|confirm)\b/i
          .test(msg);
      if (isUnverified) {
        navigation.navigate('OTPVerification', { email });
      } else {
        Alert.alert("Login Failed", msg);
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
        Alert.alert(
          "Authentication Failed",
          "Biometric authentication was not successful",
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Biometric authentication failed");
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

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("");
    } else if (value.length < 8) {
      setPasswordError("Password must be at least 8 characters");
    } else if (!/(?=.*[a-z])/.test(value)) {
      setPasswordError("Password must include a lowercase letter");
    } else if (!/(?=.*[A-Z])/.test(value)) {
      setPasswordError("Password must include an uppercase letter");
    } else if (!/(?=.*\d)/.test(value)) {
      setPasswordError("Password must include a number");
    } else if (!/(?=.*[!@#$%^&*])/.test(value)) {
      setPasswordError("Password must include a special character");
    } else {
      setPasswordError("");
    }
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
    // so-jokw: defensive guard — buttons are hidden when !agreedToTerms,
    // so this should never fire unchecked.
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

            {/* so-jokw: TOS checkbox + gating, parity with RegisterScreen.
                Hydrated true on mount when @terms_accepted is set; default
                FALSE for fresh installs landing here directly. */}
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
                styles.loginButton,
                (isLoading || !agreedToTerms) && styles.loginButtonDisabled,
                pressed && !isLoading && agreedToTerms && { opacity: TOUCH_PRESS_OPACITY },
              ]}
              onPress={handleLogin}
              disabled={isLoading || !agreedToTerms}
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading || !agreedToTerms, busy: isLoading }}
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

            {/* Social Login Section. so-jokw: entire block hidden when
                terms unchecked — overseer wants buttons to disappear, not
                show as disabled. */}
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
              </>
            )}
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
    </CosmicScreen>
  );
};

export default LoginScreen;
