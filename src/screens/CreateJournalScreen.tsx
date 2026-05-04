import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useJournal } from '../contexts/JournalContext';
import JournalService from '../services/JournalService';
import { useAutoSave } from '../hooks/useAutoSave';
import {
  useLocalDraft,
  loadLocalDraft,
  clearLocalDraft,
} from '../hooks/useLocalDraft';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import SaveAnimation from '../components/SaveAnimation';
import InspirationDropdown from '../components/InspirationDropdown';
import VoiceRecordingIndicator from '../components/VoiceRecordingIndicator';
import SoulPalAnimated from '../components/SoulPalAnimated';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { Feather } from '@expo/vector-icons';

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
        headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
        headerTitle: { flex: 1, fontFamily: fonts.edensor.bold, fontSize: 24, color: colors.text.primary },
        soulPal: { marginRight: 4 },
        contentCard: { flex: 1, borderRadius: 14, padding: 18, backgroundColor: 'rgba(255, 255, 255, 0.07)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.10)' },
        textInput: { flex: 1, fontFamily: fonts.outfit.regular, fontSize: 16, lineHeight: 16 * 1.6, color: colors.text.primary },
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
        // Light path: page-bg ink for AA on the so-u1k lavender wash.
        backText: { fontFamily: fonts.outfit.semiBold, fontSize: 24, color: colors.text.primary },
        contentCard: { flex: 1, backgroundColor: colors.white, borderRadius: 10, padding: 20 },
        textInput: { flex: 1, fontFamily: fonts.outfit.regular, fontSize: 16, lineHeight: 16 * 1.6, color: '#333333' },
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
  // so-apy: tracks whether AI analysis on the saved entry has finished. Drives
  // the SaveAnimation's loop → checkmark transition. For edit-mode finalized
  // entries (no fresh analysis), gets set true immediately on submit.
  const [analysisDone, setAnalysisDone] = useState(false);
  const savedEntryIdRef = React.useRef<string | null>(null);

  // Auto-save hook (only for new entries, not edits of existing non-drafts)
  useAutoSave({
    text,
    mood: undefined,
    draftId,
    setDraftId,
    enabled: !isEdit || (isEdit && editEntry.is_draft),
  });

  // Local-storage draft persistence (so-skm). Crash-recovery for voice-to-text
  // and force-quits — captures every change on a 500ms debounce, far tighter
  // than the 30s server save above. Disabled in edit mode of finalized entries
  // since those aren't drafts being authored.
  const localDraftEnabled = !isEdit;

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
      // Clear the local crash-recovery draft (so-skm) on successful submit so
      // the next New Entry session starts clean.
      clearLocalDraft();
      // so-apy: edit-mode (non-draft) doesn't trigger fresh AI analysis, so
      // skip the polling and show the checkmark immediately. Fresh entries +
      // draft-finalize fall through to the polling effect below.
      if (isEdit && !editEntry.is_draft) {
        setAnalysisDone(true);
      } else {
        setAnalysisDone(false);
      }
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
    setAnalysisDone(false);
    if (savedEntryIdRef.current && !isEdit) {
      navigation.replace('JournalEntry', { entryId: savedEntryIdRef.current });
    } else {
      navigation.goBack();
    }
  };

  // so-apy: poll the saved entry's ai_processing_status while the loader is
  // up. Loop continues until 'complete' / 'failed' or the 30s safety bail
  // (max 20 attempts × 1500ms). 'failed' is treated as done so the user
  // isn't stranded — the JournalEntry screen handles the failed state.
  useEffect(() => {
    if (!showSaveAnimation || analysisDone) return;
    const id = savedEntryIdRef.current;
    if (!id) return;
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 20;
    const POLL_MS = 1500;
    const poll = async () => {
      while (!cancelled) {
        if (attempts >= MAX_ATTEMPTS) {
          if (!cancelled) setAnalysisDone(true);
          return;
        }
        attempts += 1;
        try {
          const entry = await JournalService.getEntry(id);
          const status = entry.ai_processing_status;
          if (status === 'complete' || status === 'failed') {
            if (!cancelled) setAnalysisDone(true);
            return;
          }
        } catch {
          // Silent retry — transient network errors shouldn't kill the loop.
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [showSaveAnimation, analysisDone]);

  const displayValue = isRecording && liveTranscript
    ? (textBeforeRecordingRef.current.trim() ? textBeforeRecordingRef.current + ' ' : '') + liveTranscript
    : text;

  // Persist displayValue (text + interim live transcript when dictating) on
  // every change, debounced. Catches crashes mid-dictation since live partials
  // flow through this same value.
  useLocalDraft({
    value: displayValue,
    draftId,
    enabled: localDraftEnabled,
  });

  // Restore-on-mount prompt (so-skm). Run once for new entries only — edit
  // mode opens a specific entry and shouldn't be hijacked by a stale local
  // draft. Reconcile with the server-side draft via updatedAt: if the local
  // copy is newer (typical post-crash), prefer it.
  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    (async () => {
      const local = await loadLocalDraft();
      if (cancelled || !local || !local.text.trim()) return;
      Alert.alert(
        'Restore unfinished entry?',
        "We saved your last entry locally before it was interrupted. Want to pick up where you left off?",
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              clearLocalDraft();
            },
          },
          {
            text: 'Restore',
            onPress: () => {
              setText(local.text);
              if (local.draftId) setDraftId(local.draftId);
            },
          },
        ],
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ════════════════════════════════════════
  // DARK MODE
  // ════════════════════════════════════════
  if (isDarkMode) {
    return (
      <CosmicScreen tone="dawn">
        <KeyboardAvoidingView style={dkS.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[dkS.content, { paddingTop: insets.top + 16 }]}>
            <View style={dkS.headerRow}>
              <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
                <Feather name="chevron-left" size={28} color="#FFFFFF" />
              </Pressable>
              <Text style={dkS.headerTitle}>{isEdit ? 'Edit Entry' : 'New Entry'}</Text>
              <SoulPalAnimated pose="default" size={32} animate showEyes={false} style={dkS.soulPal} />
            </View>
            <InspirationDropdown />
            <View style={dkS.contentCard}>
              <TextInput
                style={dkS.textInput}
                placeholder="Write your thoughts here..."
                placeholderTextColor="rgba(255,255,255,0.50)"
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
        <SaveAnimation visible={showSaveAnimation} done={analysisDone} onComplete={handleSaveAnimationComplete} />
      </CosmicScreen>
    );
  }

  // ════════════════════════════════════════
  // LIGHT MODE
  // ════════════════════════════════════════
  return (
    <CosmicScreen tone="dawn">
      <KeyboardAvoidingView style={ltS.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[ltS.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={ltS.backRow} onPress={() => navigation.goBack()} hitSlop={12}>
            <Feather name="chevron-left" size={28} color="#3A0E66" />
            <Text style={ltS.backText}>{isEdit ? 'Edit Entry' : 'New Entry'}</Text>
          </Pressable>
          <InspirationDropdown />
          <View style={ltS.contentCard}>
            <TextInput
              style={ltS.textInput}
              placeholder="Write your thoughts here..."
              placeholderTextColor="rgba(51, 51, 51, 0.7)"
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
      <SaveAnimation visible={showSaveAnimation} done={analysisDone} onComplete={handleSaveAnimationComplete} />
    </CosmicScreen>
  );
};

export default CreateJournalScreen;
