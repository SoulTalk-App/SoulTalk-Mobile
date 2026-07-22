/**
 * groupSignals — so-9kg3 M-1
 *
 * Production grouping logic for the Soul Signals feed. This module replaces
 * the broken `buildGroups` that lived in mockData.ts (and was therefore
 * bundled in production), which had two bugs:
 *
 *   1. Grouped by `tone` (a colour hex like '#70CACF') instead of `tag` (the
 *      semantic category like 'Pacing'). Different tags can share the same
 *      colour, producing wrong cross-tag groupings.
 *   2. Applied a hard `.slice(0, Math.ceil(count / 2))` cap that silently
 *      dropped patterns when the user had more than 3. The result header
 *      read "6 patterns" while only 3 cards rendered.
 *
 * Grouping contract:
 *  • One Group per distinct `tag` among pattern signals. Each Group's
 *    `related` list holds observation signals that share the same `tag`.
 *  • Observation signals with no matching pattern `tag` (e.g. tag-less
 *    observations, or observations whose pattern hasn't generated yet) surface
 *    as standalone Groups: { pattern: <observation>, related: [] }.
 *  • No count cap — every signal the list endpoint returns is rendered.
 *  • Groups are ordered by the group's pattern signal `createdAt` DESC
 *    (newest patterns first); `sortOrder` ASC is the tiebreaker.
 *  • `related` signals within a group are ordered by `sortOrder` ASC.
 *
 * Tag normalisation: both sides use `(signal.tag ?? '').trim()` so that a
 * null/undefined tag is treated as the empty-string bucket (standalone group)
 * and minor whitespace variants never duplicate.
 */

import { Group, Signal } from './types';

// ─── sectioned-feed types (so-kajr) ──────────────────────────────────────────

/** Injected between category sections in the signals feed. */
export type DividerItem = { _type: 'divider'; label: string };

/** Union of a pattern-group card or a between-section divider. */
export type FeedItem = Group | DividerItem;

/** Type-guard: true when item is a DividerItem. */
export function isDivider(item: FeedItem): item is DividerItem {
  return (item as DividerItem)._type === 'divider';
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Compare two signals newest-first by createdAt ISO string. */
function byCreatedAtDesc(a: Signal, b: Signal): number {
  const ta = a.createdAt ?? '';
  const tb = b.createdAt ?? '';
  if (tb > ta) return 1;
  if (ta > tb) return -1;
  return 0;
}

/** Compare two signals by sortOrder ASC, with undefined treated as 0. */
function bySortOrderAsc(a: Signal, b: Signal): number {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Build the Groups array for the Soul Signals feed.
 *
 * @param signals - Normalised signals from `SoulSignalsService.list()`.
 * @returns Groups ordered: pattern groups first (by createdAt DESC), then
 *          standalone observation groups (also by createdAt DESC).
 */
export function buildGroups(signals: Signal[]): Group[] {
  const patterns = signals.filter((s) => s.kind === 'pattern');
  const observations = signals.filter((s) => s.kind === 'observation');

  // ── pattern groups ────────────────────────────────────────────────────────
  // Collect patterns by tag, keeping the newest signal per tag as the "hero"
  // card (in case the BE ever returns multiple pattern signals for one tag).
  const tagToPattern = new Map<string, Signal>();
  for (const p of [...patterns].sort(byCreatedAtDesc)) {
    const t = (p.tag ?? '').trim();
    if (!tagToPattern.has(t)) {
      tagToPattern.set(t, p);
    }
  }

  const patternGroups: Group[] = [];
  const consumedObsIds = new Set<string>();

  for (const [tag, pattern] of tagToPattern) {
    const related = observations
      .filter((o) => (o.tag ?? '').trim() === tag)
      .sort(bySortOrderAsc);
    for (const r of related) consumedObsIds.add(r.id);
    patternGroups.push({ pattern, related });
  }

  // Sort pattern groups newest-first (the map iteration order already reflects
  // insertion order from the sorted walk above, but sort explicitly for
  // clarity and correctness if patterns share the same createdAt).
  patternGroups.sort((a, b) => {
    const d = byCreatedAtDesc(a.pattern, b.pattern);
    return d !== 0 ? d : bySortOrderAsc(a.pattern, b.pattern);
  });

  // ── standalone observation groups ─────────────────────────────────────────
  // Observations that didn't match any pattern tag surface as their own cards.
  const standaloneGroups: Group[] = observations
    .filter((o) => !consumedObsIds.has(o.id))
    .sort(byCreatedAtDesc)
    .map((o) => ({ pattern: o, related: [] }));

  return [...patternGroups, ...standaloneGroups];
}

// ─── category-sectioned feed (so-kajr) ───────────────────────────────────────

// BE taxonomy (app/schemas/soul_signal.py:10): pattern|loop|narrative|fear|strength
// Client layout: [loop, pattern, narrative] → divider → [strength, fear]
const SECTION_B_CATEGORIES = new Set(['strength', 'fear']);

const DEEPER_DIVIDER: DividerItem = {
  _type: 'divider',
  label: "Let's go even deeper",
};

/**
 * Build the category-sectioned feed for the Soul Signals hub.
 *
 * Groups are ordered within each section by the same createdAt DESC / sortOrder
 * ASC rules as buildGroups. If only one section has entries the divider is
 * omitted (nothing to divide). Groups whose pattern has no category (legacy /
 * missing) fall into section A.
 *
 * @param signals - Normalised signals from `SoulSignalsService.list()`.
 * @returns Flat FeedItem[] ready for a FlatList: sectionA groups, optional
 *          divider, sectionB groups.
 */
export function buildSectionedGroups(signals: Signal[]): FeedItem[] {
  const groups = buildGroups(signals);

  const sectionA: Group[] = [];
  const sectionB: Group[] = [];

  for (const g of groups) {
    const cat = (g.pattern.category ?? '').toLowerCase().trim();
    if (SECTION_B_CATEGORIES.has(cat)) {
      sectionB.push(g);
    } else {
      sectionA.push(g);
    }
  }

  const result: FeedItem[] = [...sectionA];
  if (sectionA.length > 0 && sectionB.length > 0) {
    result.push(DEEPER_DIVIDER);
  }
  result.push(...sectionB);
  return result;
}
