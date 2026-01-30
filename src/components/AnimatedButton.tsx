import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, fonts } from '../theme';
import { SpringConfigs, TimingConfigs, AnimationValues } from '../animations/constants';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}) => {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(AnimationValues.buttonPressScale, SpringConfigs.snappy);
    pressed.value = withTiming(1, { duration: 100 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SpringConfigs.bouncy);
    pressed.value = withTiming(0, { duration: 150 });
  }, []);

  const animatedButtonStyle = useAnimatedStyle(() => {
    let backgroundColor: string;
    let pressedColor: string;
    let shadowOpacity: number;

    switch (variant) {
      case 'primary':
        backgroundColor = colors.white;
        pressedColor = 'rgba(79, 23, 134, 0.12)';
        shadowOpacity = 0.15;
        break;
      case 'secondary':
        backgroundColor = colors.primary;
        pressedColor = colors.button.primaryPressed;
        shadowOpacity = 0.2;
        break;
      case 'outline':
        backgroundColor = 'transparent';
        pressedColor = 'rgba(101, 52, 149, 0.1)';
        shadowOpacity = 0;
        break;
      default:
        backgroundColor = colors.white;
        pressedColor = 'rgba(79, 23, 134, 0.12)';
        shadowOpacity = 0.15;
    }

    const bgColor = interpolateColor(
      pressed.value,
      [0, 1],
      [backgroundColor, pressedColor]
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor: bgColor,
      shadowOpacity: shadowOpacity * (1 - pressed.value * 0.5),
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    let textColor: string;
    let pressedTextColor: string;

    switch (variant) {
      case 'primary':
        textColor = '#4F1786';
        pressedTextColor = colors.primary;
        break;
      case 'secondary':
        textColor = colors.white;
        pressedTextColor = colors.white;
        break;
      case 'outline':
        textColor = colors.primary;
        pressedTextColor = colors.primary;
        break;
      default:
        textColor = '#4F1786';
        pressedTextColor = colors.primary;
    }

    const color = interpolateColor(
      pressed.value,
      [0, 1],
      [textColor, pressedTextColor]
    );

    return { color };
  });

  const buttonStyles = [
    styles.button,
    variant === 'outline' && styles.outlineButton,
    disabled && styles.disabled,
    style,
  ];

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[buttonStyles, animatedButtonStyle]}
    >
      <Animated.Text style={[styles.buttonText, textStyle, animatedTextStyle]}>
        {title}
      </Animated.Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    height: 56,
    width: 280,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default AnimatedButton;
