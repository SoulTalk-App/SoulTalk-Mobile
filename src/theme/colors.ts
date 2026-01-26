export const colors = {
  // Primary palette
  primary: "#653495",
  background: "#F5F2F9",

  // Text colors
  text: {
    primary: "#653495",
    secondary: "#8B7399",
    dark: "#333333",
    light: "#666666",
    white: "#FFFFFF",
  },

  // UI colors
  white: "#FFFFFF",
  black: "#000000",
  border: "#E0DCE5",

  // Button states
  button: {
    primary: "#653495",
    primaryPressed: "#4A2570",
    disabled: "#B8A8C4",
  },

  // Feedback colors
  success: "#4CAF50",
  error: "#E53935",
  warning: "#FF9800",

  // Transparent variants
  overlay: "rgba(101, 52, 149, 0.1)",
} as const;

export type Colors = typeof colors;
