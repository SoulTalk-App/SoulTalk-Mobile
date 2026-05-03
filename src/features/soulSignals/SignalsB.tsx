import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme';
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

const BackIconDark = require('../../../assets/images/settings/BackButtonIcon.png');
const BackIconLight = require('../../../assets/images/profile/ProfileBackIcon.png');

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
  // Single-row header (so-rlz): back + title + counter ride the same row,
  // no separate back-row band above. Just enough top inset to clear the
  // notch.
  const scrollTopPad = insets.top + 14;

  return (
    <View style={styles.root}>
      <PageBg theme={theme} />
      <StarsBg theme={theme} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: scrollTopPad }]}
        showsVerticalScrollIndicator={false}
      >
        {status === 'locked' ? (
          <LockedState
            theme={theme}
            eligibility={eligibility}
            onOpenJournal={onOpenJournal}
          />
        ) : status === 'processing' || status === 'listening' ? (
          <ListeningState theme={theme} meta={listeningMeta} />
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.headerTopRow}>
                {onBack ? (
                  <Pressable
                    onPress={onBack}
                    hitSlop={12}
                    style={styles.backInline}
                  >
                    <Image
                      source={theme === 'dark' ? BackIconDark : BackIconLight}
                      style={styles.backIcon}
                      resizeMode="contain"
                    />
                  </Pressable>
                ) : null}
                <Text
                  style={[styles.title, { color: ink(theme) }]}
                  numberOfLines={1}
                >
                  Soul Signals
                </Text>
                <Text style={[styles.countCap, { color: inkSub(theme) }]}>
                  {groups.length} patterns
                </Text>
              </View>
              <Text style={[styles.subtitle, { color: inkSub(theme) }]}>
                Recurring threads, with the noticings that make them visible.
              </Text>
            </View>
            {/* Drawer filter (so-8ho). All vs Muted; muted is lazy-fetched
                upstream and rendered as pseudo-groups. */}
            {onFilterChange && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
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
            )}
            <View style={styles.list}>
              {groups.length === 0 && filter === 'muted' ? (
                <Text style={[styles.emptyMuted, { color: inkSub(theme) }]}>
                  No muted threads yet.
                </Text>
              ) : (
                groups.map((g) => (
                  <PatternCard
                    key={g.pattern.id}
                    group={g}
                    theme={theme}
                    focused={focusId === g.pattern.id}
                    dim={focusId != null && focusId !== g.pattern.id}
                    onPress={onPatternPress}
                  />
                ))
              )}
            </View>
          </>
        )}
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
    paddingBottom: 80,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backInline: {
    flexShrink: 0,
  },
  backIcon: {
    width: 36,
    height: 36,
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
  subtitle: {
    marginTop: 6,
    fontFamily: fonts.edensor.lightItalic,
    fontSize: 13,
    lineHeight: 13 * 1.4,
  },
  list: {
    paddingTop: 14,
    paddingHorizontal: 20,
    gap: 16,
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
  },
});
