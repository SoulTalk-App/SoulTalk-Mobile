import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JournalService, {
  JournalEntry,
  Mood,
  ListEntriesParams,
  StreakResponse,
  SoulBarResponse,
} from '../services/JournalService';
import { useWS } from './WebSocketContext';
import { useAuth } from './AuthContext';
import { getDeviceTimezone } from '../utils/timezone';

// so-hl09: persisted finalize-intent payload. If finalizeDraft fails
// (network drop mid-PUT), we stash the intent and retry on the next
// app launch so the entry doesn't sit stranded as a draft. Per-user
// scoped to prevent cross-user bleed on a shared device.
const PENDING_FINALIZE_KEY_PREFIX = '@soultalk_pending_finalize';
const pendingFinalizeKey = (userId: string) =>
  `${PENDING_FINALIZE_KEY_PREFIX}:${userId}`;
const MAX_FINALIZE_RETRY_ATTEMPTS = 5;

interface PendingFinalize {
  draftId: string;
  text: string;
  mood?: Mood;
  attempts: number;
}

// so-l304 F2: split volatile state from stable action API so components
// that only call actions never re-render on entry/gamification changes.
interface JournalStateType {
  entries: JournalEntry[];
  isLoading: boolean;
  currentEntry: JournalEntry | null;
  total: number;
  streak: StreakResponse | null;
  soulBar: SoulBarResponse | null;
  hasEntryToday: boolean;
}

interface JournalActionsType {
  fetchEntries: (params?: ListEntriesParams) => Promise<void>;
  createEntry: (rawText: string, mood?: Mood, isDraft?: boolean) => Promise<JournalEntry>;
  updateEntry: (id: string, data: { raw_text?: string; mood?: Mood; is_draft?: boolean }) => Promise<JournalEntry>;
  deleteEntry: (id: string) => Promise<void>;
  setCurrentEntry: (entry: JournalEntry | null) => void;
  refreshEntries: () => Promise<void>;
  fetchStreak: () => Promise<void>;
  fetchSoulBar: () => Promise<void>;
  // so-l304 F1: debounced wrapper — coalesces rapid paired calls into one
  // parallel fetch pair. Multiple call sites firing within 50ms share a
  // single streak+soulBar round-trip instead of issuing N separate pairs.
  fetchGamification: () => void;
  saveDraft: (text: string, mood?: Mood, draftId?: string) => Promise<JournalEntry>;
  finalizeDraft: (draftId: string, text: string, mood?: Mood) => Promise<JournalEntry>;
  // so-hl09: persist a failed finalize so the next launch can retry it.
  // Called by CreateJournalScreen.handleSave's catch on network failure.
  persistPendingFinalize: (draftId: string, text: string, mood?: Mood) => Promise<void>;
}

// Backward-compat combined type — useJournal() still satisfies this.
type JournalContextType = JournalStateType & JournalActionsType;

// so-l304 F2: two contexts — actions context is stable (never re-creates
// at list scale), state context re-creates whenever entries/streak change.
const JournalStateContext = createContext<JournalStateType | undefined>(undefined);
const JournalActionsContext = createContext<JournalActionsType | undefined>(undefined);

// useJournalState — subscribe to volatile state only (entries, streak, …).
export const useJournalState = () => {
  const ctx = useContext(JournalStateContext);
  if (ctx === undefined) {
    throw new Error('useJournalState must be used within a JournalProvider');
  }
  return ctx;
};

// useJournalActions — subscribe to stable action API only. Components that
// only call actions (saveDraft, createEntry, …) will not re-render when
// entries or gamification state changes.
export const useJournalActions = () => {
  const ctx = useContext(JournalActionsContext);
  if (ctx === undefined) {
    throw new Error('useJournalActions must be used within a JournalProvider');
  }
  return ctx;
};

// useJournal — backward-compat combined hook. Existing consumers keep
// working unchanged; they still re-render on any state change.
export const useJournal = (): JournalContextType => ({
  ...useJournalState(),
  ...useJournalActions(),
});

interface JournalProviderProps {
  children: ReactNode;
}

export const JournalProvider: React.FC<JournalProviderProps> = ({ children }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  // so-cnd8: mirror entries into a ref so updateEntry / finalizeDraft can
  // derive "already in list?" OUTSIDE the setEntries updater. The earlier
  // (so-tpwh #6) approach mutated a local `wasNew` inside the updater and
  // read it on the next line — works by virtue of React's eager-bailout
  // semantics but is fragile (concurrent mode + StrictMode double-invoke
  // could resequence the updater run vs the gate read). Ref-mirror keeps
  // the existence check synchronous and unambiguous.
  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [total, setTotal] = useState(0);
  const [lastParams, setLastParams] = useState<ListEntriesParams | undefined>();
  const [streak, setStreak] = useState<StreakResponse | null>(null);
  const [soulBar, setSoulBar] = useState<SoulBarResponse | null>(null);
  const { subscribe } = useWS();
  const { user } = useAuth();

  // Subscribe to AI processing completion events
  useEffect(() => {
    const unsubscribe = subscribe('journal_ai_complete', (data: any) => {
      const { entry_id, ai_processing_status, response_text, mode, tags_summary } = data;
      const update = (entry: JournalEntry): JournalEntry => {
        if (entry.id !== entry_id) return entry;
        return {
          ...entry,
          ai_processing_status: ai_processing_status ?? entry.ai_processing_status,
          ai_response: response_text ? { text: response_text, mode: mode ?? null } : entry.ai_response,
          tags: tags_summary ? {
            ...entry.tags,
            emotion_primary: tags_summary.emotion_primary ?? null,
            nervous_system_state: tags_summary.nervous_system_state ?? null,
            crisis_flag: tags_summary.crisis_flag ?? false,
          } as any : entry.tags,
        };
      };

      setEntries((prev) => prev.map(update));
      setCurrentEntry((prev) => (prev && prev.id === entry_id ? update(prev) : prev));
    });
    return unsubscribe;
  }, [subscribe]);

  const fetchEntries = useCallback(async (params?: ListEntriesParams) => {
    try {
      setIsLoading(true);
      setLastParams(params);
      const response = await JournalService.listEntries(params);
      setEntries(response.entries);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch journal entries:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshEntries = useCallback(async () => {
    await fetchEntries(lastParams);
  }, [fetchEntries, lastParams]);

  // so-rhap: fetchStreak / fetchSoulBar are called fire-and-forget from
  // ~8 sites (mount, createEntry, finalizeDraft, updateEntry, pending
  // finalize retry, deleteEntry, HomeScreen focus, SoulSight generate).
  // When two overlap, an OLDER response can land AFTER a newer one and
  // setSoulBar/setStreak to a stale (often LOWER) value — the tester
  // "soul bar charged backward after journaling" trace was this exact
  // race. Each fetch now captures a monotonically increasing request id;
  // its resolve only commits if no newer request has started.
  const streakRequestIdRef = useRef(0);
  const soulBarRequestIdRef = useRef(0);

  const fetchStreak = useCallback(async () => {
    const requestId = ++streakRequestIdRef.current;
    try {
      const data = await JournalService.getStreak();
      // so-rhap: drop stale resolves.
      if (requestId !== streakRequestIdRef.current) return;
      setStreak(data);
    } catch (error) {
      console.error('Failed to fetch streak:', error);
    }
  }, []);

  const fetchSoulBar = useCallback(async () => {
    const requestId = ++soulBarRequestIdRef.current;
    try {
      const data = await JournalService.getSoulBar();
      // so-rhap: drop stale resolves. Without this guard, an older
      // fetch resolving after a newer one rewinds the bar to a stale
      // value — the "backward charge" repro.
      if (requestId !== soulBarRequestIdRef.current) return;
      setSoulBar(data);
    } catch (error) {
      console.error('Failed to fetch soul bar:', error);
    }
  }, []);

  // so-l304 F1: debounced gamification refresh — coalesces rapid paired
  // fetchStreak+fetchSoulBar calls from multiple mutation sites within a
  // 50ms window into a single parallel request pair. Replaces the
  // `fetchStreak(); fetchSoulBar();` pattern at every internal call site.
  // External callers that need only one (e.g. HomeScreen→fetchSoulBar)
  // continue to call the individual functions directly.
  const gamificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchGamification = useCallback(() => {
    if (gamificationTimerRef.current) clearTimeout(gamificationTimerRef.current);
    gamificationTimerRef.current = setTimeout(() => {
      gamificationTimerRef.current = null;
      fetchStreak();
      fetchSoulBar();
    }, 50);
  }, [fetchStreak, fetchSoulBar]);

  // Fetch streak and soulBar on mount
  useEffect(() => {
    fetchGamification();
  }, [fetchGamification]);

  // so-hl09: persist + retry finalize intent. If finalizeDraft fails
  // mid-PUT (network drop, app backgrounded), the draftId/text/mood
  // payload is stashed under a per-user key; the next app launch picks
  // it up and re-attempts the PUT is_draft:false. PUT is_draft:false is
  // idempotent on the BE so the retry is safe even if the original
  // request actually succeeded — the second PUT no-ops the BE side.
  // A 409 (so-z961: BE will hard-block published->draft, also surfaces
  // for already-finalized entries) is treated as "already published,
  // drop the pending intent and move on."
  const persistPendingFinalize = useCallback(
    async (draftId: string, text: string, mood?: Mood) => {
      const userId = user?.id;
      if (!userId) return;
      const payload: PendingFinalize = { draftId, text, mood, attempts: 0 };
      try {
        await AsyncStorage.setItem(
          pendingFinalizeKey(userId),
          JSON.stringify(payload),
        );
      } catch (err) {
        console.warn('[JournalContext] persistPendingFinalize failed:', err);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    const key = pendingFinalizeKey(userId);
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw || cancelled) return;
        let payload: PendingFinalize;
        try {
          payload = JSON.parse(raw);
        } catch {
          await AsyncStorage.removeItem(key);
          return;
        }
        if (!payload?.draftId || (payload.attempts ?? 0) >= MAX_FINALIZE_RETRY_ATTEMPTS) {
          await AsyncStorage.removeItem(key);
          return;
        }
        try {
          await JournalService.updateEntry(payload.draftId, {
            raw_text: payload.text,
            mood: payload.mood,
            is_draft: false,
          });
          await AsyncStorage.removeItem(key);
          // Re-fetch streak + soulBar in case the BE awarded points on
          // the retried finalize.
          fetchGamification();
        } catch (err: any) {
          const status = err?.response?.status;
          if (status === 409 || status === 404) {
            // so-z961: BE rejects published->draft AND treats a finalize
            // on an already-finalized entry as a 409. Either way, the
            // intent is satisfied — drop it.
            // so-j6ea: 404 means the entry no longer exists on the BE
            // (deleted or never persisted) — retrying is pointless; drop.
            await AsyncStorage.removeItem(key);
            return;
          }
          // Network / 5xx — bump attempts and leave for the next launch.
          const next: PendingFinalize = { ...payload, attempts: (payload.attempts ?? 0) + 1 };
          try {
            await AsyncStorage.setItem(key, JSON.stringify(next));
          } catch {}
        }
      } catch (err) {
        console.warn('[JournalContext] flushPendingFinalize threw:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchGamification]);

  const createEntry = useCallback(async (rawText: string, mood?: Mood, isDraft: boolean = false) => {
    const entry = await JournalService.createEntry(rawText, mood, isDraft);
    if (!isDraft) {
      // Prepend to local state (newest first)
      setEntries((prev) => [entry, ...prev]);
      setTotal((prev) => prev + 1);
      // Re-fetch streak and soulBar after non-draft creation
      fetchGamification();
    }
    return entry;
  }, [fetchGamification]);

  const updateEntry = useCallback(async (id: string, data: { raw_text?: string; mood?: Mood; is_draft?: boolean }) => {
    const updated = await JournalService.updateEntry(id, data);
    // If draft was finalized, add to entries list and refresh gamification
    if (data.is_draft === false) {
      // so-cnd8: derive existence from the ref-mirrored committed state
      // BEFORE setEntries. Gate setTotal on this flag instead of mutating
      // one inside the updater. Note: setEntries's updater still does its
      // own .some() check — that's the correctness path against concurrent
      // updates (its result determines whether to map-replace vs prepend).
      // The outer `exists` is the gate for setTotal; the inner check is
      // the gate for the list shape.
      const exists = entriesRef.current.some((e) => e.id === id);
      setEntries((prev) => {
        const stillExists = prev.some((e) => e.id === id);
        return stillExists ? prev.map((e) => (e.id === id ? updated : e)) : [updated, ...prev];
      });
      if (!exists) {
        setTotal((prev) => prev + 1);
      }
      fetchGamification();
    } else {
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    }
    if (currentEntry?.id === id) setCurrentEntry(updated);
    return updated;
  }, [currentEntry, fetchGamification]);

  const deleteEntry = useCallback(async (id: string) => {
    await JournalService.deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setTotal((prev) => prev - 1);
    if (currentEntry?.id === id) setCurrentEntry(null);
    // so-rhap: deleting a published entry can reduce the SoulBar (and
    // streak when the deletion crosses a day boundary). Refetch both —
    // the request-id guard above keeps a concurrent older fetch from
    // overwriting the new value. Pre-fix the bar stayed stale (visibly
    // too high) until the next Home focus.
    fetchGamification();
  }, [currentEntry, fetchGamification]);

  const saveDraft = useCallback(async (text: string, mood?: Mood, draftId?: string) => {
    if (draftId) {
      // so-hl09: belt-and-suspenders guard against the autosave-after-
      // finalize race. CreateJournalScreen.handleSave now cancels the
      // autosave timer + nulls draftId on finalize success, but if a
      // saveDraft call still slips through (e.g. a tick that already
      // started in the JS event loop before cancel() fired), do not
      // resurrect the published entry by PUT'ing is_draft:true. Look up
      // the draftId in entries-state; if it resolves to is_draft:false,
      // no-op and return the existing entry. The audit on so-z961 will
      // make the BE 409 published->draft transitions; this catches it
      // client-side first so we never even send the bad PUT.
      const existing = entriesRef.current.find((e) => e.id === draftId);
      if (existing && existing.is_draft === false) {
        console.warn(
          '[JournalContext] so-hl09: refused saveDraft against finalized entry',
          draftId,
        );
        return existing;
      }
      return await JournalService.updateEntry(draftId, { raw_text: text, mood, is_draft: true });
    }
    return await JournalService.createEntry(text, mood, true);
  }, []);

  const finalizeDraft = useCallback(async (draftId: string, text: string, mood?: Mood) => {
    const updated = await JournalService.updateEntry(draftId, {
      raw_text: text,
      mood,
      is_draft: false,
    });
    // so-cnd8: see updateEntry above for the rationale. Existence is derived
    // from the ref-mirrored state outside the updater; the inner check
    // still guards the list-shape decision against concurrent updates.
    const exists = entriesRef.current.some((e) => e.id === draftId);
    setEntries((prev) => {
      const stillExists = prev.some((e) => e.id === draftId);
      return stillExists ? prev.map((e) => (e.id === draftId ? updated : e)) : [updated, ...prev];
    });
    if (!exists) {
      setTotal((prev) => prev + 1);
    }
    fetchGamification();
    return updated;
  }, [fetchGamification]);

  // so-j2h9: compare against the user's local IANA day, not UTC. The BE
  // (so-byw) computes has_entry_today against users.timezone; an FE that
  // diffs UTC date strings locks the UI on legitimate next-day journals
  // whenever evening-UTC and morning-user-local fall on the same UTC date.
  // Prefer the BE-authoritative user.timezone (set by ensureTimezone), fall
  // back to the device zone if the user record hasn't hydrated yet.
  const hasEntryToday = useMemo(() => {
    const userTz = user?.timezone || getDeviceTimezone() || 'UTC';
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = fmt.format(new Date());
    return entries.some(
      (e) => !e.is_draft && fmt.format(new Date(e.created_at)) === todayStr,
    );
  }, [entries, user?.timezone]);

  // so-l304 F2: volatile state memo — re-creates whenever entries, streak,
  // or other display state changes. Components subscribed via useJournalState
  // re-render on this; those using useJournalActions do not.
  const stateValue: JournalStateType = useMemo(
    () => ({
      entries,
      isLoading,
      currentEntry,
      total,
      streak,
      soulBar,
      hasEntryToday,
    }),
    [entries, isLoading, currentEntry, total, streak, soulBar, hasEntryToday],
  );

  // so-l304 F2: stable actions memo — only re-creates if a callback
  // changes identity. All callbacks are useCallback with stable deps,
  // so in practice this memo value is stable across entry mutations.
  const actionsValue: JournalActionsType = useMemo(
    () => ({
      fetchEntries,
      createEntry,
      updateEntry,
      deleteEntry,
      setCurrentEntry,
      refreshEntries,
      fetchStreak,
      fetchSoulBar,
      fetchGamification,
      saveDraft,
      finalizeDraft,
      persistPendingFinalize,
    }),
    [
      fetchEntries,
      createEntry,
      updateEntry,
      deleteEntry,
      refreshEntries,
      fetchStreak,
      fetchSoulBar,
      fetchGamification,
      saveDraft,
      finalizeDraft,
      persistPendingFinalize,
    ],
  );

  return (
    <JournalActionsContext.Provider value={actionsValue}>
      <JournalStateContext.Provider value={stateValue}>
        {children}
      </JournalStateContext.Provider>
    </JournalActionsContext.Provider>
  );
};
