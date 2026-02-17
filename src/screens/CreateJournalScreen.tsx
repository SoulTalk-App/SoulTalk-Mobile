import React, { useState } from 'react';
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
import { Mood } from '../services/JournalService';

const SwirlIcon = require('../../assets/images/journal/SwirlIcon.png');
const MicIcon = require('../../assets/images/journal/MicIcon.png');

const MOODS: { label: Mood; color: string }[] = [
  { label: 'Happy', color: '#EFDE11' },
  { label: 'Normal', color: '#59168B' },
  { label: 'Sad', color: '#0F3BF2' },
  { label: 'Mad', color: '#F20F0F' },
];

const CreateJournalScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { createEntry, updateEntry } = useJournal();

  // Edit mode: entry passed via params
  const editEntry = route.params?.entry;
  const isEdit = !!editEntry;

  const [text, setText] = useState(isEdit ? editEntry.raw_text : '');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(
    isEdit ? editEntry.mood : route.params?.mood || null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    try {
      if (isEdit) {
        await updateEntry(editEntry.id, {
          raw_text: text.trim(),
          mood: selectedMood || undefined,
        });
      } else {
        await createEntry(text.trim(), selectedMood || undefined);
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save entry');
    } finally {
      setIsSaving(false);
    }
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

          {/* Mood Selector */}
          <View style={styles.moodRow}>
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
          </View>

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
            <Pressable style={styles.micButton}>
              <Image source={MicIcon} style={styles.micIcon} resizeMode="contain" />
            </Pressable>
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
    marginBottom: 16,
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

  // Mood Selector
  moodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  moodPill: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  moodPillText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
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
  micButton: {
    width: 56,
    height: 56,
    backgroundColor: colors.white,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIcon: {
    width: 28,
    height: 28,
    tintColor: '#59168B',
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
