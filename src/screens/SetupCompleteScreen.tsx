import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../theme';
import { SpringConfigs, TimingConfigs, AnimationValues } from '../animations/constants';

const CharacterDiscover = require('../../assets/images/onboarding/Carousel3.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SetupCompleteScreenProps {
  navigation: any;
}

const SetupCompleteScreen: React.FC<SetupCompleteScreenProps> = ({ navigation }) => {
  const { setLocalAuth } = useAuth();

  // Animation values
  const imageScale = useSharedValue(0.8);
  const imageOpacity = useSharedValue(0);
  const imageFloat = useSharedValue(0);
  const imageRotation = useSharedValue(0);

  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);

  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(30);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(30);
  const buttonScale = useSharedValue(1);

  // Celebration particles
  const particle1Opacity = useSharedValue(0);
  const particle1Y = useSharedValue(0);
  const particle2Opacity = useSharedValue(0);
  const particle2Y = useSharedValue(0);
  const particle3Opacity = useSharedValue(0);
  const particle3Y = useSharedValue(0);

  useEffect(() => {
    // Image entrance with bounce
    imageOpacity.value = withDelay(200, withTiming(1, TimingConfigs.entrance));
    imageScale.value = withDelay(200, withSpring(1, SpringConfigs.bouncy));

    // Title
    titleOpacity.value = withDelay(500, withTiming(1, TimingConfigs.entrance));
    titleTranslateY.value = withDelay(500, withSpring(0, SpringConfigs.subtle));

    // Subtitle
    subtitleOpacity.value = withDelay(700, withTiming(1, TimingConfigs.entrance));
    subtitleTranslateY.value = withDelay(700, withSpring(0, SpringConfigs.subtle));

    // Button
    buttonOpacity.value = withDelay(900, withTiming(1, TimingConfigs.entrance));
    buttonTranslateY.value = withDelay(900, withSpring(0, SpringConfigs.subtle));

    // Celebration particles
    particle1Opacity.value = withDelay(300, withTiming(1, { duration: 300 }));
    particle2Opacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    particle3Opacity.value = withDelay(500, withTiming(1, { duration: 300 }));

    particle1Y.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(-80, { duration: 1500, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        3,
        false
      )
    );
    particle2Y.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(-100, { duration: 1800, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        3,
        false
      )
    );
    particle3Y.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(-60, { duration: 1400, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        3,
        false
      )
    );

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

  const handleContinue = async () => {
    await AsyncStorage.setItem('@soultalk_local_auth', 'true');
    setLocalAuth(true);
  };

  const handleBackToStart = () => {
    navigation.navigate('WelcomeSplash');
  };

  const handlePressIn = useCallback(() => {
    buttonScale.value = withSpring(AnimationValues.buttonPressScale, SpringConfigs.snappy);
  }, []);

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

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [
      { translateY: buttonTranslateY.value },
      { scale: buttonScale.value },
    ],
  }));

  const particle1Style = useAnimatedStyle(() => ({
    opacity: particle1Opacity.value * (1 - Math.abs(particle1Y.value) / 80),
    transform: [{ translateY: particle1Y.value }, { translateX: -40 }],
  }));

  const particle2Style = useAnimatedStyle(() => ({
    opacity: particle2Opacity.value * (1 - Math.abs(particle2Y.value) / 100),
    transform: [{ translateY: particle2Y.value }, { translateX: 0 }],
  }));

  const particle3Style = useAnimatedStyle(() => ({
    opacity: particle3Opacity.value * (1 - Math.abs(particle3Y.value) / 60),
    transform: [{ translateY: particle3Y.value }, { translateX: 40 }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Character Image with Particles */}
        <View style={styles.imageSection}>
          {/* Celebration particles */}
          <Animated.View style={[styles.particle, particle1Style]}>
            <View style={[styles.particleDot, { backgroundColor: colors.accent.yellow }]} />
          </Animated.View>
          <Animated.View style={[styles.particle, particle2Style]}>
            <View style={[styles.particleDot, { backgroundColor: colors.accent.pink }]} />
          </Animated.View>
          <Animated.View style={[styles.particle, particle3Style]}>
            <View style={[styles.particleDot, { backgroundColor: colors.accent.cyan }]} />
          </Animated.View>

          <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
            <Image
              source={CharacterDiscover}
              style={styles.image}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Title */}
        <Animated.Text style={[styles.title, titleAnimatedStyle]}>
          You're all set!
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
          Your account is ready.{'\n'}
          Let's start your SoulTalk journey!
        </Animated.Text>

        {/* Continue Button */}
        <AnimatedPressable
          style={[styles.button, buttonAnimatedStyle]}
          onPress={handleContinue}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </AnimatedPressable>

        {/* DEV Buttons */}
        {__DEV__ && (
          <Pressable style={styles.devButton} onPress={handleBackToStart}>
            <Text style={styles.devButtonText}>DEV: Back to Start</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  imageSection: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  particle: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -4,
  },
  particleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
  },
  title: {
    fontFamily: fonts.edensor.bold,
    fontSize: 32,
    color: colors.text.dark,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: fonts.outfit.light,
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 50,
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
  devButton: {
    marginTop: 30,
    padding: 10,
    alignItems: 'center',
  },
  devButtonText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors.error,
  },
});

export default SetupCompleteScreen;
