import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';

interface OTPVerificationScreenProps {
  navigation: any;
}

// TODO: Remove before production - Test OTP code
const TEST_OTP = '1234';

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({ navigation }) => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace - move to previous input
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirm = () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      Alert.alert('Error', 'Please enter a 4-digit code');
      return;
    }

    // For testing - validate against test OTP
    if (otpCode !== TEST_OTP) {
      Alert.alert('Invalid Code', 'Please enter the correct verification code.');
      return;
    }

    navigation.navigate('TransitionSplash');
  };

  const handleResend = () => {
    Alert.alert('Code Resent', 'A new verification code has been sent to your email.');
  };

  const isComplete = otp.every((digit) => digit !== '');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Email</Text>

        <Text style={styles.subtitle}>
          Enter the 4-digit code sent to your email
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

        <TouchableOpacity onPress={handleResend}>
          <Text style={styles.resendText}>Didn't receive the code? Resend</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !isComplete && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={!isComplete}
        >
          <Text style={styles.buttonText}>Confirm</Text>
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
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    ...typography.body,
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 40,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 30,
  },
  otpInput: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  resendText: {
    ...typography.body,
    color: colors.white,
    opacity: 0.8,
    textDecorationLine: 'underline',
    marginBottom: 40,
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
    ...typography.button,
    color: colors.primary,
  },
});

export default OTPVerificationScreen;
