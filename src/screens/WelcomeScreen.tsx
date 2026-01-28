import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { welcomeContent } from "../mocks/content";
import { colors, fonts } from "../theme";
import { resetOnboarding } from "../utils/resetOnboarding";

const SoultalkLogo = require("../../assets/images/logo/SoultalkLogo.png");

interface WelcomeScreenProps {
  navigation: any;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  // Button press animations
  const primaryScaleAnim = useRef(new Animated.Value(1)).current;
  const secondaryScaleAnim = useRef(new Animated.Value(1)).current;
  const [primaryPressed, setPrimaryPressed] = useState(false);
  const [secondaryPressed, setSecondaryPressed] = useState(false);

  // Tagline slide-up animation
  const taglineSlideAnim = useRef(new Animated.Value(40)).current;
  const taglineFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(taglineFadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(taglineSlideAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [taglineFadeAnim, taglineSlideAnim]);

  const handlePressIn = (scaleAnim: Animated.Value, setPressed: (v: boolean) => void) => {
    setPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (scaleAnim: Animated.Value, setPressed: (v: boolean) => void) => {
    setPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleGetStarted = () => {
    navigation.navigate("Onboarding");
  };

  const handleHaveAccount = () => {
    navigation.navigate("Login");
  };

  // TODO: Remove this before production
  const handleResetOnboarding = async () => {
    await resetOnboarding();
    Alert.alert("Reset", "Onboarding reset. Reload the app to see carousel.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={SoultalkLogo}
            style={styles.logo}
            resizeMode="contain"
          />
          <Animated.Text
            style={[
              styles.tagline,
              {
                opacity: taglineFadeAnim,
                transform: [{ translateY: taglineSlideAnim }],
              },
            ]}
          >
            {welcomeContent.tagline}
          </Animated.Text>
        </View>

        <View style={styles.buttonContainer}>
          <Animated.View style={{ transform: [{ scale: primaryScaleAnim }] }}>
            <TouchableOpacity
              style={[styles.primaryButton, primaryPressed && styles.buttonPressed]}
              onPress={handleGetStarted}
              onPressIn={() => handlePressIn(primaryScaleAnim, setPrimaryPressed)}
              onPressOut={() => handlePressOut(primaryScaleAnim, setPrimaryPressed)}
              activeOpacity={1}
            >
              <Text style={[styles.primaryButtonText, primaryPressed && styles.pressedText]}>
                Get Started
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: secondaryScaleAnim }] }}>
            <TouchableOpacity
              style={[styles.secondaryButton, secondaryPressed && styles.buttonPressed]}
              onPress={handleHaveAccount}
              onPressIn={() => handlePressIn(secondaryScaleAnim, setSecondaryPressed)}
              onPressOut={() => handlePressOut(secondaryScaleAnim, setSecondaryPressed)}
              activeOpacity={1}
            >
              <Text style={[styles.secondaryButtonText, secondaryPressed && styles.pressedText]}>
                I already have an account
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* TODO: Remove before production */}
          <TouchableOpacity
            style={styles.devButton}
            onPress={handleResetOnboarding}
          >
            <Text style={styles.devButtonText}>DEV: Reset Onboarding</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 228,
    height: 50,
    marginBottom: 24,
  },
  tagline: {
    fontFamily: fonts.edensor.italic,
    fontSize: 22,
    color: colors.primary,
    textAlign: "center",
  },
  buttonContainer: {
    gap: 16,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    height: 56,
    width: 280,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: "#4F1786",
  },
  secondaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 56,
    width: 280,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.white,
  },
  buttonPressed: {
    backgroundColor: "rgba(79, 23, 134, 0.12)",
  },
  pressedText: {
    color: colors.primary,
  },
  // TODO: Remove before production
  devButton: {
    marginTop: 20,
    padding: 10,
    alignItems: "center",
  },
  devButtonText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors.error,
  },
});

export default WelcomeScreen;
