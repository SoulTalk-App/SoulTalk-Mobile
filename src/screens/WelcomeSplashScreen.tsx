import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SubmitIcon = require('../../assets/images/common/SubmitIcon.png');

interface WelcomeSplashScreenProps {
  navigation: any;
}

const WelcomeSplashScreen: React.FC<WelcomeSplashScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Animation values
  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const welcomeTranslateY = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animation sequence matching Figma prototype
    Animated.sequence([
      // 1. "Welcome to SoulTalk" fades in (centered position)
      Animated.timing(welcomeOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // 2. Pause for a moment to let user read
      Animated.delay(1000),
      // 3. Welcome text moves up to final position
      Animated.timing(welcomeTranslateY, {
        toValue: -80,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowForm(true);
      // Form fades in and slides up
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  const handleContinue = async () => {
    if (username.trim()) {
      await AsyncStorage.setItem('@soultalk_username', username.trim());
      navigation.navigate('SoulPalName');
    }
  };

  const handlePressIn = () => {
    if (username.trim()) {
      Animated.spring(buttonScale, {
        toValue: 0.9,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.content, { paddingTop: insets.top }]}>
          {/* Main content wrapper - centers everything vertically */}
          <View style={styles.mainWrapper}>
            {/* Welcome Text - animates from center to final position */}
            <Animated.View
              style={[
                styles.welcomeContainer,
                {
                  opacity: welcomeOpacity,
                  transform: [{ translateY: welcomeTranslateY }],
                },
              ]}
            >
              <Text style={styles.welcomeToText}>Welcome to</Text>
              <Text style={styles.soulTalkText}>SoulTalk</Text>
            </Animated.View>

            {/* Form Section - reveals after welcome animation */}
            {showForm && (
              <Animated.View
                style={[
                  styles.formSection,
                  {
                    opacity: formOpacity,
                    transform: [{ translateY: formTranslateY }],
                  },
                ]}
              >
                {/* Question */}
                <Text style={styles.question}>What should we call you?</Text>

                {/* Username Input */}
                <View style={styles.inputWrapper}>
                  <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Username"
                      placeholderTextColor="#D3C5E1"
                      value={username}
                      onChangeText={setUsername}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      autoCapitalize="words"
                      autoCorrect={false}
                      onSubmitEditing={handleContinue}
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {/* Submit Icon Button */}
                <AnimatedPressable
                  style={[
                    styles.iconButton,
                    !username.trim() && styles.iconButtonDisabled,
                    { transform: [{ scale: buttonScale }] },
                  ]}
                  onPress={handleContinue}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={!username.trim()}
                >
                  <Image
                    source={SubmitIcon}
                    style={styles.submitIcon}
                    resizeMode="contain"
                  />
                </AnimatedPressable>
              </Animated.View>
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
    backgroundColor: '#59168B',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  mainWrapper: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    paddingTop: 200, // Position content from top (Figma: y:253 approx)
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeToText: {
    fontFamily: fonts.outfit.light,
    fontSize: 48,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 48 * 1.2,
  },
  soulTalkText: {
    fontFamily: fonts.edensor.regular,
    fontSize: 56,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 56 * 1.1,
    marginTop: 8, // Gap between "Welcome to" and "SoulTalk"
  },
  formSection: {
    marginTop: 60, // Gap between welcome text and form
    alignItems: 'center',
    width: '100%',
  },
  question: {
    fontFamily: fonts.outfit.light,
    fontSize: 15,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 15 * 1.26,
  },
  inputWrapper: {
    width: 268,
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: colors.white,
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  inputContainerFocused: {
    borderWidth: 2,
    borderColor: '#4F1786',
  },
  input: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: colors.text.dark,
  },
  iconButton: {
    width: 55,
    height: 38,
    backgroundColor: colors.white,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  submitIcon: {
    width: 22,
    height: 22,
  },
});

export default WelcomeSplashScreen;
