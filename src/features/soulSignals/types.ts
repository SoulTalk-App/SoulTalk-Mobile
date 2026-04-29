export type SoulpalVariant = 1 | 2 | 3 | 4 | 5;

export type SignalKind = 'observation' | 'pattern';

export type Signal = {
  id: string;
  kind: SignalKind;
  strength?: number;
  tag?: string;
  tone: string;
  soulpal: SoulpalVariant;
  when: string;
  headline: string;
  detail: string;
  quotes: string[];
  fedSight: string | null;
};

export type SignalsStatus = 'locked' | 'processing' | 'listening' | 'done';

export type Eligibility = {
  current: number;
  needed: number;
};

export type Group = {
  pattern: Signal;
  related: Signal[];
};
