import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../theme';

interface EmailVerifiedScreenProps {
  navigation: any;
  route: any;
}

const EmailVerifiedScreen: React.FC<EmailVerifiedScreenProps> = ({ navigation, route }) => {
  const { token } = route.params || {};
  const { verifyEmail } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (token) {
      handleVerifyEmail();
    } else {
      setIsVerifying(false);
      setErrorMessage('Invalid verification link');
    }
  }, [token]);

  const handleVerifyEmail = async () => {
    try {
      setIsVerifying(true);
      await verifyEmail(token);
      setIsSuccess(true);
    } catch (error: any) {
      setIsSuccess(false);
      setErrorMessage(error.message || 'Email verification failed. The link may have expired.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGoToLogin = () => {
    navigation.navigate('Login');
  };

  if (isVerifying) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.loadingText}>Verifying your email...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle-outline" size={100} color={colors.white} />
          </View>

          <Text style={styles.title}>Email Verified!</Text>

          <Text style={styles.subtitle}>
            Your email has been successfully verified.{'\n'}
            You can now log in to your account.
          </Text>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleGoToLogin}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle-outline" size={100} color={colors.white} />
        </View>

        <Text style={styles.title}>Verification Failed</Text>

        <Text style={styles.subtitle}>
          {errorMessage || 'We could not verify your email.'}
          {'\n\n'}
          The link may have expired or already been used.
        </Text>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleGoToLogin}
        >
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
    marginBottom: 40,
  },
  loadingText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: colors.white,
    marginTop: 20,
  },
  loginButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  loginButtonText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.primary,
  },
});

export default EmailVerifiedScreen;
