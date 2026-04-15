import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { surfaces } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type GlassIntensity = 'light' | 'medium' | 'heavy';

interface GlassCardProps {
  intensity?: GlassIntensity;
  glowColor?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
  blurIntensity?: number;
}

const GLASS_BG: Record<GlassIntensity, string> = {
  light: surfaces.glass.light,
  medium: surfaces.glass.medium,
  heavy: surfaces.glass.heavy,
};

const BLUR_AMOUNT: Record<GlassIntensity, number> = {
  light: 20,
  medium: 30,
  heavy: 40,
};

const GlassCard: React.FC<GlassCardProps> = ({
  intensity = 'medium',
  glowColor,
  children,
  style,
  onPress,
  disabled,
  blurIntensity,
}) => {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0.2);

  const pressAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress && !disabled) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      borderOpacity.value = withSpring(0.5, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    borderOpacity.value = withSpring(0.2, { damping: 12, stiffness: 200 });
  };

  const blur = blurIntensity ?? BLUR_AMOUNT[intensity];

  const cardContent = (
    <View style={[styles.outer, style]}>
      {/* Glow layer behind the card */}
      {glowColor && (
        <View
          style={[
            styles.glow,
            { backgroundColor: glowColor },
          ]}
        />
      )}

      {/* Blur backdrop */}
      <BlurView
        intensity={blur}
        tint="dark"
        style={styles.blur}
      />

      {/* Glass fill */}
      <View
        style={[
          styles.glassFill,
          { backgroundColor: GLASS_BG[intensity] },
        ]}
      />

      {/* Top-edge highlight border (brighter at top, fading) */}
      <LinearGradient
        colors={[surfaces.glass.borderHighlight, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topHighlight}
      />

      {/* Side borders */}
      <View style={styles.borderOverlay} />

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[pressAnimStyle, style?.flex != null && { flex: style.flex }]}
      >
        {cardContent}
      </AnimatedPressable>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  outer: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 24,
    opacity: 0.5,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: surfaces.glass.border,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
  },
});

export default GlassCard;
