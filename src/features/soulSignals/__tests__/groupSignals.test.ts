/**
 * Unit tests for groupSignals.buildGroups — so-9kg3 M-1
 *
 * Tests pin the grouping contract so regressions in tag-based grouping,
 * observation surfacing, ordering, and the cap-removal are caught immediately.
 */

import { buildGroups } from '../groupSignals';
import { Signal } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeSignal(overrides: Partial<Signal> & { id: string; kind: Signal['kind'] }): Signal {
  return {
    tone: '#70CACF',
    soulpal: 1,
    when: 'recently',
    headline: 'Test headline',
    detail: 'Test detail',
    quotes: [],
    fedSight: null,
    ...overrides,
  };
}

// ─── grouping by tag ──────────────────────────────────────────────────────────

describe('buildGroups — tag-based grouping', () => {
  it('groups observations under the pattern with the same tag', () => {
    const signals: Signal[] = [
      makeSignal({ id: 'p1', kind: 'pattern', tag: 'Pacing', createdAt: '2024-01-02T00:00:00Z' }),
      makeSignal({ id: 'o1', kind: 'observation', tag: 'Pacing', sortOrder: 1 }),
      makeSignal({ id: 'o2', kind: 'observation', tag: 'Pacing', sortOrder: 2 }),
    ];
    const groups = buildGroups(signals);
    expect(groups).toHaveLength(1);
    expect(groups[0].pattern.id).toBe('p1');
    expect(groups[0].related.map((r) => r.id)).toEqual(['o1', 'o2']);
  });

  it('does NOT group observations under a pattern with a different tag', () => {
    const signals: Signal[] = [
      makeSignal({ id: 'p1', kind: 'pattern', tag: 'Pacing', tone: '#AAAAAA' }),
      makeSignal({ id: 'o1', kind: 'observation', tag: 'Self-talk', tone: '#AAAAAA' }),
    ];
    const groups = buildGroups(signals);
    // o1 should be standalone because its tag ('Self-talk') ≠ pattern tag ('Pacing')
    expect(groups).toHaveLength(2);
    const patternGroup = groups.find((g) => g.pattern.id === 'p1')!;
    expect(patternGroup.related).toHaveLength(0);
    const standalone = groups.find((g) => g.pattern.id === 'o1')!;
    expect(standalone).toBeDefined();
    expect(standalone.related).toHaveLength(0);
  });

  it('produces a separate group per distinct tag', () => {
    const signals: Signal[] = [
      makeSignal({ id: 'p1', kind: 'pattern', tag: 'Pacing', createdAt: '2024-01-03T00:00:00Z' }),
      makeSignal({ id: 'p2', kind: 'pattern', tag: 'Self-talk', createdAt: '2024-01-02T00:00:00Z' }),
      makeSignal({ id: 'p3', kind: 'pattern', tag: 'Mornings', createdAt: '2024-01-01T00:00:00Z' }),
    ];
    const groups = buildGroups(signals);
    expect(groups).toHaveLength(3);
  });

  it('surfaces observations with no matching pattern as standalone groups', () => {
    const signals: Signal[] = [
      makeSignal({ id: 'o1', kind: 'observation', tag: undefined }),
      makeSignal({ id: 'o2', kind: 'observation', tag: 'OrphanTag' }),
    ];
    const groups = buildGroups(signals);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.related.length === 0)).toBe(true);
  });
});

// ─── no count cap ─────────────────────────────────────────────────────────────

describe('buildGroups — no count cap', () => {
  it('renders all pattern signals regardless of count (was capped at ceil(count/2))', () => {
    const signals: Signal[] = Array.from({ length: 8 }, (_, i) =>
      makeSignal({
        id: `p${i + 1}`,
        kind: 'pattern',
        tag: `Tag${i + 1}`,
        createdAt: `2024-01-0${i + 1}T00:00:00Z`,
      }),
    );
    const groups = buildGroups(signals);
    // All 8 must render — the old code would return only 3 (ceil(6/2)=3).
    expect(groups).toHaveLength(8);
  });
});

// ─── ordering ─────────────────────────────────────────────────────────────────

describe('buildGroups — ordering', () => {
  it('orders pattern groups by createdAt DESC (newest first)', () => {
    const signals: Signal[] = [
      makeSignal({ id: 'p1', kind: 'pattern', tag: 'A', createdAt: '2024-01-01T00:00:00Z' }),
      makeSignal({ id: 'p2', kind: 'pattern', tag: 'B', createdAt: '2024-01-03T00:00:00Z' }),
      makeSignal({ id: 'p3', kind: 'pattern', tag: 'C', createdAt: '2024-01-02T00:00:00Z' }),
    ];
    const groups = buildGroups(signals);
    expect(groups.map((g) => g.pattern.id)).toEqual(['p2', 'p3', 'p1']);
  });

  it('orders related signals within a group by sortOrder ASC', () => {
    const signals: Signal[] = [
      makeSignal({ id: 'p1', kind: 'pattern', tag: 'Pacing' }),
      makeSignal({ id: 'o3', kind: 'observation', tag: 'Pacing', sortOrder: 3 }),
      makeSignal({ id: 'o1', kind: 'observation', tag: 'Pacing', sortOrder: 1 }),
      makeSignal({ id: 'o2', kind: 'observation', tag: 'Pacing', sortOrder: 2 }),
    ];
    const groups = buildGroups(signals);
    expect(groups[0].related.map((r) => r.id)).toEqual(['o1', 'o2', 'o3']);
  });

  it('places pattern groups before standalone observation groups', () => {
    const signals: Signal[] = [
      makeSignal({ id: 'o_standalone', kind: 'observation', tag: 'NoMatchTag', createdAt: '2024-02-01T00:00:00Z' }),
      makeSignal({ id: 'p1', kind: 'pattern', tag: 'Pacing', createdAt: '2024-01-01T00:00:00Z' }),
    ];
    const groups = buildGroups(signals);
    // Pattern group must come first despite the standalone observation being newer.
    expect(groups[0].pattern.id).toBe('p1');
    expect(groups[1].pattern.id).toBe('o_standalone');
  });
});

// ─── edge cases ───────────────────────────────────────────────────────────────

describe('buildGroups — edge cases', () => {
  it('returns empty array for empty input', () => {
    expect(buildGroups([])).toEqual([]);
  });

  it('handles signals with no tag (treated as empty-string bucket)', () => {
    const signals: Signal[] = [
      makeSignal({ id: 'p1', kind: 'pattern', tag: undefined }),
      makeSignal({ id: 'o1', kind: 'observation', tag: undefined }),
    ];
    const groups = buildGroups(signals);
    // Both have tag === '' — observation matches the pattern's empty-tag bucket.
    expect(groups).toHaveLength(1);
    expect(groups[0].pattern.id).toBe('p1');
    expect(groups[0].related.map((r) => r.id)).toEqual(['o1']);
  });

  it('keeps multiple pattern signals for the same tag: uses newest as hero', () => {
    const signals: Signal[] = [
      makeSignal({ id: 'p_old', kind: 'pattern', tag: 'Pacing', createdAt: '2024-01-01T00:00:00Z' }),
      makeSignal({ id: 'p_new', kind: 'pattern', tag: 'Pacing', createdAt: '2024-01-05T00:00:00Z' }),
    ];
    const groups = buildGroups(signals);
    expect(groups).toHaveLength(1);
    expect(groups[0].pattern.id).toBe('p_new');
  });
});
