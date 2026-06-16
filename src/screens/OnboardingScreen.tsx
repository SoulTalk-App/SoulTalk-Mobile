import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { SpringConfigs, AnimationValues } from '../animations/constants';
import { privacyPolicy, termsOfService } from '../mocks/content';

// Figma prototype spring config for character transitions (SMART_ANIMATE)
const FIGMA_SPRING_CONFIG = {
  mass: 1,
  stiffness: 100,
  damping: 15,
};

// Character images
const CharacterWelcome = require('../../assets/images/onboarding/Carousel1.png');
const CharacterDiscover = require('../../assets/images/onboarding/Carousel3.png');

// SoulPal composite characters
const SoulpalMain = require('../../assets/images/onboarding/soulpal_main.png');
const SoulpalLeft = require('../../assets/images/onboarding/soulpal_left.png');
const SoulpalRight = require('../../assets/images/onboarding/soulpal_right.png');

// Decoration images
const StarDecoration = require('../../assets/images/onboarding/star.png');
const HeartLarge = require('../../assets/images/onboarding/heart_large.png');
const HeartMedium = require('../../assets/images/onboarding/heart_medium.png');
const HeartSmall = require('../../assets/images/onboarding/heart_small.png');

// Discover slide icons (from Figma)
const DiscoverIconLeft = require('../../assets/images/onboarding/DiscoverIcon1.png');   // Pentagon with spiral - 11 o'clock
const DiscoverIconTop = require('../../assets/images/onboarding/DiscoverIcon2.png');    // Notebook - 12 o'clock
const DiscoverIconRight = require('../../assets/images/onboarding/DiscoverIcon3.png'); // Speech bubble - 1 o'clock

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// so-u41t: PaginationDot + NavArrow were defined inline inside the
// OnboardingScreen render body, so every parent setState (activeIndex,
// termsAccepted, legal-tab switches) gave them new function identities and
// remounted them. That blew away their internal useSharedValues and forced
// a re-init of their animations each tick. Hoisted to module scope so React
// keeps them mounted across parent re-renders; closure-bound things
// (styles, theme bits) flow in as props. SlideContent's hoist is bigger
// surgery and tracked separately.
type PaginationDotProps = {
  isActive: boolean;
  onPress: () => void;
  dotTouchableStyle: any;
  dotOuterStyle: any;
  dotInnerStyle: any;
};

const PaginationDot: React.FC<PaginationDotProps> = ({
  isActive,
  onPress,
  dotTouchableStyle,
  dotOuterStyle,
  dotInnerStyle,
}) => {
  const scale = useSharedValue(isActive ? 1 : 0.85);
  const fillOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    fillOpacity.value = withSpring(isActive ? 1 : 0, FIGMA_SPRING_CONFIG);
    scale.value = withSpring(isActive ? 1 : 0.85, FIGMA_SPRING_CONFIG);
  }, [isActive]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    opacity: fillOpacity.value,
  }));

  return (
    <Pressable onPress={onPress} style={dotTouchableStyle}>
      <Animated.View style={[dotOuterStyle, dotStyle]}>
        <Animated.View style={[dotInnerStyle, fillStyle]} />
      </Animated.View>
    </Pressable>
  );
};

type NavArrowProps = {
  direction: 'left' | 'right';
  onPress: () => void;
  disabled?: boolean;
  nextButtonStyle: any;
  prevButtonStyle: any;
  rightIconColor: string;
  leftIconColor: string;
};

const NavArrow: React.FC<NavArrowProps> = ({
  direction,
  onPress,
  disabled,
  nextButtonStyle,
  prevButtonStyle,
  rightIconColor,
  leftIconColor,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.9, SpringConfigs.snappy);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SpringConfigs.bouncy);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.3 : 1,
  }));

  if (direction === 'right') {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[nextButtonStyle, animatedStyle]}
      >
        <Ionicons name="chevron-forward" size={22} color={rightIconColor} />
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[prevButtonStyle, animatedStyle]}
    >
      <Feather name="chevron-left" size={26} color={leftIconColor} />
    </AnimatedPressable>
  );
};

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface SlideFeature {
  name: string;
  desc: string;
  icon: FeatherName;
}

interface Slide {
  id: string;
  titleStart: string;
  titleHighlight: string;
  tagline: string | null;
  characterType: 'welcome' | 'soulpal' | 'discover' | 'features' | 'terms';
  features?: SlideFeature[];
  privacyLine?: string;
}

// Slide data
const slides: Slide[] = [
  {
    id: '1',
    titleStart: 'Welcome to ',
    titleHighlight: 'SoulTalk',
    tagline:
      "A private space to slow down, reflect, and get to know the deeper parts of yourself. Tune into what's really going on inside.",
    characterType: 'welcome',
  },
  {
    id: '2',
    titleStart: 'Meet your ',
    titleHighlight: 'SoulPal',
    tagline:
      "Your tiny companion for the journey inward. SoulPal listens, remembers what matters to you, and helps you make sense of what you're feeling.",
    characterType: 'soulpal',
  },
  {
    id: '3',
    titleStart: "What You'll ",
    titleHighlight: 'Discover',
    tagline:
      "Patterns you've been missing. Shifts you didn't know you were making. A gentler way to understand yourself, one reflection at a time.",
    characterType: 'discover',
  },
  {
    id: '4',
    titleStart: "What's ",
    titleHighlight: 'Inside',
    tagline: null,
    characterType: 'features',
    features: [
      { name: 'Daily Reflection', desc: "Write or speak what's on your mind.", icon: 'edit-3' },
      { name: 'Affirmation Mirror', desc: 'Grounded reminders that meet you where you are.', icon: 'sun' },
      { name: 'SoulSight', desc: 'Deeper insights into yourself over time.', icon: 'eye' },
      { name: 'SoulSignals', desc: 'Patterns and narratives that surface as you reflect.', icon: 'activity' },
      { name: 'SoulShifts', desc: 'Suggestions to implement change in your daily life.', icon: 'shuffle' },
      { name: 'Personality Tests', desc: 'A starting map of how you move through the world.', icon: 'compass' },
    ],
    privacyLine: 'Everything you share stays private. Always.',
  },
  // so-jokw: required terms slide. The user MUST tap "I Accept" before they
  // can advance to Register — this replaces the prior so-37a checkbox-on-
  // RegisterScreen consent gate which had bounce-and-erase regressions.
  {
    id: '5',
    titleStart: 'Terms & ',
    titleHighlight: 'Privacy',
    tagline: null,
    characterType: 'terms',
  },
];

interface OnboardingScreenProps {
  navigation: any;
}

interface SlideContentProps {
  slide: typeof slides[0];
  opacity: SharedValue<number>;
  scale: SharedValue<number>;
  floatY: SharedValue<number>;
  rotation: SharedValue<number>;
  decorOpacity: SharedValue<number>;
  starFloat: SharedValue<number>;
  heartLargeFloat: SharedValue<number>;
  heartMediumFloat: SharedValue<number>;
  heartSmallFloat: SharedValue<number>;
  sideCharactersScale: SharedValue<number>;
  sideCharactersOpacity: SharedValue<number>;
}

// ============================================
// Main Onboarding Screen
// ============================================
const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayIndices, setDisplayIndices] = useState<[number, number]>([0, -1]); // [current, outgoing]
  const isTransitioning = useRef(false);
  // so-xllj #5: track the 500ms post-transition cleanup timer so it can be
  // cleared on unmount — otherwise navigating away mid-transition fires
  // setState on an unmounted component and can leave isTransitioning stuck.
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // so-jokw: explicit consent for slide 5. Hydrated from AsyncStorage on
  // mount so a returning user who already accepted on a prior session can
  // walk through onboarding without being blocked again.
  const [termsAccepted, setTermsAccepted] = useState(false);

  // so-hqu6: tabbed Privacy/Terms on slide 5 (matches the Settings-accessed
  // TermsScreen pattern). Scroll ref resets to top on tab switch so the new
  // doc starts at the heading.
  const [activeLegalTab, setActiveLegalTab] = useState<'privacy' | 'terms'>('privacy');
  const legalScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    AsyncStorage.getItem('@terms_accepted')
      .then((v) => setTermsAccepted(v === 'true'))
      .catch(() => {});
  }, []);

  // so-xllj #5: clear any pending transition cleanup timer on unmount.
  useEffect(
    () => () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    },
    [],
  );

  const handleLegalTabSwitch = useCallback((tab: 'privacy' | 'terms') => {
    setActiveLegalTab(tab);
    legalScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const isFirstSlide = activeIndex === 0;
  const isLastSlide = activeIndex === slides.length - 1;
  const isTermsSlide = slides[activeIndex]?.characterType === 'terms';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        contentArea: {
          flex: 1,
        },
        slideContainer: {
          flex: 1,
          position: 'relative',
        },
        // Each slide content is absolutely positioned for crossfade overlap
        slideContent: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 20,
          paddingTop: 120,
          justifyContent: 'space-between',
        },
        titleContainer: {
          flexDirection: 'row',
          flexWrap: 'wrap',
        },
        // Light path: page-bg ink for AA on the so-u1k lavender wash.
        titleStart: {
          fontFamily: fonts.edensor.medium,
          fontSize: 30,
          color: isDarkMode ? colors.white : colors.text.primary,
        },
        titleHighlight: {
          fontFamily: fonts.edensor.medium,
          fontSize: 30,
          color: '#C47ADB',
        },
        characterWrapper: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        characterContainer: {
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          width: SCREEN_WIDTH * 0.9,
          height: SCREEN_WIDTH * 1.1,
        },
        decorationsContainer: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          pointerEvents: 'none',
        },
        characterImage: {
          width: SCREEN_WIDTH * 0.5,
          height: SCREEN_WIDTH * 0.8,
        },
        // Star - 11 o'clock position from head (upper-left diagonal)
        decorStar: {
          position: 'absolute',
          width: 38,
          height: 38,
          left: '18%',
          top: '15%',
        },
        // Large heart - top right (highest)
        decorHeartLarge: {
          position: 'absolute',
          width: 48,
          height: 44,
          right: '10%',
          top: '8%',
        },
        // Medium heart - middle right (below large)
        decorHeartMedium: {
          position: 'absolute',
          width: 38,
          height: 34,
          right: '5%',
          top: '18%',
        },
        // Small heart - at eye level (lowest in cascade)
        decorHeartSmall: {
          position: 'absolute',
          width: 30,
          height: 26,
          right: '12%',
          top: '27%',
        },
        // Discover slide icons - positioned at 11, 12, and 1 o'clock from head
        discoverIconLeft: {
          position: 'absolute',
          left: '14%',
          top: '8%',
        },
        discoverIconTop: {
          position: 'absolute',
          left: '50%',
          marginLeft: -20,
          top: '0%',
        },
        discoverIconRight: {
          position: 'absolute',
          right: '14%',
          top: '8%',
        },
        discoverIconImage: {
          width: 40,
          height: 40,
        },
        soulpalComposite: {
          width: SCREEN_WIDTH * 0.65,
          height: SCREEN_WIDTH * 0.9,
          justifyContent: 'center',
          alignItems: 'center',
        },
        soulpalMain: {
          width: SCREEN_WIDTH * 0.34,
          height: SCREEN_WIDTH * 0.65,
          position: 'absolute',
          zIndex: 3,
        },
        // Side characters positioned very close to main, almost behind it
        soulpalLeft: {
          width: SCREEN_WIDTH * 0.24,
          height: SCREEN_WIDTH * 0.48,
          position: 'absolute',
          left: '12%',
          top: '20%',
          zIndex: 1,
        },
        soulpalRight: {
          width: SCREEN_WIDTH * 0.24,
          height: SCREEN_WIDTH * 0.48,
          position: 'absolute',
          right: '12%',
          top: '20%',
          zIndex: 2,
        },
        tagline: {
          fontFamily: fonts.outfit.light,
          fontSize: 16,
          color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(58, 14, 102, 0.78)',
          textAlign: 'center',
          lineHeight: 24,
          paddingHorizontal: 10,
          marginBottom: 40,
        },
        // so-c6h + so-6rj: Slide 4 'What's Inside' feature list + privacy promise.
        featuresSlideContent: {
          // Override slideContent's default 'space-between' so the inner block
          // can center vertically without leaving big bottom whitespace.
          justifyContent: 'center',
          paddingTop: 60,
        },
        featuresInner: {
          width: '100%',
        },
        featuresTitleContainer: {
          // Center the title to match slides 1-3's centered chrome (so-6rj).
          justifyContent: 'center',
          alignSelf: 'center',
          marginBottom: 24,
        },
        featuresList: {
          paddingBottom: 4,
        },
        featureRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 14,
          marginBottom: 16,
        },
        featureIcon: {
          marginTop: 1,
        },
        featureText: {
          flex: 1,
          minWidth: 0,
        },
        featureName: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 15,
          color: isDarkMode ? colors.white : colors.text.primary,
          marginBottom: 2,
        },
        featureDesc: {
          fontFamily: fonts.outfit.regular,
          fontSize: 13,
          lineHeight: 13 * 1.45,
          color: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(58, 14, 102, 0.7)',
        },
        // Privacy promise block — divider + lock leading-icon + larger
        // higher-contrast italic so it reads as a deliberate promise (so-6rj).
        privacyBlock: {
          marginTop: 14,
        },
        privacyDivider: {
          height: 1,
          backgroundColor: isDarkMode
            ? 'rgba(255,255,255,0.16)'
            : 'rgba(58, 14, 102, 0.14)',
          marginBottom: 12,
        },
        privacyRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
        },
        privacyLeadIcon: {
          marginTop: 1,
        },
        privacyLine: {
          fontFamily: fonts.edensor.italic,
          fontSize: 14,
          letterSpacing: 0.3,
          color: isDarkMode ? 'rgba(255,255,255,0.92)' : colors.text.primary,
          textAlign: 'center',
          flexShrink: 1,
        },
        bottomBar: {
          // Dark: translucent deep-cosmic so the CosmicScreen night atmosphere
          // reads through; light: keep brand-purple pill (existing design).
          backgroundColor: isDarkMode ? 'rgba(15,8,32,0.78)' : colors.primary,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingTop: 18,
          paddingHorizontal: 20,
          borderTopWidth: 1,
          borderTopColor: isDarkMode
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(255,255,255,0.15)',
        },
        navigationRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        prevButton: {
          width: 44,
          height: 44,
          justifyContent: 'center',
          alignItems: 'center',
        },
        nextButton: {
          width: 50,
          height: 50,
          borderRadius: 25,
          // Dark: frosted-glass disc with subtle stroke so it doesn't read as
          // a flat teal/cream chip pasted from light. Light unchanged.
          backgroundColor: isDarkMode
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(255, 255, 255, 0.2)',
          borderWidth: isDarkMode ? 1 : 0,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.18)' : 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDarkMode ? 0 : 0.1,
          shadowRadius: 4,
          elevation: isDarkMode ? 0 : 3,
        },
        dotsContainer: {
          // so-mw8e: claim the middle slot via flex:1 + justifyContent:center
          // so the dots cluster sits centered between prevButton and the
          // right-side affordance (NavArrow on slides 1-4, acceptCta on
          // slide 5). Without this, space-between + a wider acceptCta could
          // squeeze the dots into thin vertical pills ("barcode").
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 14,
        },
        // so-jokw: terms slide ditches the centered character chrome —
        // text-heavy, scrollable, full-bleed within slide padding.
        termsSlideContent: {
          justifyContent: 'flex-start',
          paddingTop: 80,
        },
        // so-hqu6: tab row sits between the title and the scroll frame.
        // Translucent-glass styling so the white-on-purple TermsScreen
        // pills don't fight with the cosmic backdrop.
        termsTabRow: {
          flexDirection: 'row',
          gap: 8,
          marginTop: 16,
        },
        termsTab: {
          flex: 1,
          paddingVertical: 10,
          borderRadius: 8,
          alignItems: 'center',
          backgroundColor: isDarkMode
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.7)',
          borderWidth: 1,
          borderColor: isDarkMode
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(58,14,102,0.10)',
        },
        termsTabActive: {
          backgroundColor: isDarkMode ? colors.white : colors.primary,
          borderColor: isDarkMode ? 'transparent' : colors.primary,
        },
        termsTabText: {
          fontFamily: fonts.outfit.medium,
          fontSize: 13,
          color: isDarkMode ? 'rgba(255,255,255,0.78)' : colors.text.primary,
        },
        termsTabTextActive: {
          color: isDarkMode ? '#3A0E66' : colors.white,
          fontFamily: fonts.outfit.semiBold,
        },
        termsScrollFrame: {
          flex: 1,
          marginTop: 12,
          backgroundColor: isDarkMode
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(255,255,255,0.7)',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: isDarkMode
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(58,14,102,0.10)',
          overflow: 'hidden',
        },
        termsScrollContent: {
          padding: 16,
          paddingBottom: 32,
        },
        termsEffective: {
          fontFamily: fonts.outfit.regular,
          fontSize: 12,
          color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(58,14,102,0.65)',
          marginBottom: 10,
        },
        termsBody: {
          fontFamily: fonts.outfit.regular,
          fontSize: 13,
          lineHeight: 13 * 1.55,
          color: isDarkMode ? 'rgba(255,255,255,0.85)' : colors.text.primary,
        },
        // Slide-5 Accept button — fills the navigationRow's right-side
        // affordance slot. Sized similar to the existing acceptButton on
        // TermsScreen but tuned for the bottom-bar context.
        acceptCta: {
          paddingHorizontal: 20,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.white,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDarkMode ? 0 : 0.12,
          shadowRadius: 4,
          elevation: isDarkMode ? 0 : 3,
        },
        acceptCtaText: {
          fontFamily: fonts.outfit.bold,
          fontSize: 15,
          color: colors.primary,
        },
        dotTouchable: {
          padding: 4,
          flexShrink: 0,
        },
        dotOuter: {
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: colors.white,
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
        },
        dotInner: {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.white,
          flexShrink: 0,
        },
      }),
    [colors, isDarkMode]
  );

  // so-u41t: PaginationDot + NavArrow hoisted to module scope above so
  // their identities stay stable across parent re-renders (Reanimated
  // shared values are no longer reseeded every keystroke).

  // ============================================
  // Slide Content Component (for crossfade)
  // ============================================
  const SlideContent: React.FC<SlideContentProps> = ({
    slide,
    opacity,
    scale,
    floatY,
    rotation,
    decorOpacity,
    starFloat,
    heartLargeFloat,
    heartMediumFloat,
    heartSmallFloat,
    sideCharactersScale,
    sideCharactersOpacity,
  }) => {
    // Main content opacity (text, main character)
    const containerStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    // Main character animation
    const characterStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: floatY.value },
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
    }));

    // Side characters (SoulPal left/right) - animate separately
    const sideCharacterLeftStyle = useAnimatedStyle(() => ({
      opacity: sideCharactersOpacity.value,
      transform: [
        { translateY: floatY.value },
        { scale: sideCharactersScale.value },
        { translateX: (1 - sideCharactersScale.value) * 50 }, // Slide in from center
      ],
    }));

    const sideCharacterRightStyle = useAnimatedStyle(() => ({
      opacity: sideCharactersOpacity.value,
      transform: [
        { translateY: floatY.value },
        { scale: sideCharactersScale.value },
        { translateX: -(1 - sideCharactersScale.value) * 50 }, // Slide in from center
      ],
    }));

    const decorStyle = useAnimatedStyle(() => ({
      opacity: decorOpacity.value,
    }));

    const starStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: starFloat.value }],
    }));

    const heartLargeStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: heartLargeFloat.value }],
    }));

    const heartMediumStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: heartMediumFloat.value }],
    }));

    const heartSmallStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: heartSmallFloat.value }],
    }));

    const renderCharacter = () => {
      switch (slide.characterType) {
        case 'soulpal':
          // SoulPal slide: main character + animated side characters
          return (
            <View style={styles.soulpalComposite}>
              {/* Side characters animate in separately */}
              <Animated.Image
                source={SoulpalLeft}
                style={[styles.soulpalLeft, sideCharacterLeftStyle]}
                resizeMode="contain"
              />
              <Animated.Image
                source={SoulpalRight}
                style={[styles.soulpalRight, sideCharacterRightStyle]}
                resizeMode="contain"
              />
              {/* Main character stays in place (morphs from Welcome character) */}
              <Image source={SoulpalMain} style={styles.soulpalMain} resizeMode="contain" />
            </View>
          );
        case 'discover':
          return (
            <Image source={CharacterDiscover} style={styles.characterImage} resizeMode="contain" />
          );
        case 'welcome':
        default:
          return (
            <Image source={CharacterWelcome} style={styles.characterImage} resizeMode="contain" />
          );
      }
    };

    if (slide.characterType === 'terms') {
      // so-jokw + so-hqu6: terms slide with tabbed Privacy/Terms UX matching
      // the Settings-accessed TermsScreen. Single ScrollView shows only the
      // active doc; tab switch resets scroll to top. The "I Accept" CTA
      // lives in the navigationRow at the bottom (rendered by the parent),
      // and acceptance covers both docs ("by tapping Accept, you agree to
      // our Terms and Privacy Policy"). Tab is reset to 'privacy' on
      // every onboarding entry via the useFocusEffect above.
      const currentDoc = activeLegalTab === 'privacy' ? privacyPolicy : termsOfService;
      return (
        <Animated.View style={[styles.slideContent, styles.termsSlideContent, containerStyle]}>
          <View style={styles.titleContainer}>
            <Text style={styles.titleStart}>{slide.titleStart}</Text>
            <Text style={styles.titleHighlight}>{slide.titleHighlight}</Text>
          </View>
          <View style={styles.termsTabRow}>
            <Pressable
              style={[
                styles.termsTab,
                activeLegalTab === 'privacy' && styles.termsTabActive,
              ]}
              onPress={() => handleLegalTabSwitch('privacy')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeLegalTab === 'privacy' }}
            >
              <Text
                style={[
                  styles.termsTabText,
                  activeLegalTab === 'privacy' && styles.termsTabTextActive,
                ]}
              >
                Privacy Policy
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.termsTab,
                activeLegalTab === 'terms' && styles.termsTabActive,
              ]}
              onPress={() => handleLegalTabSwitch('terms')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeLegalTab === 'terms' }}
            >
              <Text
                style={[
                  styles.termsTabText,
                  activeLegalTab === 'terms' && styles.termsTabTextActive,
                ]}
              >
                Terms of Service
              </Text>
            </Pressable>
          </View>
          <View style={styles.termsScrollFrame}>
            <ScrollView
              ref={legalScrollRef}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.termsScrollContent}
              nestedScrollEnabled
            >
              <Text style={styles.termsEffective}>
                Effective: {currentDoc.effectiveDate}
              </Text>
              <Text style={styles.termsBody}>{currentDoc.content}</Text>
            </ScrollView>
          </View>
        </Animated.View>
      );
    }

    if (slide.characterType === 'features') {
      // so-c6h + so-6rj: Slide 4 ('What's Inside'). Title + feature list +
      // emphasized privacy promise, all centered vertically in the available
      // space between the safe-area top and the bottom bar.
      return (
        <Animated.View
          style={[styles.slideContent, styles.featuresSlideContent, containerStyle]}
        >
          <View style={styles.featuresInner}>
            <View style={[styles.titleContainer, styles.featuresTitleContainer]}>
              <Text style={styles.titleStart}>{slide.titleStart}</Text>
              <Text style={styles.titleHighlight}>{slide.titleHighlight}</Text>
            </View>
            <View style={styles.featuresList}>
              {slide.features?.map((f) => (
                <View key={f.name} style={styles.featureRow}>
                  <Feather
                    name={f.icon}
                    size={24}
                    color={isDarkMode ? colors.white : colors.text.primary}
                    style={styles.featureIcon}
                  />
                  <View style={styles.featureText}>
                    <Text style={styles.featureName}>{f.name}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
            {slide.privacyLine && (
              <View style={styles.privacyBlock}>
                <View style={styles.privacyDivider} />
                <View style={styles.privacyRow}>
                  <Feather
                    name="lock"
                    size={14}
                    color={isDarkMode ? colors.white : colors.text.primary}
                    style={styles.privacyLeadIcon}
                  />
                  <Text style={styles.privacyLine}>{slide.privacyLine}</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      );
    }

    return (
      <Animated.View style={[styles.slideContent, containerStyle]}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleStart}>{slide.titleStart}</Text>
          <Text style={styles.titleHighlight}>{slide.titleHighlight}</Text>
        </View>

        {/* Character with decorations */}
        <View style={styles.characterWrapper}>
          <Animated.View style={[styles.characterContainer, characterStyle]}>
            {/* Decorations - Welcome slide (star and hearts) */}
            {slide.characterType === 'welcome' && (
              <Animated.View style={[styles.decorationsContainer, decorStyle]}>
                <Animated.Image
                  source={StarDecoration}
                  style={[styles.decorStar, starStyle]}
                  resizeMode="contain"
                />
                <Animated.Image
                  source={HeartLarge}
                  style={[styles.decorHeartLarge, heartLargeStyle]}
                  resizeMode="contain"
                />
                <Animated.Image
                  source={HeartMedium}
                  style={[styles.decorHeartMedium, heartMediumStyle]}
                  resizeMode="contain"
                />
                <Animated.Image
                  source={HeartSmall}
                  style={[styles.decorHeartSmall, heartSmallStyle]}
                  resizeMode="contain"
                />
              </Animated.View>
            )}

            {/* Decorations - Discover slide (icons) */}
            {slide.characterType === 'discover' && (
              <View style={styles.decorationsContainer}>
                {/* Notebook icon - 11 o'clock position */}
                <Animated.View style={[styles.discoverIconLeft, starStyle]}>
                  <Image source={DiscoverIconTop} style={styles.discoverIconImage} resizeMode="contain" />
                </Animated.View>
                {/* Speech bubble icon - 12 o'clock position */}
                <Animated.View style={[styles.discoverIconTop, heartLargeStyle]}>
                  <Image source={DiscoverIconRight} style={styles.discoverIconImage} resizeMode="contain" />
                </Animated.View>
                {/* Pentagon/spiral icon - 1 o'clock position */}
                <Animated.View style={[styles.discoverIconRight, heartMediumStyle]}>
                  <Image source={DiscoverIconLeft} style={styles.discoverIconImage} resizeMode="contain" />
                </Animated.View>
              </View>
            )}

            {/* Character image */}
            {renderCharacter()}
          </Animated.View>
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>{slide.tagline}</Text>
      </Animated.View>
    );
  };

  // Opacity values for crossfade effect
  const slideOpacity0 = useSharedValue(1);
  const slideOpacity1 = useSharedValue(0);
  const slideOpacity2 = useSharedValue(0);
  const slideOpacity3 = useSharedValue(0);  // so-uy3: 'What's Inside' slide
  const slideOpacity4 = useSharedValue(0);  // so-ebsm: terms slide (was sharing slideOpacity3 and getting blanked during 3->4 transition)

  // Scale values for morph effect
  // Slides 0 & 2 (Welcome & Discover) are smaller, Slide 1 (SoulPal) is larger
  const slideScale0 = useSharedValue(0.9);  // Welcome - smaller
  const slideScale1 = useSharedValue(1.5);  // SoulPal - large (grouped characters)
  const slideScale2 = useSharedValue(0.9);  // Discover - smaller
  const slideScale3 = useSharedValue(0.9);  // so-uy3: features list — default size, no character to morph
  const slideScale4 = useSharedValue(0.9);  // so-ebsm: terms slide

  // Shared floating animation values (all slides share these)
  const floatY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const decorOpacity = useSharedValue(1);
  const starFloat = useSharedValue(0);
  const heartLargeFloat = useSharedValue(0);
  const heartMediumFloat = useSharedValue(0);
  const heartSmallFloat = useSharedValue(0);

  // Side characters animation (for SoulPal slide - left and right characters)
  const sideCharactersScale = useSharedValue(1);
  const sideCharactersOpacity = useSharedValue(1);

  // Swipe gesture tracking
  const gestureTranslateX = useSharedValue(0);
  const activeIndexShared = useSharedValue(0);

  // Get opacity shared value for a slide index
  const getOpacityForSlide = useCallback((index: number) => {
    if (index === 0) return slideOpacity0;
    if (index === 1) return slideOpacity1;
    if (index === 2) return slideOpacity2;
    if (index === 3) return slideOpacity3;
    return slideOpacity4;
  }, [slideOpacity0, slideOpacity1, slideOpacity2, slideOpacity3, slideOpacity4]);

  // Get scale shared value for a slide index
  const getScaleForSlide = useCallback((index: number) => {
    if (index === 0) return slideScale0;
    if (index === 1) return slideScale1;
    if (index === 2) return slideScale2;
    if (index === 3) return slideScale3;
    return slideScale4;
  }, [slideScale0, slideScale1, slideScale2, slideScale3, slideScale4]);

  // Initialize floating animations
  useEffect(() => {
    // Continuous floating animation
    floatY.value = withRepeat(
      withSequence(
        withTiming(-AnimationValues.floatDistance, {
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(AnimationValues.floatDistance, {
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      true
    );

    // Subtle rotation
    rotation.value = withRepeat(
      withSequence(
        withTiming(-AnimationValues.floatRotation, {
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(AnimationValues.floatRotation, {
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      true
    );

    // Decoration floating animations
    starFloat.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(6, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    heartLargeFloat.value = withDelay(
      100,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(8, { duration: 2000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    heartMediumFloat.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(5, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          withTiming(-5, { duration: 1600, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    heartSmallFloat.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(4, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);

  // Reset to first slide whenever this screen gains focus (e.g. navigating back)
  useFocusEffect(
    useCallback(() => {
      setActiveIndex(0);
      setDisplayIndices([0, -1]);
      isTransitioning.current = false;
      slideOpacity0.value = 1;
      slideOpacity1.value = 0;
      slideOpacity2.value = 0;
      slideOpacity3.value = 0;
      slideOpacity4.value = 0;
      slideScale0.value = 0.9;
      slideScale1.value = 1.5;
      slideScale2.value = 0.9;
      slideScale3.value = 0.9;
      slideScale4.value = 0.9;
      sideCharactersScale.value = 1;
      sideCharactersOpacity.value = 1;
      activeIndexShared.value = 0;
      // so-hqu6: reset slide-5 tab to Privacy on every onboarding entry
      // so users always see the Privacy doc first (not whichever tab the
      // last session left active).
      setActiveLegalTab('privacy');
    }, [])
  );

  // Keep shared value in sync with state
  useEffect(() => {
    activeIndexShared.value = activeIndex;
  }, [activeIndex]);

  // Crossfade transition to new slide with expand/contract effect
  // The main character morphs in place, side characters animate separately
  const transitionToSlide = useCallback((newIndex: number) => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;

    const currentIndex = activeIndex;
    const currentOpacity = getOpacityForSlide(currentIndex);
    const newOpacity = getOpacityForSlide(newIndex);
    const currentScale = getScaleForSlide(currentIndex);
    const newScale = getScaleForSlide(newIndex);

    // Set display indices to show both slides during transition
    setDisplayIndices([newIndex, currentIndex]);

    // Determine scale values based on transition direction
    // Slides 0 & 2 are smaller (0.9), Slide 1 (SoulPal) is large (1.5)
    const getTargetScale = (index: number) => (index === 1 ? 1.5 : 0.9);
    const getStartScale = (index: number) => (index === 1 ? 0.9 : 1.1);

    // Prepare new slide
    newScale.value = getStartScale(newIndex);
    newOpacity.value = 0;

    // === ENTERING SoulPal slide (index 1) ===
    if (newIndex === 1) {
      // Side characters start hidden/small, will animate in with delay
      sideCharactersScale.value = 0.3;
      sideCharactersOpacity.value = 0;

      // Main content fades in
      newOpacity.value = withSpring(1, FIGMA_SPRING_CONFIG);
      newScale.value = withSpring(getTargetScale(newIndex), FIGMA_SPRING_CONFIG);

      // Side characters animate in with delay (after main character appears)
      sideCharactersOpacity.value = withDelay(150, withSpring(1, FIGMA_SPRING_CONFIG));
      sideCharactersScale.value = withDelay(150, withSpring(1, FIGMA_SPRING_CONFIG));
    }
    // === LEAVING SoulPal slide (index 1) ===
    else if (currentIndex === 1) {
      // Side characters fade out first
      sideCharactersOpacity.value = withSpring(0, FIGMA_SPRING_CONFIG);
      sideCharactersScale.value = withSpring(0.3, FIGMA_SPRING_CONFIG);

      // Main content fades with slight delay (morphs into new character)
      currentOpacity.value = withDelay(100, withSpring(0, FIGMA_SPRING_CONFIG));
      currentScale.value = withSpring(0.95, FIGMA_SPRING_CONFIG);

      // New slide fades in
      newOpacity.value = withDelay(100, withSpring(1, FIGMA_SPRING_CONFIG));
      newScale.value = withSpring(getTargetScale(newIndex), FIGMA_SPRING_CONFIG);
    }
    // === Normal transition (0 to 2 or vice versa, shouldn't happen in normal flow) ===
    else {
      currentOpacity.value = withSpring(0, FIGMA_SPRING_CONFIG);
      currentScale.value = withSpring(0.95, FIGMA_SPRING_CONFIG);
      newOpacity.value = withSpring(1, FIGMA_SPRING_CONFIG);
      newScale.value = withSpring(getTargetScale(newIndex), FIGMA_SPRING_CONFIG);
    }

    // Old slide fades out (if not already handled above)
    if (newIndex !== 1 && currentIndex !== 1) {
      currentOpacity.value = withSpring(0, FIGMA_SPRING_CONFIG);
    } else if (newIndex === 1) {
      currentOpacity.value = withSpring(0, FIGMA_SPRING_CONFIG);
      currentScale.value = withSpring(0.95, FIGMA_SPRING_CONFIG);
    }

    // Update state after animation starts
    setActiveIndex(newIndex);

    // Clean up after transition. Tracked + cleared on unmount (so-xllj #5);
    // also clear any prior pending timer so overlapping transitions don't
    // stack callbacks.
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setDisplayIndices([newIndex, -1]);
      isTransitioning.current = false;
      // Reset the old slide's values to their resting state
      currentOpacity.value = 0;
      // Slides 0 & 2 are smaller (0.9), Slide 1 is large (1.5)
      currentScale.value = currentIndex === 1 ? 1.5 : 0.9;
      // Reset side characters to visible state for next time
      if (currentIndex === 1) {
        sideCharactersScale.value = 1;
        sideCharactersOpacity.value = 1;
      }
    }, 500);
  }, [activeIndex, getOpacityForSlide, getScaleForSlide, sideCharactersScale, sideCharactersOpacity]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (!isFirstSlide && !isTransitioning.current) {
      transitionToSlide(activeIndex - 1);
    }
  }, [activeIndex, isFirstSlide, transitionToSlide]);

  // so-jokw: from the terms slide, "Next" only proceeds if the user has
  // tapped Accept. Acceptance writes AsyncStorage and is the single signal
  // the auth screens read on mount. The right-arrow on slide 5 is hidden
  // until accepted (replaced by the I Accept button rendered in the
  // navigationRow), so this guard is the safety net for swipe.
  const handleNext = useCallback(async () => {
    if (isTransitioning.current) return;

    if (isLastSlide) {
      if (termsAccepted) {
        navigation.navigate('Register');
      }
      // No-op when not accepted — the slide-5 UI shows an Accept button.
    } else {
      transitionToSlide(activeIndex + 1);
    }
  }, [activeIndex, isLastSlide, navigation, termsAccepted, transitionToSlide]);

  const handleAcceptTerms = useCallback(async () => {
    try {
      await AsyncStorage.setItem('@terms_accepted', 'true');
    } catch {}
    setTermsAccepted(true);
    navigation.navigate('Register');
  }, [navigation]);

  const handleDotPress = useCallback((index: number) => {
    if (index !== activeIndex && !isTransitioning.current) {
      transitionToSlide(index);
    }
  }, [activeIndex, transitionToSlide]);

  // Swipe gesture handler
  const startX = useSharedValue(0);
  const panGesture = Gesture.Pan()
    // so-wdvc: constrain to horizontal pans so vertical pans inside the
    // slide-5 Terms ScrollView reach the inner scroller. Without these,
    // the parent Pan grabs any direction and the Terms-of-Service section
    // (rendered after the Privacy Policy) was unreachable. activeOffsetX
    // requires ~15px of horizontal travel before the slide swipe takes
    // over; failOffsetY hard-disables the parent gesture once the user
    // has clearly committed to a vertical pan.
    .activeOffsetX([-15, 15])
    .failOffsetY([-12, 12])
    .onStart(() => {
      startX.value = gestureTranslateX.value;
    })
    .onUpdate((event) => {
      const resistance = 0.3;
      gestureTranslateX.value = startX.value + event.translationX * resistance;
    })
    .onEnd((event) => {
      const threshold = SCREEN_WIDTH * 0.15;
      const currentIndex = activeIndexShared.value;

      gestureTranslateX.value = withSpring(0, FIGMA_SPRING_CONFIG);

      // so-jokw: swipes between slides 1↔5 still allowed (re-read prior
      // slides). Forward-swipe from terms slide is governed by handleNext,
      // which no-ops when terms aren't accepted yet.
      if (event.translationX < -threshold && currentIndex < slides.length - 1) {
        runOnJS(handleNext)();
      } else if (event.translationX > threshold && currentIndex > 0) {
        runOnJS(handlePrev)();
      }
    });

  // Gesture feedback style
  const gestureStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: gestureTranslateX.value }],
  }));

  // Determine which slides to render
  const slidesToRender = displayIndices.filter(i => i >= 0);

  return (
    <CosmicScreen tone="night">
      {/* Main Content Area */}
      <View style={styles.contentArea}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.slideContainer, gestureStyle]}>
            {/* Render slides for crossfade effect */}
            {slidesToRender.map((slideIndex) => (
              <SlideContent
                key={slideIndex}
                slide={slides[slideIndex]}
                opacity={getOpacityForSlide(slideIndex)}
                scale={getScaleForSlide(slideIndex)}
                floatY={floatY}
                rotation={rotation}
                decorOpacity={decorOpacity}
                starFloat={starFloat}
                heartLargeFloat={heartLargeFloat}
                heartMediumFloat={heartMediumFloat}
                heartSmallFloat={heartSmallFloat}
                sideCharactersScale={sideCharactersScale}
                sideCharactersOpacity={sideCharactersOpacity}
              />
            ))}
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Purple Bottom Navigation Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.navigationRow}>
          <NavArrow
            direction="left"
            onPress={handlePrev}
            disabled={isFirstSlide}
            nextButtonStyle={styles.nextButton}
            prevButtonStyle={styles.prevButton}
            rightIconColor={isDarkMode ? colors.white : colors.primary}
            leftIconColor={colors.white}
          />

          <View style={styles.dotsContainer}>
            {slides.map((_, index) => (
              <PaginationDot
                key={index}
                isActive={index === activeIndex}
                onPress={() => handleDotPress(index)}
                dotTouchableStyle={styles.dotTouchable}
                dotOuterStyle={styles.dotOuter}
                dotInnerStyle={styles.dotInner}
              />
            ))}
          </View>

          {isTermsSlide && !termsAccepted ? (
            <Pressable
              onPress={handleAcceptTerms}
              style={styles.acceptCta}
              accessibilityRole="button"
              accessibilityLabel="Accept Terms and Privacy"
            >
              <Text style={styles.acceptCtaText}>I Accept</Text>
            </Pressable>
          ) : (
            <NavArrow
              direction="right"
              onPress={handleNext}
              nextButtonStyle={styles.nextButton}
              prevButtonStyle={styles.prevButton}
              rightIconColor={isDarkMode ? colors.white : colors.primary}
              leftIconColor={colors.white}
            />
          )}
        </View>
      </View>
    </CosmicScreen>
  );
};

export default OnboardingScreen;
