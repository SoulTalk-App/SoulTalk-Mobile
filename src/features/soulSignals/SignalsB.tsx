import React, { useCallback } from 'react';
import {
  FlatList,
  ListRenderItem,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../theme';
import { useSoulPalName } from '../../contexts/SoulPalContext';
import { ListeningState } from './ListeningState';
import { LockedState } from './LockedState';
import { PageBg } from './PageBg';
import { PatternCard } from './PatternCard';
import { StarsBg } from './StarsBg';
import {
  Theme,
  ink,
  inkSub,
} from './tokens';
import { Eligibility, Group, SignalsStatus } from './types';

type Props = {
  theme: Theme;
  status: SignalsStatus;
  groups: Group[];
  eligibility?: Eligibility;
  listeningMeta?: { entries: number; patterns: number };
  onOpenJournal?: () => void;
  onBack?: () => void;
  /** Tap handler for the pattern card → opens SignalsDetailModal. */
  onPatternPress?: (id: string) => void;
  /** When set, the matching card renders focused; all other cards dim.
   *  Used while a detail / mute / turn-to-shift modal is over the feed. */
  focusId?: string;
  /**
   * Drawer filter (so-8ho). 'all' renders the default pattern groups; 'muted'
   * renders muted signals as pseudo-groups (one card each, no siblings).
   */
  filter?: 'all' | 'muted';
  onFilterChange?: (next: 'all' | 'muted') => void;
};

export function SignalsB({
  theme,
  status,
  groups,
  eligibility,
  listeningMeta,
  onOpenJournal,
  onBack,
  onPatternPress,
  focusId,
  filter = 'all',
  onFilterChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const soulPalName = useSoulPalName();
  // Single-row header (so-rlz): back + title + counter ride the same row,
  // no separate back-row band above. Just enough top inset to clear the
  // notch.
  const scrollTopPad = insets.top + 14;

  // so-9kg3 MI-3: renderItem extracted so FlatList can receive a stable
  // reference (avoids a re-render of every card on parent re-render).
  const renderItem: ListRenderItem<Group> = useCallback(
    ({ item: g }) => (
      <View style={styles.itemWrap}>
        <PatternCard
          group={g}
          theme={theme}
          focused={focusId === g.pattern.id}
          dim={focusId != null && focusId !== g.pattern.id}
          onPress={onPatternPress}
        />
      </View>
    ),
    [theme, focusId, onPatternPress],
  );

  const keyExtractor = useCallback((g: Group) => g.pattern.id, []);

  const ItemSeparator = useCallback(
    () => <View style={styles.itemGap} />,
    [],
  );

  // ── locked / processing / listening states ─────────────────────────────
  // These never have a scrollable list — keep them in a simple ScrollView.
  if (status === 'locked' || status === 'processing' || status === 'listening') {
    return (
      <View style={styles.root}>
        <PageBg theme={theme} />
        <StarsBg theme={theme} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingTop: scrollTopPad }]}
          showsVerticalScrollIndicator={false}
        >
          {/* so-1tbl: empty/locked/listening states render full-card with no
              surrounding header — without this back chevron, users hit a
              dead end (only CTA is "Open Journal", no escape to home). */}
          {onBack ? (
            <View style={styles.emptyBackRow}>
              <Pressable onPress={onBack} hitSlop={12} style={styles.backInline}>
                <Feather
                  name="chevron-left"
                  size={28}
                  color={theme === 'dark' ? '#FFFFFF' : '#3A0E66'}
                />
              </Pressable>
            </View>
          ) : null}
          {status === 'locked' ? (
            <LockedState
              theme={theme}
              eligibility={eligibility}
              onOpenJournal={onOpenJournal}
            />
          ) : (
            <ListeningState theme={theme} meta={listeningMeta} />
          )}
        </ScrollView>
      </View>
    );
  }

  // ── done state — virtualised FlatList ────────────────────────────────────
  // so-9kg3 M-1 / MI-3: convert the ScrollView+map to FlatList so long feeds
  // (all signals rendered, no cap) don't keep every card in memory. Header
  // (back, title, filter chips) lives in ListHeaderComponent so it scrolls
  // with the feed. Footer provides the bottom safe-area pad.

  const emptyText =
    filter === 'muted'
      ? 'No muted threads yet.'
      : `No signals yet. ${soulPalName} will surface threads here as patterns emerge across your reflections.`;

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
            SoulSignals
          </Text>
          <Text style={[styles.countCap, { color: inkSub(theme) }]}>
            {groups.length} patterns
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: inkSub(theme) }]}>
          The recurring patterns your reflections reveal.
        </Text>
      </View>
      {/* Drawer filter (so-8ho). All vs Muted; muted is lazy-fetched
          upstream and rendered as pseudo-groups. */}
      {onFilterChange ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {/* so-9kg3 MI-5: accessibilityRole + accessibilityLabel on chips. */}
          {(['all', 'muted'] as const).map((k) => {
            const active = filter === k;
            return (
              <Pressable
                key={k}
                onPress={() => onFilterChange(k)}
                style={[
                  styles.chip,
                  active
                    ? {
                        backgroundColor:
                          theme === 'dark' ? '#fff' : '#3A0E66',
                        borderColor:
                          theme === 'dark' ? '#fff' : '#3A0E66',
                      }
                    : {
                        backgroundColor:
                          theme === 'dark'
                            ? 'rgba(255,255,255,0.06)'
                            : '#fff',
                        borderColor:
                          theme === 'dark'
                            ? 'rgba(255,255,255,0.14)'
                            : 'rgba(58,14,102,0.08)',
                      },
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  k === 'all' ? 'Show all signals' : 'Show muted signals'
                }
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: active
                        ? theme === 'dark'
                          ? '#3A0E66'
                          : '#fff'
                        : ink(theme),
                    },
                  ]}
                >
                  {k === 'all' ? 'All' : 'Muted'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      {/* Top padding for the list area (replaces styles.list paddingTop). */}
      <View style={styles.listTopPad} />
    </>
  );

  return (
    <View style={styles.root}>
      <PageBg theme={theme} />
      <StarsBg theme={theme} />
      <FlatList
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: scrollTopPad }}
        showsVerticalScrollIndicator={false}
        data={groups}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <Text style={[styles.emptyMuted, { color: inkSub(theme) }]}>
            {emptyText}
          </Text>
        }
        ListFooterComponent={<View style={styles.listFooter} />}
        // removeClippedSubviews provides an extra memory win on Android for
        // long feeds. Default false on iOS (no benefit, potential issues).
        removeClippedSubviews
      />
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
    paddingBottom: 80,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backInline: {
    flexShrink: 0,
  },
  emptyBackRow: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.edensor.regular,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  countCap: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // so-8wy7 (feedback #16): edensor.lightItalic → outfit.regular for legibility
  // at small muted size. Mirrors so-c44d eyebrow fix. inkSub + size unchanged.
  subtitle: {
    marginTop: 6,
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
  },
  // so-9kg3 MI-3: item-level padding replaces styles.list paddingHorizontal.
  itemWrap: {
    paddingHorizontal: 20,
  },
  itemGap: {
    height: 16,
  },
  listTopPad: {
    height: 14,
  },
  listFooter: {
    height: 80,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
  },
  emptyMuted: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    textAlign: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
});
