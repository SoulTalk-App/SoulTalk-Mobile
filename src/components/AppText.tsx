// AppText — enforces the typography system across the app.
//
// Usage:
//   <AppText variant="body">Standard body copy</AppText>
//   <AppText variant="heading" style={{ color: colors.white }}>Title</AppText>
//   <AppText variant="caption" numberOfLines={1}>Truncated caption</AppText>
//
// The preset for `variant` (fontFamily, fontSize, lineHeight) is applied first;
// `style` overrides color, margin, alignment, etc. per-instance. All standard
// React Native Text props (numberOfLines, ellipsizeMode, onPress, accessibilityRole,
// adjustsFontSizeToFit, testID, …) pass through unchanged via {...rest}.
//
// Default variant: 'body' (Outfit Regular 16 / lineHeight 24).
//
// Note: presets include lineHeight — suited for multi-line prose. For
// single-line UI controls (tabs, pills, buttons) where lineHeight conflicts
// with container padding, use a plain <Text> with explicit fontFamily/fontSize.

import React from 'react';
import { Text, TextProps } from 'react-native';
import { typography } from '../theme';

export type TextVariant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: TextVariant;
}

const AppText = React.forwardRef<Text, AppTextProps>(
  ({ variant = 'body', style, children, ...rest }, ref) => (
    <Text ref={ref} style={[typography[variant], style]} {...rest}>
      {children}
    </Text>
  ),
);

AppText.displayName = 'AppText';

export default AppText;
