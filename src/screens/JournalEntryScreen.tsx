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

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');

const JournalEntryScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { deleteEntry, entries } = useJournal();
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
            <Image source={BackIcon} style={styles.backIcon} resizeMode="contain" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <SoulTalkLoader />
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

                  {/* Coping Mechanisms */}
                  {entry.coping_mechanisms && entry.coping_mechanisms.length > 0 && (
                    <View>
                      <Text style={styles.copingLabel}>Coping</Text>
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

});

export default JournalEntryScreen;
