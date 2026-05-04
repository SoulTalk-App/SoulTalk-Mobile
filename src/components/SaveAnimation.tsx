import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  cancelAnimation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface SaveAnimationProps {
  visible: boolean;
  /**
   * When false, the star loader loops indefinitely (analysis still in
   * progress). When it flips true, stars settle to a converged state and
   * the checkmark fades in (so-apy).
   */
  done: boolean;
  onComplete: () => void;
}

const STAR_COUNT = 8;
const DURATION = 1500;

const StarShape = ({
  index,
  total,
  done,
}: {
  index: number;
  total: number;
  done: boolean;
}) => {
  const angle = (index / total) * Math.PI * 2;
  const startRadius = 120;
  const startX = Math.cos(angle) * startRadius;
  const startY = Math.sin(angle) * startRadius;

  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const rotation = useSharedValue(0);

  // so-apy: loop the converge cycle while analysis is in flight. Each cycle
  // fades stars in at the far position, converges to center, then fades out
  // and instantly resets so the next cycle starts fresh outside the visible
  // frame.
  useEffect(() => {
    const delay = index * 40;

    scale.value = withDelay(delay, withTiming(1, { duration: 300 }));

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 200 }),
          withDelay(DURATION - 400, withTiming(0, { duration: 200 })),
        ),
        -1,
        false,
      ),
    );

    rotation.value = withRepeat(
      withTiming(360 + index * 45, {
        duration: DURATION,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: DURATION - 600, easing: Easing.in(Easing.ease) }),
          withTiming(0, { duration: 1 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  // When analysis completes, settle stars to converged + faded so the
  // checkmark has a clean stage to pop in.
  useEffect(() => {
    if (!done) return;
    cancelAnimation(progress);
    cancelAnimation(opacity);
    progress.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.ease) });
    opacity.value = withTiming(0, { duration: 360 });
  }, [done]);

  const animatedStyle = useAnimatedStyle(() => {
    const x = startX * (1 - progress.value);
    const y = startY * (1 - progress.value);
    return {
      opacity: opacity.value,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: scale.value * (1 - progress.value * 0.6) },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  const colors = ['#FFD700', '#FF69B4', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C', '#FF6B6B', '#7FFFD4'];
  const color = colors[index % colors.length];

  return (
    <Animated.View style={[styles.star, animatedStyle]}>
      <View style={[styles.starInner, { backgroundColor: color }]} />
    </Animated.View>
  );
};

const SaveAnimation: React.FC<SaveAnimationProps> = ({ visible, done, onComplete }) => {
  const checkOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  // Fade the overlay in on mount.
  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [visible]);

  // Trigger the checkmark + fade-out only once analysis is done (so-apy).
  useEffect(() => {
    if (!visible || !done) return;
    // Brief settle window so the converging stars have a beat to clear before
    // the checkmark pops in.
    const SETTLE = 380;
    checkOpacity.value = withDelay(SETTLE, withTiming(1, { duration: 300 }));
    checkScale.value = withDelay(
      SETTLE,
      withSequence(
        withTiming(1.2, { duration: 200, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 150 }),
      ),
    );
    const fadeAt = SETTLE + 700;
    const completeAt = fadeAt + 320;
    const fade = setTimeout(() => {
      overlayOpacity.value = withTiming(0, { duration: 300 });
    }, fadeAt);
    const complete = setTimeout(() => onComplete(), completeAt);
    return () => {
      clearTimeout(fade);
      clearTimeout(complete);
    };
  }, [done, visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <View style={styles.center}>
        {Array.from({ length: STAR_COUNT }).map((_, i) => (
          <StarShape key={i} index={i} total={STAR_COUNT} done={done} />
        ))}
        <Animated.View style={[styles.checkContainer, checkStyle]}>
          <View style={styles.checkmark}>
            <View style={styles.checkShort} />
            <View style={styles.checkLong} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(89, 22, 139, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  center: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starInner: {
    width: 14,
    height: 14,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  checkContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 30,
    height: 20,
    marginTop: -2,
    marginLeft: 2,
  },
  checkShort: {
    position: 'absolute',
    bottom: 4,
    left: 2,
    width: 12,
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  checkLong: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    width: 20,
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
    transform: [{ rotate: '-45deg' }],
  },
});

export default SaveAnimation;
