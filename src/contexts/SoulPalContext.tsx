import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOULPAL_COLOR_KEY = '@soultalk_soulpal_color';
const SOULPAL_NAME_KEY = '@soultalk_soulpal_name';

// Fallback when the user hasn't named their SoulPal yet. User-facing strings
// ("<name> is reading…") render this verbatim, so it must read naturally.
const DEFAULT_SOULPAL_NAME = 'SoulPal';

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

// Swatch hexes are sampled directly from the dominant body color of each
// body_<id>.png asset. so-trs0: the picker swatch must match the rendered
// body, and since the body PNGs are NOT theme-forked, the hex can't be
// either — a divergent hex makes one theme's swatch lie about the body
// (this was the "pink renders greenish-gray" class of bug). Both maps are
// kept for the getSoulPalHex API surface but hold identical values.
// Extends the so-pz1x slate fix to the full palette.
const SOULPAL_HEX_LIGHT: Record<SoulPalColorId, string> = {
  teal: '#70CACF',
  blue: '#709ACF',
  purple: '#A570CF',
  pink: '#CF709B',
  coral: '#CF7570',
  gold: '#CBCF70',
  mint: '#70CFA4',
  slate: '#8FA9A8',
};

const SOULPAL_HEX_DARK: Record<SoulPalColorId, string> = {
  teal: '#70CACF',
  blue: '#709ACF',
  purple: '#A570CF',
  pink: '#CF709B',
  coral: '#CF7570',
  gold: '#CBCF70',
  mint: '#70CFA4',
  slate: '#8FA9A8',
};

const SOULPAL_LABELS: Record<SoulPalColorId, { light: string; dark: string }> = {
  teal: { light: 'Sage', dark: 'Deep Teal' },
  blue: { light: 'Periwinkle', dark: 'Cyan' },
  purple: { light: 'Mauve', dark: 'Electric' },
  pink: { light: 'Dusty Rose', dark: 'Magenta' },
  coral: { light: 'Peach', dark: 'Ember' },
  gold: { light: 'Amber', dark: 'Gold' },
  mint: { light: 'Mint', dark: 'Mint' },
  // so-pz1x: was 'Cream Lilac' / 'Lilac' — labels described the cheek tint,
  // not the body color. Renamed to match the actual rendered sage-teal body.
  slate: { light: 'Sage', dark: 'Seafoam' },
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
export const BODY_IMAGES: Record<SoulPalColorId, any> = {
  teal: require('../../assets/images/soulpal-colors/body_teal.png'),
  blue: require('../../assets/images/soulpal-colors/body_blue.png'),
  purple: require('../../assets/images/soulpal-colors/body_purple.png'),
  pink: require('../../assets/images/soulpal-colors/body_pink.png'),
  coral: require('../../assets/images/soulpal-colors/body_coral.png'),
  gold: require('../../assets/images/soulpal-colors/body_gold.png'),
  mint: require('../../assets/images/soulpal-colors/body_mint.png'),
  slate: require('../../assets/images/soulpal-colors/body_slate.png'),
};

export const HOME_IMAGES: Record<SoulPalColorId, any> = {
  teal: require('../../assets/images/soulpal-colors/home_teal.png'),
  blue: require('../../assets/images/soulpal-colors/home_blue.png'),
  purple: require('../../assets/images/soulpal-colors/home_purple.png'),
  pink: require('../../assets/images/soulpal-colors/home_pink.png'),
  coral: require('../../assets/images/soulpal-colors/home_coral.png'),
  gold: require('../../assets/images/soulpal-colors/home_gold.png'),
  mint: require('../../assets/images/soulpal-colors/home_mint.png'),
  slate: require('../../assets/images/soulpal-colors/home_slate.png'),
};

export const EYES_IMAGES: Record<SoulPalColorId, any> = {
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
  name: string;
  setName: (name: string) => void;
  bodyImage: any;
  homeImage: any;
  eyesImage: any;
}

// so-xm18: all SoulPals are blue across the app (blue = the single unified color).
const FIXED_COLOR_ID: SoulPalColorId = 'blue';

const SoulPalContext = createContext<SoulPalContextType>({
  colorId: FIXED_COLOR_ID,
  setColorId: () => {},
  name: DEFAULT_SOULPAL_NAME,
  setName: () => {},
  bodyImage: BODY_IMAGES[FIXED_COLOR_ID],
  homeImage: HOME_IMAGES[FIXED_COLOR_ID],
  eyesImage: EYES_IMAGES[FIXED_COLOR_ID],
});

export const SoulPalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // so-xm18: color is fixed to FIXED_COLOR_ID (blue) for all users.
  // Stored @soultalk_soulpal_color is ignored so returning users with a
  // previously-persisted teal/purple/etc. also get blue immediately.
  const colorId = FIXED_COLOR_ID;
  const [name, setNameState] = useState<string>(DEFAULT_SOULPAL_NAME);

  useEffect(() => {
    AsyncStorage.getItem(SOULPAL_NAME_KEY).then((val) => {
      if (val && val.trim()) {
        setNameState(val.trim());
      }
    });
  }, []);

  // setColorId is retained on the context API surface for type-compatibility
  // but is a no-op: the color is pinned to FIXED_COLOR_ID.
  const setColorId = (_id: SoulPalColorId) => {};

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

  return (
    <SoulPalContext.Provider
      value={{
        colorId,
        setColorId,
        name,
        setName,
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

/** Convenience primitive — the user's chosen SoulPal name, or 'SoulPal' if
 *  unset. Safe to drop directly into user-facing strings. */
export const useSoulPalName = (): string => useContext(SoulPalContext).name;
