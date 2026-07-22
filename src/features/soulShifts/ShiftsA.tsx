import React, { useCallback, useState } from 'react';
import { FlatList, Image, ListRenderItem, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../theme';
import { useSoulPalName } from '../../contexts/SoulPalContext';
import { PageBg } from './PageBg';
import { ShiftCard } from './ShiftCard';
import { StarsBg } from './StarsBg';
import { Shift, ShiftStatus } from './types';
import {
  PINK,
  PURPLE,
  PURPLE_INK,
  TEAL,
  Theme,
  YELLOW,
  ink,
  inkSub,
} from './tokens';


// so-zlvm MI-6: locked + processing removed — no writer produces these statuses.
// so-hjwv A3: 'snoozed' added — lazy-fetched list of future-snoozed shifts.
type FilterKey = 'all' | 'active' | 'integrated' | 'released' | 'snoozed';

type Props = {
  theme: Theme;
  shifts: Shift[];
  onBack?: () => void;
  /** Tap handler for individual cards (open detail modal). */
  onShiftPress?: (id: string) => void;
  /**
   * When set, the matching card renders with `focused` styling and all other
   * cards render with `dim` styling. Used while a detail/tend/release modal
   * is open over the list.
   */
  focusId?: string;
  /** Tap handler for the "✨ Suggestions" pill at the end of the chips row. */
  onSuggestionsPress?: () => void;
  /**
   * Released shifts (so-2pm). Default list response excludes status='released',
   * so the screen lazy-fetches these via SoulShiftsService.list({ statusFilter:
   * 'released' }) on first Released-pill tap and passes them in. When the
   * Released filter is active, this list is rendered instead of `shifts`.
   */
  releasedShifts?: Shift[];
  /**
   * Fires when the Released pill is tapped, signalling the screen to fetch
   * (or refetch) released shifts. Cached on the screen — fetch is one-shot.
   */
  onReleasedRequested?: () => void;
  /**
   * so-hjwv A2: Integrated shifts. Default list excludes status='integrated' so
   * the screen lazy-fetches on first Integrated-pill tap (same pattern as Released).
   */
  integratedShifts?: Shift[];
  /** Fires when the Integrated pill is tapped — screen fetches once and caches. */
  onIntegratedRequested?: () => void;
  /**
   * so-hjwv A3: Snoozed shifts. Screen lazy-fetches with include_snoozed=true on
   * first Snoozed-pill tap and client-filters to future snoozed_until rows.
   */
  snoozedShifts?: Shift[];
  /** Fires when the Snoozed pill is tapped — screen fetches once and caches. */
  onSnoozedRequested?: () => void;
};

// so-hjwv A2: integrated removed from status-chip counts (lazy-fetched, pill rendered standalone).
type StatusChip = {
  k: 'active';
  n: number;
  color: string;
};

export function ShiftsA({
  theme,
  shifts,
  onBack,
  onShiftPress,
  focusId,
  onSuggestionsPress,
  releasedShifts,
  onReleasedRequested,
  integratedShifts,
  onIntegratedRequested,
  snoozedShifts,
  onSnoozedRequested,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const soulPalName = useSoulPalName();
  // so-hjwv A1: open on Active (not All) — the most actionable view by default.
  const [filter, setFilter] = useState<FilterKey>('active');

  // Active count from the default list; other filters use lazy-fetched lists
  // so their counts aren't meaningful until fetched (pills shown without counts).
  // so-zlvm MI-6: removed processing pill — no writer produces that status.
  // so-hjwv A2: integrated removed from counts — default list excludes it; always-0
  //   was misleading. Rendered as a standalone pill (count-free) like Released.
  const counts: StatusChip[] = [
    { k: 'active', n: shifts.filter((s) => s.status === 'active').length, color: YELLOW },
  ];

  // so-hjwv A2/A3: integrated + snoozed use their own lazy-fetched lists.
  // Released + integrated + snoozed all live outside the default `shifts` array.
  const visibleShifts =
    filter === 'released'
      ? releasedShifts ?? []
      : filter === 'integrated'
      ? integratedShifts ?? []
      : filter === 'snoozed'
      ? snoozedShifts ?? []
      : filter === 'all'
      ? shifts
      : shifts.filter((s) => s.status === (filter as ShiftStatus));

  // so-zlvm MI-5: Released drawer virtualization. Stable renderItem reference
  // so FlatList doesn't re-render every card on parent re-render.
  const renderItem: ListRenderItem<Shift> = useCallback(
    ({ item: shift }) => (
      <View style={styles.flatItem}>
        <ShiftCard
          shift={shift}
          theme={theme}
          focused={focusId === shift.id}
          dim={focusId != null && focusId !== shift.id}
          onPress={onShiftPress ? () => onShiftPress(shift.id) : undefined}
        />
      </View>
    ),
    [theme, focusId, onShiftPress],
  );
  const keyExtractor = useCallback((s: Shift) => s.id, []);

  const chipBg = isDark ? 'rgba(255,255,255,0.06)' : '#fff';
  const chipBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(58,14,102,0.08)';
  const activeChipBg = isDark ? '#fff' : PURPLE;
  const activeChipFg = isDark ? PURPLE_INK : '#fff';

  const onPillTap = (k: FilterKey) => {
    // Tapping the active pill clears the filter — toggle behavior per design.
    setFilter((prev) => (prev === k ? 'all' : k));
    // Lazy-fetched lists: screen owns cache + fetch state; fire once on first tap.
    if (k === 'released') onReleasedRequested?.();
    // so-hjwv A2/A3: trigger lazy-fetch for integrated + snoozed on first tap.
    if (k === 'integrated') onIntegratedRequested?.();
    if (k === 'snoozed') onSnoozedRequested?.();
  };

  // Shared header + chips — used in both ScrollView and FlatList paths via
  // ListHeaderComponent so it scrolls with the content.
  const ListHeader = (
    <>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              style={styles.backInline}
            >
              <Feather
                name="chevron-left"
                size={28}
                color={theme === 'dark' ? '#FFFFFF' : '#3A0E66'}
              />
            </Pressable>
          ) : null}
          <Text
            style={[styles.title, { color: ink(theme) }]}
            numberOfLines={1}
          >
            SoulShifts
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: inkSub(theme) }]}>
          Behaviors moving from intention to integration.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {/* All pill (always present, shows total count) */}
        <Pressable
          onPress={() => onPillTap('all')}
          style={[
            styles.chip,
            filter === 'all'
              ? { backgroundColor: activeChipBg, borderColor: activeChipBg }
              : { backgroundColor: chipBg, borderColor: chipBorder },
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: filter === 'all' }}
        >
          <Text
            style={[
              styles.chipText,
              { color: filter === 'all' ? activeChipFg : ink(theme) },
            ]}
          >
            All · {shifts.length}
          </Text>
        </Pressable>
        {counts.map((c) => {
          const active = filter === c.k;
          return (
            <Pressable
              key={c.k}
              onPress={() => onPillTap(c.k)}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: activeChipBg, borderColor: activeChipBg }
                  : { backgroundColor: chipBg, borderColor: chipBorder },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.chipDot, { backgroundColor: c.color }]} />
              <Text
                style={[
                  styles.chipText,
                  { color: active ? activeChipFg : ink(theme) },
                ]}
              >
                {c.k} · {c.n}
              </Text>
            </Pressable>
          );
        })}
        {/* so-hjwv A2: Integrated pill — lazy-fetched on first tap (no count until loaded). */}
        <Pressable
          onPress={() => onPillTap('integrated')}
          style={[
            styles.chip,
            filter === 'integrated'
              ? { backgroundColor: activeChipBg, borderColor: activeChipBg }
              : { backgroundColor: chipBg, borderColor: chipBorder },
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: filter === 'integrated' }}
        >
          <View style={[styles.chipDot, { backgroundColor: TEAL }]} />
          <Text
            style={[
              styles.chipText,
              { color: filter === 'integrated' ? activeChipFg : ink(theme) },
            ]}
          >
            Integrated
          </Text>
        </Pressable>
        {/* Released pill (so-2pm). No count — separate fetch on mount deferred. */}
        <Pressable
          onPress={() => onPillTap('released')}
          style={[
            styles.chip,
            filter === 'released'
              ? { backgroundColor: activeChipBg, borderColor: activeChipBg }
              : { backgroundColor: chipBg, borderColor: chipBorder },
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: filter === 'released' }}
        >
          <Text
            style={[
              styles.chipText,
              { color: filter === 'released' ? activeChipFg : ink(theme) },
            ]}
          >
            Released
          </Text>
        </Pressable>
        {/* so-hjwv A3: Snoozed pill — lazy-fetched on first tap. */}
        <Pressable
          onPress={() => onPillTap('snoozed')}
          style={[
            styles.chip,
            filter === 'snoozed'
              ? { backgroundColor: activeChipBg, borderColor: activeChipBg }
              : { backgroundColor: chipBg, borderColor: chipBorder },
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected: filter === 'snoozed' }}
        >
          <Text
            style={[
              styles.chipText,
              { color: filter === 'snoozed' ? activeChipFg : ink(theme) },
            ]}
          >
            Snoozed
          </Text>
        </Pressable>
        {onSuggestionsPress && (
          <Pressable
            onPress={onSuggestionsPress}
            style={[
              styles.chip,
              { backgroundColor: chipBg, borderColor: chipBorder },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`See ${soulPalName} suggestions`}
          >
            <Text style={[styles.chipText, { color: ink(theme) }]}>
              ✨ Suggestions
            </Text>
          </Pressable>
        )}
      </ScrollView>
      <View style={styles.listTopPad} />
    </>
  );

  // so-yabx: explanatory empty state — without this, users see only the chip
  // row and a starry void and have no idea why. Branch copy on whether the
  // list is globally empty (pre-first-Sight) vs. just empty-for-this-filter.
  // No outer wrapper — callers place it inside styles.list (ScrollView path)
  // or as ListEmptyComponent (FlatList path).
  const EmptyCard = (
    <View
      style={[
        emptyStyles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.92)',
          borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(58,14,102,0.14)',
        },
      ]}
    >
      <Image
        source={require('../../../assets/images/home-v2/soulpal-4.png')}
        style={emptyStyles.soulpal}
        resizeMode="contain"
      />
      {filter !== 'all' && shifts.length > 0 ? (
        <>
          <Text style={[emptyStyles.title, { color: ink(theme) }]}>
            No Shifts in this state yet.
          </Text>
          <Text style={[emptyStyles.subtitle, { color: inkSub(theme) }]}>
            Try another filter. Your other Shifts are in different stages.
          </Text>
        </>
      ) : (
        <>
          <Text style={[emptyStyles.title, { color: ink(theme) }]}>
            No SoulShifts yet.
          </Text>
          <Text style={[emptyStyles.subtitle, { color: inkSub(theme) }]}>
            SoulShifts surface from patterns {soulPalName} notices in your
            entries and SoulSights. Keep journaling. Your first Shift will
            appear after your first SoulSight.
          </Text>
        </>
      )}
    </View>
  );

  // ── Released / Integrated / Snoozed → FlatList ────────────────────────────
  // These lists can accumulate unboundedly; virtualize them.
  // Active/all are bounded by the working set and kept in the ScrollView path.
  // so-hjwv A2/A3: integrated + snoozed added alongside released.
  if (filter === 'released' || filter === 'integrated' || filter === 'snoozed') {
    return (
      <View style={styles.root}>
        <PageBg theme={theme} />
        <StarsBg theme={theme} />
        <FlatList
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 14 }]}
          showsVerticalScrollIndicator={false}
          data={visibleShifts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.flatItemGap} />}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={<View style={styles.list}>{EmptyCard}</View>}
          ListFooterComponent={<View style={styles.flatFooter} />}
          removeClippedSubviews
        />
      </View>
    );
  }

  // ── All / Active → ScrollView+map (bounded list) with A4 ordering ──────────
  // so-hjwv A4: partition into in-progress (pct>0) then up-next (pct==0/Notice).
  // Only applies to filters that scope to the default shifts list (all/active).
  const inProgress = visibleShifts.filter((s) => s.pct > 0);
  const upNext = visibleShifts.filter((s) => s.pct === 0);
  const showSectionLabels = inProgress.length > 0 && upNext.length > 0;

  const renderShiftCard = (shift: Shift) => (
    <ShiftCard
      key={shift.id}
      shift={shift}
      theme={theme}
      focused={focusId === shift.id}
      dim={focusId != null && focusId !== shift.id}
      onPress={onShiftPress ? () => onShiftPress(shift.id) : undefined}
    />
  );

  return (
    <View style={styles.root}>
      <PageBg theme={theme} />
      <StarsBg theme={theme} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
      >
        {ListHeader}

        <View style={styles.list}>
          {visibleShifts.length === 0 ? (
            EmptyCard
          ) : (
            <>
              {inProgress.map(renderShiftCard)}
              {showSectionLabels && (
                <Text style={[sectionStyles.label, { color: inkSub(theme) }]}>
                  Up next
                </Text>
              )}
              {upNext.map(renderShiftCard)}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backInline: {
    flexShrink: 0,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.edensor.regular,
    fontSize: 30,
    lineHeight: 32,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
  },
  chipsRow: {
    paddingTop: 8,
    paddingLeft: 20,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  list: {
    // paddingTop removed — listTopPad in ListHeader provides the gap between
    // chips and the first card in both the ScrollView and FlatList paths.
    paddingHorizontal: 20,
    gap: 12,
  },
  listTopPad: {
    height: 16,
  },
  // so-zlvm MI-5: FlatList item styles for the Released drawer.
  flatItem: {
    paddingHorizontal: 20,
  },
  flatItemGap: {
    height: 12,
  },
  flatFooter: {
    height: 80,
  },
});

// so-hjwv A4: section label between in-progress and up-next buckets.
const sectionStyles = StyleSheet.create({
  label: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingTop: 4,
    paddingBottom: 2,
  },
});

// so-yabx: empty-state styles patterned on SoulSightScreen's emptyCard
// (dashed border, centered SoulPal + title + subtitle). Kept in a
// separate StyleSheet so the theme-dependent surface colors are still
// applied inline above (matching the rest of this file's pattern of
// inline color overrides + StyleSheet for layout).
const emptyStyles = StyleSheet.create({
  card: {
    paddingVertical: 32,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  soulpal: { width: 70, height: 70, marginBottom: 10 },
  title: {
    fontFamily: fonts.edensor.regular,
    fontSize: 19,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.5,
    textAlign: 'center',
    maxWidth: 280,
  },
});
