// AppText — enforces the typography system across the app.
//
// Usage:
//   <AppText variant="body">Standard body copy</AppText>
//   <AppText variant="heading" style={{ color: colors.white }}>Title</AppText>
//   <AppText variant="caption" numberOfLines={1}>Truncated label</AppText>
//
// The preset for `variant` (fontFamily, fontSize, lineHeight) is applied first;
// `style` overrides color, margin, alignment, etc. per-instance. All standard
// React Native Text props (numberOfLines, ellipsizeMode, onPress, accessibilityRole,
// adjustsFontSizeToFit, testID, …) pass through unchanged via {...rest}.
//
// Default variant: 'body' (Outfit Regular 16 / lineHeight 24).

import React from 'react';
import { Text, TextProps } from 'react-native';
import { typography } from '../theme';

export type TextVariant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: TextVariant;
}

const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  style,
  children,
  ...rest
}) => (
  <Text style={[typography[variant], style]} {...rest}>
    {children}
  </Text>
);

export default AppText;
