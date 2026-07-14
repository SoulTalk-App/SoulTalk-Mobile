import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useJournal } from '../contexts/JournalContext';
import { useAuth } from '../contexts/AuthContext';
import JournalService from '../services/JournalService';
import { useAutoSave } from '../hooks/useAutoSave';
import {
  useLocalDraft,
  loadLocalDraft,
  clearLocalDraft,
} from '../hooks/useLocalDraft';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import { useAppAlert } from '../components/AppAlertProvider';
import { CrisisResourcesSheet } from '../components/CrisisResourcesSheet';
import JournalLoader from '../components/JournalLoader';
import InspirationDropdown from '../components/InspirationDropdown';
import VoiceRecordingIndicator from '../components/VoiceRecordingIndicator';
import SoulPalAnimated from '../components/SoulPalAnimated';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { Feather } from '@expo/vector-icons';

// so-t5vg: switched from a 5000-char limit to a 1000-word limit per the
// May 10 migration doc. Word-based counts read more naturally for a
// long-form journal entry than a char count. BE schema cap is being
// raised from 5000 → 10000 chars in a paired ASK to be_core; the
// TextInput maxLength is set generously so paste/voice don't hard-stop
// mid-word — the submit gate enforces the word limit instead.
const MAX_ENTRY_WORDS = 1000;
const COUNTER_VISIBLE_AT_WORDS = 850;
const COUNTER_WARN_AT_WORDS = 950;
const MAX_ENTRY_CHARS = 10000;

// so-ztg9: the SoulPal's saved name is the "SoulPal created" signal. Mirrors
// SoulPalContext's SOULPAL_NAME_KEY; the app addresses these onboarding flags by
// bare AsyncStorage key (cf. @soultalk_setup_complete in App.tsx), so we read it
// directly rather than couple this screen to the context's private constant.
const SOULPAL_NAME_KEY = '@soultalk_soulpal_name';

const countWords = (s: string): number => {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
};

const CreateJournalScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const { createEntry, updateEntry, finalizeDraft, entries, persistPendingFinalize } = useJournal();
  // so-1k32: local journal drafts are namespaced per user; thread the id into
  // the draft hook + load/clear so User B is never offered User A's draft.
  const { user } = useAuth();
  const userId = user?.id;
  // so-1zn0: themed alert replaces native Alert across this surface.
  const { showAlert, showError } = useAppAlert();

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
        counterRow: { paddingTop: 8, alignItems: 'flex-end' },
        counterText: { fontFamily: fonts.outfit.regular, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
        counterTextWarn: { color: '#FF8A8A' },
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
        counterRow: { paddingTop: 8, alignItems: 'flex-end' },
        counterText: { fontFamily: fonts.outfit.regular, fontSize: 12, color: 'rgba(51,51,51,0.6)' },
        counterTextWarn: { color: '#B00020' },
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
  // so-h8eo: crisis resources are attached synchronously to the POST /journal/
  // 201 (be_core so-qyky CR-2). When present, show the crisis sheet BEFORE the
  // save animation so the user sees help resources the instant the entry saves.
  const [crisisResources, setCrisisResources] = useState<string | null>(null);

  // so-ztg9: gate journaling on SoulPal setup being complete. A social-signup
  // user can land on Home with @soultalk_setup_complete force-set (App.tsx
  // checkStatus, when the social profile already carries a username) yet never
  // have gone through SoulPalName — leaving them able to open this screen and
  // journal before their SoulPal exists. The saved SoulPal name is the truthful
  // "SoulPal created" signal. null = still resolving; edit mode is exempt (an
  // entry can only exist if the user already journaled, i.e. already set up).
  const [soulPalReady, setSoulPalReady] = useState<boolean | null>(
    isEdit ? true : null,
  );

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    AsyncStorage.getItem(SOULPAL_NAME_KEY).then((name) => {
      if (cancelled) return;
      const ready = !!name && name.trim().length > 0;
      setSoulPalReady(ready);
      if (!ready) {
        // Both actions leave this screen, so journaling can't begin until the
        // user finishes setting up their SoulPal.
        showAlert({
          title: 'Meet your SoulPal first',
          message: 'Finish setting up your SoulPal before you start journaling.',
          buttons: [
            { text: 'Not now', style: 'cancel', onPress: () => navigation.goBack() },
            { text: 'Set up SoulPal', onPress: () => navigation.navigate('SoulPalName') },
          ],
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isEdit, navigation, showAlert]);

  // Auto-save hook (only for new entries, not edits of existing non-drafts).
  // so-hl09: cancel() is the imperative kill-switch we fire on finalize
  // success so a still-pending 30s tick can't race the publish PUT and
  // re-draft it.
  const { cancel: cancelAutoSave } = useAutoSave({
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
        let combined = base + separator + transcribedText;
        // so-t5vg: cap on word count, not chars. Walk the combined text and
        // keep the first MAX_ENTRY_WORDS whitespace-separated tokens (with
        // their original separators preserved via slice on the source).
        const wordCount = countWords(combined);
        if (wordCount > MAX_ENTRY_WORDS) {
          // Find the offset that ends after the MAX_ENTRY_WORDS-th word.
          const tokenRe = /\S+/g;
          let match: RegExpExecArray | null;
          let kept = 0;
          let cut = combined.length;
          while ((match = tokenRe.exec(combined)) !== null) {
            kept += 1;
            if (kept === MAX_ENTRY_WORDS) {
              cut = match.index + match[0].length;
              break;
            }
          }
          combined = combined.slice(0, cut);
          showAlert({
            title: 'Entry trimmed',
            message: `Voice transcription would have exceeded the ${MAX_ENTRY_WORDS}-word limit. Your entry was trimmed to fit.`,
          });
        }
        setText(combined);
        setLiveTranscript(null);
      } catch (error: any) {
        setLiveTranscript(null);
        // so-iiw8: was "Failed to transcribe audio" — too technical and
        // didn't tell the user what to do. The raw error.message could
        // also leak SDK strings ("AVAudioSession activation failed").
        showAlert({
          title: 'Transcription',
          message: "Couldn't hear you clearly. Please try again.",
        });
      }
    } else {
      try {
        textBeforeRecordingRef.current = text;
        await startRecording();
      } catch (error: any) {
        // so-iiw8: was "Failed to start recording" + raw error.message.
        // Almost always a missing-mic-permission case — point the user
        // at Settings instead of dumping the SDK error.
        showAlert({
          title: 'Microphone',
          message:
            'We need microphone access. Check your phone settings.',
        });
      }
    }
  }, [isRecording, startRecording, stopRecording, text, showAlert]);

  const handleSave = async () => {
    // so-m5oj: dismiss the keyboard before doing anything else so the
    // SaveAnimation overlay + nav transition aren't fighting the IME slide.
    // Cheap no-op when the keyboard is already down.
    Keyboard.dismiss();
    if (!text.trim()) return;
    // so-ztg9: never persist an entry before SoulPal setup is complete. The
    // mount gate already nudges + navigates away, but guard the write too in
    // case a save is triggered before that resolves.
    if (soulPalReady === false) {
      navigation.navigate('SoulPalName');
      return;
    }
    // so-t5vg: gate submit on word count, not char length. TextInput's
    // generous maxLength prevents most paste/voice over-runs but a user who
    // pastes a wall of text could still cross the line.
    if (countWords(text) > MAX_ENTRY_WORDS) {
      showAlert({
        title: 'Entry too long',
        message: `Journal entries are capped at ${MAX_ENTRY_WORDS} words. Trim a little and try again.`,
      });
      return;
    }
    setIsSaving(true);
    // so-hl09: snapshot the draftId BEFORE any state changes — we need
    // the original id both for persistPendingFinalize on failure and as
    // the source of truth for which entry to finalize. setDraftId(null)
    // below would otherwise lose the value before the catch can stash it.
    const finalizingDraftId = draftId;
    const finalizingText = text.trim();
    try {
      let entryId: string | null = null;
      // so-h8eo: crisis_resources is present ONLY on a fresh non-draft create
      // (POST /journal/ 201). Draft-finalize (PUT) and edit (PUT) don't run
      // the sync crisis scan, so we only capture it on that path.
      let capturedCrisisResources: string | null = null;
      if (finalizingDraftId) {
        // so-hl09: kill the autosave timer FIRST + drop the draftId from
        // screen state so even a JS-event-loop-queued saveNow that
        // executes after this point sees no draftId and cannot resurrect
        // the entry. Done before the PUT — if the PUT fails, the catch
        // re-arms the local-draft recovery path; if the PUT succeeds we
        // navigate away and the screen unmounts the autosave hook.
        cancelAutoSave();
        setDraftId(null);
        const result = await finalizeDraft(finalizingDraftId, finalizingText);
        entryId = result?.id || finalizingDraftId;
      } else if (isEdit) {
        await updateEntry(editEntry.id, {
          raw_text: finalizingText,
        });
        entryId = editEntry.id;
      } else {
        const result = await createEntry(finalizingText);
        entryId = result?.id || null;
        // so-h8eo: capture resources defensively; the field may be absent on
        // older BE versions or non-crisis entries.
        capturedCrisisResources = result?.crisis_resources ?? null;
      }
      savedEntryIdRef.current = entryId;
      // Clear the local crash-recovery draft (so-skm) on successful submit so
      // the next New Entry session starts clean.
      clearLocalDraft(userId);
      setAnalysisDone(false);
      if (capturedCrisisResources) {
        // so-h8eo: show the crisis sheet BEFORE the save animation. The sheet's
        // "I've read this" button triggers the save animation + navigation via
        // handleCrisisClose below, maintaining the normal completion UX.
        setCrisisResources(capturedCrisisResources);
      } else {
        setShowSaveAnimation(true);
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      // so-irkq: Pydantic 422 returns `detail` as an array of {loc,msg,type}.
      // Stringifying it raw produces "[object Object]" and the user sees
      // nothing useful. so-fntk delegates the flatten + friendly fallback
      // to normalizeError; we still extract detail locally just to keep
      // the 400/max-edits regex check below working against the BE's
      // raw string. The 409 / 400-max-edits branches keep their bespoke
      // copy (the BE-shipped Daily-Limit + Edit-limit messages are the
      // user-grade source of truth here; we only swap the generic
      // fallback at the bottom).
      const detailMsg = Array.isArray(detail)
        ? detail.map((d) => d?.msg || JSON.stringify(d)).join('; ')
        : detail;
      if (status === 409) {
        showAlert({
          title: 'Daily Limit',
          message:
            detailMsg ||
            "Self-awareness is built through continuous practice. One journal a day, keeps awareness at bay! Come back tomorrow to continue your journey.",
        });
      } else if (status === 400 && /max(imum)?\s*edits|edit\s*limit/i.test(detailMsg || '')) {
        // so-uba4: BE returns 400 with a max-edits message when the user
        // has exhausted the 3-edit cap. The generic "Failed to save entry"
        // dialog was misleading — give them the actual reason.
        showAlert({
          title: 'Edit limit reached',
          message:
            detailMsg || "You've reached the maximum of 3 edits for this entry.",
        });
      } else {
        // so-hl09: stash a finalize-retry intent for any non-409 failure
        // on the draft-finalize path — typically network drop or 5xx.
        // The next app launch's flushPendingFinalize will re-attempt the
        // PUT is_draft:false (idempotent on the BE). Without this, a
        // dropped finalize lost the entry as a stranded draft (the bug
        // that hit Chey). 409 is handled above + intentionally not
        // persisted (daily-limit gate).
        if (finalizingDraftId) {
          persistPendingFinalize(finalizingDraftId, finalizingText).catch(() => {});
        }
        // so-fntk: friendly fallback for everything not caught by the
        // 409 (daily limit) or 400/max-edits branches above. normalize
        // handles BE detail, Pydantic 422, status copy, and network /
        // timeout — no more raw axios strings ("Network Error",
        // "timeout of 10000ms exceeded") leaking into the dialog.
        showError(error);
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

  // so-h8eo: called when the user dismisses the CrisisResourcesSheet. We then
  // proceed to the normal save animation → JournalEntry navigation sequence.
  const handleCrisisClose = useCallback(() => {
    setCrisisResources(null);
    setShowSaveAnimation(true);
  }, []);

  // so-apy: poll the saved entry's ai_processing_status while the loader is
  // up. Loop continues until 'complete' / 'failed' / 'skipped' or the 30s
  // safety bail (max 20 attempts × 1500ms). All three are treated as done
  // so the user isn't stranded — JournalEntryScreen handles each state.
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
          // so-uba4: timed out waiting for the AI re-run. Don't pretend
          // this was a clean completion — log so field traces capture
          // it, then dismiss the save-animation. The detail screen
          // (JournalEntryScreen) re-arms its own poll on focus and will
          // surface the failure inline with a retry affordance if the
          // BE never settles. User isn't stranded on this loader.
          console.warn(
            '[CreateJournalScreen] so-uba4: AI poll timed out, dismissing save-animation',
          );
          if (!cancelled) setAnalysisDone(true);
          return;
        }
        attempts += 1;
        try {
          const entry = await JournalService.getEntry(id);
          const status = entry.ai_processing_status;
          if (status === 'failed') {
            // so-uba4: same telemetry log for hard failures. Detail
            // screen will render the failure text + retry row.
            console.warn(
              '[CreateJournalScreen] so-uba4: AI processing failed for entry',
              id,
            );
          }
          if (status === 'skipped') {
            // so-por9: AI was skipped (consent absent). Terminal — dismiss the
            // loader so the user isn't stranded. JournalEntryScreen renders the
            // calm "AI insights are off" state.
            console.log(
              '[CreateJournalScreen] so-por9: AI skipped (no consent) for entry',
              id,
            );
          }
          if (status === 'complete' || status === 'failed' || status === 'skipped') {
            if (!cancelled) setAnalysisDone(true);
            return;
          }
        } catch (err) {
          // so-uba4: surface mid-poll fetch errors via a log instead of
          // a bare catch{}. Behavior unchanged (transient errors still
          // don't kill the loop — we just no longer pretend they didn't
          // happen).
          console.warn('[CreateJournalScreen] so-uba4: AI poll fetch error:', err);
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [showSaveAnimation, analysisDone]);

  // so-9bq8: immediate refetch on foreground so the save overlay settles
  // without waiting for the next 1500ms tick after a background->foreground.
  // Only active while the overlay is up and not yet done.
  // so-8233 m1: cancelled flag guards the setState after the async getEntry
  // await so it cannot fire on an unmounted component (mirrors JES pattern).
  useEffect(() => {
    if (!showSaveAnimation || analysisDone) return;
    const id = savedEntryIdRef.current;
    if (!id) return;
    let cancelled = false;
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      JournalService.getEntry(id)
        .then((e) => {
          if (cancelled) return;
          const s = e.ai_processing_status;
          if (s === 'complete' || s === 'failed' || s === 'skipped') setAnalysisDone(true);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      sub.remove();
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
    userId,
  });

  // Restore-on-mount prompt (so-skm). Run once for new entries only — edit
  // mode opens a specific entry and shouldn't be hijacked by a stale local
  // draft. Reconcile with the server-side draft via updatedAt: if the local
  // copy is newer (typical post-crash), prefer it.
  //
  // so-nvyc: defensively drop local.draftId if it resolves to a FINALIZED
  // entry in the user's current journal. Background — clearLocalDraft on
  // successful finalize is fire-and-forget (AsyncStorage can fail silently),
  // so a stale local draft can persist with a draftId that now points at a
  // committed entry. Without this guard, "Restore" would seat that
  // finalized-entry id into screen state and the next useAutoSave tick
  // would PUT is_draft:true on it, hiding the entry from the list and
  // reverting SoulBar. Restoring the TEXT is still safe — useAutoSave will
  // create a fresh server draft on next save.
  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    (async () => {
      const local = await loadLocalDraft(userId);
      if (cancelled || !local || !local.text.trim()) return;
      // so-vhse: content dedupe — if any committed entry in the loaded page
      // has raw_text matching the local draft's text (trimmed), the draft was
      // already submitted. Silently clear and skip the prompt.
      // Handles draftId=null (text typed before server draft created) and the
      // pagination gap where the committed entry is absent from
      // stalePointsToFinalized's scope. raw_text is confirmed present on list
      // items (JournalEntryListItem, _entry_list_item in journal.py).
      const alreadySubmitted = entries.some(
        (e) => !e.is_draft && (e.raw_text?.trim() ?? '') === local.text.trim(),
      );
      if (alreadySubmitted) {
        clearLocalDraft(userId);
        return;
      }
      const stalePointsToFinalized =
        local.draftId &&
        entries.some((e) => e.id === local.draftId && !e.is_draft);
      if (stalePointsToFinalized) {
        // Local draft references a committed entry — never reuse the id.
        // Discard the local draft entirely; the user's committed work is
        // already safe on the server, and a stale text body shouldn't
        // overwrite it.
        clearLocalDraft(userId);
        return;
      }
      showAlert({
        title: 'Restore unfinished entry?',
        message:
          "We saved your last entry locally before it was interrupted. Want to pick up where you left off?",
        buttons: [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              clearLocalDraft(userId);
            },
          },
          {
            text: 'Restore',
            onPress: () => {
              setText(local.text);
              // so-nvyc: only carry forward the draftId if the matching
              // server-side entry is still a draft. If it isn't in our
              // current entries list at all (cross-device or stale state),
              // also drop it — useAutoSave will mint a fresh draft id on
              // its next tick rather than risk PUTing to an unknown id.
              const draftStillValid = entries.some(
                (e) => e.id === local.draftId && e.is_draft,
              );
              if (local.draftId && draftStillValid) {
                setDraftId(local.draftId);
              }
            },
          },
        ],
      });
    })();
    return () => {
      cancelled = true;
    };
    // so-1k32: depend on userId so the restore check runs once auth resolves
    // (and re-keys per user). entries/showAlert intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
                maxLength={MAX_ENTRY_CHARS}
              />
            </View>
            {(() => {
              const wc = countWords(text);
              return wc >= COUNTER_VISIBLE_AT_WORDS ? (
                <View style={dkS.counterRow}>
                  <Text style={[dkS.counterText, wc >= COUNTER_WARN_AT_WORDS && dkS.counterTextWarn]}>
                    {wc}/{MAX_ENTRY_WORDS} words
                  </Text>
                </View>
              ) : null;
            })()}
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
        {/* so-4j34: rainbow SaveAnimation retired. JournalLoader's
            overlay variant matches the SaveAnimation contract
            (visible/done/onComplete) but loops a SoulPal reflecting
            scene with a rotating status line and an on-brand
            celebrating-SoulPal completion beat. The 30s poll, WS
            journal_ai_complete fast-path (JournalContext), and so-uba4
            timeout dismissal are untouched — only the overlay surface
            changed. */}
        <JournalLoader
          variant="overlay"
          visible={showSaveAnimation}
          done={analysisDone}
          onComplete={handleSaveAnimationComplete}
        />
        {/* so-h8eo: crisis resources surface here BEFORE the save animation
            so the user sees help the instant the entry saves. The sheet
            renders on top of everything via its own Modal portal. */}
        {crisisResources != null && (
          <CrisisResourcesSheet
            visible
            text={crisisResources}
            onClose={handleCrisisClose}
          />
        )}
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
              maxLength={MAX_ENTRY_CHARS}
            />
          </View>
          {(() => {
            const wc = countWords(text);
            return wc >= COUNTER_VISIBLE_AT_WORDS ? (
              <View style={ltS.counterRow}>
                <Text style={[ltS.counterText, wc >= COUNTER_WARN_AT_WORDS && ltS.counterTextWarn]}>
                  {wc}/{MAX_ENTRY_WORDS} words
                </Text>
              </View>
            ) : null;
          })()}
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
      {/* so-4j34: see dark-mode branch for full rationale. */}
      <JournalLoader
        variant="overlay"
        visible={showSaveAnimation}
        done={analysisDone}
        onComplete={handleSaveAnimationComplete}
      />
      {/* so-h8eo: crisis resources sheet — see dark-mode branch for rationale. */}
      {crisisResources != null && (
        <CrisisResourcesSheet
          visible
          text={crisisResources}
          onClose={handleCrisisClose}
        />
      )}
    </CosmicScreen>
  );
};

export default CreateJournalScreen;
