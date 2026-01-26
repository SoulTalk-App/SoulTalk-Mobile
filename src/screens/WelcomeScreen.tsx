import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { welcomeContent } from "../mocks/content";
import { colors, typography } from "../theme";
import { resetOnboarding } from "../utils/resetOnboarding";

interface WelcomeScreenProps {
  navigation: any;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const canGoBack = navigation.canGoBack();

  const handleBack = () => {
    navigation.goBack();
  };

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
      {canGoBack && (
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
      )}
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          {/* Logo placeholder - replace with actual logo */}
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>ST</Text>
          </View>
          <Text style={styles.appName}>SoulTalk</Text>
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
  backButton: {
    position: "absolute",
    top: 60,
    left: 16,
    zIndex: 10,
    padding: 8,
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
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  logoText: {
    fontSize: 48,
    fontWeight: "bold",
    color: colors.white,
  },
  appName: {
    ...typography.displayLarge,
    color: colors.primary,
    marginBottom: 12,
  },
  tagline: {
    ...typography.body,
    color: colors.text.light,
    textAlign: "center",
  },
  buttonContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.primary,
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
