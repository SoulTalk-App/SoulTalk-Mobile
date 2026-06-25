import { useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local AsyncStorage draft persistence (so-skm). Sits alongside useAutoSave
 * (server, every 30s) as immediate crash protection: every text change is
 * persisted to local storage on a 500ms debounce, so a force-quit / crash
 * loses at most ~500ms of typing or dictation rather than up to 30s.
 *
 * so-1k32 (SS-M3, privacy): the key is scoped PER USER (mirrors the so-5eu1
 * settings-draft pattern). A single device-global slot let User B on a shared
 * device be offered User A's private journal text on the restore prompt — the
 * very content that becomes Signals/Shifts. AuthContext.logout also clears the
 * leaving user's draft as belt-and-suspenders.
 */
const LOCAL_DRAFT_KEY_PREFIX = '@soultalk_journal_draft_local';
export const localDraftKey = (userId: string) =>
  `${LOCAL_DRAFT_KEY_PREFIX}:${userId}`;

// so-1k32: the pre-fix builds wrote to this BARE (device-global) key. It is no
// longer read or written, but existing installs may still hold a previous
// user's draft text under it — purge it once so the leaked content is gone.
// Note: this is the bare prefix (no `:userId`), so it never touches the new
// per-user keys.
const LEGACY_GLOBAL_DRAFT_KEY = LOCAL_DRAFT_KEY_PREFIX;
export const purgeLegacyGlobalDraft = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(LEGACY_GLOBAL_DRAFT_KEY);
  } catch {
    // best-effort
  }
};

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
  /** Current user id — drafts are namespaced per user (so-1k32). When absent,
   *  persistence no-ops (no user-safe key to write). */
  userId?: string | null;
}

export const useLocalDraft = ({
  value,
  mood,
  draftId,
  debounceMs = 500,
  enabled = true,
  userId,
}: UseLocalDraftOptions) => {
  const lastWrittenRef = useRef<string>('');

  // so-1k32: one-time purge of the legacy device-global draft key on mount, so
  // an old leaked draft can't survive on the device.
  useEffect(() => {
    purgeLegacyGlobalDraft();
  }, []);

  useEffect(() => {
    if (!enabled || !userId) return;
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
      AsyncStorage.setItem(localDraftKey(userId), JSON.stringify(payload)).catch(
        (err) => console.log('[useLocalDraft] write error:', err?.message),
      );
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [value, mood, draftId, debounceMs, enabled, userId]);

  const clearDraft = useCallback(async () => {
    lastWrittenRef.current = '';
    if (!userId) return;
    try {
      await AsyncStorage.removeItem(localDraftKey(userId));
    } catch (err: any) {
      console.log('[useLocalDraft] clear error:', err?.message);
    }
  }, [userId]);

  return { clearDraft };
};

export const loadLocalDraft = async (
  userId: string | null | undefined,
): Promise<LocalDraft | null> => {
  if (!userId) return null;
  try {
    const json = await AsyncStorage.getItem(localDraftKey(userId));
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

export const clearLocalDraft = async (
  userId: string | null | undefined,
): Promise<void> => {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(localDraftKey(userId));
  } catch (err: any) {
    console.log('[useLocalDraft] clear error:', err?.message);
  }
};
