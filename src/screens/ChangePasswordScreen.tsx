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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../theme';

const ChangePasswordScreen = ({ navigation }: any) => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validateNewPassword = (value: string) => {
    if (!value) {
      setNewPasswordError('');
      return false;
    } else if (value.length < 8) {
      setNewPasswordError('Password must be at least 8 characters');
      return false;
    } else if (!/(?=.*[a-z])/.test(value)) {
      setNewPasswordError('Must include a lowercase letter');
      return false;
    } else if (!/(?=.*[A-Z])/.test(value)) {
      setNewPasswordError('Must include an uppercase letter');
      return false;
    } else if (!/(?=.*\d)/.test(value)) {
      setNewPasswordError('Must include a number');
      return false;
    } else if (!/(?=.*[^a-zA-Z0-9])/.test(value)) {
      setNewPasswordError('Must include a special character');
      return false;
    } else {
      setNewPasswordError('');
      return true;
    }
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) {
      setConfirmPasswordError('');
      return false;
    } else if (value !== newPassword) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    } else {
      setConfirmPasswordError('');
      return true;
    }
  };

  const isFormValid = useMemo(() => {
    const passwordValid =
      newPassword.length >= 8 &&
      /(?=.*[a-z])/.test(newPassword) &&
      /(?=.*[A-Z])/.test(newPassword) &&
      /(?=.*\d)/.test(newPassword) &&
      /(?=.*[^a-zA-Z0-9])/.test(newPassword);

    return currentPassword.length > 0 && passwordValid && newPassword === confirmPassword;
  }, [currentPassword, newPassword, confirmPassword]);

  const handleChangePassword = async () => {
    if (!isFormValid) return;

    try {
      setIsLoading(true);
      await changePassword(currentPassword, newPassword);
      // changePassword calls logout — user will be redirected to login automatically
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed-outline" size={60} color={colors.white} />
            </View>

            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>
              You will be logged out after changing your password.
            </Text>

            {/* Current Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Current Password"
                placeholderTextColor={colors.text.secondary}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                <Ionicons name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="New Password"
                placeholderTextColor={colors.text.secondary}
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); validateNewPassword(v); if (confirmPassword) validateConfirmPassword(confirmPassword); }}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                autoComplete="new-password"
                passwordRules="minlength: 8; required: lower; required: upper; required: digit; required: special;"
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            {newPasswordError ? <Text style={styles.errorText}>{newPasswordError}</Text> : null}

            {/* Confirm New Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirm New Password"
                placeholderTextColor={colors.text.secondary}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); validateConfirmPassword(v); }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

            <TouchableOpacity
              style={[styles.submitButton, (!isFormValid || isLoading) && styles.submitButtonDisabled]}
              onPress={handleChangePassword}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.submitButtonText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    padding: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: -40,
  },
  iconContainer: {
    marginBottom: 24,
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
    fontSize: 14,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 56,
    backgroundColor: colors.white,
    width: '100%',
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
    position: 'absolute',
    right: 12,
    padding: 4,
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
});

export default ChangePasswordScreen;
