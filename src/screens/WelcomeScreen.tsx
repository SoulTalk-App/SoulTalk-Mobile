import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Image, Pressable } from 'react-native';
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
import { welcomeContent } from '../mocks/content';
import { colors, fonts } from '../theme';
import { resetOnboarding } from '../utils/resetOnboarding';
import { SpringConfigs, TimingConfigs, AnimationValues, ScreenAnimations } from '../animations/constants';

const SoultalkLogo = require('../../assets/images/logo/SoultalkLogo.png');

interface WelcomeScreenProps {
  navigation: any;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================
// Animated Button Component
// ============================================
const WelcomeButton: React.FC<{
  title: string;
  variant: 'primary' | 'secondary';
  onPress: () => void;
}> = ({ title, variant, onPress }) => {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(AnimationValues.buttonPressScale, SpringConfigs.snappy);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SpringConfigs.bouncy);
  }, []);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        buttonStyle,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          isPrimary ? styles.buttonTextPrimary : styles.buttonTextSecondary,
        ]}
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
};

// ============================================
// Main Welcome Screen
// ============================================
const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const logoFloat = useSharedValue(0);

  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(30);

  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(40);

  useEffect(() => {
    // Logo entrance
    logoOpacity.value = withDelay(200, withTiming(1, TimingConfigs.entrance));
    logoScale.value = withDelay(200, withSpring(1, SpringConfigs.bouncy));

    // Tagline entrance
    taglineOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    taglineTranslateY.value = withDelay(500, withSpring(0, SpringConfigs.subtle));

    // Buttons entrance
    buttonsOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
    buttonsTranslateY.value = withDelay(800, withSpring(0, SpringConfigs.subtle));

    // Subtle floating animation for logo
    logoFloat.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
          withTiming(6, { duration: 2500, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { translateY: logoFloat.value },
    ],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const handleGetStarted = () => {
    navigation.navigate('Onboarding');
  };

  const handleHaveAccount = () => {
    navigation.navigate('Login');
  };

  // DEV only
  const handleResetOnboarding = async () => {
    await resetOnboarding();
    Alert.alert('Reset', 'Onboarding reset. Reload the app.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo and Tagline Section */}
        <View style={styles.centerSection}>
          <Animated.Image
            source={SoultalkLogo}
            style={[styles.logo, logoStyle]}
            resizeMode="contain"
          />
          <Animated.Text style={[styles.tagline, taglineStyle]}>
            {welcomeContent.tagline}
          </Animated.Text>
        </View>

        {/* Buttons Section */}
        <Animated.View style={[styles.buttonsSection, buttonsStyle]}>
          <WelcomeButton
            title={welcomeContent.primaryButton}
            variant="primary"
            onPress={handleGetStarted}
          />
          <WelcomeButton
            title={welcomeContent.secondaryButton}
            variant="secondary"
            onPress={handleHaveAccount}
          />

          {/* DEV Button */}
          {__DEV__ && (
            <Pressable style={styles.devButton} onPress={handleResetOnboarding}>
              <Text style={styles.devButtonText}>DEV: Reset Onboarding</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: 228,
    height: 52,
    marginBottom: 30,
  },
  tagline: {
    fontFamily: fonts.edensor.italic,
    fontSize: 20,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 28,
  },
  buttonsSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  button: {
    width: 319,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonPrimary: {
    backgroundColor: colors.white,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  buttonText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 18,
  },
  buttonTextPrimary: {
    color: colors.primary,
  },
  buttonTextSecondary: {
    color: colors.white,
  },
  devButton: {
    marginTop: 20,
    padding: 10,
  },
  devButtonText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors.error,
  },
});

export default WelcomeScreen;
