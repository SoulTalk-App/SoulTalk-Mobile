import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { termsAndConditions } from "../mocks/content";
import { colors, typography } from "../theme";
import { completeOnboarding } from "../../App";

interface TermsScreenProps {
  navigation: any;
}

const TermsScreen: React.FC<TermsScreenProps> = ({ navigation }) => {
  const handleBack = () => {
    navigation.goBack();
  };

  const handleAccept = async () => {
    await completeOnboarding();
    navigation.navigate("Welcome");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{termsAndConditions.title}</Text>
        <Text style={styles.lastUpdated}>
          Last updated: {termsAndConditions.lastUpdated}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.content}>{termsAndConditions.content}</Text>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Text style={styles.agreementText}>
          By tapping Accept, you agree to our Terms & Conditions and Privacy
          Policy
        </Text>
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  content: {
    ...typography.body,
    color: colors.text.dark,
    lineHeight: 24,
  },
  buttonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
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
