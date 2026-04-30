/**
 * SoulTalk Color Palette
 * Extracted from Figma design system
 *
 * Light is the canonical shape; `darkColors` mirrors every key.
 * Screens should consume via `useThemeColors()` (see `./useThemeColors`).
 */

export const lightColors = {
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
    pink: '#E93678',       // Decorative pink elements
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

/**
 * Dark mode palette — mirrors `lightColors` shape exactly.
 * Values consolidated from inline dark hex tokens previously scattered across
 * HomeScreen, JournalScreen, JournalEntryScreen, CreateJournalScreen,
 * AffirmationMirrorScreen, SoulSightScreen, SoulSightDetailScreen,
 * SettingsScreen, ProfileScreen, HelpScreen.
 */
export const darkColors: typeof lightColors = {
  primary: '#4DE8D4',      // Teal — dark-mode brand accent
  secondary: '#70CACF',    // Soft teal
  background: '#0A0A14',   // Deep space (matches createGradient base)

  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    dark: '#FFFFFF',                          // Titles invert to white on dark
    light: 'rgba(255, 255, 255, 0.5)',
    white: '#FFFFFF',
  },

  white: '#FFFFFF',
  black: '#000000',
  border: 'rgba(255, 255, 255, 0.15)',
  inputBorder: 'rgba(255, 255, 255, 0.2)',

  accent: {
    pink: '#E93678',
    cyan: '#7DF0FF',
    teal: '#4DE8D4',
    orange: '#FF9E55',
    yellow: '#FFD757',
    magenta: '#D35CFF',
  },

  button: {
    primary: 'rgba(77, 232, 212, 0.15)',      // Translucent teal pill
    primaryText: '#4DE8D4',
    secondary: '#4DE8D4',
    secondaryText: '#0A0A14',
    disabled: 'rgba(255, 255, 255, 0.2)',
    pressed: 'rgba(77, 232, 212, 0.25)',
    primaryPressed: 'rgba(77, 232, 212, 0.35)',
  },

  dots: {
    active: '#4DE8D4',
    inactive: 'rgba(255, 255, 255, 0.2)',
    inactiveBorder: 'rgba(255, 255, 255, 0.3)',
  },

  success: '#4CAF50',
  error: '#FF5E5E',
  warning: '#FF9800',

  overlay: 'rgba(255, 255, 255, 0.1)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
} as const;

/**
 * @deprecated Import `lightColors`/`darkColors` directly, or use `useThemeColors()`.
 * Retained as a back-compat alias so partial migrations don't break.
 */
export const colors = lightColors;

/**
 * Screen-specific mood gradients & glass surface tokens
 * Liquid Glass design language — dark-mode first
 */
export const surfaces = {
  // Home — deep space night
  homeGradient: ['#030510', '#080B1A', '#0F1B2D', '#1A1040'] as const,
  homeGlow: 'rgba(112, 202, 207, 0.15)',

  // Journal list — cool reflective indigo
  journalGradient: ['#0F1B2D', '#1A2B45', '#2A3D5E', '#3D5478'] as const,
  journalGlow: 'rgba(61, 84, 120, 0.3)',

  // Journal entry detail — warm reading
  entryGradient: ['#1E1A2E', '#2D2440', '#3D3355', '#4D4368'] as const,
  entryGlow: 'rgba(77, 67, 104, 0.2)',

  // Create journal — deep focus
  createGradient: ['#0A0A14', '#12121F', '#1A1A2E', '#222240'] as const,
  createGlow: 'rgba(34, 34, 64, 0.4)',

  // Profile — deep space purple
  profileGradient: ['#080B1A', '#12102B', '#1E1540', '#2D1B4E'] as const,
  profileGlow: 'rgba(112, 202, 207, 0.15)',

  // SoulSight — deep teal-blue
  soulsightGradient: ['#0D1F2D', '#153040', '#1E4258', '#2A5570'] as const,
  soulsightGlow: 'rgba(42, 85, 112, 0.3)',

  // Personality — deep indigo / violet (sibling of profile gradient)
  personalityGradient: ['#0A0818', '#15102E', '#241645', '#3A1F5F'] as const,
  personalityGlow: 'rgba(167, 139, 250, 0.2)',

  // Glass card base
  glass: {
    light: 'rgba(255, 255, 255, 0.12)',
    medium: 'rgba(255, 255, 255, 0.18)',
    heavy: 'rgba(255, 255, 255, 0.25)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderHighlight: 'rgba(255, 255, 255, 0.2)',
  },

  // Emotion accent colors for journal entry strips
  emotionAccent: {
    warm: '#D4A952',      // joy, calm, gratitude
    cool: '#5B8DB8',      // sadness, grief, loneliness
    alert: '#D4953A',     // anxiety, fear, dread
    hot: '#D46B6B',       // anger, frustration
    neutral: '#8B8B8B',   // numbness, emptiness
  },
} as const;

export type Colors = typeof lightColors;
export type Surfaces = typeof surfaces;
