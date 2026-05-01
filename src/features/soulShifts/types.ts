export type SoulpalVariant = 1 | 2 | 3 | 4 | 5;

export type ShiftStatus =
  | 'locked'
  | 'processing'
  | 'active'
  | 'integrated'
  /**
   * User-archived. Shift moves to a Released list and SoulPal stops nudging
   * about it. [ASK] be_core: confirm 'released' is the canonical enum value
   * and whether the verb is PATCH status or a dedicated archive endpoint.
   */
  | 'released';

export type Shift = {
  id: string;
  title: string;
  cat: string;
  status: ShiftStatus;
  pct: number;
  since: string | null;
  mood: string;
  soulpal: SoulpalVariant;
  description?: string | null;
  /**
   * Body copy for The Practice card. Populated by be_core post-migration 036
   * (so-ttk contract). NULL on legacy rows until backfill runs; the FE detail
   * modal falls back to `description` then `title` while it's null.
   */
  practice?: string | null;
  /**
   * ISO timestamp; null when the shift is not snoozed (be_core so-trc).
   * Default GET /soul-shifts/ filters out shifts where snoozed_until > now(),
   * so the FE rarely sees a future value here unless include_snoozed=true.
   */
  snoozedUntil?: string | null;
};

/**
 * Extended shape for the detail modal. Backend GET /soul-shifts/{id} may not
 * yet return practice / tendCount / lastTend — surfaced as an [ASK] to be_core.
 * Until those fields land, the FE falls back to safe defaults computed from
 * what the list endpoint already exposes (description → practice, 0 / null).
 */
export type ShiftDetail = Shift & {
  practice: string | null;
  tendCount: number;
  lastTend: string | null;
};

export const STATUS_LABEL: Record<ShiftStatus, string> = {
  locked: 'Locked',
  processing: 'Processing',
  active: 'Active',
  integrated: 'Integrated',
  released: 'Released',
};

export const STAGES = ['Notice', 'Practice', 'Embody', 'Integrate'] as const;
export type Stage = (typeof STAGES)[number];

/**
 * SoulPal-suggested shift candidate (so-pjv / be_core so-q9w). One row's
 * candidates[] returned by GET /soul-shifts/suggestions; the user picks one
 * to materialize as an active shift. Provenance ids round-trip on accept so
 * BE can attribute the resulting shift back to source signals/sights.
 */
export type ShiftSuggestionCandidate = {
  title: string;
  practice: string;
  cat: string;
  /** Hex color, e.g. "#FFC85C". Mirrors the `mood` field on Shift. */
  tone: string;
  soulpal: SoulpalVariant;
  /** Human-readable provenance, e.g. "4 entries · 2 patterns". */
  source_summary: string;
  source_signal_ids: string[];
  source_sight_ids: string[];
};

/** GET /soul-shifts/suggestions response shape. */
export type ShiftSuggestionResponse = {
  /** Suggestion-row id; null when no row exists yet. */
  id: string | null;
  candidates: ShiftSuggestionCandidate[];
  /** Server timestamps, ISO8601. */
  generated_at: string | null;
  next_eligible_at: string | null;
};
