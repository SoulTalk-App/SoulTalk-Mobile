import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOULPAL_COLOR_KEY = '@soultalk_soulpal_color';

// All 8 image-asset ids. The picker shows 7 per theme (one is dropped per
// vibe — see SOULPAL_PALETTE_LIGHT / _DARK), but the underlying images cover
// every id so a previously-selected id always renders even if it's not in
// the current theme's palette.
export const SOULPAL_COLOR_IDS = [
  'teal',
  'blue',
  'purple',
  'pink',
  'coral',
  'gold',
  'mint',
  'slate',
] as const;

export type SoulPalColorId = (typeof SOULPAL_COLOR_IDS)[number];

export interface SoulPalSwatch {
  id: SoulPalColorId;
  label: string;
  hex: string;
}

// Per-theme hex maps. Light palette is warm pastels tuned to the lavender
// CosmicBackdrop wash; dark palette is vibrant cosmic accents matching the
// void/teal accent family.
const SOULPAL_HEX_LIGHT: Record<SoulPalColorId, string> = {
  teal: '#9CC8C2',
  blue: '#A8B5D8',
  purple: '#B89FD0',
  pink: '#D4A5B8',
  coral: '#E8B89A',
  gold: '#D8C088',
  mint: '#A8C8A0',
  slate: '#C8B8D0',
};

const SOULPAL_HEX_DARK: Record<SoulPalColorId, string> = {
  teal: '#4DE8D4',
  blue: '#5ECEFF',
  purple: '#B070FF',
  pink: '#FF5EA0',
  coral: '#FF8855',
  gold: '#FFD757',
  mint: '#70CC8A',
  slate: '#D8B0FF',
};

const SOULPAL_LABELS: Record<SoulPalColorId, { light: string; dark: string }> = {
  teal: { light: 'Sage', dark: 'Deep Teal' },
  blue: { light: 'Periwinkle', dark: 'Cyan' },
  purple: { light: 'Mauve', dark: 'Electric' },
  pink: { light: 'Dusty Rose', dark: 'Magenta' },
  coral: { light: 'Peach', dark: 'Ember' },
  gold: { light: 'Amber', dark: 'Gold' },
  mint: { light: 'Mint', dark: 'Mint' },
  slate: { light: 'Cream Lilac', dark: 'Lilac' },
};

// 7 ids per theme. Each set is curated to the vibe and drops one id that
// doesn't fit (light drops teal — too saturated for pastel palette; dark
// drops mint — too soft for cosmic vibe).
const LIGHT_PALETTE_IDS: readonly SoulPalColorId[] = [
  'mint',
  'blue',
  'purple',
  'pink',
  'coral',
  'gold',
  'slate',
];
const DARK_PALETTE_IDS: readonly SoulPalColorId[] = [
  'teal',
  'pink',
  'purple',
  'blue',
  'coral',
  'slate',
  'gold',
];

export const SOULPAL_PALETTE_LIGHT: SoulPalSwatch[] = LIGHT_PALETTE_IDS.map((id) => ({
  id,
  hex: SOULPAL_HEX_LIGHT[id],
  label: SOULPAL_LABELS[id].light,
}));

export const SOULPAL_PALETTE_DARK: SoulPalSwatch[] = DARK_PALETTE_IDS.map((id) => ({
  id,
  hex: SOULPAL_HEX_DARK[id],
  label: SOULPAL_LABELS[id].dark,
}));

/** Returns the swatch palette to display for the active theme. */
export const getSoulPalPalette = (isDark: boolean): SoulPalSwatch[] =>
  isDark ? SOULPAL_PALETTE_DARK : SOULPAL_PALETTE_LIGHT;

/** Returns the per-theme hex for a given id (covers all 8 ids, even
 *  ones omitted from the current theme's picker). */
export const getSoulPalHex = (colorId: SoulPalColorId, isDark: boolean): string =>
  (isDark ? SOULPAL_HEX_DARK : SOULPAL_HEX_LIGHT)[colorId];

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
