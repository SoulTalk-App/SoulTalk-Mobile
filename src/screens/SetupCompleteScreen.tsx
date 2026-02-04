import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../theme';

const SoulpalCharacter = require('../../assets/images/onboarding/soulpal_main.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SetupCompleteScreenProps {
  navigation: any;
}

const SetupCompleteScreen: React.FC<SetupCompleteScreenProps> = () => {
  const insets = useSafeAreaInsets();
  const { setLocalAuth } = useAuth();

  // Animation values
  const characterOpacity = useSharedValue(0);
  const characterScale = useSharedValue(0.8);
  const characterRotation = useSharedValue(0);

  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    // Character entrance
    characterOpacity.value = withTiming(1, { duration: 500 });
    characterScale.value = withTiming(1, { duration: 500 });

    // Continuous 3D wobble animation - rotates back and forth around Y axis
    characterRotation.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(180, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1, // Infinite repeat
        false
      )
    );

    // Title fades in after character appears
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    // Subtitle fades in after title
    subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));

    // Auto-navigate after showing the confirmation
    const timer = setTimeout(async () => {
      await AsyncStorage.setItem('@soultalk_local_auth', 'true');
      setLocalAuth(true);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  // Animated styles
  const characterAnimatedStyle = useAnimatedStyle(() => ({
    opacity: characterOpacity.value,
    transform: [
      { perspective: 800 },
      { scale: characterScale.value },
      { rotateY: `${characterRotation.value}deg` },
    ],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top }]}>
        {/* Main content wrapper */}
        <View style={styles.mainWrapper}>
          {/* SoulPal Character - Spinning */}
          <Animated.View style={[styles.characterContainer, characterAnimatedStyle]}>
            <Image
              source={SoulpalCharacter}
              style={styles.characterImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Title */}
          <Animated.Text style={[styles.title, titleAnimatedStyle]}>
            You're all set!
          </Animated.Text>

          {/* Subtitle */}
          <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
            A verification code has been sent to your email{'\n'}
            Please check your inbox.
          </Animated.Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#59168B',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  mainWrapper: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    paddingTop: 180,
  },
  characterContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  characterImage: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.55,
  },
  title: {
    fontFamily: fonts.outfit.light,
    fontSize: 48,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 48 * 1.26,
    paddingHorizontal: 40,
  },
  subtitle: {
    fontFamily: fonts.outfit.light,
    fontSize: 15,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 15 * 1.26,
    marginTop: 30,
    paddingHorizontal: 35,
  },
});

export default SetupCompleteScreen;
