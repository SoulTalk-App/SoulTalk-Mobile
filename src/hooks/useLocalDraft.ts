import { useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local AsyncStorage draft persistence (so-skm). Sits alongside useAutoSave
 * (server, every 30s) as immediate crash protection: every text change is
 * persisted to local storage on a 500ms debounce, so a force-quit / crash
 * loses at most ~500ms of typing or dictation rather than up to 30s.
 *
 * Single-slot: only one draft-in-progress per device.
 */
export const LOCAL_DRAFT_KEY = '@soultalk_journal_draft_local';

export interface LocalDraft {
  text: string;
  mood?: string | null;
  draftId?: string | null;
  updatedAt: number;
}

interface UseLocalDraftOptions {
  value: string;
  mood?: string | null;
  draftId?: string | null;
  debounceMs?: number;
  enabled?: boolean;
}

export const useLocalDraft = ({
  value,
  mood,
  draftId,
  debounceMs = 500,
  enabled = true,
}: UseLocalDraftOptions) => {
  const lastWrittenRef = useRef<string>('');

  useEffect(() => {
    if (!enabled) return;
    const handle = setTimeout(() => {
      // Empty values are not worth persisting — a fresh screen with no text
      // should not overwrite a recovery draft from a prior session.
      if (!value || !value.trim()) return;
      if (value === lastWrittenRef.current) return;
      lastWrittenRef.current = value;
      const payload: LocalDraft = {
        text: value,
        mood: mood ?? null,
        draftId: draftId ?? null,
        updatedAt: Date.now(),
      };
      AsyncStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(payload)).catch(
        (err) => console.log('[useLocalDraft] write error:', err?.message),
      );
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [value, mood, draftId, debounceMs, enabled]);

  const clearDraft = useCallback(async () => {
    lastWrittenRef.current = '';
    try {
      await AsyncStorage.removeItem(LOCAL_DRAFT_KEY);
    } catch (err: any) {
      console.log('[useLocalDraft] clear error:', err?.message);
    }
  }, []);

  return { clearDraft };
};

export const loadLocalDraft = async (): Promise<LocalDraft | null> => {
  try {
    const json = await AsyncStorage.getItem(LOCAL_DRAFT_KEY);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (typeof parsed?.text !== 'string' || typeof parsed?.updatedAt !== 'number') {
      return null;
    }
    return parsed as LocalDraft;
  } catch (err: any) {
    console.log('[useLocalDraft] load error:', err?.message);
    return null;
  }
};

export const clearLocalDraft = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(LOCAL_DRAFT_KEY);
  } catch (err: any) {
    console.log('[useLocalDraft] clear error:', err?.message);
  }
};
