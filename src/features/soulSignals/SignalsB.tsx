import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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

type Props = {
  theme: Theme;
  status: SignalsStatus;
  groups: Group[];
  eligibility?: Eligibility;
  listeningMeta?: { entries: number; patterns: number };
  onOpenJournal?: () => void;
};

export function SignalsB({
  theme,
  status,
  groups,
  eligibility,
  listeningMeta,
  onOpenJournal,
}: Props) {
  return (
    <View style={styles.root}>
      <PageBg theme={theme} />
      <StarsBg theme={theme} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
                <Text style={[styles.title, { color: ink(theme) }]}>
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
            <View style={styles.list}>
              {groups.map((g) => (
                <PatternCard key={g.pattern.id} group={g} theme={theme} />
              ))}
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.edensor.regular,
    fontSize: 36,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  countCap: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
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
});
