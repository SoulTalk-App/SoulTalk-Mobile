import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface SaveAnimationProps {
  visible: boolean;
  onComplete: () => void;
}

const STAR_COUNT = 8;
const DURATION = 1500;

const StarShape = ({ index, total }: { index: number; total: number }) => {
  const angle = (index / total) * Math.PI * 2;
  const startRadius = 120;
  const startX = Math.cos(angle) * startRadius;
  const startY = Math.sin(angle) * startRadius;

  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const rotation = useSharedValue(0);

  useEffect(() => {
    const delay = index * 40;
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    scale.value = withDelay(delay, withTiming(1, { duration: 300 }));
    rotation.value = withDelay(
      delay,
      withTiming(360 + index * 45, { duration: DURATION - 200, easing: Easing.inOut(Easing.ease) }),
    );
    progress.value = withDelay(
      delay,
      withSequence(
        withTiming(0.3, { duration: 400, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: DURATION - 600, easing: Easing.in(Easing.ease) }),
      ),
    );
  }, []);

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

const SaveAnimation: React.FC<SaveAnimationProps> = ({ visible, onComplete }) => {
  const checkOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 200 });
      // Show checkmark after stars converge
      checkOpacity.value = withDelay(DURATION - 300, withTiming(1, { duration: 300 }));
      checkScale.value = withDelay(
        DURATION - 300,
        withSequence(
          withTiming(1.2, { duration: 200, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 150 }),
        ),
      );
      // Fade out and complete
      const timeout = setTimeout(() => {
        overlayOpacity.value = withTiming(0, { duration: 300 });
        setTimeout(() => runOnJS(onComplete)(), 300);
      }, DURATION + 200);
      return () => clearTimeout(timeout);
    }
  }, [visible]);

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
          <StarShape key={i} index={i} total={STAR_COUNT} />
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
