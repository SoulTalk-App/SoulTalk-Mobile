import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import SoulTalkLoader from '../components/SoulTalkLoader';
import SoulSightService, { SoulsightDetail, AggregateStats } from '../services/SoulSightService';

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');

interface ParsedSection {
  heading: string;
  body: string;
}

// Section names we look for (case-insensitive, with or without markdown headings)
const SECTION_NAMES = [
  'Big picture snapshot',
  'Hidden narrative',
  'Unspoken fear',
  'Patterns and loops',
  '80/20 focus',
  'Micro experiments',
  'Closing reflection',
];

/** Strip markdown formatting: headings (#), bold (**), italic (*), hr (---), em dashes */
const stripMarkdown = (text: string): string => {
  return text
    .replace(/^#{1,6}\s+/gm, '')       // # headings
    .replace(/^---+$/gm, '')           // --- horizontal rules
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold**
    .replace(/\*(.+?)\*/g, '$1')       // *italic*
    .replace(/\u2014/g, '-')           // em dash to regular dash
    .replace(/\u2013/g, '-')           // en dash to regular dash
    .replace(/^\s*\n/gm, '\n')         // collapse blank lines
    .trim();
};

const parseSoulsightContent = (content: string): ParsedSection[] => {
  const sections: ParsedSection[] = [];

  // Extract title: first line that looks like "# Something" or first non-empty line before sections
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    sections.push({ heading: 'Title', body: titleMatch[1].trim() });
  }

  // Build regex to split by section headings (handles ## Heading, Heading:, etc.)
  for (let i = 0; i < SECTION_NAMES.length; i++) {
    const name = SECTION_NAMES[i];
    // Match "## Big picture snapshot", "Big picture snapshot:", etc.
    const pattern = new RegExp(
      `(?:^|\\n)(?:#{1,6}\\s+)?${name.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')}[:\\s]*\\n`,
      'i',
    );
    const match = content.match(pattern);
    if (!match || match.index === undefined) continue;

    const startIdx = match.index + match[0].length;

    // Find where this section ends (next section heading or end of content)
    let endIdx = content.length;
    for (let j = i + 1; j < SECTION_NAMES.length; j++) {
      const nextPattern = new RegExp(
        `(?:^|\\n)(?:#{1,6}\\s+)?${SECTION_NAMES[j].replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')}[:\\s]*\\n`,
        'i',
      );
      const nextMatch = content.substring(startIdx).match(nextPattern);
      if (nextMatch && nextMatch.index !== undefined) {
        endIdx = startIdx + nextMatch.index;
        break;
      }
    }

    const body = stripMarkdown(content.substring(startIdx, endIdx));
    if (body) {
      sections.push({ heading: name, body });
    }
  }

  return sections;
};

const formatDateRange = (start: string, end: string): string => {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} \u2013 ${e.toLocaleDateString('en-US', opts)}`;
};

const getTopEntries = (dist: Record<string, number>, limit: number = 5): [string, number][] => {
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
};

const SoulSightDetailScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const soulsightId: string = route.params?.soulsightId;
  const [soulsight, setSoulsight] = useState<SoulsightDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SoulSightService.getById(soulsightId)
      .then(setSoulsight)
      .catch((err) => console.log('[SoulSight] Detail fetch error:', err.message))
      .finally(() => setIsLoading(false));
  }, [soulsightId]);

  if (isLoading || !soulsight) {
    return (
      <LinearGradient
        colors={['#59168B', '#653495', '#59168B']}
        locations={[0, 0.5, 1]}
        style={styles.container}
      >
        <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
            <Image source={BackIcon} style={styles.backIcon} resizeMode="contain" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <SoulTalkLoader />
        </View>
      </LinearGradient>
    );
  }

  const isSafetyRedirect = soulsight.status === 'safety_redirect';
  const sections = !isSafetyRedirect && soulsight.content
    ? parseSoulsightContent(soulsight.content)
    : [];
  const titleSection = sections.find((s) => s.heading === 'Title');
  const bodySections = sections.filter((s) => s.heading !== 'Title');
  const stats = soulsight.aggregate_stats;

  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#59168B']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Back Button */}
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
          <Image source={BackIcon} style={styles.backIcon} resizeMode="contain" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* White Content Card */}
        <View style={styles.contentCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {isSafetyRedirect ? (
              <Text style={styles.safetyText}>{soulsight.content}</Text>
            ) : sections.length > 0 ? (
              <>
                {/* Title */}
                {titleSection && (
                  <Text style={styles.reportTitle}>{titleSection.body}</Text>
                )}

                {/* Date Range */}
                <Text style={styles.dateSubtitle}>
                  {formatDateRange(soulsight.window_start, soulsight.window_end)}
                </Text>

                {/* Stat Pills */}
                <View style={styles.statRow}>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillText}>{soulsight.entry_count} entries</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillText}>{soulsight.active_days} active days</Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Parsed Sections */}
                {bodySections.map((section, idx) => (
                  <View key={idx} style={styles.sectionBlock}>
                    <Text style={styles.sectionHeading}>{section.heading}</Text>
                    <Text style={styles.sectionBody}>{section.body}</Text>
                  </View>
                ))}

                {/* Aggregate Stats */}
                {stats && <StatsSection stats={stats} />}
              </>
            ) : (
              // Fallback: render content as plain text
              <>
                <Text style={styles.dateSubtitle}>
                  {formatDateRange(soulsight.window_start, soulsight.window_end)}
                </Text>
                <View style={styles.divider} />
                <Text style={styles.sectionBody}>{soulsight.content}</Text>
              </>
            )}
          </ScrollView>
        </View>

        <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }} />
      </View>
    </LinearGradient>
  );
};

const StatsSection = ({ stats }: { stats: AggregateStats }) => {
  const topEmotions = getTopEntries(stats.emotion_distribution);
  const topTopics = getTopEntries(stats.topic_frequency);
  const topCoping = getTopEntries(stats.coping_frequency);
  const maxEmotion = topEmotions.length > 0 ? topEmotions[0][1] : 1;

  if (topEmotions.length === 0 && topTopics.length === 0 && topCoping.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.divider} />
      <Text style={styles.statsTitle}>Your Stats</Text>

      {/* Emotion Bars */}
      {topEmotions.length > 0 && (
        <View style={styles.statsGroup}>
          <Text style={styles.statsLabel}>Top Emotions</Text>
          {topEmotions.map(([emotion, count]) => (
            <View key={emotion} style={styles.barRow}>
              <Text style={styles.barLabel}>{emotion}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.max((count / maxEmotion) * 100, 8)}%` },
                  ]}
                />
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Topic Pills */}
      {topTopics.length > 0 && (
        <View style={styles.statsGroup}>
          <Text style={styles.statsLabel}>Topics</Text>
          <View style={styles.pillRow}>
            {topTopics.map(([topic]) => (
              <View key={topic} style={styles.topicPill}>
                <Text style={styles.topicPillText}>{topic.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Coping Pills */}
      {topCoping.length > 0 && (
        <View style={styles.statsGroup}>
          <Text style={styles.statsLabel}>Coping</Text>
          <View style={styles.pillRow}>
            {topCoping.map(([mech]) => (
              <View key={mech} style={styles.copingPill}>
                <Text style={styles.copingPillText}>{mech.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Average Intensity */}
      {stats.avg_emotion_intensity != null && (
        <View style={styles.statsGroup}>
          <Text style={styles.statsLabel}>
            Avg. Emotion Intensity: {stats.avg_emotion_intensity}/5
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
  },

  // Back Button
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backIcon: {
    width: 36,
    height: 36,
  },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: colors.white,
  },

  // Content Card
  contentCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  // Report Title
  reportTitle: {
    fontFamily: fonts.edensor.bold,
    fontSize: 24,
    color: '#59168B',
    textAlign: 'center',
    marginBottom: 8,
  },
  dateSubtitle: {
    fontFamily: fonts.outfit.light,
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 12,
  },

  // Stat Pills
  statRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statPill: {
    backgroundColor: '#F3ECFA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statPillText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: '#59168B',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E0D4E8',
    marginVertical: 16,
  },

  // Parsed Sections
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: '#59168B',
    marginBottom: 6,
  },
  sectionBody: {
    fontFamily: fonts.outfit.light,
    fontSize: 14,
    lineHeight: 14 * 1.6,
    color: '#333333',
  },

  // Safety Redirect
  safetyText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 15 * 1.6,
    color: '#333333',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Stats Section
  statsTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: '#59168B',
    marginBottom: 16,
  },
  statsGroup: {
    marginBottom: 16,
  },
  statsLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: '#59168B',
    marginBottom: 8,
  },

  // Emotion Bars
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: '#666',
    width: 80,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F3ECFA',
    borderRadius: 5,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#59168B',
    borderRadius: 5,
  },
  barCount: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: '#888',
    width: 24,
    textAlign: 'right',
  },

  // Pill Tags
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicPill: {
    backgroundColor: '#F3ECFA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  topicPillText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: '#59168B',
  },
  copingPill: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  copingPillText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: '#2E7D32',
  },
});

export default SoulSightDetailScreen;
