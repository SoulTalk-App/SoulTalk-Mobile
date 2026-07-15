import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { useAppAlert } from '../components/AppAlertProvider';

interface OTPVerificationScreenProps {
  navigation: any;
  route: any;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({ navigation, route }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  // so-1zn0: themed alert replaces native Alert.
  const { showAlert } = useAppAlert();
  // so-xllj #3: guard against nav/deep-link with no params (was crashing on
  // mount when route.params was undefined).
  const email = route.params?.email;
  const { verifyOTP, resendVerificationEmail } = useAuth();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        content: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        },
        // Light path: page-bg ink for AA on the so-u1k lavender wash.
        title: {
          fontFamily: fonts.edensor.bold,
          fontSize: 28,
          color: isDarkMode ? colors.white : colors.text.primary,
          textAlign: 'center',
          marginBottom: 12,
        },
        subtitle: {
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          color: isDarkMode ? colors.white : 'rgba(58, 14, 102, 0.85)',
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
          // Theme-aware surface (so-iao).
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : colors.white,
          borderWidth: isDarkMode ? 1 : 0,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.14)' : 'transparent',
          color: isDarkMode ? colors.white : colors.primary,
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
          color: isDarkMode ? colors.white : colors.text.primary,
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
      }),
    [colors, isDarkMode]
  );

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOtpChange = (value: string, index: number) => {
    // so-nyxy: pasted strings (length > 1) spread across remaining inputs.
    // Strip non-digits first so "123 456", "code: 123456", or the wrapper
    // text iOS auto-paste sometimes carries still resolves cleanly.
    const digits = value.replace(/\D/g, '');

    if (digits.length > 1) {
      const newOtp = [...otp];
      const slice = digits.slice(0, OTP_LENGTH - index);
      for (let i = 0; i < slice.length; i++) {
        newOtp[index + i] = slice[i];
      }
      setOtp(newOtp);
      setError('');
      const focusIndex = Math.min(index + slice.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    // Single-char path: empty (deletion) or one digit. Reject letters silently.
    if (value && !digits) return;

    const newOtp = [...otp];
    newOtp[index] = digits;
    setOtp(newOtp);
    setError('');

    if (digits && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirm = useCallback(async () => {
    if (isLoading) return;
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
      showAlert({
        title: 'Code Resent',
        message: 'A new verification code has been sent to your email.',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [resendCooldown, email, resendVerificationEmail]);

  const isComplete = otp.every((digit) => digit !== '');

  // so-ifrw: single-fire guard — prevents double-submit if isComplete flips
  // more than once in the same fill (e.g. handleConfirm reference change).
  const submittedRef = useRef(false);

  // so-ifrw: auto-submit on completion. When isComplete goes false (OTP
  // cleared on error), reset the guard so re-entry triggers a fresh submit.
  useEffect(() => {
    if (!isComplete) {
      submittedRef.current = false;
      return;
    }
    if (isLoading || submittedRef.current) return;
    submittedRef.current = true;
    handleConfirm();
  }, [isComplete, isLoading, handleConfirm]);

  return (
    <CosmicScreen tone="night">
      <SafeAreaView style={styles.container}>
        {/* so-ifrw: KAV keeps Confirm reachable when the number-pad is open.
            behavior='padding' on iOS slides the content up; 'height' on Android
            shrinks the layout to fit. */}
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* so-ifrw: tap outside inputs to dismiss the keyboard (secondary
              fallback for users who skip auto-submit). accessible=false prevents
              screen readers from announcing the whole content area as a button. */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.content}>
              <Text style={styles.title}>Verify Your Email</Text>

              <Text style={styles.subtitle}>
                A {OTP_LENGTH} digit verification code has been sent to{'\n'}{email}
              </Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      // so-xllj #4: block body so the callback returns void (React 19
                      // warns on ref callbacks that return a value).
                      inputRefs.current[index] = ref;
                    }}
                    style={styles.otpInput}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    // so-nyxy: maxLength left unbounded on the first input so the OS
                    // can paste/auto-fill the full 6-digit code into it — the paste
                    // handler then spreads digits across the rest. Other inputs keep
                    // maxLength=1 since they receive a single char at a time.
                    maxLength={index === 0 ? OTP_LENGTH : 1}
                    selectTextOnFocus
                    autoFocus={index === 0}
                    // so-nyxy: surface iOS QuickType "from messages" suggestion and
                    // Android sms-otp autofill on the first input — only one input
                    // can advertise these because they correspond to the full code.
                    textContentType={index === 0 ? 'oneTimeCode' : 'none'}
                    autoComplete={index === 0 ? 'sms-otp' : 'off'}
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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </CosmicScreen>
  );
};

export default OTPVerificationScreen;
