import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { useJournal } from '../contexts/JournalContext';
import { Mood } from '../services/JournalService';
import { useAutoSave } from '../hooks/useAutoSave';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import SaveAnimation from '../components/SaveAnimation';
import InspirationDropdown from '../components/InspirationDropdown';
import VoiceRecordingIndicator from '../components/VoiceRecordingIndicator';

const SwirlIcon = require('../../assets/images/journal/SwirlIcon.png');
const JournalSoulPal = require('../../assets/images/journal/JournalSoulPalChar.png');

const MOODS: { label: Mood; color: string }[] = [
  { label: 'Happy', color: '#EFDE11' },
  { label: 'Normal', color: '#59168B' },
  { label: 'Sad', color: '#0F3BF2' },
  { label: 'Mad', color: '#F20F0F' },
  { label: 'Chill', color: '#5ECEFF' },
  { label: 'Vibing', color: '#D35CFF' },
  { label: 'Lost', color: '#8B7399' },
  { label: 'Tired', color: '#70CACF' },
  { label: 'Sexy', color: '#FF559E' },
  { label: 'Fire', color: '#FF9E55' },
];

const SOULPAL_REACTIONS: Record<Mood, string> = {
  Happy: 'is beaming!',
  Normal: 'is chillin with you.',
  Sad: 'is here for you.',
  Mad: 'feels the fire too.',
  Chill: 'is vibing along.',
  Vibing: 'is grooving!',
  Lost: 'is searching with you.',
  Tired: 'says rest is okay.',
  Sexy: 'is feeling confident!',
  Fire: 'is lit right now!',
};

const CreateJournalScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { createEntry, updateEntry, finalizeDraft } = useJournal();

  // Edit mode: entry passed via params
  const editEntry = route.params?.entry;
  const isEdit = !!editEntry;

  const [text, setText] = useState(isEdit ? editEntry.raw_text : '');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(
    isEdit ? editEntry.mood : route.params?.mood || null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(
    isEdit && editEntry.is_draft ? editEntry.id : null,
  );
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);

  // Auto-save hook (only for new entries, not edits of existing non-drafts)
  useAutoSave({
    text,
    mood: selectedMood,
    draftId,
    setDraftId,
    enabled: !isEdit || (isEdit && editEntry.is_draft),
  });

  // Voice recording
  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecording();

  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      try {
        const transcribedText = await stopRecording();
        setText((prev: string) => {
          const separator = prev.trim() ? ' ' : '';
          return prev + separator + transcribedText;
        });
      } catch (error: any) {
        Alert.alert('Transcription Error', error.message || 'Failed to transcribe audio');
      }
    } else {
      try {
        await startRecording();
      } catch (error: any) {
        Alert.alert('Recording Error', error.message || 'Failed to start recording');
      }
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    try {
      if (draftId) {
        // Finalize draft
        await finalizeDraft(draftId, text.trim(), selectedMood || undefined);
      } else if (isEdit) {
        await updateEntry(editEntry.id, {
          raw_text: text.trim(),
          mood: selectedMood || undefined,
        });
      } else {
        await createEntry(text.trim(), selectedMood || undefined);
      }
      // Show save animation then navigate back
      setShowSaveAnimation(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save entry');
      setIsSaving(false);
    }
  };

  const handleSaveAnimationComplete = () => {
    setShowSaveAnimation(false);
    navigation.goBack();
  };

  const handleSelectPrompt = (prompt: string) => {
    setText((prev: string) => {
      if (!prev.trim()) return prompt;
      return prev + '\n\n' + prompt;
    });
  };

  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#59168B']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
          {/* Back Button */}
          <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
            <View style={styles.swirlCircle}>
              <Image source={SwirlIcon} style={styles.swirlIcon} resizeMode="contain" />
            </View>
            <Text style={styles.backText}>{isEdit ? 'Edit Entry' : 'New Entry'}</Text>
          </Pressable>

          {/* SoulPal Reaction */}
          {selectedMood && (
            <View style={styles.soulPalRow}>
              <Image source={JournalSoulPal} style={styles.soulPalMini} resizeMode="contain" />
              <View style={styles.reactionBubble}>
                <Text style={styles.reactionText}>
                  SoulPal {SOULPAL_REACTIONS[selectedMood]}
                </Text>
              </View>
            </View>
          )}

          {/* Mood Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.moodScroll}
            contentContainerStyle={styles.moodRow}
          >
            {MOODS.map((m) => (
              <Pressable
                key={m.label}
                style={[
                  styles.moodPill,
                  selectedMood === m.label && { backgroundColor: m.color },
                ]}
                onPress={() => setSelectedMood(selectedMood === m.label ? null : m.label)}
              >
                <Text
                  style={[
                    styles.moodPillText,
                    selectedMood === m.label && styles.moodPillTextActive,
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Inspiration Dropdown */}
          <InspirationDropdown onSelectPrompt={handleSelectPrompt} />

          {/* White Content Card with TextInput */}
          <View style={styles.contentCard}>
            <TextInput
              style={styles.textInput}
              placeholder="Write your thoughts here..."
              placeholderTextColor="rgba(51, 51, 51, 0.4)"
              multiline
              textAlignVertical="top"
              value={text}
              onChangeText={setText}
              autoFocus={!isEdit}
            />
          </View>

          {/* Bottom Row: Mic + Save */}
          <View style={[styles.bottomRow, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
            <VoiceRecordingIndicator
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              onPress={handleMicPress}
            />
            <Pressable
              style={[styles.saveButton, !text.trim() && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!text.trim() || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.saveText}>{isEdit ? 'Update' : 'Save'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Save Animation Overlay */}
      <SaveAnimation visible={showSaveAnimation} onComplete={handleSaveAnimationComplete} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
  },

  // Back
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
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

  // SoulPal Reaction
  soulPalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  soulPalMini: {
    width: 36,
    height: 50,
  },
  reactionBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reactionText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: colors.white,
  },

  // Mood Selector
  moodScroll: {
    flexShrink: 0,
    flexGrow: 0,
    marginBottom: 10,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  moodPill: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  moodPillText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: '#59168B',
  },
  moodPillTextActive: {
    color: colors.white,
  },

  // Content Card
  contentCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
  },
  textInput: {
    flex: 1,
    fontFamily: fonts.outfit.light,
    fontSize: 14,
    lineHeight: 14 * 1.6,
    color: '#333333',
  },

  // Bottom Row
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    gap: 16,
  },
  saveButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#59168B',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 18,
    color: colors.white,
  },
});

export default CreateJournalScreen;
