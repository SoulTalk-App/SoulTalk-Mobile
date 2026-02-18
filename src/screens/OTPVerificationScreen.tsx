import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../theme';

interface OTPVerificationScreenProps {
  navigation: any;
  route: any;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({ navigation, route }) => {
  const { email } = route.params;
  const { verifyOTP, resendVerificationEmail } = useAuth();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOtpChange = (value: string, index: number) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirm = useCallback(async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await verifyOTP(email, otpCode);
      // Auth state change switches to AppStack automatically (WelcomeSplash for new users)
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [otp, email, verifyOTP, navigation]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;

    try {
      setIsLoading(true);
      setError('');
      await resendVerificationEmail(email);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      Alert.alert('Code Resent', 'A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [resendCooldown, email, resendVerificationEmail]);

  const isComplete = otp.every((digit) => digit !== '');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Email</Text>

        <Text style={styles.subtitle}>
          A {OTP_LENGTH} digit verification code has been sent to{'\n'}{email}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={styles.otpInput}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0 || isLoading}>
          <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Didn't receive the code? Resend"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (!isComplete || isLoading) && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={!isComplete || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.buttonText}>Confirm</Text>
          )}
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
  title: {
    fontFamily: fonts.edensor.bold,
    fontSize: 28,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 40,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.white,
    color: colors.primary,
    fontFamily: fonts.outfit.bold,
    fontSize: 24,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.white,
    textDecorationLine: 'underline',
    marginBottom: 40,
  },
  resendTextDisabled: {
    opacity: 0.5,
    textDecorationLine: 'none',
  },
  button: {
    backgroundColor: colors.white,
    borderRadius: 12,
    height: 56,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  buttonText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 18,
    color: colors.primary,
  },
});

export default OTPVerificationScreen;
