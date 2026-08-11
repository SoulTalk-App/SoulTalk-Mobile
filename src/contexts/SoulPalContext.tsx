import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// so-jor7: single teal SoulPal everywhere. Multi-color picker was removed
// (so-38wy); the dynamic colorId system is now fully excised so any
// stale stored color can no longer override the designed teal.
const SOULPAL_NAME_KEY = '@soultalk_soulpal_name';

const DEFAULT_SOULPAL_NAME = 'SoulPal';

/** The single canonical SoulPal hex used app-wide. */
export const SOULPAL_TEAL_HEX = '#70CACF';

const bodyImage = require('../../assets/images/soulpal-colors/body_teal.png');
const homeImage = require('../../assets/images/soulpal-colors/home_teal.png');
const eyesImage = require('../../assets/images/soulpal-colors/eyes_teal.png');

interface SoulPalContextType {
  name: string;
  setName: (name: string) => void;
  // so-5cdc: resets the in-memory name to the default and removes the
  // persisted key — called on logout so the next user on a shared device
  // never sees a previous user's SoulPal name.
  reset: () => void;
  bodyImage: any;
  homeImage: any;
  eyesImage: any;
}

const SoulPalContext = createContext<SoulPalContextType>({
  name: DEFAULT_SOULPAL_NAME,
  setName: () => {},
  reset: () => {},
  bodyImage,
  homeImage,
  eyesImage,
});

export const SoulPalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [name, setNameState] = useState<string>(DEFAULT_SOULPAL_NAME);

  useEffect(() => {
    AsyncStorage.getItem(SOULPAL_NAME_KEY).then((val) => {
      if (val && val.trim()) {
        setNameState(val.trim());
      }
    });
  }, []);

  const setName = (next: string) => {
    const trimmed = next.trim();
    const resolved = trimmed || DEFAULT_SOULPAL_NAME;
    setNameState(resolved);
    if (trimmed) {
      AsyncStorage.setItem(SOULPAL_NAME_KEY, trimmed);
    } else {
      AsyncStorage.removeItem(SOULPAL_NAME_KEY);
    }
  };

  // so-5cdc: called on logout so the next user on a shared device sees
  // the default name, not the previous user's chosen name.
  const reset = () => {
    setNameState(DEFAULT_SOULPAL_NAME);
    AsyncStorage.removeItem(SOULPAL_NAME_KEY);
  };

  return (
    <SoulPalContext.Provider
      value={{
        name,
        setName,
        reset,
        bodyImage,
        homeImage,
        eyesImage,
      }}
    >
      {children}
    </SoulPalContext.Provider>
  );
};

export const useSoulPal = () => useContext(SoulPalContext);

/** Convenience primitive — the user's SoulPal name, or 'SoulPal' if unset. */
export const useSoulPalName = (): string => useContext(SoulPalContext).name;
