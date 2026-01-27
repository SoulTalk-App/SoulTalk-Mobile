import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { welcomeContent } from "../mocks/content";
import { colors, typography } from "../theme";
import { resetOnboarding } from "../utils/resetOnboarding";

const SoultalkLogo = require("../../assets/images/logo/SoultalkLogo.png");

interface WelcomeScreenProps {
  navigation: any;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const handleGetStarted = () => {
    navigation.navigate("Register");
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
          <Text style={styles.tagline}>{welcomeContent.tagline}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleHaveAccount}
          >
            <Text style={styles.secondaryButtonText}>
              I already have an account
            </Text>
          </TouchableOpacity>

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
    ...typography.subheading,
    color: colors.primary,
    textAlign: "center",
    fontStyle: "italic",
    fontWeight: "300",
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
    ...typography.button,
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
    ...typography.button,
    color: colors.white,
  },
  // TODO: Remove before production
  devButton: {
    marginTop: 20,
    padding: 10,
    alignItems: "center",
  },
  devButtonText: {
    fontSize: 12,
    color: colors.error,
  },
});

export default WelcomeScreen;
