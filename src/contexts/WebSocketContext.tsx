import React, { createContext, useContext, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

type EventHandler = (data: any) => void;

interface WebSocketContextType {
  subscribe: (event: string, handler: EventHandler) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWS = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWS must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

// so-8702: stream event types for which late subscribers receive a replay
// of buffered events within REPLAY_WINDOW_MS. Covers the navigation gap
// between CreateJournalScreen navigating to JournalEntryScreen and JES's
// useEffect subscription registering — without this, response_stream_start
// (and early tokens) that arrive during the navigation animation are lost.
const REPLAY_STREAM_EVENTS = new Set([
  'response_stream_start',
  'response_token',
  'response_stream_end',
  'response_stream_error',
]);
const REPLAY_WINDOW_MS = 5000;

type BufferedEvent = { event: string; data: any; ts: number };

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const listenersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  // so-8702: short-lived ring buffer for stream events.
  const replayRef = useRef<BufferedEvent[]>([]);

  const handleMessage = useCallback((data: any) => {
    const event = data?.event;
    if (!event) return;
    // so-8702: buffer stream events for late-subscriber replay.
    if (REPLAY_STREAM_EVENTS.has(event)) {
      const now = Date.now();
      replayRef.current.push({ event, data, ts: now });
      // Prune entries older than the replay window to bound memory.
      replayRef.current = replayRef.current.filter((b) => now - b.ts < REPLAY_WINDOW_MS);
    }
    const handlers = listenersRef.current.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }, []);

  useWebSocket(isAuthenticated, handleMessage);

  const subscribe = useCallback((event: string, handler: EventHandler) => {
    // so-8702: replay any buffered stream events so a subscriber that
    // registers during navigation doesn't miss tokens. Events are replayed
    // in arrival order before the handler is added to the live set, giving
    // the caller a consistent historical sequence followed by live events.
    if (REPLAY_STREAM_EVENTS.has(event)) {
      const now = Date.now();
      // so-wcz1: compute the highest generation seen per entry_id across
      // ALL buffered events. Only replay events from the latest generation
      // so stale/superseded runs never surface to a late subscriber.
      const maxGenByEntry = new Map<string, number>();
      replayRef.current.forEach((b) => {
        const eid = b.data.entry_id;
        const gen = b.data.generation ?? 0;
        if (eid != null) {
          maxGenByEntry.set(eid, Math.max(maxGenByEntry.get(eid) ?? -1, gen));
        }
      });
      replayRef.current
        .filter((b) => {
          if (b.event !== event || now - b.ts >= REPLAY_WINDOW_MS) return false;
          const eid = b.data.entry_id;
          if (eid == null) return true; // no entry_id — replay as-is
          const bGen = b.data.generation ?? 0;
          return bGen >= (maxGenByEntry.get(eid) ?? 0);
        })
        .forEach((b) => handler(b.data));
    }
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = listenersRef.current.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          listenersRef.current.delete(event);
        }
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};
