/**
 * SoulTalk Color Palette
 * Extracted from Figma design system
 */

export const colors = {
  // Primary palette (from Figma)
  primary: '#4F1786',      // Deep purple - main brand color
  secondary: '#653495',    // Medium purple - secondary buttons
  background: '#F9F5FB',   // Light pinkish-lavender background (from prototype)

  // Text colors
  text: {
    primary: '#4F1786',    // Purple text
    secondary: '#8B7399',  // Muted purple
    dark: '#000000',       // Black for titles
    light: '#666666',      // Gray text
    white: '#FFFFFF',
  },

  // UI colors
  white: '#FFFFFF',
  black: '#000000',
  border: '#E0DCE5',
  inputBorder: '#D6D6D6',

  // Accent colors (from Figma)
  accent: {
    pink: '#EA3678',       // Decorative pink elements
    cyan: '#5ECEFF',       // Links, Terms & Privacy
    teal: '#70CACF',       // Character accent
    orange: '#FF9E55',     // Character accent
    yellow: '#FFD757',     // Character accent
    magenta: '#D35CFF',    // Character accent
  },

  // Button colors
  button: {
    primary: '#FFFFFF',           // White button bg
    primaryText: '#4F1786',       // Purple text on white
    secondary: '#653495',         // Purple button bg
    secondaryText: '#FFFFFF',     // White text on purple
    disabled: '#D6D6D6',
    pressed: 'rgba(79, 23, 134, 0.12)',
    primaryPressed: 'rgba(79, 23, 134, 0.85)',  // Darker purple when pressed
  },

  // Pagination dots
  dots: {
    active: '#4F1786',
    inactive: '#FFFFFF',
    inactiveBorder: '#E0DCE5',
  },

  // Feedback colors
  success: '#4CAF50',
  error: '#E53935',
  warning: '#FF9800',

  // Transparent variants
  overlay: 'rgba(79, 23, 134, 0.1)',
  overlayDark: 'rgba(0, 0, 0, 0.5)',
} as const;

export type Colors = typeof colors;
