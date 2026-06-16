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
  // so-tpwh #5: track mood independently so a mood-only edit (text
  // unchanged) is still autosaved. Pre-fix: the text-only guard skipped
  // the save the moment text hadn't changed since the last successful
  // round-trip, so a user picking a different mood mid-entry got no
  // server-side persistence until they typed another character.
  const lastSavedMoodRef = useRef<Mood | null | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const trimmed = textRef.current.trim();
    if (!trimmed) return;
    // so-tpwh #5: skip ONLY when nothing material has changed since the
    // last successful save. Either a text delta OR a mood delta is
    // enough to fire.
    const currentMood = moodRef.current ?? null;
    const textUnchanged = trimmed === lastSavedTextRef.current;
    const moodUnchanged = currentMood === lastSavedMoodRef.current;
    if (textUnchanged && moodUnchanged) return;

    try {
      const currentDraftId = draftIdRef.current;
      const result = await saveDraftRef.current(
        trimmed,
        moodRef.current || undefined,
        currentDraftId || undefined,
      );
      lastSavedTextRef.current = trimmed;
      lastSavedMoodRef.current = currentMood;
      if (!currentDraftId) {
        setDraftIdRef.current(result.id);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

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

  return { saveNow };
};
