export type SoulpalVariant = 1 | 2 | 3 | 4 | 5;

export type SightStatus = 'locked' | 'processing' | 'done';

export type SightDetail = {
  id: string;
  title: string;
  window: string;
  entries: number;
  signals: number;
  soulpal: SoulpalVariant;
  reading_paragraphs: string[];
  pull_quote: { text: string; tag: string };
  signals_summary: string[];
};

export type Eligibility = {
  current: number;
  needed: number;
};
