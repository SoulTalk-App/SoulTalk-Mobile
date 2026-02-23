import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { fonts } from '../theme';

const SoulPalChar = require('../../assets/images/journal/JournalSoulPalChar.png');
const SoulPalArmLeft = require('../../assets/images/journal/SoulPalArmLeft.png');
const SoulPalArmRight = require('../../assets/images/journal/SoulPalArmRight.png');

const MESSAGES = [
  'Flipping through your pages...',
  'Gathering your thoughts...',
  'Reading your reflections...',
];

const JournalLoader: React.FC = () => {
  // SoulPal gentle bobbing
  const bob = useSharedValue(0);
  // Arm wave (right arm writing motion)
  const armRotate = useSharedValue(0);
  // Three floating dots
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);
  // Message fade
  const textOpacity = useSharedValue(1);

  useEffect(() => {
    // Gentle body bob
    bob.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );

    // Right arm "writing" wiggle
    armRotate.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(-8, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        withDelay(400, withTiming(0, { duration: 1 })),
      ),
      -1,
    );

    // Cascading dots
    dot1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
        withTiming(0.3, { duration: 400, easing: Easing.in(Easing.ease) }),
      ),
      -1,
    );
    dot2.value = withRepeat(
      withSequence(
        withDelay(200, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })),
        withTiming(0.3, { duration: 400, easing: Easing.in(Easing.ease) }),
      ),
      -1,
    );
    dot3.value = withRepeat(
      withSequence(
        withDelay(400, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })),
        withTiming(0.3, { duration: 400, easing: Easing.in(Easing.ease) }),
      ),
      -1,
    );

    // Pulsing text
    textOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, []);

  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));

  const armStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${armRotate.value}deg` }],
  }));

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1.value,
    transform: [{ scale: dot1.value }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2.value,
    transform: [{ scale: dot2.value }],
  }));
  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3.value,
    transform: [{ scale: dot3.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  // Pick a random message on mount
  const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  return (
    <View style={styles.container}>
      {/* SoulPal character */}
      <Animated.View style={[styles.characterContainer, bobStyle]}>
        <Image source={SoulPalChar} style={styles.character} resizeMode="contain" />
        <Image source={SoulPalArmLeft} style={styles.armLeft} resizeMode="contain" />
        <Animated.Image source={SoulPalArmRight} style={[styles.armRight, armStyle]} resizeMode="contain" />
      </Animated.View>

      {/* Writing dots */}
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, dot1Style]} />
        <Animated.View style={[styles.dot, dot2Style]} />
        <Animated.View style={[styles.dot, dot3Style]} />
      </View>

      {/* Message */}
      <Animated.Text style={[styles.messageText, textStyle]}>{message}</Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  characterContainer: {
    width: 80,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  character: {
    width: 60,
    height: 84,
  },
  armLeft: {
    position: 'absolute',
    width: 24,
    height: 28,
    left: 2,
    top: 50,
  },
  armRight: {
    position: 'absolute',
    width: 26,
    height: 27,
    right: 2,
    top: 51,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#59168B',
  },
  messageText: {
    fontFamily: fonts.outfit.light,
    fontSize: 13,
    color: '#59168B',
    fontStyle: 'italic',
  },
});

export default JournalLoader;
