import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOULPAL_COLOR_KEY = '@soultalk_soulpal_color';

export const SOULPAL_COLORS = [
  { id: 'teal', label: 'Teal', hex: '#70CACF' },
  { id: 'blue', label: 'Blue', hex: '#7088CF' },
  { id: 'purple', label: 'Purple', hex: '#A07ACC' },
  { id: 'pink', label: 'Pink', hex: '#CC7AA0' },
  { id: 'coral', label: 'Coral', hex: '#C08070' },
  { id: 'gold', label: 'Gold', hex: '#C0C070' },
  { id: 'mint', label: 'Mint', hex: '#70CC8A' },
  { id: 'slate', label: 'Slate', hex: '#8FA0A2' },
] as const;

export type SoulPalColorId = (typeof SOULPAL_COLORS)[number]['id'];

// Image maps — require() must be static, so we map by id
const BODY_IMAGES: Record<SoulPalColorId, any> = {
  teal: require('../../assets/images/soulpal-colors/body_teal.png'),
  blue: require('../../assets/images/soulpal-colors/body_blue.png'),
  purple: require('../../assets/images/soulpal-colors/body_purple.png'),
  pink: require('../../assets/images/soulpal-colors/body_pink.png'),
  coral: require('../../assets/images/soulpal-colors/body_coral.png'),
  gold: require('../../assets/images/soulpal-colors/body_gold.png'),
  mint: require('../../assets/images/soulpal-colors/body_mint.png'),
  slate: require('../../assets/images/soulpal-colors/body_slate.png'),
};

const HOME_IMAGES: Record<SoulPalColorId, any> = {
  teal: require('../../assets/images/soulpal-colors/home_teal.png'),
  blue: require('../../assets/images/soulpal-colors/home_blue.png'),
  purple: require('../../assets/images/soulpal-colors/home_purple.png'),
  pink: require('../../assets/images/soulpal-colors/home_pink.png'),
  coral: require('../../assets/images/soulpal-colors/home_coral.png'),
  gold: require('../../assets/images/soulpal-colors/home_gold.png'),
  mint: require('../../assets/images/soulpal-colors/home_mint.png'),
  slate: require('../../assets/images/soulpal-colors/home_slate.png'),
};

const EYES_IMAGES: Record<SoulPalColorId, any> = {
  teal: require('../../assets/images/soulpal-colors/eyes_teal.png'),
  blue: require('../../assets/images/soulpal-colors/eyes_blue.png'),
  purple: require('../../assets/images/soulpal-colors/eyes_purple.png'),
  pink: require('../../assets/images/soulpal-colors/eyes_pink.png'),
  coral: require('../../assets/images/soulpal-colors/eyes_coral.png'),
  gold: require('../../assets/images/soulpal-colors/eyes_gold.png'),
  mint: require('../../assets/images/soulpal-colors/eyes_mint.png'),
  slate: require('../../assets/images/soulpal-colors/eyes_slate.png'),
};

interface SoulPalContextType {
  colorId: SoulPalColorId;
  setColorId: (id: SoulPalColorId) => void;
  bodyImage: any;
  homeImage: any;
  eyesImage: any;
}

const SoulPalContext = createContext<SoulPalContextType>({
  colorId: 'teal',
  setColorId: () => {},
  bodyImage: BODY_IMAGES.teal,
  homeImage: HOME_IMAGES.teal,
  eyesImage: EYES_IMAGES.teal,
});

export const SoulPalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorId, setColorIdState] = useState<SoulPalColorId>('teal');

  useEffect(() => {
    AsyncStorage.getItem(SOULPAL_COLOR_KEY).then((val) => {
      if (val && BODY_IMAGES[val as SoulPalColorId]) {
        setColorIdState(val as SoulPalColorId);
      }
    });
  }, []);

  const setColorId = (id: SoulPalColorId) => {
    setColorIdState(id);
    AsyncStorage.setItem(SOULPAL_COLOR_KEY, id);
  };

  return (
    <SoulPalContext.Provider
      value={{
        colorId,
        setColorId,
        bodyImage: BODY_IMAGES[colorId],
        homeImage: HOME_IMAGES[colorId],
        eyesImage: EYES_IMAGES[colorId],
      }}
    >
      {children}
    </SoulPalContext.Provider>
  );
};

export const useSoulPal = () => useContext(SoulPalContext);
