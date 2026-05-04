import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_PREF_KEY = '@soultalk_theme_pref';
const LEGACY_DARK_KEY = '@soultalk_dark_mode';

export type ThemePref = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  themePref: ThemePref;
  isDarkMode: boolean;
  themeLoaded: boolean;
  setThemePref: (pref: ThemePref) => void;
  /** @deprecated use setThemePref. Cycles system → light → dark → system. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themePref: 'dark',
  isDarkMode: true,
  themeLoaded: false,
  setThemePref: () => {},
  toggleTheme: () => {},
});

const isThemePref = (val: unknown): val is ThemePref =>
  val === 'system' || val === 'light' || val === 'dark';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // so-33w: first-launch default is dark — user manually opts into light/system.
  const [themePref, setThemePrefState] = useState<ThemePref>('dark');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(THEME_PREF_KEY);
      if (isThemePref(stored)) {
        setThemePrefState(stored);
      } else {
        const legacy = await AsyncStorage.getItem(LEGACY_DARK_KEY);
        // so-33w: no legacy flag either → genuine first-launch → default to dark.
        const migrated: ThemePref = legacy === 'true' ? 'dark' : 'dark';
        setThemePrefState(migrated);
        await AsyncStorage.setItem(THEME_PREF_KEY, migrated);
      }
      setThemeLoaded(true);
    })();
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const setThemePref = useCallback((pref: ThemePref) => {
    setThemePrefState(pref);
    AsyncStorage.setItem(THEME_PREF_KEY, pref);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemePrefState((prev) => {
      const next: ThemePref =
        prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system';
      AsyncStorage.setItem(THEME_PREF_KEY, next);
      return next;
    });
  }, []);

  const isDarkMode =
    themePref === 'dark' || (themePref === 'system' && systemScheme === 'dark');

  return (
    <ThemeContext.Provider
      value={{ themePref, isDarkMode, themeLoaded, setThemePref, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
