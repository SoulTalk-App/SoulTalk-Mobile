import React, { useState } from 'react';
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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import GhostIllustration from '../components/GhostIllustration';
import WebStyleInjector from '../components/WebStyleInjector';

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const validateForm = () => {
    const { email, username, password } = formData;

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return false;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }

    if (!acceptTerms) {
      Alert.alert('Error', 'Please accept the Privacy Policy and Community Guidelines');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      await register({
        email: formData.email,
        password: formData.password,
        username: formData.username,
      });

      Alert.alert(
        'Registration Successful',
        'Welcome to SoulTalk!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <WebStyleInjector />
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create a New{"\n"}Account</Text>
          </View>

          <View style={styles.ghostContainer}>
            <GhostIllustration width={228} height={312} color="#FFFFFF" />
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="email"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
            />

            <TextInput
              style={styles.input}
              placeholder="username"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={formData.username}
              onChangeText={(value) => handleInputChange('username', value)}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
            />

            <TextInput
              style={[styles.input, { marginBottom: 15 }]}
              placeholder="password"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
            />

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAcceptTerms(!acceptTerms)}
              >
                <View style={[styles.checkboxInner, acceptTerms && styles.checkboxChecked]} />
              </TouchableOpacity>
              <Text style={styles.checkboxText}>
                I accept the Privacy Policy and consent to the processing of my personal information in accordance with it.
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { width: 58 }]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>go</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { width: 77 }]}
              onPress={handleBack}
            >
              <Text style={styles.buttonText}>back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 50,
    marginLeft: 35,
  },
  title: {
    fontSize: 40,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 50,
    width: 243,
    height: 100,
  },
  ghostContainer: {
    alignItems: 'center',
    marginBottom: 50,
    marginTop: 30,
  },
  form: {
    marginBottom: 30,
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#3D3D3D',
    borderRadius: 5,
    height: 38,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '100',
    color: '#FFFFFF',
    marginBottom: 11,
    width: 324,
    borderWidth: 0,
    borderColor: 'transparent',
    ...(Platform.OS === 'web' && {
      outline: 'none',
      outlineStyle: 'none',
      outlineWidth: 0,
      outlineColor: 'transparent',
      border: 'none',
      borderStyle: 'none',
      borderWidth: 0,
      borderColor: 'transparent',
      boxShadow: 'none',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      appearance: 'none',
      WebkitBoxShadow: 'none',
      MozBoxShadow: 'none',
      backgroundColor: '#3D3D3D !important',
      WebkitBackgroundClip: 'padding-box',
      backgroundClip: 'padding-box',
      WebkitTextFillColor: '#FFFFFF',
      caretColor: '#FFFFFF',
    }),
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 25,
    marginTop: 20,
    paddingHorizontal: 35,
    width: '100%',
  },
  checkbox: {
    width: 21,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#FFFFFF',
  },
  checkboxText: {
    flex: 1,
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 10,
    fontWeight: '400',
    maxWidth: 299,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 35,
    width: '100%',
  },
  actionButton: {
    backgroundColor: '#3D3D3D',
    borderRadius: 10,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '100',
    textAlign: 'center',
  },
});

export default RegisterScreen;