import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme';
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

const BackIconDark = require('../../../assets/images/settings/BackButtonIcon.png');
const BackIconLight = require('../../../assets/images/profile/ProfileBackIcon.png');

type FilterKey = 'all' | ShiftStatus;

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
};

type StatusChip = {
  k: 'active' | 'processing' | 'integrated';
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
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState<FilterKey>('all');

  // Counts always reflect unfiltered totals so the pill counters stay stable
  // as the user toggles filters.
  const counts: StatusChip[] = [
    { k: 'active', n: shifts.filter((s) => s.status === 'active').length, color: YELLOW },
    { k: 'processing', n: shifts.filter((s) => s.status === 'processing').length, color: PINK },
    { k: 'integrated', n: shifts.filter((s) => s.status === 'integrated').length, color: TEAL },
  ];

  const visibleShifts =
    filter === 'all' ? shifts : shifts.filter((s) => s.status === filter);

  const chipBg = isDark ? 'rgba(255,255,255,0.06)' : '#fff';
  const chipBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(58,14,102,0.08)';
  const activeChipBg = isDark ? '#fff' : PURPLE;
  const activeChipFg = isDark ? PURPLE_INK : '#fff';

  const onPillTap = (k: FilterKey) => {
    // Tapping the active pill clears the filter — toggle behavior per design.
    setFilter((prev) => (prev === k ? 'all' : k));
  };

  return (
    <View style={styles.root}>
      <PageBg theme={theme} />
      <StarsBg theme={theme} />

      {onBack && (
        <View style={[styles.backRow, { top: insets.top + 12 }]} pointerEvents="box-none">
          <Pressable onPress={onBack} hitSlop={12}>
            <Image
              source={theme === 'dark' ? BackIconDark : BackIconLight}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </Pressable>
          <Text style={[styles.backText, { color: ink(theme) }]}>Back</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 56 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: ink(theme) }]}>Soul Shifts</Text>
          <Text style={[styles.subtitle, { color: inkSub(theme) }]}>
            Behaviors moving from intention to integration.
          </Text>
        </View>

        <View style={styles.chipsRow}>
          {/* All pill (always present, shows total count) */}
          <Pressable
            onPress={() => onPillTap('all')}
            style={[
              styles.chip,
              filter === 'all'
                ? { backgroundColor: activeChipBg, borderColor: activeChipBg }
                : { backgroundColor: chipBg, borderColor: chipBorder },
            ]}
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
          {onSuggestionsPress && (
            <Pressable
              onPress={onSuggestionsPress}
              style={[
                styles.chip,
                { backgroundColor: chipBg, borderColor: chipBorder },
              ]}
              accessibilityLabel="See SoulPal suggestions"
            >
              <Text style={[styles.chipText, { color: ink(theme) }]}>
                ✨ Suggestions
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.list}>
          {visibleShifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              theme={theme}
              focused={focusId === shift.id}
              dim={focusId != null && focusId !== shift.id}
              onPress={onShiftPress ? () => onShiftPress(shift.id) : undefined}
            />
          ))}
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
  backRow: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  backIcon: {
    width: 36,
    height: 36,
  },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 18,
  },
  title: {
    fontFamily: fonts.edensor.regular,
    fontSize: 34,
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: fonts.outfit.light,
    fontSize: 13,
  },
  chipsRow: {
    paddingTop: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
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
    fontSize: 11,
    textTransform: 'capitalize',
  },
  list: {
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
});
