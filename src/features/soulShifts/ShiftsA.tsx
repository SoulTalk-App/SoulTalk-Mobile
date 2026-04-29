import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme';
import { PageBg } from './PageBg';
import { ShiftCard } from './ShiftCard';
import { StarsBg } from './StarsBg';
import { Shift } from './types';
import {
  PINK,
  TEAL,
  Theme,
  YELLOW,
  ink,
  inkSub,
} from './tokens';

type Props = {
  theme: Theme;
  shifts: Shift[];
  onAddShift?: () => void;
};

type StatusChip = {
  k: 'active' | 'processing' | 'integrated';
  n: number;
  color: string;
};

export function ShiftsA({ theme, shifts, onAddShift }: Props) {
  const isDark = theme === 'dark';

  const counts: StatusChip[] = [
    { k: 'active', n: shifts.filter((s) => s.status === 'active').length, color: YELLOW },
    { k: 'processing', n: shifts.filter((s) => s.status === 'processing').length, color: PINK },
    { k: 'integrated', n: shifts.filter((s) => s.status === 'integrated').length, color: TEAL },
  ];

  const chipBg = isDark ? 'rgba(255,255,255,0.06)' : '#fff';
  const chipBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(58,14,102,0.08)';

  return (
    <View style={styles.root}>
      <PageBg theme={theme} />
      <StarsBg theme={theme} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: ink(theme) }]}>Soul Shifts</Text>
          <Text style={[styles.subtitle, { color: inkSub(theme) }]}>
            Behaviors moving from intention to integration.
          </Text>
        </View>

        <View style={styles.chipsRow}>
          {counts.map((c) => (
            <View
              key={c.k}
              style={[
                styles.chip,
                { backgroundColor: chipBg, borderColor: chipBorder },
              ]}
            >
              <View style={[styles.chipDot, { backgroundColor: c.color }]} />
              <Text style={[styles.chipText, { color: ink(theme) }]}>
                {c.k} · {c.n}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.list}>
          {shifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} theme={theme} />
          ))}
        </View>

        <View style={styles.addWrap}>
          <Pressable
            style={[
              styles.addBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                borderColor: isDark
                  ? 'rgba(255,255,255,0.3)'
                  : 'rgba(79,23,134,0.25)',
              },
            ]}
            onPress={onAddShift}
          >
            <Text style={[styles.addPlus, { color: ink(theme) }]}>+</Text>
            <Text style={[styles.addText, { color: ink(theme) }]}>
              Begin a new shift
            </Text>
          </Pressable>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
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
  addWrap: {
    paddingTop: 18,
    paddingHorizontal: 20,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  addPlus: {
    fontSize: 16,
    fontFamily: fonts.outfit.semiBold,
  },
  addText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 13,
  },
});
