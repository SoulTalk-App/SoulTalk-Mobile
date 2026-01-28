import React, { useState, useMemo, useRef, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../theme';

const AuthIcon = require("../../assets/images/authentication/AutheticationIcon.png");

// TODO: Set to false when backend is ready
const USE_LOCAL_AUTH = true;

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Error states
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Animation for peeking image
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const { register } = useAuth();

  useEffect(() => {
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const validateField = (field: string, value: string) => {
    let error = '';

    switch (field) {
      case 'firstName':
        if (value && !/^[a-zA-Z\s'-]+$/.test(value)) {
          error = 'First name can only contain letters';
        }
        break;
      case 'lastName':
        if (value && !/^[a-zA-Z\s'-]+$/.test(value)) {
          error = 'Last name can only contain letters';
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'password':
        if (value) {
          if (value.length < 8) {
            error = 'Password must be at least 8 characters';
          } else if (!/(?=.*[a-z])/.test(value)) {
            error = 'Password must include a lowercase letter';
          } else if (!/(?=.*[A-Z])/.test(value)) {
            error = 'Password must include an uppercase letter';
          } else if (!/(?=.*\d)/.test(value)) {
            error = 'Password must include a number';
          } else if (!/(?=.*[!@#$%^&*])/.test(value)) {
            error = 'Password must include a special character';
          }
        }
        break;
      case 'confirmPassword':
        if (value && value !== formData.password) {
          error = 'Passwords do not match';
        }
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    validateField(field, value);

    // Also validate confirmPassword when password changes
    if (field === 'password' && formData.confirmPassword) {
      if (value !== formData.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      } else {
        setErrors(prev => ({ ...prev, confirmPassword: '' }));
      }
    }
  };

  const isFormValid = useMemo(() => {
    const { firstName, lastName, email, password, confirmPassword } = formData;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordValid =
      password.length >= 8 &&
      /(?=.*[a-z])/.test(password) &&
      /(?=.*[A-Z])/.test(password) &&
      /(?=.*\d)/.test(password) &&
      /(?=.*[!@#$%^&*])/.test(password);

    return (
      firstName.trim() !== '' &&
      lastName.trim() !== '' &&
      emailRegex.test(email) &&
      passwordValid &&
      password === confirmPassword &&
      agreedToTerms
    );
  }, [formData, agreedToTerms]);

  const handleRegister = async () => {
    try {
      setIsLoading(true);

      if (USE_LOCAL_AUTH) {
        // Local testing mode - store user data locally and proceed
        await AsyncStorage.setItem('@soultalk_user_email', formData.email);
        await AsyncStorage.setItem('@soultalk_user_firstname', formData.firstName);
        await AsyncStorage.setItem('@soultalk_user_lastname', formData.lastName);
        // Navigate to verification flow (email verification)
        navigation.navigate('VerificationSent');
      } else {
        // Backend mode
        await register({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
        });

        Alert.alert(
          'Registration Successful',
          'Please check your email to verify your account before logging in.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  const handleBackToHome = () => {
    navigation.navigate('Welcome');
  };

  const handleTermsPress = () => {
    navigation.navigate('Terms');
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert('Coming Soon', `${provider} login will be available soon.`);
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.subtitle}>Join SoulTalk today</Text>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.halfWidthWrapper}>
                <View style={[styles.inputContainer, styles.halfWidth, focusedField === 'firstName' && styles.inputContainerFocused]}>
                  <Ionicons name="person-outline" size={20} color={focusedField === 'firstName' ? colors.primary : colors.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    placeholderTextColor={focusedField === 'firstName' ? colors.primary : colors.text.secondary}
                    value={formData.firstName}
                    onChangeText={(value) => handleInputChange('firstName', value)}
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
                {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
              </View>

              <View style={styles.halfWidthWrapper}>
                <View style={[styles.inputContainer, styles.halfWidth, focusedField === 'lastName' && styles.inputContainerFocused]}>
                  <Ionicons name="person-outline" size={20} color={focusedField === 'lastName' ? colors.primary : colors.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    placeholderTextColor={focusedField === 'lastName' ? colors.primary : colors.text.secondary}
                    value={formData.lastName}
                    onChangeText={(value) => handleInputChange('lastName', value)}
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
                {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
              </View>
            </View>

            <View style={[styles.inputContainer, focusedField === 'email' && styles.inputContainerFocused]}>
              <Ionicons name="mail-outline" size={20} color={focusedField === 'email' ? colors.primary : colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={focusedField === 'email' ? colors.primary : colors.text.secondary}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

            <View style={[styles.inputContainer, focusedField === 'password' && styles.inputContainerFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'password' ? colors.primary : colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Password"
                placeholderTextColor={focusedField === 'password' ? colors.primary : colors.text.secondary}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={focusedField === 'password' ? colors.primary : colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

            <View style={[styles.inputContainer, focusedField === 'confirmPassword' && styles.inputContainerFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'confirmPassword' ? colors.primary : colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirm Password"
                placeholderTextColor={focusedField === 'confirmPassword' ? colors.primary : colors.text.secondary}
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={focusedField === 'confirmPassword' ? colors.primary : colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

            {/* Password Requirements */}
            <View style={styles.passwordRequirements}>
              <Text style={styles.requirementsTitle}>Password must contain:</Text>
              <Text style={styles.requirement}>• At least 8 characters</Text>
              <Text style={styles.requirement}>• One uppercase letter</Text>
              <Text style={styles.requirement}>• One lowercase letter</Text>
              <Text style={styles.requirement}>• One number</Text>
              <Text style={styles.requirement}>• One special character (!@#$%^&*)</Text>
            </View>

            {/* Terms and Privacy Checkbox */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && <Ionicons name="checkmark" size={16} color={colors.white} />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink} onPress={handleTermsPress}>
                  Terms and Privacy
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.registerButton,
                !isFormValid && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.registerButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            {/* Social Login Section */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton]}
                onPress={() => handleSocialLogin('Google')}
              >
                <FontAwesome5 name="google" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.facebookButton]}
                onPress={() => handleSocialLogin('Facebook')}
              >
                <FontAwesome5 name="facebook-f" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton]}
                onPress={() => handleSocialLogin('Apple')}
              >
                <FontAwesome5 name="apple" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.signinText}>
              Already have an account?{' '}
              <Text style={styles.signinLink} onPress={handleSignIn}>
                Sign In
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: colors.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    position: 'relative',
    overflow: 'visible',
  },
  peekingImageContainer: {
    position: 'absolute',
    left: -30,
    top: 12,
    zIndex: 10,
  },
  peekingImage: {
    width: 120,
    height: 120,
    transform: [{ rotate: '15deg' }],
  },
  title: {
    fontFamily: fonts.edensor.bold,
    fontSize: 28,
    color: colors.primary,
    textAlign: 'left',
    marginTop: 20,
    marginBottom: 4,
    marginLeft: 70,
  },
  subtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'left',
    marginBottom: 30,
    marginLeft: 70,
  },
  form: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidthWrapper: {
    width: '48%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 56,
    backgroundColor: colors.white,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  halfWidth: {
    width: '100%',
    marginBottom: 0,
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
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  passwordRequirements: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.overlay,
    borderRadius: 12,
  },
  requirementsTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.primary,
    marginBottom: 8,
  },
  requirement: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
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
  termsLink: {
    fontFamily: fonts.outfit.semiBold,
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  registerButtonDisabled: {
    backgroundColor: colors.button.disabled,
  },
  registerButtonText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.white,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: '#EA4335',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  footer: {
    alignItems: 'center',
    marginTop: -30,
  },
  signinText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: colors.text.secondary,
  },
  signinLink: {
    fontFamily: fonts.outfit.semiBold,
    color: colors.primary,
  },
});

export default RegisterScreen;
