import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETE_KEY = "@soultalk_onboarding_complete";

export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    console.log("Onboarding reset - restart app to see carousel");
  } catch (error) {
    console.error("Error resetting onboarding:", error);
  }
};
