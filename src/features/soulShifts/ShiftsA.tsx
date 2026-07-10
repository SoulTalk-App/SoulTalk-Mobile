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
type FilterKey = 'all' | 'active' | 'integrated' | 'released';

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
};

type StatusChip = {
  k: 'active' | 'integrated';
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
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const soulPalName = useSoulPalName();
  const [filter, setFilter] = useState<FilterKey>('all');

  // Counts always reflect unfiltered totals so the pill counters stay stable
  // as the user toggles filters.
  // so-zlvm MI-6: removed processing pill — no writer produces that status.
  const counts: StatusChip[] = [
    { k: 'active', n: shifts.filter((s) => s.status === 'active').length, color: YELLOW },
    { k: 'integrated', n: shifts.filter((s) => s.status === 'integrated').length, color: TEAL },
  ];

  // Released uses its own lazy-fetched list; the default `shifts` array
  // excludes released items per BE default. Other filters still scope to
  // `shifts` (active/integrated all live in the default list).
  const visibleShifts =
    filter === 'released'
      ? releasedShifts ?? []
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
    // Released list is lazy-fetched on first tap (and refresh-on-reentry):
    // the screen owns the cache + fetch state.
    if (k === 'released') onReleasedRequested?.();
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
            Soul Shifts
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
        {/* Released pill (so-2pm). No count for v1 — would require a
            separate fetch on mount; deferred to a follow-up if asked. */}
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
            No Soul Shifts yet.
          </Text>
          <Text style={[emptyStyles.subtitle, { color: inkSub(theme) }]}>
            Soul Shifts surface from patterns {soulPalName} notices in your
            entries and SoulSights. Keep journaling. Your first Shift will
            appear after your first SoulSight.
          </Text>
        </>
      )}
    </View>
  );

  // ── Released filter → FlatList (so-zlvm MI-5) ───────────────────────────
  // Released list accumulates unboundedly; virtualize it. Other filters
  // (all/active/integrated) are bounded by the user's active set and kept in
  // the simpler ScrollView+map path below.
  if (filter === 'released') {
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

  // ── All / active / integrated → ScrollView+map (bounded list) ─────────────
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
            visibleShifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                theme={theme}
                focused={focusId === shift.id}
                dim={focusId != null && focusId !== shift.id}
                onPress={onShiftPress ? () => onShiftPress(shift.id) : undefined}
              />
            ))
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
