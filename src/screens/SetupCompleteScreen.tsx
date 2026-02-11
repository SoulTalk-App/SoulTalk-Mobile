import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../theme';

interface SetupCompleteScreenProps {
  navigation: any;
}

const ONBOARDING_COMPLETE_KEY = '@soultalk_onboarding_complete';

const SetupCompleteScreen: React.FC<SetupCompleteScreenProps> = ({ navigation }) => {

  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    // Title fades in
    titleOpacity.value = withTiming(1, { duration: 500 });

    // Subtitle fades in after title
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));

    // Fade out text, then navigate
    const timer = setTimeout(() => {
      titleOpacity.value = withTiming(0, { duration: 500 });
      subtitleOpacity.value = withTiming(0, { duration: 500 });
    }, 2800);

    // Mark onboarding complete, then navigate to auth flow
    const navTimer = setTimeout(async () => {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearTimeout(navTimer);
    };
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#59168B',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
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
