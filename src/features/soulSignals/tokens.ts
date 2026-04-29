export const PURPLE = '#4F1786';
export const PURPLE_DEEP = '#2B0F4D';
export const PURPLE_INK = '#3A0E66';
export const CREAM = '#F5F2F9';
export const COSMOS = '#050423';
export const TEAL = '#70CACF';
export const PINK = '#E93678';
export const CYAN = '#67D1FF';
export const YELLOW = '#FFC85C';
export const LILAC = '#C8A6FF';
export const ORANGE = '#FF8A4C';

export type Theme = 'dark' | 'light';

export const ink = (t: Theme) => (t === 'dark' ? '#fff' : PURPLE_INK);
export const inkSub = (t: Theme) =>
  t === 'dark' ? 'rgba(255,255,255,0.72)' : 'rgba(58,14,102,0.7)';
export const inkFaint = (t: Theme) =>
  t === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(58,14,102,0.5)';

export const surfaceBg = (t: Theme) =>
  t === 'dark' ? 'rgba(255,255,255,0.05)' : '#ffffff';
export const surfaceBorder = (t: Theme) =>
  t === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(58,14,102,0.06)';

export const TONE_HEX: Record<string, string> = {
  teal: TEAL,
  pink: PINK,
  cyan: CYAN,
  yellow: YELLOW,
  lilac: LILAC,
  orange: ORANGE,
};

export function resolveTone(token: string | null | undefined): string {
  if (!token) return LILAC;
  if (token.startsWith('#')) return token;
  return TONE_HEX[token.toLowerCase()] ?? LILAC;
}
