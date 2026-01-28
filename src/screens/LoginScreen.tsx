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
import { colors, fonts } from "../theme";

const AuthIcon = require("../../assets/images/authentication/AutheticationIcon.png");

// TODO: Set to false when backend is ready
const USE_LOCAL_AUTH = true;

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

  // Animation for peeking image
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const { login } = useAuth();

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
      Alert.alert(
        "Login Failed",
        error.message || "An error occurred during login",
      );
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
    Alert.alert("Coming Soon", "Password reset will be available soon.");
  };

  const handleSignUp = () => {
    navigation.navigate("Register");
  };

  const handleBackToHome = () => {
    navigation.navigate("Welcome");
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert("Coming Soon", `${provider} login will be available soon.`);
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

        {/* Peeking Auth Icon */}
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
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={colors.text.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.text.secondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.text.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Password"
                placeholderTextColor={colors.text.secondary}
                value={password}
                onChangeText={setPassword}
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
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>

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
                style={styles.socialButton}
                onPress={() => handleSocialLogin("Google")}
              >
                <FontAwesome5 name="google" size={24} color="#DB4437" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin("Facebook")}
              >
                <FontAwesome5 name="facebook-f" size={24} color="#1877F2" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialLogin("Apple")}
              >
                <FontAwesome5 name="apple" size={24} color="#000000" />
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
    position: "relative",
    overflow: "visible",
  },
  peekingImageContainer: {
    position: "absolute",
    left: -20,
    bottom: -30,
    zIndex: 10,
  },
  peekingImage: {
    width: 80,
    height: 80,
    transform: [{ rotate: "15deg" }],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: fonts.edensor.bold,
    fontSize: 20,
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
  },
  title: {
    fontFamily: fonts.edensor.bold,
    fontSize: 28,
    color: colors.primary,
    textAlign: "left",
    marginTop: 10,
    marginBottom: 8,
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 56,
    backgroundColor: colors.white,
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
    height: 56,
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
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
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
