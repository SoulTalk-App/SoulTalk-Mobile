/**
 * so-7ok8: shared floating back / close button for long-read detail screens.
 *
 * Sits OUTSIDE the ScrollView (position absolute, zIndex 10) so it remains
 * visible regardless of scroll depth. Includes a semi-transparent pill
 * background so the icon stays legible over scrolling text.
 *
 * Usage:
 *   // Navigation back (left edge):
 *   <FloatingBackButton onPress={() => navigation.goBack()} top={insets.top + 8} />
 *
 *   // Modal close (right edge, × icon):
 *   <FloatingBackButton icon="x" right={16} top={12} onPress={onClose} accessibilityLabel="Close" />
 */

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

type FloatingButtonIcon = 'chevron-left' | 'x';

interface FloatingBackButtonProps {
  onPress: () => void;
  /** Pixel distance from the top of the nearest positioned ancestor. Required. */
  top: number;
  /** Left offset (default 16). Provide left or right, not both. */
  left?: number;
  /** Right offset — use for close-modal variant. Omit left when using right. */
  right?: number;
  /** Icon glyph. Default: 'chevron-left' (back nav). Use 'x' for modal close. */
  icon?: FloatingButtonIcon;
  /** Icon and background tint. Default white — suits dark/cosmic backgrounds. */
  color?: string;
  accessibilityLabel?: string;
}

const FloatingBackButton: React.FC<FloatingBackButtonProps> = ({
  onPress,
  top,
  left,
  right,
  icon = 'chevron-left',
  color = '#FFFFFF',
  accessibilityLabel = 'Back',
}) => {
  const posH = right !== undefined ? { right } : { left: left ?? 16 };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={[styles.btn, { top }, posH]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Feather name={icon} size={20} color={color} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    // Legible over light and dark scrolling content.
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

export default FloatingBackButton;
