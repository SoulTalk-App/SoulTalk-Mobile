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
import OTPVerificationScreen from "./src/screens/OTPVerificationScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ResetPasswordConfirmScreen from "./src/screens/ResetPasswordConfirmScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import JournalScreen from "./src/screens/JournalScreen";
import JournalEntryScreen from "./src/screens/JournalEntryScreen";
import CreateJournalScreen from "./src/screens/CreateJournalScreen";
import AffirmationMirrorScreen from "./src/screens/AffirmationMirrorScreen";
import SoulSightScreen from "./src/screens/SoulSightScreen";
import SoulSightDetailScreen from "./src/screens/SoulSightDetailScreen";
import { JournalProvider } from "./src/contexts/JournalContext";
import { WebSocketProvider } from "./src/contexts/WebSocketContext";
import { useNotifications } from "./src/hooks";

const ONBOARDING_COMPLETE_KEY = "@soultalk_onboarding_complete";
const SETUP_COMPLETE_KEY = "@soultalk_setup_complete";

const DEV_SKIP_TO_WELCOME_SPLASH = false;

const Stack = createStackNavigator();

// Deep linking configuration
const prefix = Linking.createURL("/");
const linking: LinkingOptions<any> = {
  prefixes: [prefix, "soultalk://"],
  config: {
    screens: {
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
    <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPasswordConfirm" component={ResetPasswordConfirmScreen} />
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
    <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPasswordConfirm" component={ResetPasswordConfirmScreen} />
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

const AppStack = ({ setupComplete }: { setupComplete: boolean }) => {
  useNotifications();

  return (
    <JournalProvider>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={setupComplete ? "Home" : "WelcomeSplash"}
      >
        <Stack.Screen name="WelcomeSplash" component={WelcomeSplashScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="SoulPalName" component={SoulPalNameScreen} />
        <Stack.Screen name="SetupComplete" component={SetupCompleteScreen} />
        <Stack.Screen name="Home" component={HomeScreen} options={tabScreenOptions} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={tabScreenOptions} />
        <Stack.Screen name="Journal" component={JournalScreen} options={tabScreenOptions} />
        <Stack.Screen name="JournalEntry" component={JournalEntryScreen} />
        <Stack.Screen name="CreateJournal" component={CreateJournalScreen} />
        <Stack.Screen name="AffirmationMirror" component={AffirmationMirrorScreen} options={{ animation: 'none' }} />
        <Stack.Screen name="SoulSight" component={SoulSightScreen} />
        <Stack.Screen name="SoulSightDetail" component={SoulSightDetailScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} options={{ gestureEnabled: false }} />
      </Stack.Navigator>
    </JournalProvider>
  );
};

const Navigation = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null
  );
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [showLoading, setShowLoading] = useState(true);

  const dataReady = !isLoading && onboardingComplete !== null && setupComplete !== null;

  useEffect(() => {
    checkStatus();
  }, [isAuthenticated]);

  const checkStatus = async () => {
    try {
      const onboarding = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
      const setup = await AsyncStorage.getItem(SETUP_COMPLETE_KEY);

      // Returning user on a new device: if authenticated and user has a username,
      // they've already completed onboarding and setup — skip those screens.
      if (isAuthenticated && user?.username) {
        if (onboarding !== "true") {
          await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
        }
        if (setup !== "true") {
          await AsyncStorage.setItem(SETUP_COMPLETE_KEY, "true");
        }
        setOnboardingComplete(true);
        setSetupComplete(true);
      } else {
        setOnboardingComplete(onboarding === "true");
        setSetupComplete(setup === "true");
      }
    } catch (error) {
      console.error("Error checking status:", error);
      setOnboardingComplete(false);
      setSetupComplete(false);
    }
  };

  // Show loading screen until data is ready AND the current video loop finishes
  if (showLoading) {
    return (
      <LoadingScreen
        readyToDismiss={dataReady}
        onDismiss={() => setShowLoading(false)}
      />
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {isAuthenticated ? (
        <AppStack setupComplete={setupComplete} />
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
          <WebSocketProvider>
            <StatusBar style="auto" />
            <Navigation />
          </WebSocketProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
