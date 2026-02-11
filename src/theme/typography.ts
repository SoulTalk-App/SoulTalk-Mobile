import { TextStyle } from "react-native";

// Font Families
export const fonts = {
  // Edensor - Decorative serif for brand, logo, emotional moments
  edensor: {
    thin: "Edensor-Thin",
    extraLight: "Edensor-ExtraLight",
    light: "Edensor-Light",
    regular: "Edensor-Regular",
    medium: "Edensor-Medium",
    semiBold: "Edensor-SemiBold",
    bold: "Edensor-Bold",
    italic: "Edensor-Italic",
    lightItalic: "Edensor-LightItalic",
  },
  // Outfit - Geometric sans-serif for UI, functional communication
  outfit: {
    thin: "Outfit-Thin",
    extraLight: "Outfit-ExtraLight",
    light: "Outfit-Light",
    regular: "Outfit-Regular",
    medium: "Outfit-Medium",
    semiBold: "Outfit-SemiBold",
    bold: "Outfit-Bold",
  },
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 32,
  displayLarge: 40,
} as const;

export const fontWeights: Record<string, TextStyle["fontWeight"]> = {
  thin: "100",
  extraLight: "200",
  light: "300",
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// Typography Hierarchy based on SoulTalk Brand Guidelines
// Edensor = Expression (brand, logo, emotional moments)
// Outfit = Function (practical communication, UI, longer text)

export const typography = {
  // ============================================
  // EDENSOR STYLES - Brand & Emotional Moments
  // ============================================

  // Major titles, splash screens, hero sections
  displayLarge: {
    fontFamily: fonts.edensor.bold,
    fontSize: fontSizes.displayLarge,
    lineHeight: fontSizes.displayLarge * lineHeights.tight,
  } as TextStyle,

  // Primary headings, brand expressions
  heading: {
    fontFamily: fonts.edensor.bold,
    fontSize: fontSizes.xxxl,
    lineHeight: fontSizes.xxxl * lineHeights.tight,
  } as TextStyle,

  // Secondary headings with Edensor
  headingMedium: {
    fontFamily: fonts.edensor.medium,
    fontSize: fontSizes.xxl,
    lineHeight: fontSizes.xxl * lineHeights.tight,
  } as TextStyle,

  // Edensor regular for decorative text
  headingRegular: {
    fontFamily: fonts.edensor.regular,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * lineHeights.normal,
  } as TextStyle,

  // ============================================
  // OUTFIT STYLES - Functional UI
  // ============================================

  // Section titles, UI headers (Outfit Light)
  subheading: {
    fontFamily: fonts.outfit.light,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * lineHeights.normal,
  } as TextStyle,

  // Subsections, smaller UI headers (Outfit ExtraLight)
  subheadingSmall: {
    fontFamily: fonts.outfit.extraLight,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.normal,
  } as TextStyle,

  // Main text and instructions (Outfit Thin)
  body: {
    fontFamily: fonts.outfit.thin,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.normal,
  } as TextStyle,

  // Body with regular weight for better readability
  bodyRegular: {
    fontFamily: fonts.outfit.regular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.normal,
  } as TextStyle,

  // Small body text
  bodySmall: {
    fontFamily: fonts.outfit.thin,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
  } as TextStyle,

  // Caption text
  caption: {
    fontFamily: fonts.outfit.thin,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * lineHeights.normal,
  } as TextStyle,

  // Button text (Outfit SemiBold for prominence)
  button: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.tight,
  } as TextStyle,

  // Large button text
  buttonLarge: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * lineHeights.tight,
  } as TextStyle,

  // Input text
  input: {
    fontFamily: fonts.outfit.regular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.normal,
  } as TextStyle,

  // Label text
  label: {
    fontFamily: fonts.outfit.medium,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * lineHeights.normal,
  } as TextStyle,

  // Link text
  link: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * lineHeights.normal,
  } as TextStyle,
} as const;

export type Typography = typeof typography;
export type Fonts = typeof fonts;
