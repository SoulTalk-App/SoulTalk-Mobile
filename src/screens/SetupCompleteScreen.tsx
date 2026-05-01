import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { CosmicScreen } from '../components/CosmicBackdrop';

interface SetupCompleteScreenProps {
  navigation: any;
}

const SETUP_COMPLETE_KEY = '@soultalk_setup_complete';

const SetupCompleteScreen: React.FC<SetupCompleteScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        content: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 80,
        },
        // Light path: page-bg ink for AA on the so-u1k lavender wash.
        title: {
          fontFamily: fonts.outfit.light,
          fontSize: 48,
          color: isDarkMode ? colors.white : colors.text.primary,
          textAlign: 'center',
          lineHeight: 48 * 1.26,
          paddingHorizontal: 40,
        },
        subtitle: {
          fontFamily: fonts.outfit.light,
          fontSize: 15,
          color: isDarkMode ? colors.white : 'rgba(58, 14, 102, 0.85)',
          textAlign: 'center',
          lineHeight: 15 * 1.26,
          marginTop: 30,
          paddingHorizontal: 35,
        },
      }),
    [colors, isDarkMode]
  );

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

    // Mark setup complete, then navigate to Home
    const navTimer = setTimeout(async () => {
      await AsyncStorage.setItem(SETUP_COMPLETE_KEY, 'true');
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
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
    <CosmicScreen tone="night">
      <View style={styles.content}>
        {/* Title */}
        <Animated.Text style={[styles.title, titleAnimatedStyle]}>
          You're all set!
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
          Let's get started on your journey.
        </Animated.Text>
      </View>
    </CosmicScreen>
  );
};

export default SetupCompleteScreen;
