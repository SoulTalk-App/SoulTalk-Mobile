import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../theme';
import {
  PINK,
  PURPLE,
  TEAL,
  Theme,
  ink,
  inkSub,
  surfaceBg,
  surfaceBorder,
} from '../soulSignals/tokens';

export type AffirmationItem = {
  date_key: string;
  affirmation_text: string;
  source: string;
  generated_at: string;
};

type Props = {
  theme: Theme;
  today: AffirmationItem;
  history: AffirmationItem[];
  // so-lt40 MI-2: total from BE so we know when more pages exist.
  historyTotal: number;
  onReplay?: () => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
};

const formatHistoryDate = (date_key: string): string => {
  const [y, m, d] = date_key.split('-').map(Number);
  if (!y || !m || !d) return date_key;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export function ReadyState({ theme, today, history, historyTotal, onReplay, onLoadMore, isLoadingMore }: Props) {
  const isDark = theme === 'dark';
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Past = everything except today's row. BE returns today included; filter
  // by date_key so we don't show today twice.
  const past = useMemo(
    () => history.filter((h) => h.date_key !== today.date_key),
    [history, today.date_key],
  );

  return (
    <View style={styles.container}>
      {/* Today's hero card */}
      <Pressable
        onPress={onReplay}
        disabled={!onReplay}
        accessibilityRole="button"
        accessibilityLabel={`Replay today's affirmation reveal: ${today.affirmation_text}`}
        style={styles.todayWrap}
      >
        <LinearGradient
          colors={
            isDark
              ? ['rgba(112,202,207,0.18)', 'rgba(233,54,120,0.10)']
              : ['#FFF1F8', '#FFE4F0']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.todayBg, { borderColor: isDark ? 'rgba(112,202,207,0.25)' : 'rgba(233,54,120,0.18)' }]}
        >
          <Text style={[styles.eyebrow, { color: isDark ? TEAL : PINK }]}>
            Today · {formatHistoryDate(today.date_key)}
          </Text>
          <Text style={[styles.todayText, { color: ink(theme) }]}>
            {today.affirmation_text}
          </Text>
          {onReplay ? (
            <Text style={[styles.replayHint, { color: inkSub(theme) }]}>
              Tap to replay the reveal
            </Text>
          ) : null}
        </LinearGradient>
      </Pressable>

      {/* History list */}
      {past.length > 0 ? (
        <View style={styles.historyBlock}>
          <Text style={[styles.sectionLabel, { color: inkSub(theme) }]}>
            Past affirmations
          </Text>
          <View style={styles.historyList}>
            {past.map((item) => {
              const isOpen = expandedKey === item.date_key;
              return (
                <Pressable
                  key={item.date_key}
                  onPress={() => setExpandedKey(isOpen ? null : item.date_key)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={`${formatHistoryDate(item.date_key)} affirmation`}
                  accessibilityHint={isOpen ? 'Collapses the full affirmation' : 'Expands the full affirmation'}
                  style={[
                    styles.historyRow,
                    {
                      backgroundColor: surfaceBg(theme),
                      borderColor: surfaceBorder(theme),
                    },
                  ]}
                >
                  <Text style={[styles.historyDate, { color: isDark ? TEAL : PURPLE }]}>
                    {formatHistoryDate(item.date_key)}
                  </Text>
                  <Text
                    style={[styles.historyText, { color: ink(theme) }]}
                    numberOfLines={isOpen ? undefined : 2}
                  >
                    {item.affirmation_text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {/* so-lt40 MI-2: show load-more when history doesn't cover all rows.
              history.length includes today; historyTotal is the BE total which
              also includes today — so history.length < historyTotal means more
              pages exist. */}
          {history.length < historyTotal && (
            <Pressable
              onPress={onLoadMore}
              disabled={isLoadingMore}
              style={styles.loadMoreBtn}
              accessibilityRole="button"
              accessibilityLabel={isLoadingMore ? 'Loading more affirmations' : 'Load more affirmations'}
              accessibilityState={{ busy: isLoadingMore ?? false }}
            >
              {isLoadingMore ? (
                <ActivityIndicator size="small" color={isDark ? TEAL : PURPLE} />
              ) : (
                <Text style={[styles.loadMoreText, { color: isDark ? TEAL : PURPLE }]}>
                  Load more
                </Text>
              )}
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  todayWrap: {
    marginTop: 12,
  },
  todayBg: {
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
  },
  eyebrow: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  todayText: {
    fontFamily: fonts.edensor.regular,
    fontSize: 22,
    lineHeight: 22 * 1.3,
  },
  replayHint: {
    marginTop: 12,
    fontFamily: fonts.edensor.lightItalic,
    fontSize: 12,
  },
  historyBlock: {
    marginTop: 28,
  },
  sectionLabel: {
    fontFamily: fonts.edensor.italic,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  historyList: {
    gap: 8,
  },
  historyRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  historyDate: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  historyText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 15 * 1.5,
  },
  // so-lt40 MI-2: load-more trigger below the history list.
  loadMoreBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  loadMoreText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
