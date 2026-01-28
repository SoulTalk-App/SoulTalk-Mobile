import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETE_KEY = "@soultalk_onboarding_complete";

export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    await AsyncStorage.removeItem("@soultalk_local_auth");
    await AsyncStorage.removeItem("@soultalk_username");
    await AsyncStorage.removeItem("@soultalk_soulpal_name");
    console.log("Onboarding reset - restart app to see carousel");
  } catch (error) {
    console.error("Error resetting onboarding:", error);
  }
};

export const completeOnboarding = async () => {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
  } catch (error) {
    console.error("Error saving onboarding status:", error);
  }
};
