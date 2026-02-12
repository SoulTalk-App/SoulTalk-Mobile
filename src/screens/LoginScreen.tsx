import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../contexts/AuthContext";
import AuthService from "../services/AuthService";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { useFacebookAuth } from "../hooks/useFacebookAuth";
import { colors, fonts } from "../theme";

const AuthIcon = require("../../assets/images/authentication/AutheticationIcon.png");
const SSOIcon = require("../../assets/images/authentication/SingleSignOnIcon.png");

const USE_LOCAL_AUTH = false;

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
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

  // Animation for peeking image
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const { login, loginWithGoogle, loginWithFacebook } = useAuth();

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

  useEffect(() => {
    checkBiometricStatus();
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
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
      if (msg.toLowerCase().includes("verify your email")) {
        // Unverified account — send them to OTP screen
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
    if (provider === 'Google') {
      await promptGoogleAsync();
    } else if (provider === 'Facebook') {
      await promptFacebookAsync();
    } else if (provider === 'SSO') {
      Alert.alert("Coming Soon", "SSO login will be available soon.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Purple Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToHome}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
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
          {/* Peeking Auth Icon from left edge */}
          <Animated.View
            style={[
              styles.peekingImageContainer,
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <Image
              source={AuthIcon}
              style={styles.peekingImage}
              resizeMode="contain"
            />
          </Animated.View>

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
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={passwordFocused ? colors.primary : colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {biometricAvailable && biometricEnabled && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
              >
                <Ionicons name="finger-print-outline" size={24} color={colors.primary} />
                <Text style={styles.biometricButtonText}>
                  Use Biometric Authentication
                </Text>
              </TouchableOpacity>
            )}

            {/* Social Login Section */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton]}
                onPress={() => handleSocialLogin("Google")}
              >
                <FontAwesome5 name="google" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.facebookButton]}
                onPress={() => handleSocialLogin("Facebook")}
              >
                <FontAwesome5 name="facebook-f" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.ssoButton]}
                onPress={() => handleSocialLogin("SSO")}
              >
                <Image source={SSOIcon} style={styles.ssoIcon} resizeMode="contain" />
              </TouchableOpacity>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: colors.primary,
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
    color: colors.white,
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
    position: "relative",
    overflow: "visible",
  },
  peekingImageContainer: {
    position: "absolute",
    left: -30,
    top: 12,
    zIndex: 10,
  },
  peekingImage: {
    width: 120,
    height: 120,
    transform: [{ rotate: "15deg" }],
  },
  title: {
    fontFamily: fonts.edensor.bold,
    fontSize: 28,
    color: colors.primary,
    textAlign: "left",
    marginTop: 20,
    marginBottom: 4,
    marginLeft: 55,
  },
  subtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: "left",
    marginBottom: 30,
    marginLeft: 55,
  },
  form: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 56,
    backgroundColor: colors.white,
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
  ssoButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
  },
  ssoIcon: {
    width: 40,
    height: 40,
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
});

export default LoginScreen;
