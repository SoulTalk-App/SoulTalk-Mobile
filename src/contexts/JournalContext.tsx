import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import JournalService, {
  JournalEntry,
  Mood,
  ListEntriesParams,
} from '../services/JournalService';
import { useWS } from './WebSocketContext';

interface JournalContextType {
  entries: JournalEntry[];
  isLoading: boolean;
  currentEntry: JournalEntry | null;
  total: number;
  fetchEntries: (params?: ListEntriesParams) => Promise<void>;
  createEntry: (rawText: string, mood?: Mood) => Promise<JournalEntry>;
  updateEntry: (id: string, data: { raw_text?: string; mood?: Mood }) => Promise<JournalEntry>;
  deleteEntry: (id: string) => Promise<void>;
  setCurrentEntry: (entry: JournalEntry | null) => void;
  refreshEntries: () => Promise<void>;
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

  const createEntry = useCallback(async (rawText: string, mood?: Mood) => {
    const entry = await JournalService.createEntry(rawText, mood);
    // Prepend to local state (newest first)
    setEntries((prev) => [entry, ...prev]);
    setTotal((prev) => prev + 1);
    return entry;
  }, []);

  const updateEntry = useCallback(async (id: string, data: { raw_text?: string; mood?: Mood }) => {
    const updated = await JournalService.updateEntry(id, data);
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    if (currentEntry?.id === id) setCurrentEntry(updated);
    return updated;
  }, [currentEntry]);

  const deleteEntry = useCallback(async (id: string) => {
    await JournalService.deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setTotal((prev) => prev - 1);
    if (currentEntry?.id === id) setCurrentEntry(null);
  }, [currentEntry]);

  const value: JournalContextType = {
    entries,
    isLoading,
    currentEntry,
    total,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    setCurrentEntry,
    refreshEntries,
  };

  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
};
