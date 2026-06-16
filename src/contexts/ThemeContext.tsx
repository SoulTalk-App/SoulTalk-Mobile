import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_PREF_KEY = '@soultalk_theme_pref';

export type ThemePref = 'light' | 'dark';

interface ThemeContextValue {
  themePref: ThemePref;
  isDarkMode: boolean;
  themeLoaded: boolean;
  setThemePref: (pref: ThemePref) => void;
  /** @deprecated use setThemePref. Toggles light ↔ dark. */
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
  val === 'light' || val === 'dark';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePref, setThemePrefState] = useState<ThemePref>('dark');
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    (async () => {
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
      setThemeLoaded(true);
    })();
  }, []);

  // so-tpwh #9: AsyncStorage.setItem returns a promise — un-awaited
  // failures used to surface as unhandled rejections. Storage failures
  // here are best-effort (the in-memory state still updates), so a
  // .catch() that logs is enough.
  const setThemePref = useCallback((pref: ThemePref) => {
    setThemePrefState(pref);
    AsyncStorage.setItem(THEME_PREF_KEY, pref).catch((err) => {
      console.warn('[ThemeContext] persist theme pref failed:', err);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemePrefState((prev) => {
      const next: ThemePref = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(THEME_PREF_KEY, next).catch((err) => {
        console.warn('[ThemeContext] persist theme pref failed:', err);
      });
      return next;
    });
  }, []);

  const isDarkMode = themePref === 'dark';

  return (
    <ThemeContext.Provider
      value={{ themePref, isDarkMode, themeLoaded, setThemePref, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
