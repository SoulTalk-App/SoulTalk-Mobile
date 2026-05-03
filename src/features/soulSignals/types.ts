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
  /** Optional toggle states the list endpoint may surface; canonical for the
   *  detail modal lives on SignalDetail. */
  isSaved?: boolean;
  muteUntil?: string | null;
  mutedForever?: boolean;
  /**
   * Id of the non-released Soul Shift this signal already feeds, or null
   * (be_core so-c9f). Used to gate Turn-to-Shift and surface a "View existing
   * shift" affordance. Released-shift carve-out: a signal previously linked
   * to a now-released shift returns null here.
   */
  linkedShiftId?: string | null;
};

/**
 * Source quote contributing to a signal — date label + italic excerpt
 * pulled from the user's journal. Optional `entry_id` lets a future
 * "Open entry" affordance deep-link into the journal. (so-4vd)
 */
export type SignalSource = {
  date: string;
  excerpt: string;
  entry_id?: string;
};

/**
 * Detail-modal projection of a Signal with sources + canonical save/mute
 * state. [ASK] be_core for the wire shape; the FE assumes additive fields
 * below until the contract lands.
 */
export type SignalDetail = Signal & {
  sources: SignalSource[];
  isSaved: boolean;
  muteUntil: string | null;
  mutedForever: boolean;
};

export type ResonanceVote = 'yes' | 'not_quite';

/**
 * Mute durations supported by the Mute modal (so-x5g / be_core so-otk).
 * Enum strings on the wire; the FE labels the chips as "7 days" / "30 days"
 * / "Forever" for design fidelity. BE owns the day-count translation.
 */
export type MuteDuration = 'week' | 'month' | 'forever';

/**
 * Aggregated view of all signals tagged with `tag` for the current user
 * (be_core so-ris). Returned by GET /soul-signals/patterns/{tag}.
 */
export type SignalPatternAggregate = {
  tag: string;
  tone: string;
  /** Server-formatted, e.g. "Pattern across this month". */
  headline: string;
  /** Server-formatted, e.g. "12 noticings · across 8 entries · 2 weeks". */
  summary: string;
  noticings: Signal[];
  date_range: { start: string; end: string };
  soulpal: SoulpalVariant;
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
