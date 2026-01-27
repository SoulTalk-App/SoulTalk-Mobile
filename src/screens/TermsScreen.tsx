import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { termsAndConditions } from "../mocks/content";
import { colors, typography } from "../theme";
import { completeOnboarding } from "../../App";

interface TermsScreenProps {
  navigation: any;
}

const TermsScreen: React.FC<TermsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAccept = async () => {
    await completeOnboarding();
    navigation.navigate("Welcome");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{termsAndConditions.title}</Text>
        <Text style={styles.lastUpdated}>
          Last updated: {termsAndConditions.lastUpdated}
        </Text>
      </View>

      <View style={styles.scrollContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          <Text style={styles.content}>{termsAndConditions.content}</Text>
        </ScrollView>
      </View>

      <View style={styles.separator} />
      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.agreementText}>
          By tapping Accept, you agree to our Terms and Privacy Policy
        </Text>
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    marginLeft: -8,
    marginBottom: 8,
    padding: 4,
    alignSelf: "flex-start",
  },
  title: {
    ...typography.heading,
    color: colors.primary,
    marginBottom: 4,
  },
  lastUpdated: {
    ...typography.caption,
    color: colors.text.light,
  },
  scrollContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  content: {
    ...typography.body,
    color: colors.primary,
    lineHeight: 24,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  buttonContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  agreementText: {
    ...typography.caption,
    color: colors.text.light,
    textAlign: "center",
    marginBottom: 16,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default TermsScreen;
