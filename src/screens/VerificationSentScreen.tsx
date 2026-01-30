import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../theme';

interface VerificationSentScreenProps {
  navigation: any;
  route: any;
}

const VerificationSentScreen: React.FC<VerificationSentScreenProps> = ({ navigation, route }) => {
  const { email } = route.params || {};
  const { resendVerificationEmail } = useAuth();
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'Email address not available');
      return;
    }

    try {
      setIsResending(true);
      await resendVerificationEmail(email);
      Alert.alert('Success', 'Verification email has been resent. Please check your inbox.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={80} color={colors.white} />
        </View>

        <Text style={styles.title}>Check Your Email</Text>

        <Text style={styles.subtitle}>
          We've sent a verification link to{'\n'}
          <Text style={styles.emailText}>{email || 'your email'}</Text>
          {'\n\n'}
          Click the link in your email to verify your account.
        </Text>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.white} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            If you don't see the email, check your spam folder
          </Text>
        </View>

        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResendEmail}
          disabled={isResending}
        >
          {isResending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={20} color={colors.primary} />
              <Text style={styles.resendButtonText}>Resend Verification Email</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleGoToLogin}
        >
          <Ionicons name="arrow-back-outline" size={20} color={colors.white} />
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontFamily: fonts.edensor.bold,
    fontSize: 32,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
    marginBottom: 24,
  },
  emailText: {
    fontFamily: fonts.outfit.semiBold,
    color: colors.white,
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
    color: colors.white,
    opacity: 0.8,
    flex: 1,
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
    borderColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
  },
  loginButtonText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.white,
    marginLeft: 8,
  },
});

export default VerificationSentScreen;
