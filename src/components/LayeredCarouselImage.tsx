import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { SpringConfigs, TimingConfigs } from '../animations/constants';

const Carousel2a = require('../../assets/images/onboarding/Carousel2a.png');
const Carousel2b = require('../../assets/images/onboarding/Carousel2b.png');
const Carousel2c = require('../../assets/images/onboarding/Carousel2c.png');

interface LayeredCarouselImageProps {
  isActive?: boolean;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

const LayeredCarouselImage: React.FC<LayeredCarouselImageProps> = ({ isActive = true }) => {
  // Floating animation values
  const leftFloatY = useSharedValue(0);
  const centerFloatY = useSharedValue(0);
  const rightFloatY = useSharedValue(0);

  // Rotation animation values for subtle swaying
  const leftRotation = useSharedValue(0);
  const centerRotation = useSharedValue(0);
  const rightRotation = useSharedValue(0);

  // Scale values for entrance
  const leftScale = useSharedValue(0.8);
  const centerScale = useSharedValue(0.8);
  const rightScale = useSharedValue(0.8);

  // Opacity for entrance
  const leftOpacity = useSharedValue(0);
  const centerOpacity = useSharedValue(0);
  const rightOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Staggered entrance animations
      // Center image comes in first
      centerOpacity.value = withDelay(0, withTiming(1, TimingConfigs.entrance));
      centerScale.value = withDelay(0, withSpring(1, SpringConfigs.bouncy));

      // Left image comes in second
      leftOpacity.value = withDelay(150, withTiming(1, TimingConfigs.entrance));
      leftScale.value = withDelay(150, withSpring(1, SpringConfigs.bouncy));

      // Right image comes in third
      rightOpacity.value = withDelay(300, withTiming(1, TimingConfigs.entrance));
      rightScale.value = withDelay(300, withSpring(1, SpringConfigs.bouncy));

      // Start floating animations after entrance
      const floatDuration = 2500;

      // Left card floats with offset phase
      leftFloatY.value = withDelay(
        500,
        withRepeat(
          withSequence(
            withTiming(-8, { duration: floatDuration, easing: Easing.inOut(Easing.sin) }),
            withTiming(8, { duration: floatDuration, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );

      // Center card floats
      centerFloatY.value = withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(-10, { duration: floatDuration + 200, easing: Easing.inOut(Easing.sin) }),
            withTiming(10, { duration: floatDuration + 200, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );

      // Right card floats with different phase
      rightFloatY.value = withDelay(
        700,
        withRepeat(
          withSequence(
            withTiming(-6, { duration: floatDuration - 200, easing: Easing.inOut(Easing.sin) }),
            withTiming(6, { duration: floatDuration - 200, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );

      // Subtle rotation/sway animations
      leftRotation.value = withDelay(
        500,
        withRepeat(
          withSequence(
            withTiming(-3, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
            withTiming(3, { duration: 3000, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );

      rightRotation.value = withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(3, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
            withTiming(-3, { duration: 2800, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );

      centerRotation.value = withDelay(
        700,
        withRepeat(
          withSequence(
            withTiming(-1.5, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
            withTiming(1.5, { duration: 3200, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );
    }
  }, [isActive]);

  const leftAnimatedStyle = useAnimatedStyle(() => ({
    opacity: leftOpacity.value,
    transform: [
      { scale: leftScale.value },
      { translateY: leftFloatY.value },
      { rotate: `${leftRotation.value}deg` },
    ],
  }));

  const centerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: centerOpacity.value,
    transform: [
      { scale: centerScale.value },
      { translateY: centerFloatY.value },
      { rotate: `${centerRotation.value}deg` },
    ],
  }));

  const rightAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rightOpacity.value,
    transform: [
      { scale: rightScale.value },
      { translateY: rightFloatY.value },
      { rotate: `${rightRotation.value}deg` },
    ],
  }));

  return (
    <View style={styles.container}>
      {/* Left image (a) - behind */}
      <AnimatedImage
        source={Carousel2a}
        style={[styles.sideImageLeft, leftAnimatedStyle]}
        resizeMode="contain"
      />

      {/* Center image (b) - in front */}
      <AnimatedImage
        source={Carousel2b}
        style={[styles.centerImage, centerAnimatedStyle]}
        resizeMode="contain"
      />

      {/* Right image (c) - behind */}
      <AnimatedImage
        source={Carousel2c}
        style={[styles.sideImageRight, rightAnimatedStyle]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 220,
    height: 300,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideImageLeft: {
    position: 'absolute',
    left: -25,
    width: 120,
    height: 220,
    zIndex: 1,
  },
  centerImage: {
    position: 'absolute',
    width: 170,
    height: 270,
    zIndex: 2,
  },
  sideImageRight: {
    position: 'absolute',
    right: -25,
    width: 120,
    height: 220,
    zIndex: 1,
  },
});

export default LayeredCarouselImage;
