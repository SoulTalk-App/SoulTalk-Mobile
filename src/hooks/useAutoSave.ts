import { useRef, useCallback, useEffect } from 'react';
import { Mood } from '../services/JournalService';
import { useJournal } from '../contexts/JournalContext';

interface UseAutoSaveOptions {
  text: string;
  mood?: Mood | null;
  draftId: string | null;
  setDraftId: (id: string | null) => void;
  intervalMs?: number;
  enabled?: boolean;
}

export const useAutoSave = ({
  text,
  mood,
  draftId,
  setDraftId,
  intervalMs = 30000,
  enabled = true,
}: UseAutoSaveOptions) => {
  const { saveDraft } = useJournal();
  const lastSavedTextRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // so-hl09: hard kill-switch for the autosave loop. Once cancel() is
  // called (e.g. after finalize succeeds in handleSave), no further tick
  // — neither the interval's scheduled saveNow nor an in-flight one
  // that hasn't completed yet — may persist as a draft. Without this,
  // the 30s timer could fire AFTER finalize completes and send
  // is_draft:true back over the published entry, re-hiding it. This is
  // the bug that lost Chey's entries.
  const cancelledRef = useRef(false);

  // so-kqsv: route the volatile inputs through refs so the interval effect
  // can depend on stable values only. Before this fix, saveNow closed over
  // `text` and the interval effect listed `saveNow` in its deps, so every
  // keystroke rebuilt saveNow → cleared the interval → installed a fresh
  // 30s one. During continuous typing or dictation the server autosave
  // never fired (crash safety leaned entirely on the 500ms useLocalDraft).
  const textRef = useRef(text);
  const moodRef = useRef(mood);
  const draftIdRef = useRef(draftId);
  const setDraftIdRef = useRef(setDraftId);
  const saveDraftRef = useRef(saveDraft);

  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => { moodRef.current = mood; }, [mood]);
  useEffect(() => { draftIdRef.current = draftId; }, [draftId]);
  useEffect(() => { setDraftIdRef.current = setDraftId; }, [setDraftId]);
  useEffect(() => { saveDraftRef.current = saveDraft; }, [saveDraft]);

  // Stable callback — reads current values from refs at invocation time.
  const saveNow = useCallback(async () => {
    // so-hl09: bail before touching the network if cancel() has already
    // fired. Belt-and-suspenders alongside the interval-clear in cancel()
    // — covers the narrow window where the timer already woke saveNow up
    // but hasn't entered the function body yet.
    if (cancelledRef.current) return;
    const trimmed = textRef.current.trim();
    if (!trimmed || trimmed === lastSavedTextRef.current) return;

    try {
      const currentDraftId = draftIdRef.current;
      // so-hl09: re-check cancellation after the await — saveDraftRef's
      // network call can outlast a finalize that lands before this
      // promise resolves. Skipping the setDraftId in that case prevents
      // a stale `result.id` from overwriting null.
      const result = await saveDraftRef.current(
        trimmed,
        moodRef.current || undefined,
        currentDraftId || undefined,
      );
      if (cancelledRef.current) return;
      lastSavedTextRef.current = trimmed;
      if (!currentDraftId) {
        setDraftIdRef.current(result.id);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, []);

  // so-hl09: imperative cancel — clears the interval and trips the flag.
  // Idempotent. Once cancelled, the hook stays cancelled for the lifetime
  // of the component (consumers call this on finalize-success, then
  // navigate; there's no re-enable use case).
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || cancelledRef.current) return;

    timerRef.current = setInterval(() => {
      saveNow();
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [saveNow, intervalMs, enabled]);

  return { saveNow, cancel };
};
