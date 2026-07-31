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
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { privacyPolicy, termsOfService } from "../mocks/content";
import { fonts, useThemeColors } from "../theme";
import AppText from "../components/AppText";
import { completeOnboarding } from "../utils/resetOnboarding";
import { SpringConfigs, TimingConfigs, AnimationValues } from "../animations/constants";
import { CosmicScreen } from "../components/CosmicBackdrop";
import { TOUCH_HITSLOP_SMALL } from "../components/touchPrimitives";
import { callReaccept, clearReacceptCallback } from '../utils/reacceptBridge';

type LegalTab = 'privacy' | 'terms';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// so-chyd: how close to the bottom (pts) counts as "at the bottom".
// 24 pt gives a comfortable tolerance so the user doesn't need to
// over-scroll past the last line of text.
const SCROLL_BOTTOM_PAD = 24;

function checkAtBottom({
  layoutMeasurement,
  contentOffset,
  contentSize,
}: {
  layoutMeasurement: { height: number };
  contentOffset: { y: number };
  contentSize: { height: number };
}): boolean {
  return (
    layoutMeasurement.height + contentOffset.y >=
    contentSize.height - SCROLL_BOTTOM_PAD
  );
}

// so-eer8: route param that controls whether the Accept footer is shown.
//   mode='accept'    — RegisterScreen signup path: Accept sets @terms_accepted
//                      and goBack() so the checkbox registers. LOAD-BEARING.
//   mode='reaccept'  — so-chyd: re-acceptance flow launched from
//                      TermsReacceptanceModal. Same gated two-step as accept,
//                      but final Accept fires the reacceptBridge callback
//                      (parent's acceptTerms()) instead of @terms_accepted.
//   mode='view' / absent — read-only viewer; no Accept footer.
interface TermsScreenProps {
  navigation: any;
  route: {
    params?: {
      mode?: 'accept' | 'view' | 'reaccept';
      // so-i5o2: lets callers open on a specific tab without triggering footer.
      initialTab?: LegalTab;
      // so-chyd: carried through for context; the actual callback lives in
      // reacceptBridge (avoids non-serializable-param React Navigation warning).
      currentVersion?: number;
    };
  };
}

const TermsScreen: React.FC<TermsScreenProps> = ({ navigation, route }) => {
  const isAcceptMode = route.params?.mode === 'accept';
  const isReacceptMode = route.params?.mode === 'reaccept';
  // so-chyd: isGated = any accept flow that requires scroll-to-bottom.
  const isGated = isAcceptMode || isReacceptMode;

  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // so-c7wq: gated flows start on Terms so the user reads ToS before Privacy.
  // so-i5o2: initialTab lets callers override the starting tab.
  const [activeTab, setActiveTab] = useState<LegalTab>(
    route.params?.initialTab ?? (isGated ? 'terms' : 'privacy'),
  );
  const scrollRef = useRef<ScrollView>(null);
  // so-c7wq: guard — Terms was shown before Accept is reachable (legacy guard,
  // now superseded by the scroll latch but kept as belt-and-suspenders).
  const termsWasSeenRef = useRef(isGated);

  // so-chyd: per-tab latched scroll-to-bottom flags. useState (not refs) so
  // they drive CTA + affordance re-renders. Once latched to true, never reset —
  // the user can't "un-read" a document by scrolling back up.
  const [termsAtBottom, setTermsAtBottom] = useState(false);
  const [privacyAtBottom, setPrivacyAtBottom] = useState(false);

  // so-chyd: viewport height for the short-doc edge-case. Stored as a ref so
  // the onContentSizeChange handler always reads the live value without
  // creating a new callback on every layout change.
  const scrollViewHeightRef = useRef(0);
  // so-v82u MINOR 1: content height ref so both onLayout and onContentSizeChange
  // can call latchIfFits without a race — whichever fires last wins safely.
  const contentHeightRef = useRef(0);

  // Derived: has the active tab's doc been scrolled to the bottom yet?
  const activeTabAtBottom = activeTab === 'terms' ? termsAtBottom : privacyAtBottom;
  // so-v82u MAJOR: both tabs must be scrolled before final Accept is enabled.
  // Jumping straight to Privacy and scrolling it should not bypass the Terms gate.
  // `activeTabAtBottom` still drives the per-tab chevron/fade independently.
  const bothAtBottom = termsAtBottom && privacyAtBottom;
  const ctaEnabled = activeTab === 'terms' ? termsAtBottom : bothAtBottom;

  // ─── Animation values ───────────────────────────────────────────────────────
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(20);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(40);
  const buttonScale = useSharedValue(1);
  const backButtonScale = useSharedValue(1);
  // so-chyd: chevron bounce to hint at scrollable content below.
  const chevronBounce = useSharedValue(0);

  useEffect(() => {
    // Staggered entrance animations
    headerOpacity.value = withDelay(100, withTiming(1, TimingConfigs.entrance));
    headerTranslateY.value = withDelay(100, withSpring(0, SpringConfigs.subtle));
    contentOpacity.value = withDelay(250, withTiming(1, TimingConfigs.entrance));
    contentTranslateY.value = withDelay(250, withSpring(0, SpringConfigs.subtle));
    buttonOpacity.value = withDelay(400, withTiming(1, TimingConfigs.entrance));
    buttonTranslateY.value = withDelay(400, withSpring(0, SpringConfigs.subtle));
  }, []);

  // so-chyd: animate chevron when gated + not yet at bottom; stop once latched.
  useEffect(() => {
    const atBottom = activeTab === 'terms' ? termsAtBottom : privacyAtBottom;
    if (!isGated || atBottom) {
      chevronBounce.value = withTiming(0, { duration: 150 });
    } else {
      chevronBounce.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 550 }),
          withTiming(0, { duration: 550 }),
        ),
        -1,
        false,
      );
    }
  }, [isGated, activeTab, termsAtBottom, privacyAtBottom]);

  // so-v82u MINOR 2: clear the reaccept callback on unmount so a stale closure
  // from a previous modal session can't fire if the bridge wasn't consumed
  // (e.g. user presses back without accepting).
  useEffect(() => {
    if (!isReacceptMode) return;
    return () => {
      clearReacceptCallback();
    };
  }, [isReacceptMode]);

  // ─── Scroll gate handlers ────────────────────────────────────────────────────

  // so-v82u MINOR 1: shared helper called by both onLayout and onContentSizeChange.
  // Whichever fires last supplies the missing dimension and latches atomically —
  // no race between the two events.
  const latchIfFits = useCallback((tabAtCheck: LegalTab) => {
    const viewH = scrollViewHeightRef.current;
    const contentH = contentHeightRef.current;
    if (viewH > 0 && contentH > 0 && contentH <= viewH + SCROLL_BOTTOM_PAD) {
      if (tabAtCheck === 'terms') setTermsAtBottom(true);
      else setPrivacyAtBottom(true);
    }
  }, []);

  // so-chyd: fire on each scroll tick; latch the active tab's flag once the
  // user reaches (or scrolls past) the bottom.
  const handleScroll = useCallback(
    ({ nativeEvent }: any) => {
      if (checkAtBottom(nativeEvent)) {
        if (activeTab === 'terms') setTermsAtBottom(true);
        else setPrivacyAtBottom(true);
      }
    },
    [activeTab],
  );

  // so-chyd / so-v82u: viewport layout — store visible height then check the
  // short-doc edge case immediately (in case content height already landed).
  const handleScrollViewLayout = useCallback(({ nativeEvent }: any) => {
    scrollViewHeightRef.current = nativeEvent.layout.height;
    latchIfFits(activeTab);
  }, [latchIfFits, activeTab]);

  // so-chyd / so-v82u: short-doc edge case — store content height then check
  // immediately (in case viewport height already landed). Re-runs on every
  // tab switch because the content changes.
  const handleContentSizeChange = useCallback(
    (_w: number, h: number) => {
      if (!isGated) return;
      contentHeightRef.current = h;
      latchIfFits(activeTab);
    },
    [isGated, activeTab, latchIfFits],
  );

  // ─── Tab / navigation handlers ───────────────────────────────────────────────

  const handleTabSwitch = (tab: LegalTab) => {
    // so-c7wq: mark Terms as seen when leaving it.
    if (activeTab === 'terms') termsWasSeenRef.current = true;
    setActiveTab(tab);
    // Reset scroll to top so the new tab's content starts at the beginning.
    // onContentSizeChange will fire with the new content and immediately latch
    // if it fits in the viewport.
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleBack = () => navigation.goBack();

  const handleBackPressIn = useCallback(() => {
    backButtonScale.value = withSpring(0.9, SpringConfigs.snappy);
  }, []);
  const handleBackPressOut = useCallback(() => {
    backButtonScale.value = withSpring(1, SpringConfigs.bouncy);
  }, []);

  // so-chyd: final Accept — branches on mode.
  //   accept    → write @terms_accepted + completeOnboarding (signup path).
  //   reaccept  → fire reacceptBridge callback (parent's acceptTerms()) then
  //               goBack so the modal can show the in-flight loading state.
  const handleFinalAccept = async () => {
    if (isReacceptMode) {
      callReaccept();
      navigation.goBack();
    } else {
      await AsyncStorage.setItem('@terms_accepted', 'true');
      await completeOnboarding();
      // so-37a: goBack() preserves Register instance + form state.
      navigation.goBack();
    }
  };

  const handleButtonPressIn = useCallback(() => {
    if (!ctaEnabled) return; // no spring feedback while disabled
    buttonScale.value = withSpring(AnimationValues.buttonPressScale, SpringConfigs.snappy);
  }, [ctaEnabled]);
  const handleButtonPressOut = useCallback(() => {
    if (!ctaEnabled) return;
    buttonScale.value = withSpring(1, SpringConfigs.bouncy);
  }, [ctaEnabled]);

  // ─── Animated styles ─────────────────────────────────────────────────────────

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
  // so-chyd: chevron translates down/up to hint scrollability.
  const chevronAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: chevronBounce.value }],
  }));

  // ─── Styles ──────────────────────────────────────────────────────────────────

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
        // so-chyd: bottom fade + chevron overlay. Position absolute inside
        // scrollContainer so it sits over the last lines of scroll content.
        // pointerEvents='none' so the user can still scroll through it.
        scrollGateOverlay: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 72,
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 8,
        },
        scrollFade: {
          ...StyleSheet.absoluteFillObject,
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
          paddingTop: 12,
        },
        // so-chyd: hint text while the CTA is gated.
        helperText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 12,
          color: 'rgba(255,255,255,0.55)',
          textAlign: 'center',
          marginBottom: 10,
        },
        agreementText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 12,
          color: colors.text.light,
          textAlign: "center",
          marginBottom: 12,
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
        // so-chyd: dimmed state while scroll gate is active.
        acceptButtonDisabled: {
          opacity: 0.45,
        },
        acceptButtonText: {
          fontFamily: fonts.outfit.bold,
          fontSize: 18,
          color: colors.white,
        },
      }),
    [colors]
  );

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
              accept-mode progression (Terms first -> Next -> Privacy) so the active
              highlight advances left to right instead of right to left. */}
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
            // so-chyd: scroll gate — throttled to 16ms for smooth latch detection.
            scrollEventThrottle={isGated ? 16 : 0}
            onScroll={isGated ? handleScroll : undefined}
            // so-chyd: short-doc edge case — latch immediately when content fits.
            onContentSizeChange={isGated ? handleContentSizeChange : undefined}
            onLayout={isGated ? handleScrollViewLayout : undefined}
          >
            <AppText variant="bodyLarge" style={styles.content}>{currentDoc.content}</AppText>
          </ScrollView>

          {/* so-chyd: bottom fade + chevron (cue 3). Hidden once at bottom.
              pointerEvents='none' so taps pass through to the ScrollView. */}
          {isGated && !activeTabAtBottom ? (
            <View style={styles.scrollGateOverlay} pointerEvents="none">
              <LinearGradient
                colors={['transparent', 'rgba(8,2,20,0.96)']}
                style={styles.scrollFade}
              />
              <Animated.View style={chevronAnimStyle}>
                <Feather name="chevron-down" size={22} color="rgba(255,255,255,0.6)" />
              </Animated.View>
            </View>
          ) : null}
        </Animated.View>

        {/* so-eer8 / so-chyd: Accept footer shown on any gated flow (accept OR
            reaccept). All other callers open Terms as a read-only viewer.
            so-c7wq footer is dynamic by tab:
              Terms tab   -> 'Next'                       -> switches to Privacy
              Privacy tab -> 'Accept TOC and Privacy Policy' -> handleFinalAccept
            so-chyd: each CTA is scroll-gated (disabled + dimmed + helper text
            + chevron while the active tab has not been scrolled to bottom). */}
        {isGated && (
          <Animated.View style={[styles.bottomContainer, buttonContainerStyle]}>
            <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
              {/* so-chyd / so-v82u: cue 2 — helper text while CTA is gated.
                  so-v82u adds the cross-tab case: Privacy scrolled but Terms was
                  not yet read — prompt user to return to Terms tab. */}
              {!ctaEnabled ? (
                <Text style={styles.helperText}>
                  {activeTab === 'terms'
                    ? 'Scroll to the bottom to continue'
                    : privacyAtBottom
                      ? 'Scroll the Terms of Service to the bottom too'
                      : 'Scroll to the bottom to accept'}
                </Text>
              ) : activeTab === 'privacy' ? (
                <Text style={styles.agreementText}>
                  By tapping Accept, you agree to our Terms and Privacy Policy
                </Text>
              ) : null}

              {/* so-chyd: cue 1 — disabled state + dimmed opacity while gated. */}
              <AnimatedPressable
                style={[
                  styles.acceptButton,
                  buttonStyle,
                  !ctaEnabled && styles.acceptButtonDisabled,
                ]}
                onPress={
                  activeTab === 'terms'
                    ? () => handleTabSwitch('privacy')
                    : handleFinalAccept
                }
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={!ctaEnabled}
                accessibilityRole="button"
                accessibilityLabel={
                  activeTab === 'terms'
                    ? 'Next: view Privacy Policy'
                    : 'Accept Terms and Privacy Policy'
                }
                accessibilityState={{ disabled: !ctaEnabled }}
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
