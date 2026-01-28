import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../theme';

const SoultalkLogo = require('../../assets/images/logo/SoultalkLogo.png');

interface WelcomeSplashScreenProps {
  navigation: any;
}

const WelcomeSplashScreen: React.FC<WelcomeSplashScreenProps> = ({ navigation }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showLogo, setShowLogo] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [username, setUsername] = useState('');
  const fullText = 'Welcome to';
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const inputFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        // Show the logo after "Welcome to" animation
        setTimeout(() => {
          setShowLogo(true);
          Animated.timing(logoFadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start(() => {
            // After logo appears, show the input section
            setTimeout(() => {
              setShowInput(true);
              Animated.timing(inputFadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }).start();
            }, 800);
          });
        }, 300);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [logoFadeAnim, inputFadeAnim]);

  const handleContinue = async () => {
    if (username.trim()) {
      await AsyncStorage.setItem('@soultalk_username', username.trim());
      navigation.navigate('SoulPalName');
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Welcome to text */}
          <View style={styles.welcomeSection}>
            <View style={styles.textRow}>
              <Text style={styles.welcomeText}>{displayedText}</Text>
              {!showLogo && <Text style={styles.cursor}>|</Text>}
            </View>

            {/* SoulTalk Logo */}
            {showLogo && (
              <Animated.View style={{ opacity: logoFadeAnim }}>
                <Image
                  source={SoultalkLogo}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </Animated.View>
            )}
          </View>

          {/* Input section - appears on same purple background */}
          {showInput && (
            <Animated.View
              style={[
                styles.inputSection,
                { opacity: inputFadeAnim },
              ]}
            >
              <Text style={styles.question}>What should we call you?</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="words"
                autoCorrect={false}
                autoFocus
              />

              <TouchableOpacity
                style={[
                  styles.button,
                  !username.trim() && styles.buttonDisabled,
                ]}
                onPress={handleContinue}
                disabled={!username.trim()}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 28,
    color: colors.white,
    letterSpacing: 1,
  },
  cursor: {
    fontFamily: fonts.edensor.light,
    fontSize: 28,
    color: colors.white,
    opacity: 0.8,
  },
  logo: {
    width: 200,
    height: 44,
    tintColor: colors.white,
  },
  inputSection: {
    width: '100%',
    alignItems: 'center',
  },
  question: {
    fontFamily: fonts.edensor.semiBold,
    fontSize: 22,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    height: 56,
    width: '100%',
    paddingHorizontal: 16,
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: colors.white,
    marginBottom: 24,
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
    fontSize: 16,
    color: colors.primary,
  },
});

export default WelcomeSplashScreen;
