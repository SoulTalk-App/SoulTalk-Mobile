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
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../theme';

const SoulpalCharacter = require('../../assets/images/onboarding/soulpal_main.png');
const SubmitIcon = require('../../assets/images/common/SubmitIcon.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SoulPalNameScreenProps {
  navigation: any;
}

const SoulPalNameScreen: React.FC<SoulPalNameScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [soulPalName, setSoulPalName] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  // Animation values
  const characterOpacity = useSharedValue(0);
  const characterScale = useSharedValue(0.8);
  const characterRotation = useSharedValue(0);

  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(30);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // Character entrance
    characterOpacity.value = withTiming(1, { duration: 500 });
    characterScale.value = withSpring(1, { damping: 12, stiffness: 100 });

    // Form fades in
    formOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    formTranslateY.value = withDelay(300, withSpring(0, { damping: 15, stiffness: 100 }));

    // Continuous 3D wobble animation - rotates back and forth around Y axis
    characterRotation.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(180, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1, // Infinite repeat
        false
      )
    );
  }, []);

  const handleContinue = async () => {
    if (soulPalName.trim()) {
      await AsyncStorage.setItem('@soultalk_soulpal_name', soulPalName.trim());
      navigation.navigate('SetupComplete');
    }
  };

  const handlePressIn = useCallback(() => {
    if (soulPalName.trim()) {
      buttonScale.value = withSpring(0.9, { damping: 10, stiffness: 400 });
    }
  }, [soulPalName]);

  const handlePressOut = useCallback(() => {
    buttonScale.value = withSpring(1, { damping: 8, stiffness: 200 });
  }, []);

  // Animated styles
  const characterAnimatedStyle = useAnimatedStyle(() => ({
    opacity: characterOpacity.value,
    transform: [
      { perspective: 800 },
      { scale: characterScale.value },
      { rotateY: `${characterRotation.value}deg` },
    ],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: soulPalName.trim() ? 1 : 0.5,
  }));

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.content, { paddingTop: insets.top }]}>
          {/* Main content wrapper */}
          <View style={styles.mainWrapper}>
            {/* SoulPal Character - Floating */}
            <Animated.View style={[styles.characterContainer, characterAnimatedStyle]}>
              <Image
                source={SoulpalCharacter}
                style={styles.characterImage}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Form Section */}
            <Animated.View style={[styles.formSection, formAnimatedStyle]}>
              {/* Question */}
              <Text style={styles.question}>What would you like to name your SoulPal?</Text>

              {/* SoulPal Name Input */}
              <View style={styles.inputWrapper}>
                <View style={[styles.inputContainer, inputFocused && styles.inputContainerFocused]}>
                  <TextInput
                    style={styles.input}
                    placeholder="SoulPal"
                    placeholderTextColor="#D3C5E1"
                    value={soulPalName}
                    onChangeText={setSoulPalName}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    onSubmitEditing={handleContinue}
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Submit Icon Button */}
              <AnimatedPressable
                style={[styles.iconButton, buttonAnimatedStyle]}
                onPress={handleContinue}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={!soulPalName.trim()}
              >
                <Image
                  source={SubmitIcon}
                  style={styles.submitIcon}
                  resizeMode="contain"
                />
              </AnimatedPressable>
            </Animated.View>
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
    paddingTop: 120, // Position content from top
  },
  characterContainer: {
    alignItems: 'center',
  },
  characterImage: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.55,
  },
  formSection: {
    marginTop: 40, // Gap between character and form
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
    paddingHorizontal: 40,
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
  submitIcon: {
    width: 22,
    height: 22,
  },
});

export default SoulPalNameScreen;
