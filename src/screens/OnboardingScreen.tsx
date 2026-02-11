import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
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
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';
import { SpringConfigs, AnimationValues } from '../animations/constants';

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

// Slide data
const slides = [
  {
    id: '1',
    titleStart: 'Welcome to ',
    titleHighlight: 'SoulTalk',
    tagline: 'Your space to slow down, reflect, and reconnect with your inner world',
    characterType: 'welcome',
  },
  {
    id: '2',
    titleStart: 'Meet your ',
    titleHighlight: 'SoulPal',
    tagline: 'Your tiny companion for the journey inward',
    characterType: 'soulpal',
  },
  {
    id: '3',
    titleStart: "What You'll ",
    titleHighlight: 'Discover',
    tagline: 'A gentler way to understand yourself, one reflection at a time',
    characterType: 'discover',
  },
];

interface OnboardingScreenProps {
  navigation: any;
}

// ============================================
// Pagination Dot Component
// ============================================
const PaginationDot: React.FC<{ isActive: boolean; onPress: () => void }> = ({
  isActive,
  onPress,
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
    <Pressable onPress={onPress} style={styles.dotTouchable}>
      <Animated.View style={[styles.dotOuter, dotStyle]}>
        <Animated.View style={[styles.dotInner, fillStyle]} />
      </Animated.View>
    </Pressable>
  );
};

// ============================================
// Navigation Arrow Component
// ============================================
const NavArrow: React.FC<{
  direction: 'left' | 'right';
  onPress: () => void;
  disabled?: boolean;
}> = ({ direction, onPress, disabled }) => {
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

  // Right arrow has a circular button background
  if (direction === 'right') {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[styles.nextButton, animatedStyle]}
      >
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.prevButton, animatedStyle]}
    >
      <Ionicons name="chevron-back" size={22} color={colors.white} />
    </AnimatedPressable>
  );
};

// ============================================
// Slide Content Component (for crossfade)
// ============================================
interface SlideContentProps {
  slide: typeof slides[0];
  opacity: Animated.SharedValue<number>;
  scale: Animated.SharedValue<number>;
  floatY: Animated.SharedValue<number>;
  rotation: Animated.SharedValue<number>;
  decorOpacity: Animated.SharedValue<number>;
  starFloat: Animated.SharedValue<number>;
  heartLargeFloat: Animated.SharedValue<number>;
  heartMediumFloat: Animated.SharedValue<number>;
  heartSmallFloat: Animated.SharedValue<number>;
  sideCharactersScale: Animated.SharedValue<number>;
  sideCharactersOpacity: Animated.SharedValue<number>;
}

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

// ============================================
// Main Onboarding Screen
// ============================================
const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayIndices, setDisplayIndices] = useState<[number, number]>([0, -1]); // [current, outgoing]
  const isTransitioning = useRef(false);

  const isFirstSlide = activeIndex === 0;
  const isLastSlide = activeIndex === slides.length - 1;

  // Opacity values for crossfade effect
  const slideOpacity0 = useSharedValue(1);
  const slideOpacity1 = useSharedValue(0);
  const slideOpacity2 = useSharedValue(0);

  // Scale values for morph effect
  // Slides 0 & 2 (Welcome & Discover) are smaller, Slide 1 (SoulPal) is larger
  const slideScale0 = useSharedValue(0.9);  // Welcome - smaller
  const slideScale1 = useSharedValue(1.5);  // SoulPal - large (grouped characters)
  const slideScale2 = useSharedValue(0.9);  // Discover - smaller

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
    return slideOpacity2;
  }, [slideOpacity0, slideOpacity1, slideOpacity2]);

  // Get scale shared value for a slide index
  const getScaleForSlide = useCallback((index: number) => {
    if (index === 0) return slideScale0;
    if (index === 1) return slideScale1;
    return slideScale2;
  }, [slideScale0, slideScale1, slideScale2]);

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

    // Clean up after transition
    setTimeout(() => {
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

  const handleNext = useCallback(() => {
    if (isTransitioning.current) return;

    if (isLastSlide) {
      navigation.navigate('Terms');
    } else {
      transitionToSlide(activeIndex + 1);
    }
  }, [activeIndex, isLastSlide, navigation, transitionToSlide]);

  const handleDotPress = useCallback((index: number) => {
    if (index !== activeIndex && !isTransitioning.current) {
      transitionToSlide(index);
    }
  }, [activeIndex, transitionToSlide]);

  // Swipe gesture handler
  const startX = useSharedValue(0);
  const panGesture = Gesture.Pan()
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
    <View style={styles.container}>
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
          <NavArrow direction="left" onPress={handlePrev} disabled={isFirstSlide} />

          <View style={styles.dotsContainer}>
            {slides.map((_, index) => (
              <PaginationDot
                key={index}
                isActive={index === activeIndex}
                onPress={() => handleDotPress(index)}
              />
            ))}
          </View>

          <NavArrow direction="right" onPress={handleNext} />
        </View>
      </View>
    </View>
  );
};

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  titleStart: {
    fontFamily: fonts.edensor.medium,
    fontSize: 30,
    color: colors.text.dark,
  },
  titleHighlight: {
    fontFamily: fonts.edensor.medium,
    fontSize: 30,
    color: colors.primary,
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
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
    marginBottom: 40,
  },
  bottomBar: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 18,
    paddingHorizontal: 20,
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dotTouchable: {
    padding: 4,
  },
  dotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
  },
});

export default OnboardingScreen;
