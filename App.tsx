import React, { useEffect, useState, useCallback } from "react";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { SoulPalProvider } from "./src/contexts/SoulPalContext";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { AppAlertProvider } from "./src/components/AppAlertProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoSplashScreen from "expo-splash-screen";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";
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
import { EntitlementProvider, useEntitlement } from "./src/contexts/EntitlementContext";
import { activateAdapty, isAdaptyActive, getAdaptyActivationError } from "./src/services/adapty";
import { isAccessLocked } from "./src/utils/accessGate";
import PaywallGateScreen from "./src/screens/PaywallGateScreen";
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
import PostSignupConsentScreen from "./src/screens/PostSignupConsentScreen";
import UnderageBlockScreen from "./src/screens/UnderageBlockScreen";
import LoadingScreen from "./src/screens/LoadingScreen";
import HomeScreen from "./src/screens/HomeScreen";
import OTPVerificationScreen from "./src/screens/OTPVerificationScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ResetPasswordConfirmScreen from "./src/screens/ResetPasswordConfirmScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import HelpScreen from "./src/screens/HelpScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import JournalScreen from "./src/screens/JournalScreen";
import JournalEntryScreen from "./src/screens/JournalEntryScreen";
import CreateJournalScreen from "./src/screens/CreateJournalScreen";
import AffirmationMirrorScreen from "./src/screens/AffirmationMirrorScreen";
import SoulSightScreen from "./src/screens/SoulSightScreen";
import SoulSightDetailScreen from "./src/screens/SoulSightDetailScreen";
import SoulShiftsScreen from "./src/screens/SoulShiftsScreen";
import SoulSignalsScreen from "./src/screens/SoulSignalsScreen";
import PersonalityHubScreen from "./src/screens/personality/PersonalityHubScreen";
import PersonalityIntroScreen from "./src/screens/personality/PersonalityIntroScreen";
import PersonalityQuestionScreen from "./src/screens/personality/PersonalityQuestionScreen";
import PersonalityResultScreen from "./src/screens/personality/PersonalityResultScreen";
import { JournalProvider } from "./src/contexts/JournalContext";
import { PersonalityProvider } from "./src/contexts/PersonalityContext";
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
    <Stack.Screen name="UnderageBlock" component={UnderageBlockScreen} />
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
    {/* so-ei55: PostSignupConsent registered here so the navigator
        recognises the screen name if navigation state somehow lands
        in OnboardingStack after auth (edge-case guard). The primary
        post-signup path routes via AppStack below. */}
    <Stack.Screen
      name="PostSignupConsent"
      component={PostSignupConsentScreen}
      options={{ gestureEnabled: false }}
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
    <Stack.Screen name="UnderageBlock" component={UnderageBlockScreen} />
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
    {/* so-ei55: PostSignupConsent in AuthStack covers the returning-user
        edge case (re-auth after logout where consent bump is required). */}
    <Stack.Screen
      name="PostSignupConsent"
      component={PostSignupConsentScreen}
      options={{ gestureEnabled: false }}
    />
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

// so-fwva: PaywallStack — what the user sees when /auth/me reports
// access_granted=false (trial over, not Pro). The full app is hidden
// behind PaywallGate; only the don't-trap carve-outs are reachable
// (Settings → Delete Account/Logout, Help/crisis, Terms/Privacy,
// Manage Subscription/Restore via PaywallGate's CTAs). Apple review +
// duty-of-care: the gate must not lock the user out of these.
const PaywallStack = () => (
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
    initialRouteName="PaywallGate"
  >
    <Stack.Screen
      name="PaywallGate"
      component={PaywallGateScreen}
      options={{ gestureEnabled: false }}
    />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Help" component={HelpScreen} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    <Stack.Screen
      name="Terms"
      component={TermsScreen}
      options={{ gestureEnabled: false }}
    />
  </Stack.Navigator>
);

const AppStack = ({ setupComplete }: { setupComplete: boolean }) => {
  useNotifications();

  return (
    <JournalProvider>
      <PersonalityProvider>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={setupComplete ? "Home" : "PostSignupConsent"}
        >
          {/* so-ei55: PostSignupConsent is the initial route for new users
              (setupComplete=false). It checks acceptance_required on mount
              and skips to WelcomeSplash if the user already accepted.
              Covers both email signup (OTP → auth) and social OAuth paths. */}
          <Stack.Screen
            name="PostSignupConsent"
            component={PostSignupConsentScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="WelcomeSplash" component={WelcomeSplashScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="SoulPalName" component={SoulPalNameScreen} />
          <Stack.Screen name="SetupComplete" component={SetupCompleteScreen} />
          <Stack.Screen name="Home" component={HomeScreen} options={tabScreenOptions} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={tabScreenOptions} />
          <Stack.Screen name="Journal" component={JournalScreen} options={tabScreenOptions} />
          <Stack.Screen name="JournalEntry" component={JournalEntryScreen} />
          <Stack.Screen name="CreateJournal" component={CreateJournalScreen} />
          <Stack.Screen name="AffirmationMirror" component={AffirmationMirrorScreen} options={tabScreenOptions} />
          <Stack.Screen name="SoulSight" component={SoulSightScreen} />
          <Stack.Screen name="SoulSightDetail" component={SoulSightDetailScreen} />
          <Stack.Screen name="SoulShifts" component={SoulShiftsScreen} />
          <Stack.Screen name="SoulSignals" component={SoulSignalsScreen} />
          <Stack.Screen name="PersonalityHub" component={PersonalityHubScreen} />
          <Stack.Screen name="PersonalityIntro" component={PersonalityIntroScreen} />
          <Stack.Screen name="PersonalityQuestion" component={PersonalityQuestionScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="PersonalityResult" component={PersonalityResultScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} options={{ gestureEnabled: false }} />
        </Stack.Navigator>
      </PersonalityProvider>
    </JournalProvider>
  );
};

const Navigation = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  // so-fwva: server-side access gate. accessGranted is the trial-clock
  // + Pro authority (null while /auth/me hasn't landed; false when the
  // trial is over and the user isn't Pro). isPro is the Adapty side;
  // either trues out the gate.
  //
  // so-etv4: fail-closed fix. The original `=== false` guard left the
  // gate open for null/undefined/non-boolean access_granted (e.g. a BE
  // serializer regression drops the field entirely → everyone gets in).
  // Once authenticated AND the Adapty SDK has settled (sdkSettled=true,
  // meaning pullProfile() has completed and the loading window is over),
  // treat null access_granted as false so the gate fails closed.
  //
  // FE-H2 SDK-inactive escape: Adapty is iOS-only this round. On Android
  // (activationFailedReason='android-not-yet-supported') and on iOS with
  // a missing/errored key, getAdaptyActivationError() is non-null. In
  // those states isPro is always false, so failing closed on
  // access_granted=null would present an undismissable gate. Keep the
  // null-open behaviour when the SDK is not truly active.
  // so-etv4: the gate truth table now lives in the pure isAccessLocked() helper
  // (src/utils/accessGate.ts) so it's unit-testable in isolation.
  const { isPro, accessGranted, sdkSettled } = useEntitlement();
  const sdkActive = isAdaptyActive() && !getAdaptyActivationError();
  const accessLocked = isAccessLocked({ accessGranted, sdkSettled, sdkActive, isPro });
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
        accessLocked ? (
          // so-fwva: server says trial over and not Pro — hide the
          // whole app behind the paywall gate. Carve-outs still
          // reachable via PaywallStack.
          <PaywallStack />
        ) : (
          <AppStack setupComplete={setupComplete} />
        )
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

// Don't interrupt external audio (Spotify, Apple Music, etc.) on cold launch.
// `allowsRecordingIOS: false` keeps category at .ambient; recording flows must
// flip it to true while active and back to false when done.
// Note: prop is `playsInSilentModeIOS`, not `playsInSilentModeOnIOS` — the
// latter was silently ignored, leaving the iOS audio session in .soloAmbient.
Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  playsInSilentModeIOS: false,
  staysActiveInBackground: false,
  interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
  shouldDuckAndroid: true,
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
}).catch((err) => console.warn('Failed to set audio mode:', err));

// so-jyw0: boot the Adapty SDK once, at module load, with the public
// SDK key from app.config.extra.adaptyConfig (wired by infra so-153d).
// Idempotent + fail-closed — missing key / activation error logs and
// degrades to "no Pro from SDK" without blocking app boot. The
// EntitlementProvider awaits this same (deduped) activation before
// identify.
activateAdapty().catch((err) => console.warn('Adapty activate failed:', err));

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
        <ThemeProvider>
          {/* so-1zn0: themed in-app alert provider mounts directly inside
              ThemeProvider so showAlert/showError can read the active
              theme tokens (useThemeColors + isDarkMode). RN <Modal>
              hoists the alert above the navigator regardless of where
              the provider sits in the tree, so wrapping everything below
              is purely for theme access — no Z-order concerns. */}
          <AppAlertProvider>
            <SoulPalProvider>
            <AuthProvider>
            {/* so-jyw0: EntitlementProvider mounts INSIDE AuthProvider so
                useAuth() is available — it watches the user transition
                to drive adapty.identify / adapty.logout, and pulls the
                trial-clock fields off /auth/me. Wrapping
                WebSocketProvider keeps the entitlement state available
                to any screen below. Fail-closed: SDK errors leave
                isPro=false, the server-side accessGranted (trial)
                still flows through unaffected. */}
            <EntitlementProvider>
              <WebSocketProvider>
                <StatusBar style="auto" />
                {/* so-ve7q: root ErrorBoundary catches render-time throws in
                    any screen and shows a recovery UI instead of unmounting
                    to a white screen. Wrapping Navigation (not the whole
                    tree) keeps providers alive on reset so the user's auth
                    + theme + soulpal state survives the retry. */}
                <ErrorBoundary>
                  <Navigation />
                </ErrorBoundary>
              </WebSocketProvider>
            </EntitlementProvider>
            </AuthProvider>
            </SoulPalProvider>
          </AppAlertProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
