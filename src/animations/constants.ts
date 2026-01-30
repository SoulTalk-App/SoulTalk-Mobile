import { Easing } from 'react-native-reanimated';

/**
 * Animation configurations extracted from Figma prototype
 * SoulTalk Onboarding - Exact values from Figma
 */

// Spring configurations from Figma prototype interactions
export const SpringConfigs = {
  // Page swipe/drag transition (from DRAG trigger)
  pageSwipe: {
    mass: 1,
    stiffness: 100,
    damping: 15,
  },

  // Button hover animation (from ON_HOVER trigger)
  buttonHover: {
    mass: 1,
    stiffness: 20,
    damping: 5.4,
  },

  // General bouncy entrance
  bouncy: {
    mass: 1,
    stiffness: 100,
    damping: 10,
  },

  // Subtle element transitions
  subtle: {
    mass: 1,
    stiffness: 150,
    damping: 18,
  },

  // Quick snappy animation
  snappy: {
    mass: 0.5,
    stiffness: 250,
    damping: 18,
  },

  // Gentle floating
  gentle: {
    mass: 1,
    stiffness: 40,
    damping: 8,
  },
} as const;

// Timing configurations (in milliseconds)
export const TimingConfigs = {
  fast: {
    duration: 200,
  },
  medium: {
    duration: 400,
  },
  slow: {
    duration: 800,
  },
  entrance: {
    duration: 500,
  },
  // From Figma - SLOW easing click transition
  buttonClick: {
    duration: 1250,
  },
  // Dissolve transitions
  dissolve: {
    duration: 300,
  },
} as const;

// Easing presets
export const EasingPresets = {
  easeOut: Easing.out(Easing.cubic),
  easeIn: Easing.in(Easing.cubic),
  easeInOut: Easing.inOut(Easing.cubic),
  // Sine wave for floating animations
  sine: Easing.inOut(Easing.sin),
} as const;

// Stagger delays for sequential animations
export const StaggerDelays = {
  fast: 80,
  medium: 150,
  slow: 250,
} as const;

// Animation distance/scale values
export const AnimationValues = {
  // Scale
  buttonPressScale: 0.96,
  cardPressScale: 0.98,
  entranceScale: 0.9,

  // Opacity
  fadeStart: 0,
  fadeEnd: 1,

  // Translation (pixels)
  slideUpDistance: 40,
  slideSmall: 20,
  floatDistance: 8,

  // Rotation (degrees)
  gentleRotation: 3,
  floatRotation: 2,
} as const;

// Screen-specific animation timings
export const ScreenAnimations = {
  onboarding: {
    titleDelay: 100,
    characterDelay: 250,
    taglineDelay: 400,
    dotsDelay: 500,
    buttonDelay: 600,
  },
  splash: {
    logoDelay: 200,
    fadeOutDelay: 1500,
    fadeOutDuration: 500,
  },
} as const;
