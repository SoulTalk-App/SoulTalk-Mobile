import React, { useState, useEffect } from 'react';
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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import AuthService from '../services/AuthService';
import WebStyleInjector from '../components/WebStyleInjector';
import SoulTalkLogo from '../components/SoulTalkLogo';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const { login } = useAuth();

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    const available = await AuthService.isBiometricAvailable();
    const enabled = await AuthService.isBiometricEnabled();
    setBiometricAvailable(available);
    setBiometricEnabled(enabled);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    try {
      setIsLoading(true);
      await login(username, password);
      // Navigation will be handled by the auth state change
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
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
        Alert.alert('Authentication Failed', 'Biometric authentication was not successful');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Biometric authentication failed');
    }
  };

  const handleResetPassword = () => {
    Alert.prompt(
      'Reset Password',
      'Enter your email address to receive reset instructions:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Reset Email',
          onPress: async (email) => {
            if (!email) {
              Alert.alert('Error', 'Please enter a valid email address');
              return;
            }
            try {
              setIsLoading(true);
              await AuthService.resetPassword(email);
              Alert.alert('Success', 'Password reset instructions have been sent to your email');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send reset email');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
      'plain-text',
      '',
      'email-address'
    );
  };

  const handleSignUp = () => {
    navigation.navigate('Register');
  };

  return (
    <View style={styles.container}>
      <WebStyleInjector />
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.topSection}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle} />
              <SoulTalkLogo width={100} height={22} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.bottomSection}>
            <Text style={styles.welcomeText}>Welcome</Text>
            
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="email"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={username}
                onChangeText={setUsername}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                spellCheck={false}
                autoFocus={false}
              />

              <TextInput
                style={styles.input}
                placeholder="password"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="none"
                spellCheck={false}
                autoFocus={false}
              />
            </View>

            <View style={styles.buttonContainer}>
              <View style={styles.leftButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { width: 58 }]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>login</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { width: 71, marginLeft: 13 }]}
                  onPress={handleSignUp}
                >
                  <Text style={styles.buttonText}>signup</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.actionButton, { width: 143 }]}
                onPress={handleResetPassword}
              >
                <Text style={styles.buttonText}>reset password</Text>
              </TouchableOpacity>
            </View>

            {biometricAvailable && biometricEnabled && (
              <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin}>
                <Ionicons name="finger-print-outline" size={24} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 30,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  bottomSection: {
    paddingBottom: 50,
  },
  welcomeText: {
    fontSize: 36,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 30,
    marginLeft: 5,
  },
  form: {
    marginBottom: 20,
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    width: 324,
    alignSelf: 'center',
  },
  leftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  biometricButton: {
    alignSelf: 'center',
    padding: 15,
  },
});

export default LoginScreen;