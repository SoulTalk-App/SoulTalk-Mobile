import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_PREF_KEY = '@soultalk_theme_pref';

export type ThemePref = 'light' | 'dark';

interface ThemeContextValue {
  themePref: ThemePref;
  isDarkMode: boolean;
  themeLoaded: boolean;
  setThemePref: (pref: ThemePref) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themePref: 'dark',
  isDarkMode: true,
  themeLoaded: false,
  setThemePref: () => {},
});

const isThemePref = (val: unknown): val is ThemePref =>
  val === 'light' || val === 'dark';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePref, setThemePrefState] = useState<ThemePref>('dark');
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_PREF_KEY);
        if (isThemePref(stored)) {
          setThemePrefState(stored);
        } else {
          // Anything else — legacy 'true'/'false' from LEGACY_DARK_KEY era, the
          // removed 'system' value (so-d6y3), or no entry at all — collapses to
          // 'dark'. Silent migration; matches the brand default for new installs.
          setThemePrefState('dark');
          await AsyncStorage.setItem(THEME_PREF_KEY, 'dark');
        }
      } catch {
        // so-zown: AsyncStorage failure (corrupted store, disk full, native
        // error) — fall back to 'dark' and unblock the gate. Without this,
        // themeLoaded would stay false forever -> NavigationContainer never
        // mounts -> app permanently stuck on LoadingScreen.
        setThemePrefState('dark');
      } finally {
        // Always unblock the themeLoaded gate regardless of success or failure.
        setThemeLoaded(true);
      }
    })();
  }, []);

  const setThemePref = useCallback((pref: ThemePref) => {
    setThemePrefState(pref);
    AsyncStorage.setItem(THEME_PREF_KEY, pref);
  }, []);

  const isDarkMode = themePref === 'dark';

  return (
    <ThemeContext.Provider
      value={{ themePref, isDarkMode, themeLoaded, setThemePref }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
