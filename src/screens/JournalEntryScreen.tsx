import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import SoulTalkLoader from '../components/SoulTalkLoader';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { useJournal } from '../contexts/JournalContext';
import JournalService, { JournalEntry } from '../services/JournalService';

const SwirlIcon = require('../../assets/images/journal/SwirlIcon.png');
const ExpandIcon = require('../../assets/images/journal/ExpandIcon.png');
const MoodEyesIcon = require('../../assets/images/journal/MoodEyesIcon.png');
const MicIcon = require('../../assets/images/journal/MicIcon.png');

const SOUL_BAR_SEGMENTS = 6;

const JournalEntryScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { deleteEntry, entries, soulBar } = useJournal();
  const entryId: string = route.params?.entryId;

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Find entry from context state
  useEffect(() => {
    const found = entries.find((e) => e.id === entryId);
    if (found) setEntry(found);
  }, [entryId, entries]);

  // Polling fallback: if AI hasn't arrived via WS, poll every 5s until processed
  useEffect(() => {
    if (!entry || entry.is_ai_processed) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await JournalService.getEntry(entryId);
        if (fresh.is_ai_processed) {
          setEntry(fresh);
          clearInterval(interval);
        }
      } catch {
        // ignore — will retry on next interval
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [entry?.is_ai_processed, entryId]);

  const handleEdit = () => {
    if (!entry) return;
    navigation.navigate('CreateJournal', { entry });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this journal entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteEntry(entryId);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete entry');
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (!entry) {
    return (
      <LinearGradient
        colors={['#59168B', '#653495', '#59168B']}
        locations={[0, 0.5, 1]}
        style={styles.container}
      >
        <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
            <View style={styles.swirlCircle}>
              <Image source={SwirlIcon} style={styles.swirlIcon} resizeMode="contain" />
            </View>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <SoulTalkLoader />
        </View>
      </LinearGradient>
    );
  }

  const soulBarPoints = soulBar?.points ?? 0;

  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#59168B']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Back Button */}
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
          <View style={styles.swirlCircle}>
            <Image source={SwirlIcon} style={styles.swirlIcon} resizeMode="contain" />
          </View>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* Title Row */}
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>
            {entry.mood ? `Feeling ${entry.mood}` : 'Journal Entry'}
          </Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.actionBtn} onPress={handleEdit}>
              <Text style={styles.actionBtnText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={[styles.actionBtnText, { color: '#FF6B6B' }]}>Delete</Text>
              )}
            </Pressable>
            <Pressable style={styles.expandBtn}>
              <Image source={ExpandIcon} style={styles.expandIcon} resizeMode="contain" />
            </Pressable>
          </View>
        </View>

        {/* SoulPal Meter Row — Dynamic */}
        <View style={styles.meterRow}>
          <View style={styles.meterSwirlCircle}>
            <Image source={SwirlIcon} style={styles.meterSwirlIcon} resizeMode="contain" />
          </View>
          <View style={styles.meterBar}>
            <Text style={styles.meterLabel}>SoulPal Meter</Text>
            <View style={styles.meterSegments}>
              {Array.from({ length: SOUL_BAR_SEGMENTS }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.meterSegment,
                    { backgroundColor: i < soulBarPoints ? '#59168B' : 'rgba(89, 22, 139, 0.15)' },
                  ]}
                />
              ))}
            </View>
          </View>
          <View style={styles.moodEyesCircle}>
            <Image source={MoodEyesIcon} style={styles.moodEyesIcon} resizeMode="contain" />
          </View>
        </View>

        {/* White Content Card */}
        <View style={styles.contentCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.journalText}>{entry.raw_text}</Text>

            {/* AI Response Section */}
            <View style={styles.aiSection}>
              <View style={styles.aiDivider} />
              {entry.is_ai_processed ? (
                <>
                  <Text style={styles.aiLabel}>SoulPal's Reflection</Text>
                  <Text style={styles.aiResponseText}>{entry.ai_response}</Text>

                  {/* Topics */}
                  {entry.topics && entry.topics.length > 0 && (
                    <View style={styles.pillRow}>
                      {entry.topics.map((topic, idx) => (
                        <View key={idx} style={styles.topicPill}>
                          <Text style={styles.topicPillText}>{topic}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Emotion with Intensity Bar */}
                  {entry.emotion_primary && (
                    <View style={styles.aiFieldRow}>
                      <Text style={styles.aiFieldLabel}>Emotion</Text>
                      <View style={styles.emotionRow}>
                        <Text style={styles.aiFieldValue}>{entry.emotion_primary}</Text>
                        {entry.emotion_intensity != null && (
                          <View style={styles.intensityBar}>
                            <View
                              style={[
                                styles.intensityFill,
                                { width: `${(entry.emotion_intensity / 10) * 100}%` },
                              ]}
                            />
                          </View>
                        )}
                        {entry.emotion_intensity != null && (
                          <Text style={styles.intensityLabel}>{entry.emotion_intensity}/10</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Nervous System */}
                  {entry.nervous_system_state && (
                    <View style={styles.aiFieldRow}>
                      <Text style={styles.aiFieldLabel}>Nervous System</Text>
                      <Text style={styles.aiFieldValue}>{entry.nervous_system_state}</Text>
                    </View>
                  )}

                  {/* Self-Talk / Time Focus */}
                  {(entry.self_talk_style || entry.time_focus) && (
                    <View style={styles.aiFieldRow}>
                      <Text style={styles.aiFieldLabel}>Self-Talk / Focus</Text>
                      <Text style={styles.aiFieldValue}>
                        {[entry.self_talk_style, entry.time_focus].filter(Boolean).join(' | ')}
                      </Text>
                    </View>
                  )}

                  {/* Coping Mechanisms */}
                  {entry.coping_mechanisms && entry.coping_mechanisms.length > 0 && (
                    <View style={styles.aiFieldRow}>
                      <Text style={styles.aiFieldLabel}>Coping</Text>
                      <View style={styles.pillRow}>
                        {entry.coping_mechanisms.map((mech, idx) => (
                          <View key={idx} style={styles.copingPill}>
                            <Text style={styles.copingPillText}>{mech}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.aiLoadingRow}>
                  <ActivityIndicator color="#59168B" size="small" />
                  <Text style={styles.aiLoadingText}>SoulPal is reflecting...</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Mic Button */}
        <View style={[styles.micContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
          <Pressable style={styles.micButton}>
            <Image source={MicIcon} style={styles.micIcon} resizeMode="contain" />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Back Button
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  swirlCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swirlIcon: {
    width: 24,
    height: 22,
    tintColor: colors.white,
  },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: colors.white,
  },

  // Title Row
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 24,
    color: colors.white,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
  },
  actionBtnText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors.white,
  },
  expandBtn: {
    padding: 4,
  },
  expandIcon: {
    width: 28,
    height: 20,
    tintColor: colors.white,
  },

  // SoulPal Meter — Dynamic segments
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  meterSwirlCircle: {
    width: 42,
    height: 37,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  meterSwirlIcon: {
    width: 22,
    height: 20,
    tintColor: colors.white,
  },
  meterBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  meterLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: '#59168B',
  },
  meterSegments: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    height: 16,
    alignItems: 'center',
  },
  meterSegment: {
    flex: 1,
    height: 12,
    borderRadius: 3,
  },
  moodEyesCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#59168B',
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodEyesIcon: {
    width: 18,
    height: 18,
    tintColor: colors.white,
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
  },
  journalText: {
    fontFamily: fonts.outfit.thin,
    fontSize: 14,
    lineHeight: 14 * 1.6,
    color: '#333333',
  },

  // AI Section
  aiSection: {
    marginTop: 16,
  },
  aiDivider: {
    height: 1,
    backgroundColor: '#E0D4E8',
    marginBottom: 14,
  },
  aiLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: '#59168B',
    marginBottom: 8,
  },
  aiResponseText: {
    fontFamily: fonts.outfit.light,
    fontSize: 14,
    lineHeight: 14 * 1.6,
    color: '#333333',
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
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

  // AI Analysis Fields
  aiFieldRow: {
    marginBottom: 10,
  },
  aiFieldLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: '#59168B',
    marginBottom: 4,
  },
  aiFieldValue: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: '#333333',
  },
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intensityBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(89, 22, 139, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  intensityFill: {
    height: '100%',
    backgroundColor: '#59168B',
    borderRadius: 4,
  },
  intensityLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
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

  aiLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiLoadingText: {
    fontFamily: fonts.outfit.light,
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },

  // Mic Button
  micContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  micButton: {
    width: 103,
    height: 61,
    backgroundColor: colors.white,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIcon: {
    width: 32,
    height: 32,
    tintColor: '#59168B',
  },
});

export default JournalEntryScreen;
