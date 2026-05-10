import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// so-jkgo: stars in the cosmic backdrop overlap text glyphs and read as false
// strokes for dyslexic users. A subtle dark text-shadow creates a clearance
// halo between glyphs and any star pixels that fall on top of them, without
// flattening the cosmic atmosphere with a solid scrim block.
export const cosmicTextShadow: TextStyle = {
  textShadowColor: 'rgba(10, 8, 24, 0.85)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 4,
};

export interface CosmicTextProps extends TextProps {
  /** Force the cosmic shadow on/off; defaults to on whenever dark mode is active. */
  cosmic?: boolean;
}

export const CosmicText: React.FC<CosmicTextProps> = ({
  cosmic,
  style,
  ...rest
}) => {
  const { isDarkMode } = useTheme();
  const apply = cosmic ?? isDarkMode;
  return <Text {...rest} style={apply ? [style, cosmicTextShadow] : style} />;
};

export const cosmicTextStyles = StyleSheet.create({
  shadow: cosmicTextShadow,
});
