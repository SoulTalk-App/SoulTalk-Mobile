import React, { useState, useCallback, useMemo } from 'react';
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
import { fonts, surfaces, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useJournal } from '../contexts/JournalContext';
import { useAutoSave } from '../hooks/useAutoSave';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import SaveAnimation from '../components/SaveAnimation';
import InspirationDropdown from '../components/InspirationDropdown';
import VoiceRecordingIndicator from '../components/VoiceRecordingIndicator';
import SoulPalAnimated from '../components/SoulPalAnimated';

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');

// Star field (dark mode only)
const CREATE_STARS = Array.from({ length: 30 }, (_, i) => ({
  left: ((i * 43 + 17) % 100),
  top: ((i * 61 + 9) % 100),
  size: i < 2 ? 2.5 : (i % 4 === 0) ? 1.8 : 1,
  opacity: i < 2 ? 0.45 : (0.08 + (i % 5) * 0.07),
}));


const CreateJournalScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const { createEntry, updateEntry, finalizeDraft } = useJournal();

  const dkS = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        flex: { flex: 1 },
        content: { flex: 1, paddingHorizontal: 22 },
        planet: { position: 'absolute', width: 110, height: 110, borderRadius: 999, overflow: 'hidden', bottom: 120, left: -30, borderWidth: 1, borderColor: 'rgba(34, 34, 64, 0.15)' },
        planetFill: { ...StyleSheet.absoluteFillObject, borderRadius: 999 },
        planetHighlight: { position: 'absolute', top: '18%', left: '22%', width: 10, height: 10, borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
        headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
        backIcon: { width: 32, height: 32 },
        headerTitle: { flex: 1, fontFamily: fonts.edensor.bold, fontSize: 24, color: colors.text.primary },
        soulPal: { marginRight: 4 },
        contentCard: { flex: 1, borderRadius: 14, padding: 18, backgroundColor: 'rgba(255, 255, 255, 0.07)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.10)' },
        textInput: { flex: 1, fontFamily: fonts.outfit.light, fontSize: 16, lineHeight: 16 * 1.6, color: colors.text.primary },
        bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 16, gap: 16 },
        saveButton: { flex: 1, height: 52, backgroundColor: colors.primary, borderRadius: 26, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
        saveButtonDisabled: { opacity: 0.3 },
        saveText: { fontFamily: fonts.outfit.semiBold, fontSize: 17, color: colors.background },
      }),
    [colors]
  );

  const ltS = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        flex: { flex: 1 },
        content: { flex: 1, paddingHorizontal: 22 },
        backRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
        backIcon: { width: 36, height: 36 },
        backText: { fontFamily: fonts.outfit.semiBold, fontSize: 24, color: colors.white },
        contentCard: { flex: 1, backgroundColor: colors.white, borderRadius: 10, padding: 20 },
        textInput: { flex: 1, fontFamily: fonts.outfit.light, fontSize: 16, lineHeight: 16 * 1.6, color: '#333333' },
        bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 16, gap: 16 },
        saveButton: { flex: 1, height: 56, backgroundColor: '#59168B', borderRadius: 28, borderWidth: 2, borderColor: colors.white, justifyContent: 'center', alignItems: 'center' },
        saveButtonDisabled: { opacity: 0.5 },
        saveText: { fontFamily: fonts.outfit.semiBold, fontSize: 18, color: colors.white },
      }),
    [colors]
  );

  // Edit mode: entry passed via params
  const editEntry = route.params?.entry;
  const isEdit = !!editEntry;

  const [text, setText] = useState(isEdit ? editEntry.raw_text : '');
  const [liveTranscript, setLiveTranscript] = useState<string | null>(null);
  const textBeforeRecordingRef = React.useRef('');
  const [isSaving, setIsSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(
    isEdit && editEntry.is_draft ? editEntry.id : null,
  );
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);
  const savedEntryIdRef = React.useRef<string | null>(null);

  // Auto-save hook (only for new entries, not edits of existing non-drafts)
  useAutoSave({
    text,
    mood: undefined,
    draftId,
    setDraftId,
    enabled: !isEdit || (isEdit && editEntry.is_draft),
  });

  // Voice recording with live transcription
  const {
    isRecording,
    isTranscribing,
    volume,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecording({
    onInterimResult: (interimText) => {
      setLiveTranscript(interimText);
    },
  });

  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      try {
        const transcribedText = await stopRecording();
        const base = textBeforeRecordingRef.current;
        const separator = base.trim() ? ' ' : '';
        setText(base + separator + transcribedText);
        setLiveTranscript(null);
      } catch (error: any) {
        setLiveTranscript(null);
        Alert.alert('Transcription Error', error.message || 'Failed to transcribe audio');
      }
    } else {
      try {
        textBeforeRecordingRef.current = text;
        await startRecording();
      } catch (error: any) {
        Alert.alert('Recording Error', error.message || 'Failed to start recording');
      }
    }
  }, [isRecording, startRecording, stopRecording, text]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    try {
      let entryId: string | null = null;
      if (draftId) {
        const result = await finalizeDraft(draftId, text.trim());
        entryId = result?.id || draftId;
      } else if (isEdit) {
        await updateEntry(editEntry.id, {
          raw_text: text.trim(),
        });
        entryId = editEntry.id;
      } else {
        const result = await createEntry(text.trim());
        entryId = result?.id || null;
      }
      savedEntryIdRef.current = entryId;
      setShowSaveAnimation(true);
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      if (status === 409) {
        Alert.alert('Daily Limit', detail || "Self-awareness is built through continuous practice. One journal a day, keeps awareness at bay! Come back tomorrow to continue your journey.");
      } else {
        Alert.alert('Error', detail || error.message || 'Failed to save entry');
      }
      setIsSaving(false);
    }
  };

  const handleSaveAnimationComplete = () => {
    setShowSaveAnimation(false);
    if (savedEntryIdRef.current && !isEdit) {
      navigation.replace('JournalEntry', { entryId: savedEntryIdRef.current });
    } else {
      navigation.goBack();
    }
  };

  const displayValue = isRecording && liveTranscript
    ? (textBeforeRecordingRef.current.trim() ? textBeforeRecordingRef.current + ' ' : '') + liveTranscript
    : text;

  // ════════════════════════════════════════
  // DARK MODE
  // ════════════════════════════════════════
  if (isDarkMode) {
    return (
      <LinearGradient
        colors={[...surfaces.createGradient]}
        locations={[0, 0.3, 0.65, 1]}
        style={dkS.container}
      >
        {/* Star field + planet backdrop */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {CREATE_STARS.map((s, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: `${s.left}%` as any,
                top: `${s.top}%` as any,
                width: s.size,
                height: s.size,
                borderRadius: s.size,
                backgroundColor: '#FFFFFF',
                opacity: s.opacity,
              }}
            />
          ))}
          <View style={dkS.planet}>
            <LinearGradient
              colors={['rgba(34, 34, 64, 0.35)', 'rgba(34, 34, 64, 0.08)', 'rgba(0, 0, 0, 0.2)']}
              start={{ x: 0.2, y: 0.15 }}
              end={{ x: 0.9, y: 0.85 }}
              style={dkS.planetFill}
            />
            <View style={dkS.planetHighlight} />
          </View>
        </View>

        <KeyboardAvoidingView style={dkS.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[dkS.content, { paddingTop: insets.top + 16 }]}>
            <View style={dkS.headerRow}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
                <Image source={BackIcon} style={dkS.backIcon} resizeMode="contain" />
              </Pressable>
              <Text style={dkS.headerTitle}>{isEdit ? 'Edit Entry' : 'New Entry'}</Text>
              <SoulPalAnimated pose="default" size={32} animate showEyes={false} style={dkS.soulPal} />
            </View>
            <InspirationDropdown />
            <View style={dkS.contentCard}>
              <TextInput
                style={dkS.textInput}
                placeholder="Write your thoughts here..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                multiline
                textAlignVertical="top"
                value={displayValue}
                onChangeText={setText}
                autoFocus={!isEdit}
                editable={!isRecording}
              />
            </View>
            <View style={[dkS.bottomRow, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
              <VoiceRecordingIndicator
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                volume={volume}
                onPress={handleMicPress}
              />
              <Pressable
                style={[dkS.saveButton, !text.trim() && dkS.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!text.trim() || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.background} size="small" />
                ) : (
                  <Text style={dkS.saveText}>{isEdit ? 'Update' : 'Submit'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
        <SaveAnimation visible={showSaveAnimation} onComplete={handleSaveAnimationComplete} />
      </LinearGradient>
    );
  }

  // ════════════════════════════════════════
  // LIGHT MODE
  // ════════════════════════════════════════
  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#59168B']}
      locations={[0, 0.5, 1]}
      style={ltS.container}
    >
      <KeyboardAvoidingView style={ltS.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[ltS.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={ltS.backRow} onPress={() => navigation.goBack()}>
            <Image source={BackIcon} style={ltS.backIcon} resizeMode="contain" />
            <Text style={ltS.backText}>{isEdit ? 'Edit Entry' : 'New Entry'}</Text>
          </Pressable>
          <InspirationDropdown />
          <View style={ltS.contentCard}>
            <TextInput
              style={ltS.textInput}
              placeholder="Write your thoughts here..."
              placeholderTextColor="rgba(51, 51, 51, 0.4)"
              multiline
              textAlignVertical="top"
              value={displayValue}
              onChangeText={setText}
              autoFocus={!isEdit}
              editable={!isRecording}
            />
          </View>
          <View style={[ltS.bottomRow, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
            <VoiceRecordingIndicator
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              volume={volume}
              onPress={handleMicPress}
            />
            <Pressable
              style={[ltS.saveButton, !text.trim() && ltS.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!text.trim() || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={ltS.saveText}>{isEdit ? 'Update' : 'Submit'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      <SaveAnimation visible={showSaveAnimation} onComplete={handleSaveAnimationComplete} />
    </LinearGradient>
  );
};

export default CreateJournalScreen;
