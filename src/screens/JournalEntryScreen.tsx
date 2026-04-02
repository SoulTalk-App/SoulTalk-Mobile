import React, { useEffect, useState } from 'react';
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
import { colors, fonts } from '../theme';
import { useJournal } from '../contexts/JournalContext';
import JournalService, { JournalEntry } from '../services/JournalService';

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');

const JournalEntryScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { entries } = useJournal();
  const entryId: string = route.params?.entryId;

  const [entry, setEntry] = useState<JournalEntry | null>(null);

  // Always fetch the full entry from the detail endpoint (list endpoint omits tags/ai_response)
  useEffect(() => {
    JournalService.getEntry(entryId).then(setEntry).catch(() => {
      const found = entries.find((e) => e.id === entryId);
      if (found) setEntry(found);
    });
  }, [entryId]);

  // Update from context when WS pushes changes
  useEffect(() => {
    const found = entries.find((e) => e.id === entryId);
    if (found && found.ai_processing_status === 'complete' && !entry?.ai_response) {
      // WS updated status but we need the full detail
      JournalService.getEntry(entryId).then(setEntry).catch(() => {});
    } else if (found) {
      setEntry(found);
    }
  }, [entries]);

  // Polling fallback: if AI hasn't completed via WS, poll every 5s
  useEffect(() => {
    if (!entry || entry.ai_processing_status === 'complete' || entry.ai_processing_status === 'failed' || entry.is_draft) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await JournalService.getEntry(entryId);
        if (fresh.ai_processing_status === 'complete' || fresh.ai_processing_status === 'failed') {
          setEntry(fresh);
          clearInterval(interval);
        }
      } catch {
        // ignore — will retry on next interval
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [entry?.ai_processing_status, entryId]);

  const editCount = entry?.edit_count ?? 0;
  const canEdit = editCount < 3;

  const handleEdit = () => {
    if (!entry || !canEdit) return;
    navigation.navigate('CreateJournal', { entry });
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
            <Image source={BackIcon} style={styles.backIcon} resizeMode="contain" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <ActivityIndicator color="#FFFFFF" size="large" style={{ flex: 1, justifyContent: 'center' }} />
        </View>
      </LinearGradient>
    );
  }

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

        {/* Title Row */}
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>Journal Entry</Text>
          <Pressable
            style={[styles.actionBtn, !canEdit && styles.actionBtnDisabled]}
            onPress={handleEdit}
            disabled={!canEdit}
          >
            <Text style={[styles.actionBtnText, !canEdit && { opacity: 0.5 }]}>
              Edit {editCount}/3
            </Text>
          </Pressable>
        </View>

        {/* White Content Card */}
        <View style={styles.contentCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* AI Response Section — above the fold */}
            <View style={styles.aiSection}>
              {entry.ai_processing_status === 'complete' ? (
                <>
                  <Text style={styles.aiLabel}>SoulTalk Reflection</Text>
                  <Text style={styles.aiResponseText}>{entry.ai_response?.text?.replace(/\*+/g, '')}</Text>

                  {/* Topics */}
                  {entry.tags?.topics && entry.tags.topics.length > 0 && (
                    <View style={styles.pillRow}>
                      {entry.tags.topics.map((topic, idx) => (
                        <View key={idx} style={styles.topicPill}>
                          <Text style={styles.topicPillText}>{topic}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Coping Mechanisms */}
                  {entry.tags?.coping_mechanisms && entry.tags.coping_mechanisms.length > 0 && (
                    <View>
                      <Text style={styles.copingLabel}>Coping</Text>
                      <View style={styles.pillRow}>
                        {entry.tags.coping_mechanisms.map((mech, idx) => (
                          <View key={idx} style={styles.copingPill}>
                            <Text style={styles.copingPillText}>{mech}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              ) : entry.ai_processing_status === 'failed' ? (
                <Text style={styles.aiLoadingText}>AI processing failed. Tap to retry.</Text>
              ) : (
                <View style={styles.aiLoadingRow}>
                  <ActivityIndicator color="#59168B" size="small" />
                  <Text style={styles.aiLoadingText}>Preparing your reflection...</Text>
                </View>
              )}
            </View>

            {/* Journal text — below the analysis */}
            <View style={styles.aiDivider} />
            <Text style={styles.journalLabel}>Your Entry</Text>
            <Text style={styles.journalText}>{entry.raw_text}</Text>
          </ScrollView>
        </View>

        <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }} />
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
  backIcon: {
    width: 36,
    height: 36,
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
  actionBtnDisabled: {
    opacity: 0.5,
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
    marginBottom: 16,
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

  // Coping
  copingLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: '#59168B',
    marginBottom: 4,
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
  journalLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: '#59168B',
    marginTop: 14,
    marginBottom: 8,
  },

});

export default JournalEntryScreen;
