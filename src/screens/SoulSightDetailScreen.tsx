import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, surfaces } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import GlassCard from '../components/GlassCard';
import SoulSightService, { SoulsightDetail, AggregateStats } from '../services/SoulSightService';

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');
const ProfileBackIcon = require('../../assets/images/profile/ProfileBackIcon.png');

interface ParsedSection {
  heading: string;
  body: string;
}

/** Strip markdown formatting from body text: bold (**), italic (*), hr (---), em dashes */
const stripMarkdown = (text: string): string => {
  return text
    .replace(/^---+$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\u2014/g, '\u2014')
    .replace(/^\s*\n/gm, '\n')
    .trim();
};

const parseSoulsightContent = (content: string): ParsedSection[] => {
  const sections: ParsedSection[] = [];

  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: { level: number; title: string; index: number; matchLength: number }[] = [];

  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      title: match[2].trim(),
      index: match.index,
      matchLength: match[0].length,
    });
  }

  if (headings.length === 0) {
    return [];
  }

  const titleIdx = headings.findIndex((h) => h.level === 1);
  if (titleIdx !== -1) {
    sections.push({ heading: 'Title', body: headings[titleIdx].title });
  }

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (h.level === 1 && i === titleIdx) continue;

    const bodyStart = h.index + h.matchLength;
    const bodyEnd = i + 1 < headings.length ? headings[i + 1].index : content.length;
    const body = stripMarkdown(content.substring(bodyStart, bodyEnd));

    if (body) {
      sections.push({ heading: h.title, body });
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
  const { isDarkMode } = useTheme();
  const soulsightId: string = route.params?.soulsightId;
  const [soulsight, setSoulsight] = useState<SoulsightDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SoulSightService.getById(soulsightId)
      .then(setSoulsight)
      .catch((err) => console.log('[SoulSight] Detail fetch error:', err.message))
      .finally(() => setIsLoading(false));
  }, [soulsightId]);

  // ==============================
  // DARK MODE
  // ==============================
  if (isDarkMode) {
    if (isLoading || !soulsight) {
      return (
        <LinearGradient
          colors={[...surfaces.soulsightGradient]}
          locations={[0, 0.3, 0.65, 1]}
          style={dk.container}
        >
          <View style={[dk.content, { paddingTop: insets.top + 16 }]}>
            <Pressable style={dk.backRow} onPress={() => navigation.goBack()}>
              <Image source={BackIcon} style={dk.backIcon} resizeMode="contain" />
              <Text style={dk.backText}>Back</Text>
            </Pressable>
            <ActivityIndicator color="#FFFFFF" size="large" style={{ flex: 1, justifyContent: 'center' }} />
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
        colors={[...surfaces.soulsightGradient]}
        locations={[0, 0.3, 0.65, 1]}
        style={dk.container}
      >
        <View style={[dk.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={dk.backRow} onPress={() => navigation.goBack()}>
            <Image source={BackIcon} style={dk.backIcon} resizeMode="contain" />
            <Text style={dk.backText}>Back</Text>
          </Pressable>

          <GlassCard intensity="heavy" style={dk.contentCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={dk.scrollContent}
            >
              {isSafetyRedirect ? (
                <Text style={dk.safetyText}>{soulsight.content}</Text>
              ) : sections.length > 0 ? (
                <>
                  {titleSection && (
                    <Text style={dk.reportTitle}>{titleSection.body}</Text>
                  )}
                  <Text style={dk.dateSubtitle}>
                    {formatDateRange(soulsight.window_start, soulsight.window_end)}
                  </Text>
                  <View style={dk.statRow}>
                    <View style={dk.statPill}>
                      <Text style={dk.statPillText}>{soulsight.entry_count} entries</Text>
                    </View>
                    <View style={dk.statPill}>
                      <Text style={dk.statPillText}>{soulsight.active_days} active days</Text>
                    </View>
                  </View>
                  <View style={dk.divider} />
                  {bodySections.map((section, idx) => (
                    <View key={idx} style={dk.sectionBlock}>
                      <Text style={dk.sectionHeading}>{section.heading}</Text>
                      <Text style={dk.sectionBody}>{section.body}</Text>
                    </View>
                  ))}
                  {stats && <StatsSectionDark stats={stats} />}
                </>
              ) : (
                <>
                  <Text style={dk.dateSubtitle}>
                    {formatDateRange(soulsight.window_start, soulsight.window_end)}
                  </Text>
                  <View style={dk.divider} />
                  <Text style={dk.sectionBody}>{soulsight.content}</Text>
                </>
              )}
            </ScrollView>
          </GlassCard>

          <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }} />
        </View>
      </LinearGradient>
    );
  }

  // ==============================
  // LIGHT MODE
  // ==============================
  if (isLoading || !soulsight) {
    return (
      <LinearGradient
        colors={['#59168B', '#653495', '#F5F2F9']}
        locations={[0.1, 0.6, 1]}
        style={lt.container}
      >
        <View style={[lt.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={lt.backRow} onPress={() => navigation.goBack()}>
            <Image source={ProfileBackIcon} style={lt.backIcon} resizeMode="contain" />
            <Text style={lt.backText}>Back</Text>
          </Pressable>
          <ActivityIndicator color={colors.white} size="large" style={{ flex: 1, justifyContent: 'center' }} />
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
      colors={['#59168B', '#653495', '#F5F2F9']}
      locations={[0.1, 0.6, 1]}
      style={lt.container}
    >
      <View style={[lt.content, { paddingTop: insets.top + 16 }]}>
        <Pressable style={lt.backRow} onPress={() => navigation.goBack()}>
          <Image source={ProfileBackIcon} style={lt.backIcon} resizeMode="contain" />
          <Text style={lt.backText}>Back</Text>
        </Pressable>

        <View style={lt.contentCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={lt.scrollContent}
          >
            {isSafetyRedirect ? (
              <Text style={lt.safetyText}>{soulsight.content}</Text>
            ) : sections.length > 0 ? (
              <>
                {titleSection && (
                  <Text style={lt.reportTitle}>{titleSection.body}</Text>
                )}
                <Text style={lt.dateSubtitle}>
                  {formatDateRange(soulsight.window_start, soulsight.window_end)}
                </Text>
                <View style={lt.statRow}>
                  <View style={lt.statPill}>
                    <Text style={lt.statPillText}>{soulsight.entry_count} entries</Text>
                  </View>
                  <View style={lt.statPill}>
                    <Text style={lt.statPillText}>{soulsight.active_days} active days</Text>
                  </View>
                </View>
                <View style={lt.divider} />
                {bodySections.map((section, idx) => (
                  <View key={idx} style={lt.sectionBlock}>
                    <Text style={lt.sectionHeading}>{section.heading}</Text>
                    <Text style={lt.sectionBody}>{section.body}</Text>
                  </View>
                ))}
                {stats && <StatsSectionLight stats={stats} />}
              </>
            ) : (
              <>
                <Text style={lt.dateSubtitle}>
                  {formatDateRange(soulsight.window_start, soulsight.window_end)}
                </Text>
                <View style={lt.divider} />
                <Text style={lt.sectionBody}>{soulsight.content}</Text>
              </>
            )}
          </ScrollView>
        </View>

        <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }} />
      </View>
    </LinearGradient>
  );
};

// ==============================
// Dark mode stats section
// ==============================
const StatsSectionDark = ({ stats }: { stats: AggregateStats }) => {
  const topEmotions = getTopEntries(stats.emotion_distribution);
  const topTopics = getTopEntries(stats.topic_frequency);
  const topCoping = getTopEntries(stats.coping_frequency);
  const maxEmotion = topEmotions.length > 0 ? topEmotions[0][1] : 1;

  if (topEmotions.length === 0 && topTopics.length === 0 && topCoping.length === 0) {
    return null;
  }

  return (
    <>
      <View style={dk.divider} />
      <Text style={dk.statsTitle}>Your Stats</Text>

      {topEmotions.length > 0 && (
        <View style={dk.statsGroup}>
          <Text style={dk.statsLabel}>Top Emotions</Text>
          {topEmotions.map(([emotion, count]) => (
            <View key={emotion} style={dk.barRow}>
              <Text style={dk.barLabel}>{emotion}</Text>
              <View style={dk.barTrack}>
                <View
                  style={[
                    dk.barFill,
                    { width: `${Math.max((count / maxEmotion) * 100, 8)}%` },
                  ]}
                />
              </View>
              <Text style={dk.barCount}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {topTopics.length > 0 && (
        <View style={dk.statsGroup}>
          <Text style={dk.statsLabel}>Topics</Text>
          <View style={dk.pillRow}>
            {topTopics.map(([topic]) => (
              <View key={topic} style={dk.topicPill}>
                <Text style={dk.topicPillText}>{topic.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {topCoping.length > 0 && (
        <View style={dk.statsGroup}>
          <Text style={dk.statsLabel}>Coping</Text>
          <View style={dk.pillRow}>
            {topCoping.map(([mech]) => (
              <View key={mech} style={dk.copingPill}>
                <Text style={dk.copingPillText}>{mech.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {stats.avg_emotion_intensity != null && (
        <View style={dk.statsGroup}>
          <Text style={dk.statsLabel}>
            Avg. Emotion Intensity: {stats.avg_emotion_intensity}/5
          </Text>
        </View>
      )}
    </>
  );
};

// ==============================
// Light mode stats section
// ==============================
const StatsSectionLight = ({ stats }: { stats: AggregateStats }) => {
  const topEmotions = getTopEntries(stats.emotion_distribution);
  const topTopics = getTopEntries(stats.topic_frequency);
  const topCoping = getTopEntries(stats.coping_frequency);
  const maxEmotion = topEmotions.length > 0 ? topEmotions[0][1] : 1;

  if (topEmotions.length === 0 && topTopics.length === 0 && topCoping.length === 0) {
    return null;
  }

  return (
    <>
      <View style={lt.divider} />
      <Text style={lt.statsTitle}>Your Stats</Text>

      {topEmotions.length > 0 && (
        <View style={lt.statsGroup}>
          <Text style={lt.statsLabel}>Top Emotions</Text>
          {topEmotions.map(([emotion, count]) => (
            <View key={emotion} style={lt.barRow}>
              <Text style={lt.barLabel}>{emotion}</Text>
              <View style={lt.barTrack}>
                <View
                  style={[
                    lt.barFill,
                    { width: `${Math.max((count / maxEmotion) * 100, 8)}%` },
                  ]}
                />
              </View>
              <Text style={lt.barCount}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {topTopics.length > 0 && (
        <View style={lt.statsGroup}>
          <Text style={lt.statsLabel}>Topics</Text>
          <View style={lt.pillRow}>
            {topTopics.map(([topic]) => (
              <View key={topic} style={lt.topicPill}>
                <Text style={lt.topicPillText}>{topic.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {topCoping.length > 0 && (
        <View style={lt.statsGroup}>
          <Text style={lt.statsLabel}>Coping</Text>
          <View style={lt.pillRow}>
            {topCoping.map(([mech]) => (
              <View key={mech} style={lt.copingPill}>
                <Text style={lt.copingPillText}>{mech.replace(/_/g, ' ')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {stats.avg_emotion_intensity != null && (
        <View style={lt.statsGroup}>
          <Text style={lt.statsLabel}>
            Avg. Emotion Intensity: {stats.avg_emotion_intensity}/5
          </Text>
        </View>
      )}
    </>
  );
};

// ==============================
// DARK MODE STYLES
// ==============================
const dk = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 22 },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backIcon: { width: 36, height: 36 },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: colors.white,
  },

  contentCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  reportTitle: {
    fontFamily: fonts.edensor.bold,
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  dateSubtitle: {
    fontFamily: fonts.outfit.light,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 12,
  },

  statRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statPillText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: '#FFFFFF',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 16,
  },

  sectionBlock: { marginBottom: 16 },
  sectionHeading: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  sectionBody: {
    fontFamily: fonts.outfit.light,
    fontSize: 14,
    lineHeight: 14 * 1.6,
    color: 'rgba(255,255,255,0.85)',
  },

  safetyText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 15 * 1.6,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    paddingVertical: 20,
  },

  statsTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statsGroup: { marginBottom: 16 },
  statsLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },

  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    width: 80,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: 'rgba(42,85,112,0.8)',
    borderRadius: 5,
  },
  barCount: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    width: 24,
    textAlign: 'right',
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  topicPillText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: '#FFFFFF',
  },
  copingPill: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  copingPillText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: '#FFFFFF',
  },
});

// ==============================
// LIGHT MODE STYLES
// ==============================
const lt = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 22 },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backIcon: { width: 36, height: 36 },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: colors.white,
  },

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

  reportTitle: {
    fontFamily: fonts.edensor.bold,
    fontSize: 22,
    color: '#59168B',
    textAlign: 'center',
    marginBottom: 8,
  },
  dateSubtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: 'rgba(89, 22, 139, 0.7)',
    textAlign: 'center',
    marginBottom: 12,
  },

  statRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statPill: {
    backgroundColor: 'rgba(89, 22, 139, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statPillText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: '#59168B',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(89, 22, 139, 0.12)',
    marginVertical: 16,
  },

  sectionBlock: { marginBottom: 16 },
  sectionHeading: {
    fontFamily: fonts.edensor.bold,
    fontSize: 15,
    color: '#59168B',
    marginBottom: 6,
  },
  sectionBody: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 13 * 1.6,
    color: '#59168B',
  },

  safetyText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.6,
    color: '#59168B',
    textAlign: 'center',
    paddingVertical: 20,
  },

  statsTitle: {
    fontFamily: fonts.edensor.bold,
    fontSize: 15,
    color: '#59168B',
    marginBottom: 16,
  },
  statsGroup: { marginBottom: 16 },
  statsLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 13,
    color: '#59168B',
    marginBottom: 8,
  },

  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: 'rgba(89, 22, 139, 0.7)',
    width: 80,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(89, 22, 139, 0.08)',
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
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: 'rgba(89, 22, 139, 0.7)',
    width: 24,
    textAlign: 'right',
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicPill: {
    backgroundColor: 'rgba(89, 22, 139, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  topicPillText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: '#59168B',
  },
  copingPill: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  copingPillText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: '#2E7D32',
  },
});

export default SoulSightDetailScreen;
