export type SoulpalVariant = 1 | 2 | 3 | 4 | 5;

export type ShiftStatus = 'locked' | 'processing' | 'active' | 'integrated';

export type Shift = {
  id: string;
  title: string;
  cat: string;
  status: ShiftStatus;
  pct: number;
  since: string | null;
  mood: string;
  soulpal: SoulpalVariant;
};

export const STATUS_LABEL: Record<ShiftStatus, string> = {
  locked: 'Locked',
  processing: 'Processing',
  active: 'Active',
  integrated: 'Integrated',
};

export const STAGES = ['Notice', 'Practice', 'Embody', 'Integrate'] as const;
export type Stage = (typeof STAGES)[number];
