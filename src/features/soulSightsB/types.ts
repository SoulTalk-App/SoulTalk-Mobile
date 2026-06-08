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
  // so-dwqk: nullable. Previously the SoulSightDetailScreen forced a
  // FALLBACK_PULL_QUOTE ("You stopped negotiating with yourself for
  // permission to rest.") when the BE returned null, which rendered as
  // the user's own reflection — a P0 trust rupture for a mental-health
  // product. Drop the fallback at the screen and gate the pull-quote
  // card in ReadingBody on a truthy value.
  pull_quote: { text: string; tag: string } | null;
  signals_summary: string[];
};

export type Eligibility = {
  current: number;
  needed: number;
};
