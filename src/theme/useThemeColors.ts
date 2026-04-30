import { useTheme } from '../contexts/ThemeContext';
import { lightColors, darkColors } from './colors';

export const useThemeColors = (): typeof lightColors =>
  useTheme().isDarkMode ? darkColors : lightColors;
