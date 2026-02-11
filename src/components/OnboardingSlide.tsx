import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { colors, fonts } from '../theme';
import { SpringConfigs, TimingConfigs } from '../animations/constants';

const { width } = Dimensions.get('window');

interface OnboardingSlideProps {
  title: string;
  subtitle: string;
  image: string;
  ImageComponent?: React.ReactNode;
  isActive?: boolean;
  index?: number;
  scrollX?: SharedValue<number>;
}

const OnboardingSlide: React.FC<OnboardingSlideProps> = ({
  title,
  subtitle,
  ImageComponent,
  isActive = true,
  index = 0,
  scrollX,
}) => {
  // Animation values for entrance
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(30);
  const imageScale = useSharedValue(0.8);
  const imageOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Staggered entrance animations
      // Title comes in first
      titleOpacity.value = withDelay(100, withTiming(1, TimingConfigs.entrance));
      titleTranslateY.value = withDelay(100, withSpring(0, SpringConfigs.subtle));

      // Image comes in second
      imageOpacity.value = withDelay(200, withTiming(1, TimingConfigs.entrance));
      imageScale.value = withDelay(200, withSpring(1, SpringConfigs.bouncy));

      // Subtitle comes in last
      subtitleOpacity.value = withDelay(400, withTiming(1, TimingConfigs.entrance));
      subtitleTranslateY.value = withDelay(400, withSpring(0, SpringConfigs.subtle));
    } else {
      // Reset for inactive slides
      titleOpacity.value = withTiming(0, { duration: 200 });
      titleTranslateY.value = 30;
      subtitleOpacity.value = withTiming(0, { duration: 200 });
      subtitleTranslateY.value = 30;
      imageOpacity.value = withTiming(0.5, { duration: 200 });
      imageScale.value = withSpring(0.9, SpringConfigs.snappy);
    }
  }, [isActive]);

  // Parallax effect based on scroll position
  const parallaxStyle = useAnimatedStyle(() => {
    if (!scrollX) return {};

    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [-width * 0.2, 0, width * 0.2],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateX }],
    };
  });

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{ scale: imageScale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.headerContainer, parallaxStyle]}>
        <Animated.Text style={[styles.title, titleAnimatedStyle]}>
          {title}
        </Animated.Text>
      </Animated.View>

      <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
        {ImageComponent ? (
          ImageComponent
        ) : (
          <View style={styles.placeholderImage} />
        )}
      </Animated.View>

      <Animated.View style={[styles.footerContainer, parallaxStyle]}>
        <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
          {subtitle}
        </Animated.Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  headerContainer: {
    alignItems: 'flex-start',
    width: '100%',
    paddingTop: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 30,
  },
  placeholderImage: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.overlay,
  },
  footerContainer: {
    alignItems: 'center',
    paddingBottom: 0,
    marginTop: 40,
  },
  title: {
    fontFamily: fonts.edensor.bold,
    fontSize: 28,
    color: colors.primary,
    textAlign: 'left',
  },
  subtitle: {
    fontFamily: fonts.outfit.light,
    fontSize: 20,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 28,
  },
});

export default OnboardingSlide;
