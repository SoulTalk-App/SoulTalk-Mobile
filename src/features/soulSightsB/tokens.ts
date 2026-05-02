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

// Theme + ink helpers hoisted into theme/colors.ts (so-9tg). Imported
// for in-file use (surfaceBg/surfaceBorder below) AND re-exported so
// downstream consumers `import { Theme, ink, inkSub } from './tokens'`
// keep working without churn.
import type { ThemeMode } from '../../theme';
export type Theme = ThemeMode;
export { ink, inkSub } from '../../theme';

export const surfaceBg = (t: Theme) =>
  t === 'dark' ? 'rgba(255,255,255,0.05)' : '#ffffff';
export const surfaceBorder = (t: Theme) =>
  t === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(58,14,102,0.06)';
