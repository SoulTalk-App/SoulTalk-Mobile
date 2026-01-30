import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../theme';
import { SpringConfigs, TimingConfigs, AnimationValues } from '../animations/constants';

const CharacterSoulpal = require('../../assets/images/onboarding/Carousel2b.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SoulPalNameScreenProps {
  navigation: any;
}

const SoulPalNameScreen: React.FC<SoulPalNameScreenProps> = ({ navigation }) => {
  const [soulPalName, setSoulPalName] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  // Animation values
  const imageScale = useSharedValue(0.8);
  const imageOpacity = useSharedValue(0);
  const imageFloat = useSharedValue(0);
  const imageRotation = useSharedValue(0);

  const questionOpacity = useSharedValue(0);
  const questionTranslateY = useSharedValue(30);

  const inputOpacity = useSharedValue(0);
  const inputTranslateY = useSharedValue(30);
  const inputBorderColor = useSharedValue(0);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(30);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // Staggered entrance animations
    // Image comes in first with bounce
    imageOpacity.value = withDelay(200, withTiming(1, TimingConfigs.entrance));
    imageScale.value = withDelay(200, withSpring(1, SpringConfigs.bouncy));

    // Question text
    questionOpacity.value = withDelay(400, withTiming(1, TimingConfigs.entrance));
    questionTranslateY.value = withDelay(400, withSpring(0, SpringConfigs.subtle));

    // Input field
    inputOpacity.value = withDelay(600, withTiming(1, TimingConfigs.entrance));
    inputTranslateY.value = withDelay(600, withSpring(0, SpringConfigs.subtle));

    // Button
    buttonOpacity.value = withDelay(800, withTiming(1, TimingConfigs.entrance));
    buttonTranslateY.value = withDelay(800, withSpring(0, SpringConfigs.subtle));

    // Continuous floating animation for image
    imageFloat.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(-AnimationValues.floatDistance, {
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(AnimationValues.floatDistance, {
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      )
    );

    // Subtle rotation
    imageRotation.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(-AnimationValues.floatRotation, {
            duration: 2800,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(AnimationValues.floatRotation, {
            duration: 2800,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      )
    );
  }, []);

  // Update input border animation on focus
  useEffect(() => {
    inputBorderColor.value = withTiming(inputFocused ? 1 : 0, TimingConfigs.fast);
  }, [inputFocused]);

  const handleContinue = async () => {
    if (soulPalName.trim()) {
      await AsyncStorage.setItem('@soultalk_soulpal_name', soulPalName.trim());
      navigation.navigate('SetupComplete');
    }
  };

  const handlePressIn = useCallback(() => {
    if (soulPalName.trim()) {
      buttonScale.value = withSpring(AnimationValues.buttonPressScale, SpringConfigs.snappy);
    }
  }, [soulPalName]);

  const handlePressOut = useCallback(() => {
    buttonScale.value = withSpring(1, SpringConfigs.bouncy);
  }, []);

  // Animated styles
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [
      { scale: imageScale.value },
      { translateY: imageFloat.value },
      { rotate: `${imageRotation.value}deg` },
    ],
  }));

  const questionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: questionOpacity.value,
    transform: [{ translateY: questionTranslateY.value }],
  }));

  const inputContainerStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
    transform: [{ translateY: inputTranslateY.value }],
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      inputBorderColor.value,
      [0, 1],
      ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.8)']
    ),
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value * (soulPalName.trim() ? 1 : 0.5),
    transform: [
      { translateY: buttonTranslateY.value },
      { scale: buttonScale.value },
    ],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Character Image */}
          <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
            <Image
              source={CharacterSoulpal}
              style={styles.image}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Question */}
          <Animated.Text style={[styles.question, questionAnimatedStyle]}>
            What would you like to name your SoulPal?
          </Animated.Text>

          {/* Input */}
          <Animated.View style={[styles.inputWrapper, inputContainerStyle]}>
            <Animated.View style={[styles.inputContainer, inputAnimatedStyle]}>
              <TextInput
                style={styles.input}
                placeholder="Enter a name"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={soulPalName}
                onChangeText={setSoulPalName}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </Animated.View>
          </Animated.View>

          {/* Continue Button */}
          <AnimatedPressable
            style={[styles.button, buttonAnimatedStyle]}
            onPress={handleContinue}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={!soulPalName.trim()}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </AnimatedPressable>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    marginBottom: 40,
  },
  image: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
  },
  question: {
    fontFamily: fonts.edensor.medium,
    fontSize: 24,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 32,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 24,
  },
  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  input: {
    height: 48,
    width: '100%',
    paddingHorizontal: 16,
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: colors.white,
  },
  button: {
    backgroundColor: colors.white,
    borderRadius: 10,
    height: 48,
    width: 319,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 18,
    color: colors.primary,
  },
});

export default SoulPalNameScreen;
