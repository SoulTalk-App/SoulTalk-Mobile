import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSoulPal } from '../contexts/SoulPalContext';
import {
  TOUCH_HITSLOP_MED,
  TOUCH_PRESS_SCALE,
  TOUCH_PRESS_SPRING_IN,
  TOUCH_PRESS_SPRING_OUT,
} from './touchPrimitives';

type SoulPalPose = 'home' | 'journal' | 'profile' | 'celebrating' | 'default';
type SoulPalMood = 'happy' | 'calm' | 'reflective' | 'energized';

interface SoulPalAnimatedProps {
  pose?: SoulPalPose;
  mood?: SoulPalMood;
  size?: number;
  animate?: boolean;
  showEyes?: boolean;
  onTap?: () => void;
  style?: any;
}

const SoulPalAnimated: React.FC<SoulPalAnimatedProps> = ({
  pose = 'default',
  mood = 'calm',
  size = 80,
  animate = true,
  showEyes = false,
  onTap,
  style,
}) => {
  const { bodyImage, eyesImage } = useSoulPal();

  // Idle animations
  const breatheScale = useSharedValue(1);
  const floatY = useSharedValue(0);
  const headTilt = useSharedValue(0);

  // Eye animations
  const eyeOpacity = useSharedValue(1);
  const eyeTranslateX = useSharedValue(0);

  // Reactive animations
  const bounceScale = useSharedValue(1);

  useEffect(() => {
    if (!animate) return;

    // Breathing: subtle scale oscillation (3.5s cycle)
    breatheScale.value = withRepeat(
      withSequence(
        withTiming(1.02, {
          duration: 1750,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(1.0, {
          duration: 1750,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );

    // Floating: translateY oscillation (4s cycle)
    floatY.value = withRepeat(
      withSequence(
        withTiming(-3, {
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(3, {
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      true,
    );

    // Head tilt: random-feeling tilt every ~10s
    headTilt.value = withRepeat(
      withSequence(
        withDelay(4000, withSpring(3, { damping: 8, stiffness: 40 })),
        withDelay(3000, withSpring(-3, { damping: 8, stiffness: 40 })),
        withDelay(3000, withSpring(0, { damping: 8, stiffness: 40 })),
      ),
      -1,
      false,
    );

    // Eye blinking
    eyeOpacity.value = withRepeat(
      withSequence(
        withDelay(2500, withTiming(0, { duration: 80 })),
        withTiming(1, { duration: 80 }),
        withDelay(3500, withTiming(0, { duration: 80 })),
        withTiming(1, { duration: 80 }),
      ),
      -1,
    );

    // Eye looking direction
    eyeTranslateX.value = withRepeat(
      withSequence(
        withDelay(1500, withTiming(2, { duration: 400, easing: Easing.inOut(Easing.ease) })),
        withDelay(1000, withTiming(-2, { duration: 400, easing: Easing.inOut(Easing.ease) })),
        withDelay(800, withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) })),
      ),
      -1,
    );

    return () => {
      cancelAnimation(breatheScale);
      cancelAnimation(floatY);
      cancelAnimation(headTilt);
      cancelAnimation(eyeOpacity);
      cancelAnimation(eyeTranslateX);
    };
  }, [animate]);

  // Bounce trigger (for celebrations/events)
  const triggerBounce = useCallback(() => {
    bounceScale.value = withSequence(
      withTiming(1.08, { duration: 150 }),
      withSpring(1.0, { damping: 10, stiffness: 200 }),
    );
  }, []);

  // Nod trigger (acknowledgment)
  const triggerNod = useCallback(() => {
    floatY.value = withSequence(
      withTiming(4, { duration: 120 }),
      withSpring(0, { damping: 10, stiffness: 150 }),
    );
  }, []);

  const bodyStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: floatY.value } as const,
        { scale: breatheScale.value * bounceScale.value } as const,
        { rotate: `${headTilt.value}deg` } as const,
      ] as any,
    };
  });

  const eyeStyle = useAnimatedStyle(() => ({
    opacity: eyeOpacity.value,
    transform: [{ translateX: eyeTranslateX.value }],
  }));

  const imageRatio = 67 / 48; // original soulpal ratio
  const imageWidth = size;
  const imageHeight = size * imageRatio;

  const eyeSize = size * 0.35;
  const eyeTop = size * 0.28;
  const eyeLeft = size * 0.22;

  const handleTap = () => {
    triggerBounce();
    onTap?.();
  };

  const content = (
    <Animated.View style={[styles.container, { width: imageWidth, height: imageHeight }, bodyStyle, style]}>
      <Image
        source={bodyImage}
        style={{ width: imageWidth, height: imageHeight }}
        resizeMode="contain"
      />
      {showEyes && (
        <Animated.Image
          source={eyesImage}
          style={[
            {
              position: 'absolute',
              width: eyeSize,
              height: eyeSize,
              top: eyeTop,
              left: eyeLeft,
            },
            eyeStyle,
          ]}
          resizeMode="contain"
        />
      )}
    </Animated.View>
  );

  if (onTap) {
    // so-wgmp: onPressIn nudges the bounce shared value DOWN before the
    // tap-released bounce fires. Without this, the only press feedback
    // arrives ~150ms after release (via triggerBounce), which reads as
    // unresponsive. Press-down + press-up form a continuous spring arc.
    //
    // so-zd1z (MAJOR fix): on a CANCELLED press (finger dragged off,
    // scroll starts) RN Pressable fires onPressIn + onPressOut-cancel
    // but NOT onPress. Without onPressOut, bounceScale stayed at 0.94
    // and SoulPal looked permanently shrunk until the next successful
    // tap. Spring back to 1.0 in onPressOut covers both the cancel and
    // the success-before-triggerBounce case (triggerBounce fires from
    // handleTap on the next tick and runs on top of the restored value).
    const handlePressIn = () => {
      bounceScale.value = withSpring(TOUCH_PRESS_SCALE, TOUCH_PRESS_SPRING_IN);
    };
    const handlePressOut = () => {
      bounceScale.value = withSpring(1, TOUCH_PRESS_SPRING_OUT);
    };
    return (
      <Pressable
        onPress={handleTap}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={TOUCH_HITSLOP_MED}
        accessibilityRole="button"
        accessibilityLabel="SoulPal"
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});

export default SoulPalAnimated;
