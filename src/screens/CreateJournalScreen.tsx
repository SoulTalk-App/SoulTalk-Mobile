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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { useJournal } from '../contexts/JournalContext';
import { useAutoSave } from '../hooks/useAutoSave';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import SaveAnimation from '../components/SaveAnimation';
import InspirationDropdown from '../components/InspirationDropdown';
import VoiceRecordingIndicator from '../components/VoiceRecordingIndicator';

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');


const CreateJournalScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { createEntry, updateEntry, finalizeDraft } = useJournal();

  // Edit mode: entry passed via params
  const editEntry = route.params?.entry;
  const isEdit = !!editEntry;

  const [text, setText] = useState(isEdit ? editEntry.raw_text : '');
  const [isSaving, setIsSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(
    isEdit && editEntry.is_draft ? editEntry.id : null,
  );
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);

  // Auto-save hook (only for new entries, not edits of existing non-drafts)
  useAutoSave({
    text,
    mood: undefined,
    draftId,
    setDraftId,
    enabled: !isEdit || (isEdit && editEntry.is_draft),
  });

  // Voice recording
  const {
    isRecording,
    isTranscribing,
    volume,
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
        await finalizeDraft(draftId, text.trim());
      } else if (isEdit) {
        await updateEntry(editEntry.id, {
          raw_text: text.trim(),
        });
      } else {
        await createEntry(text.trim());
      }
      // Show save animation then navigate back
      setShowSaveAnimation(true);
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      if (status === 409) {
        Alert.alert('Daily Limit', detail || "You've already journaled today. Come back tomorrow!");
      } else {
        Alert.alert('Error', detail || error.message || 'Failed to save entry');
      }
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
            <Image source={BackIcon} style={styles.backIcon} resizeMode="contain" />
            <Text style={styles.backText}>{isEdit ? 'Edit Entry' : 'New Entry'}</Text>
          </Pressable>

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
              volume={volume}
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
