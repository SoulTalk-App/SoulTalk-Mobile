import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import TermsScreen from "./src/screens/TermsScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import LoadingScreen from "./src/screens/LoadingScreen";
import HomeScreen from "./src/screens/HomeScreen";

const ONBOARDING_COMPLETE_KEY = "@soultalk_onboarding_complete";

const Stack = createStackNavigator();

const OnboardingStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen
      name="Terms"
      component={TermsScreen}
      options={{ gestureEnabled: false }}
    />
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Home"
      component={HomeScreen}
      options={{ title: "SoulTalk" }}
    />
  </Stack.Navigator>
);

const Navigation = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
      setOnboardingComplete(value === "true");
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setOnboardingComplete(false);
    }
  };

  // Show loading while checking auth and onboarding status
  if (isLoading || onboardingComplete === null) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <AppStack />
      ) : onboardingComplete ? (
        <AuthStack />
      ) : (
        <OnboardingStack />
      )}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <Navigation />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Export helper to mark onboarding as complete
export const completeOnboarding = async () => {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
  } catch (error) {
    console.error("Error saving onboarding status:", error);
  }
};
