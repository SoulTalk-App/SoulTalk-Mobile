import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import JournalService, {
  JournalEntry,
  Mood,
  ListEntriesParams,
  StreakResponse,
  SoulBarResponse,
} from '../services/JournalService';
import { useWS } from './WebSocketContext';

interface JournalContextType {
  entries: JournalEntry[];
  isLoading: boolean;
  currentEntry: JournalEntry | null;
  total: number;
  streak: StreakResponse | null;
  soulBar: SoulBarResponse | null;
  fetchEntries: (params?: ListEntriesParams) => Promise<void>;
  createEntry: (rawText: string, mood?: Mood, isDraft?: boolean) => Promise<JournalEntry>;
  updateEntry: (id: string, data: { raw_text?: string; mood?: Mood; is_draft?: boolean }) => Promise<JournalEntry>;
  deleteEntry: (id: string) => Promise<void>;
  setCurrentEntry: (entry: JournalEntry | null) => void;
  refreshEntries: () => Promise<void>;
  fetchStreak: () => Promise<void>;
  fetchSoulBar: () => Promise<void>;
  saveDraft: (text: string, mood?: Mood, draftId?: string) => Promise<JournalEntry>;
  finalizeDraft: (draftId: string, text: string, mood?: Mood) => Promise<JournalEntry>;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (context === undefined) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return context;
};

interface JournalProviderProps {
  children: ReactNode;
}

export const JournalProvider: React.FC<JournalProviderProps> = ({ children }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [total, setTotal] = useState(0);
  const [lastParams, setLastParams] = useState<ListEntriesParams | undefined>();
  const [streak, setStreak] = useState<StreakResponse | null>(null);
  const [soulBar, setSoulBar] = useState<SoulBarResponse | null>(null);
  const { subscribe } = useWS();

  // Subscribe to AI processing completion events
  useEffect(() => {
    const unsubscribe = subscribe('journal_ai_complete', (data: any) => {
      const { entry_id, event, ...aiFields } = data;
      const update = (entry: JournalEntry): JournalEntry =>
        entry.id === entry_id ? { ...entry, ...aiFields } : entry;

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

  const fetchStreak = useCallback(async () => {
    try {
      const data = await JournalService.getStreak();
      setStreak(data);
    } catch (error) {
      console.error('Failed to fetch streak:', error);
    }
  }, []);

  const fetchSoulBar = useCallback(async () => {
    try {
      const data = await JournalService.getSoulBar();
      setSoulBar(data);
    } catch (error) {
      console.error('Failed to fetch soul bar:', error);
    }
  }, []);

  // Fetch streak and soulBar on mount
  useEffect(() => {
    fetchStreak();
    fetchSoulBar();
  }, [fetchStreak, fetchSoulBar]);

  const createEntry = useCallback(async (rawText: string, mood?: Mood, isDraft: boolean = false) => {
    const entry = await JournalService.createEntry(rawText, mood, isDraft);
    if (!isDraft) {
      // Prepend to local state (newest first)
      setEntries((prev) => [entry, ...prev]);
      setTotal((prev) => prev + 1);
      // Re-fetch streak and soulBar after non-draft creation
      fetchStreak();
      fetchSoulBar();
    }
    return entry;
  }, [fetchStreak, fetchSoulBar]);

  const updateEntry = useCallback(async (id: string, data: { raw_text?: string; mood?: Mood; is_draft?: boolean }) => {
    const updated = await JournalService.updateEntry(id, data);
    // If draft was finalized, add to entries list and refresh gamification
    if (data.is_draft === false) {
      setEntries((prev) => {
        const exists = prev.some((e) => e.id === id);
        return exists ? prev.map((e) => (e.id === id ? updated : e)) : [updated, ...prev];
      });
      setTotal((prev) => prev + 1);
      fetchStreak();
      fetchSoulBar();
    } else {
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    }
    if (currentEntry?.id === id) setCurrentEntry(updated);
    return updated;
  }, [currentEntry, fetchStreak, fetchSoulBar]);

  const deleteEntry = useCallback(async (id: string) => {
    await JournalService.deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setTotal((prev) => prev - 1);
    if (currentEntry?.id === id) setCurrentEntry(null);
  }, [currentEntry]);

  const saveDraft = useCallback(async (text: string, mood?: Mood, draftId?: string) => {
    if (draftId) {
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
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === draftId);
      return exists ? prev.map((e) => (e.id === draftId ? updated : e)) : [updated, ...prev];
    });
    setTotal((prev) => prev + 1);
    fetchStreak();
    fetchSoulBar();
    return updated;
  }, [fetchStreak, fetchSoulBar]);

  const value: JournalContextType = {
    entries,
    isLoading,
    currentEntry,
    total,
    streak,
    soulBar,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    setCurrentEntry,
    refreshEntries,
    fetchStreak,
    fetchSoulBar,
    saveDraft,
    finalizeDraft,
  };

  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
};
