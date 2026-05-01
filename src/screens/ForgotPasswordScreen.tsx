import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { CosmicScreen } from '../components/CosmicBackdrop';

interface ForgotPasswordScreenProps {
  navigation: any;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailError, setEmailError] = useState('');

  const { resetPassword } = useAuth();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        keyboardView: {
          flex: 1,
        },
        backButton: {
          padding: 16,
        },
        content: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
          marginTop: -60,
        },
        iconContainer: {
          marginBottom: 30,
        },
        // Light path: page-bg ink for AA on the so-u1k lavender wash.
        title: {
          fontFamily: fonts.edensor.bold,
          fontSize: 32,
          color: isDarkMode ? colors.white : colors.text.primary,
          textAlign: 'center',
          marginBottom: 16,
        },
        subtitle: {
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: isDarkMode ? colors.white : 'rgba(58, 14, 102, 0.85)',
          textAlign: 'center',
          lineHeight: 24,
          opacity: 0.9,
          marginBottom: 32,
        },
        emailText: {
          fontFamily: fonts.outfit.semiBold,
          color: isDarkMode ? colors.white : colors.text.primary,
        },
        infoBox: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 32,
        },
        infoIcon: {
          marginRight: 10,
          opacity: 0.8,
        },
        infoText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 14,
          color: isDarkMode ? colors.white : 'rgba(58, 14, 102, 0.85)',
          opacity: 0.8,
          flex: 1,
        },
        inputContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          // Theme-aware surface (so-iao).
          borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(58,14,102,0.10)',
          borderRadius: 12,
          marginBottom: 16,
          paddingHorizontal: 12,
          height: 56,
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : colors.white,
          width: '100%',
        },
        inputContainerFocused: {
          borderColor: isDarkMode ? colors.white : colors.primary,
          borderWidth: 2,
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
        errorText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 12,
          color: '#FF6B6B',
          marginBottom: 8,
          alignSelf: 'flex-start',
        },
        submitButton: {
          backgroundColor: colors.white,
          borderRadius: 12,
          height: 56,
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          marginTop: 8,
        },
        submitButtonDisabled: {
          opacity: 0.7,
        },
        submitButtonText: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 16,
          color: colors.primary,
        },
        resendButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.white,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 24,
          marginBottom: 16,
          width: '100%',
        },
        resendButtonText: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 16,
          color: colors.primary,
          marginLeft: 8,
        },
        loginButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          borderWidth: 2,
          // Light path: ink border for AA on the so-u1k lavender wash.
          borderColor: isDarkMode ? colors.white : colors.text.primary,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 24,
          width: '100%',
        },
        loginButtonText: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 16,
          color: isDarkMode ? colors.white : colors.text.primary,
          marginLeft: 8,
        },
      }),
    [colors, isDarkMode]
  );

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError('');
      return false;
    } else if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    } else {
      setEmailError('');
      return true;
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    validateEmail(value);
  };

  const handleSendResetLink = async () => {
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      await resetPassword(email);
      setEmailSent(true);
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.includes('Google or Facebook')) {
        Alert.alert(
          'Social Account',
          'This account was created using Google or Facebook. Please sign in using your original method.'
        );
      } else {
        // Still show success message for security (don't reveal if email exists)
        setEmailSent(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  if (emailSent) {
    return (
      <CosmicScreen tone="night">
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-outline" size={80} color={isDarkMode ? colors.white : colors.text.primary} />
          </View>

          <Text style={styles.title}>Check Your Email</Text>

          <Text style={styles.subtitle}>
            If an account exists with{'\n'}
            <Text style={styles.emailText}>{email}</Text>
            {'\n\n'}
            you will receive a password reset link shortly.
          </Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={isDarkMode ? colors.white : colors.text.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              If you don't see the email, check your spam folder
            </Text>
          </View>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={() => setEmailSent(false)}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
            <Text style={styles.resendButtonText}>Try Different Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleBackToLogin}
          >
            <Ionicons name="arrow-back-outline" size={20} color={isDarkMode ? colors.white : colors.text.primary} />
            <Text style={styles.loginButtonText}>Back to Login</Text>
          </TouchableOpacity>
          </View>
        </SafeAreaView>
      </CosmicScreen>
    );
  }

  return (
    <CosmicScreen tone="night">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
          <Ionicons name="chevron-back" size={24} color={isDarkMode ? colors.white : colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={80} color={isDarkMode ? colors.white : colors.text.primary} />
          </View>

          <Text style={styles.title}>Forgot Password?</Text>

          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

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
              placeholderTextColor={colors.text.secondary}
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

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSendResetLink}
            disabled={isLoading || !email}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.submitButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </CosmicScreen>
  );
};

export default ForgotPasswordScreen;
