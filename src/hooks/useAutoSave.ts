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

  const saveNow = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === lastSavedTextRef.current) return;

    try {
      const result = await saveDraft(trimmed, mood || undefined, draftId || undefined);
      lastSavedTextRef.current = trimmed;
      if (!draftId) {
        setDraftId(result.id);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [text, mood, draftId, setDraftId, saveDraft]);

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
