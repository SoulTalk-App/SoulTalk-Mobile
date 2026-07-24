import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { privacyPolicy, termsOfService } from "../mocks/content";
import { fonts, useThemeColors } from "../theme";
import AppText from "../components/AppText";
import { completeOnboarding } from "../utils/resetOnboarding";
import { SpringConfigs, TimingConfigs, AnimationValues } from "../animations/constants";
import { CosmicScreen } from "../components/CosmicBackdrop";
import { TOUCH_HITSLOP_SMALL } from "../components/touchPrimitives";

type LegalTab = 'privacy' | 'terms';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// so-eer8: route param that controls whether the Accept footer is shown.
//   mode='accept' — RegisterScreen signup path: Accept sets @terms_accepted and
//                   goBack() so the checkbox registers. LOAD-BEARING, keep it.
//   mode='view' or absent — all other callers (Settings, PaywallGate,
//                   TermsReacceptanceModal 'View Terms' link): read-only viewer,
//                   no Accept footer. Default-view is the SAFE default so a bare
//                   navigate('Terms') never shows a stray Accept button.
interface TermsScreenProps {
  navigation: any;
  // so-i5o2: initialTab lets callers (e.g. TermsReacceptanceModal) open on a
  // specific tab without triggering the accept footer (mode='accept' is still
  // the only trigger for that).
  route: { params?: { mode?: 'accept' | 'view'; initialTab?: LegalTab } };
}

const TermsScreen: React.FC<TermsScreenProps> = ({ navigation, route }) => {
  // so-eer8: show the Accept footer ONLY on the signup-accept path.
  const isAcceptMode = route.params?.mode === 'accept';
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  // so-c7wq: accept-mode starts on Terms so the user reads ToS before Privacy.
  // so-i5o2: initialTab param lets re-acceptance path also start on Terms
  // without triggering the accept footer (which only appears in accept-mode).
  const [activeTab, setActiveTab] = useState<LegalTab>(
    route.params?.initialTab ?? (isAcceptMode ? 'terms' : 'privacy'),
  );
  const scrollRef = useRef<ScrollView>(null);
  // so-c7wq: guard — Terms was shown before Accept is reachable.
  // True from mount in accept-mode (we start on Terms); also set true on
  // leaving the Terms tab so the guard holds even if tabs are used freely.
  const termsWasSeenRef = useRef(isAcceptMode);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        header: {
          paddingHorizontal: 24,
          // so-ngf5: 12→8; container already applies insets.top; trim further
          // to reclaim top space like the auth screens after so-wzq9.
          paddingTop: 8,
          paddingBottom: 16,
        },
        // so-ngf5: chevron + title share one horizontal row (matches so-wzq9).
        // marginLeft:-8 compensates paddingHorizontal:24 so the chevron sits
        // ~16px from screen edge (24-8=16).
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginLeft: -8,
          marginBottom: 4,
        },
        titleRowChevron: {
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
        },
        title: {
          fontFamily: fonts.edensor.bold,
          fontSize: 32,
          color: colors.text.dark,
          // so-ngf5: flex:1 fills the row alongside the chevron; marginBottom
          // moved to titleRow.
          flex: 1,
          marginLeft: 8,
        },
        lastUpdated: {
          // so-bh3j: preset (bodySmall = Outfit regular 14px) via AppText variant
          color: colors.text.light,
          marginBottom: 12,
        },
        tabRow: {
          flexDirection: 'row',
          gap: 8,
        },
        tab: {
          flex: 1,
          paddingVertical: 10,
          borderRadius: 8,
          backgroundColor: colors.background,
          alignItems: 'center',
        },
        tabActive: {
          backgroundColor: colors.primary,
        },
        tabText: {
          // so-nwly: plain Text — preset lineHeight doesn't apply to single-line
          // fixed-height tab controls; explicit props give exact control.
          fontFamily: fonts.outfit.medium,
          fontSize: 14,
          color: colors.text.light,
        },
        tabTextActive: {
          color: colors.white,
        },
        scrollContainer: {
          flex: 1,
          overflow: 'hidden',
        },
        scrollContent: {
          paddingHorizontal: 24,
          paddingBottom: 20,
        },
        content: {
          // so-bh3j: preset (bodyLarge = Outfit regular 17px) via AppText variant;
          // spread removed — AppText applies the preset before this style.
          // so-ci7: read-heavy policy copy; 17pt comfortable sustained-read tier.
          color: colors.text.primary,
        },
        // so-ffl4: the Accept footer sat as an opaque white slab over the
        // CosmicScreen ("void") backdrop — jarring against the dark space
        // theme (and a light slab in dark mode). Transparent lets the cosmic
        // backdrop show through continuously behind the Accept CTA in both
        // themes; the white separator line is dropped with it.
        bottomContainer: {
          backgroundColor: 'transparent',
        },
        buttonContainer: {
          paddingHorizontal: 24,
          paddingTop: 16,
        },
        agreementText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 12,
          color: colors.text.light,
          textAlign: "center",
          marginBottom: 16,
        },
        acceptButton: {
          backgroundColor: colors.primary,
          borderRadius: 10,
          height: 48,
          // so-xllj #7: was a fixed width:319 which overflowed ≤320pt devices
          // (older iPhone SE). Cap with maxWidth + fill available width.
          width: '100%',
          maxWidth: 319,
          alignSelf: 'center',
          justifyContent: "center",
          alignItems: "center",
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        acceptButtonText: {
          fontFamily: fonts.outfit.bold,
          fontSize: 18,
          color: colors.white,
        },
      }),
    [colors]
  );

  // Animation values
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(20);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(40);
  const buttonScale = useSharedValue(1);

  const backButtonScale = useSharedValue(1);

  useEffect(() => {
    // Staggered entrance animations
    headerOpacity.value = withDelay(100, withTiming(1, TimingConfigs.entrance));
    headerTranslateY.value = withDelay(100, withSpring(0, SpringConfigs.subtle));

    contentOpacity.value = withDelay(250, withTiming(1, TimingConfigs.entrance));
    contentTranslateY.value = withDelay(250, withSpring(0, SpringConfigs.subtle));

    buttonOpacity.value = withDelay(400, withTiming(1, TimingConfigs.entrance));
    buttonTranslateY.value = withDelay(400, withSpring(0, SpringConfigs.subtle));
  }, []);

  const handleTabSwitch = (tab: LegalTab) => {
    // so-c7wq: mark Terms as seen when leaving it (guard for free tab switching).
    if (activeTab === 'terms') termsWasSeenRef.current = true;
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleBackPressIn = useCallback(() => {
    backButtonScale.value = withSpring(0.9, SpringConfigs.snappy);
  }, []);

  const handleBackPressOut = useCallback(() => {
    backButtonScale.value = withSpring(1, SpringConfigs.bouncy);
  }, []);

  const handleAccept = async () => {
    await AsyncStorage.setItem('@terms_accepted', 'true');
    await completeOnboarding();
    // so-37a: goBack() preserves the existing Register instance + form state.
    // From Onboarding, user re-taps Next which now reads @terms_accepted=true
    // and forwards to Register.
    navigation.goBack();
  };

  const handleButtonPressIn = useCallback(() => {
    buttonScale.value = withSpring(AnimationValues.buttonPressScale, SpringConfigs.snappy);
  }, []);

  const handleButtonPressOut = useCallback(() => {
    buttonScale.value = withSpring(1, SpringConfigs.bouncy);
  }, []);

  // Animated styles
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const buttonContainerStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const backButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backButtonScale.value }],
  }));

  const currentDoc = activeTab === 'privacy' ? privacyPolicy : termsOfService;

  return (
    <CosmicScreen tone="void">
      <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.header, headerStyle]}>
        {/* so-ngf5: chevron inline with title; no white circle bubble. Void
            backdrop is always dark so the chevron is colors.white throughout. */}
        <View style={styles.titleRow}>
          <AnimatedPressable
            style={[styles.titleRowChevron, backButtonStyle]}
            onPress={handleBack}
            onPressIn={handleBackPressIn}
            onPressOut={handleBackPressOut}
            hitSlop={TOUCH_HITSLOP_SMALL}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="chevron-left" size={28} color={colors.white} />
          </AnimatedPressable>
          <Text style={styles.title}>Terms and Privacy Policy</Text>
        </View>
        <AppText variant="bodySmall" style={styles.lastUpdated}>
          Effective: {currentDoc.effectiveDate}
        </AppText>
        {/* so-i5o2: Terms of Service LEFT, Privacy Policy RIGHT — matches the
            accept-mode progression (Terms first → Next → Privacy) so the active
            highlight advances left→right instead of right→left. */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, activeTab === 'terms' && styles.tabActive]}
            onPress={() => handleTabSwitch('terms')}
          >
            <Text style={[styles.tabText, activeTab === 'terms' && styles.tabTextActive]}>
              Terms of Service
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'privacy' && styles.tabActive]}
            onPress={() => handleTabSwitch('privacy')}
          >
            <Text style={[styles.tabText, activeTab === 'privacy' && styles.tabTextActive]}>
              Privacy Policy
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View style={[styles.scrollContainer, contentStyle]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          <AppText variant="bodyLarge" style={styles.content}>{currentDoc.content}</AppText>
        </ScrollView>
      </Animated.View>

      {/* so-eer8: Accept footer is ONLY shown in the signup-accept context
          (mode='accept' from RegisterScreen). All other callers open Terms
          as a read-only viewer — no Accept button, no agreement text.
          so-c7wq: footer is dynamic by tab:
            Terms tab  → 'Next' → switches to Privacy tab (scroll top)
            Privacy tab → 'Accept TOC and Privacy Policy' → handleAccept */}
      {isAcceptMode && (
        <Animated.View style={[styles.bottomContainer, buttonContainerStyle]}>
          <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
            {activeTab === 'privacy' && (
              <Text style={styles.agreementText}>
                By tapping Accept, you agree to our Terms and Privacy Policy
              </Text>
            )}
            <AnimatedPressable
              style={[styles.acceptButton, buttonStyle]}
              onPress={
                activeTab === 'terms'
                  ? () => handleTabSwitch('privacy')
                  : handleAccept
              }
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              accessibilityRole="button"
              accessibilityLabel={
                activeTab === 'terms'
                  ? 'Next: view Privacy Policy'
                  : 'Accept Terms and Privacy Policy'
              }
            >
              <Text style={styles.acceptButtonText}>
                {activeTab === 'terms' ? 'Next' : 'Accept TOC and Privacy Policy'}
              </Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      )}
      </View>
    </CosmicScreen>
  );
};

export default TermsScreen;
