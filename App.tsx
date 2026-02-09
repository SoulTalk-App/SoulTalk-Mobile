import React, { useEffect, useState, useCallback } from "react";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoSplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { useFonts } from "expo-font";
import {
  Outfit_100Thin,
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import SplashScreen from "./src/screens/SplashScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import TermsScreen from "./src/screens/TermsScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import WelcomeSplashScreen from "./src/screens/WelcomeSplashScreen";
import TransitionSplashScreen from "./src/screens/TransitionSplashScreen";
import SoulPalNameScreen from "./src/screens/SoulPalNameScreen";
import SetupCompleteScreen from "./src/screens/SetupCompleteScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import LoadingScreen from "./src/screens/LoadingScreen";
import HomeScreen from "./src/screens/HomeScreen";
import VerificationSentScreen from "./src/screens/VerificationSentScreen";
import OTPVerificationScreen from "./src/screens/OTPVerificationScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ResetPasswordConfirmScreen from "./src/screens/ResetPasswordConfirmScreen";
import EmailVerifiedScreen from "./src/screens/EmailVerifiedScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

const ONBOARDING_COMPLETE_KEY = "@soultalk_onboarding_complete";

// DEV MODE: Set to true to skip directly to WelcomeSplash screen
const DEV_SKIP_TO_WELCOME_SPLASH = true;

const Stack = createStackNavigator();

// Deep linking configuration
const prefix = Linking.createURL("/");
const linking: LinkingOptions<any> = {
  prefixes: [prefix, "soultalk://"],
  config: {
    screens: {
      EmailVerified: "verify-email/:token",
      ResetPasswordConfirm: "reset-password/:token",
    },
  },
};

const OnboardingStack = () => (
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
    initialRouteName={DEV_SKIP_TO_WELCOME_SPLASH ? "WelcomeSplash" : "Splash"}
  >
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen
      name="Terms"
      component={TermsScreen}
      options={{ gestureEnabled: false }}
    />
    <Stack.Screen
      name="TransitionSplash"
      component={TransitionSplashScreen}
      options={{
        presentation: "modal",
        gestureEnabled: false,
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateY: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.height, 0],
                }),
              },
            ],
          },
        }),
      }}
    />
    <Stack.Screen
      name="WelcomeSplash"
      component={WelcomeSplashScreen}
      options={{
        presentation: "modal",
        gestureEnabled: false,
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateY: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.height, 0],
                }),
              },
            ],
          },
        }),
      }}
    />
    <Stack.Screen name="SoulPalName" component={SoulPalNameScreen} />
    <Stack.Screen name="SetupComplete" component={SetupCompleteScreen} />
    <Stack.Screen name="VerificationSent" component={VerificationSentScreen} />
    <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPasswordConfirm" component={ResetPasswordConfirmScreen} />
    <Stack.Screen name="EmailVerified" component={EmailVerifiedScreen} />
    <Stack.Screen
      name="Login"
      component={LoginScreen}
      options={{
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateY: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.height, 0],
                }),
              },
            ],
          },
        }),
      }}
    />
    <Stack.Screen
      name="Register"
      component={RegisterScreen}
      options={{
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateY: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.height, 0],
                }),
              },
            ],
          },
        }),
      }}
    />
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
    initialRouteName={DEV_SKIP_TO_WELCOME_SPLASH ? "WelcomeSplash" : "Splash"}
  >
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen
      name="Terms"
      component={TermsScreen}
      options={{ gestureEnabled: false }}
    />
    <Stack.Screen
      name="Login"
      component={LoginScreen}
      options={{
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateY: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.height, 0],
                }),
              },
            ],
          },
        }),
      }}
    />
    <Stack.Screen
      name="Register"
      component={RegisterScreen}
      options={{
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateY: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.height, 0],
                }),
              },
            ],
          },
        }),
      }}
    />
    <Stack.Screen name="VerificationSent" component={VerificationSentScreen} />
    <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPasswordConfirm" component={ResetPasswordConfirmScreen} />
    <Stack.Screen name="EmailVerified" component={EmailVerifiedScreen} />
    <Stack.Screen
      name="TransitionSplash"
      component={TransitionSplashScreen}
      options={{ gestureEnabled: false }}
    />
    <Stack.Screen
      name="WelcomeSplash"
      component={WelcomeSplashScreen}
      options={{ gestureEnabled: false }}
    />
    <Stack.Screen name="SoulPalName" component={SoulPalNameScreen} />
    <Stack.Screen name="SetupComplete" component={SetupCompleteScreen} />
  </Stack.Navigator>
);

// Fast fade for tab screen swaps (pill glide handles the visual transition)
const forFastFade = ({ current }: any) => ({
  cardStyle: { opacity: current.progress },
});

const tabScreenOptions = {
  cardStyleInterpolator: forFastFade,
  transitionSpec: {
    open: { animation: 'timing' as const, config: { duration: 100 } },
    close: { animation: 'timing' as const, config: { duration: 100 } },
  },
  gestureEnabled: false,
  cardOverlayEnabled: false,
};

const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreen} options={tabScreenOptions} />
    <Stack.Screen name="Profile" component={ProfileScreen} options={tabScreenOptions} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Terms" component={TermsScreen} options={{ gestureEnabled: false }} />
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
    <NavigationContainer linking={linking}>
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

// Keep splash screen visible while loading fonts
ExpoSplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    // Outfit fonts (Google Fonts)
    "Outfit-Thin": Outfit_100Thin,
    "Outfit-ExtraLight": Outfit_200ExtraLight,
    "Outfit-Light": Outfit_300Light,
    "Outfit-Regular": Outfit_400Regular,
    "Outfit-Medium": Outfit_500Medium,
    "Outfit-SemiBold": Outfit_600SemiBold,
    "Outfit-Bold": Outfit_700Bold,
    // Edensor fonts (custom)
    "Edensor-Thin": require("./assets/fonts/Edensor/Edensor-Thin.otf"),
    "Edensor-ExtraLight": require("./assets/fonts/Edensor/Edensor-ExtraLight.otf"),
    "Edensor-Light": require("./assets/fonts/Edensor/Edensor-Light.otf"),
    "Edensor-Regular": require("./assets/fonts/Edensor/Edensor-Regular.otf"),
    "Edensor-Medium": require("./assets/fonts/Edensor/Edensor-Medium.otf"),
    "Edensor-SemiBold": require("./assets/fonts/Edensor/Edensor-SemiBold.otf"),
    "Edensor-Bold": require("./assets/fonts/Edensor/Edensor-Bold.otf"),
    "Edensor-Italic": require("./assets/fonts/Edensor/Edensor-Italic.otf"),
    "Edensor-LightItalic": require("./assets/fonts/Edensor/Edensor-Light-Italic.otf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await ExpoSplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Navigation />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
