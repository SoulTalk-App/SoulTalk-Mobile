import { useEffect, useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  SharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { SpringConfigs, TimingConfigs, AnimationValues } from './constants';

/**
 * Hook for button press animation with spring physics
 */
export const useButtonAnimation = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(AnimationValues.buttonPressScale, SpringConfigs.snappy);
    opacity.value = withTiming(0.9, { duration: 100 });
  }, []);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, SpringConfigs.bouncy);
    opacity.value = withTiming(1, { duration: 100 });
  }, []);

  return { animatedStyle, onPressIn, onPressOut };
};

/**
 * Hook for fade-in animation with optional slide
 */
export const useFadeIn = (
  delay: number = 0,
  slideDistance: number = AnimationValues.slideUpDistance,
  direction: 'up' | 'down' | 'left' | 'right' = 'up'
) => {
  const opacity = useSharedValue(0);
  const translate = useSharedValue(slideDistance);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, TimingConfigs.entrance));
    translate.value = withDelay(delay, withSpring(0, SpringConfigs.subtle));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    const transform = [];
    switch (direction) {
      case 'up':
        transform.push({ translateY: translate.value });
        break;
      case 'down':
        transform.push({ translateY: -translate.value });
        break;
      case 'left':
        transform.push({ translateX: translate.value });
        break;
      case 'right':
        transform.push({ translateX: -translate.value });
        break;
    }
    return {
      opacity: opacity.value,
      transform,
    };
  });

  const reset = useCallback(() => {
    opacity.value = 0;
    translate.value = slideDistance;
  }, [slideDistance]);

  const animate = useCallback(() => {
    opacity.value = withDelay(delay, withTiming(1, TimingConfigs.entrance));
    translate.value = withDelay(delay, withSpring(0, SpringConfigs.subtle));
  }, [delay]);

  return { animatedStyle, reset, animate };
};

/**
 * Hook for continuous floating animation
 */
export const useFloatingAnimation = (amplitude: number = 10, duration: number = 3000) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-amplitude, { duration: duration / 2 }),
        withTiming(amplitude, { duration: duration / 2 })
      ),
      -1,
      true
    );
  }, [amplitude, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
};

/**
 * Hook for gentle rotation animation
 */
export const useRotationAnimation = (
  degrees: number = 360,
  duration: number = 8000,
  repeat: boolean = true
) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (repeat) {
      rotation.value = withRepeat(
        withTiming(degrees, { duration }),
        -1,
        false
      );
    } else {
      rotation.value = withTiming(degrees, { duration });
    }
  }, [degrees, duration, repeat]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return animatedStyle;
};

/**
 * Hook for scale entrance animation
 */
export const useScaleEntrance = (delay: number = 0, initialScale: number = 0.8) => {
  const scale = useSharedValue(initialScale);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, SpringConfigs.bouncy));
    opacity.value = withDelay(delay, withTiming(1, TimingConfigs.entrance));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return animatedStyle;
};

/**
 * Hook for parallax effect based on scroll/swipe position
 */
export const useParallax = (
  scrollX: SharedValue<number>,
  index: number,
  width: number,
  parallaxFactor: number = 0.3
) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [-width * parallaxFactor, 0, width * parallaxFactor],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateX }, { scale }],
      opacity,
    };
  });

  return animatedStyle;
};

/**
 * Hook for dot pagination animation
 */
export const useDotAnimation = (isActive: boolean) => {
  const width = useSharedValue(isActive ? 24 : 10);
  const opacity = useSharedValue(isActive ? 1 : 0.5);

  useEffect(() => {
    width.value = withSpring(isActive ? 24 : 10, SpringConfigs.snappy);
    opacity.value = withTiming(isActive ? 1 : 0.5, TimingConfigs.fast);
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return animatedStyle;
};

/**
 * Hook for staggered children entrance animation
 */
export const useStaggeredEntrance = (
  itemCount: number,
  baseDelay: number = 0,
  staggerDelay: number = 100
) => {
  const values = Array.from({ length: itemCount }, () => ({
    opacity: useSharedValue(0),
    translateY: useSharedValue(30),
  }));

  useEffect(() => {
    values.forEach((item, index) => {
      const delay = baseDelay + index * staggerDelay;
      item.opacity.value = withDelay(delay, withTiming(1, TimingConfigs.entrance));
      item.translateY.value = withDelay(delay, withSpring(0, SpringConfigs.subtle));
    });
  }, [baseDelay, staggerDelay]);

  const getAnimatedStyle = (index: number) => {
    return useAnimatedStyle(() => ({
      opacity: values[index].opacity.value,
      transform: [{ translateY: values[index].translateY.value }],
    }));
  };

  return { getAnimatedStyle };
};

/**
 * Hook for pulse animation (useful for loading states or attention)
 */
export const usePulseAnimation = (minScale: number = 0.95, maxScale: number = 1.05) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(maxScale, { duration: 800 }),
        withTiming(minScale, { duration: 800 })
      ),
      -1,
      true
    );
  }, [minScale, maxScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return animatedStyle;
};

/**
 * Hook for swipe gesture with spring physics
 */
export const useSwipeAnimation = (onSwipeComplete?: (direction: 'left' | 'right') => void) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const swipeLeft = useCallback(() => {
    translateX.value = withSpring(-400, SpringConfigs.pageSwipe, () => {
      if (onSwipeComplete) {
        runOnJS(onSwipeComplete)('left');
      }
    });
    opacity.value = withTiming(0, TimingConfigs.fast);
  }, [onSwipeComplete]);

  const swipeRight = useCallback(() => {
    translateX.value = withSpring(400, SpringConfigs.pageSwipe, () => {
      if (onSwipeComplete) {
        runOnJS(onSwipeComplete)('right');
      }
    });
    opacity.value = withTiming(0, TimingConfigs.fast);
  }, [onSwipeComplete]);

  const reset = useCallback(() => {
    translateX.value = withSpring(0, SpringConfigs.bouncy);
    opacity.value = withTiming(1, TimingConfigs.fast);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return { animatedStyle, swipeLeft, swipeRight, reset, translateX };
};
