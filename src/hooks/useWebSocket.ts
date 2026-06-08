import { useRef, useEffect, useCallback } from 'react';
import Constants from 'expo-constants';
import SecureStorage from '../utils/SecureStorage';
import { refreshAccessToken } from '../utils/authClient';

type MessageHandler = (data: any) => void;

const AUTH_FAILURE_CODE = 4001;

const getWsUrl = (): string => {
  const apiBaseUrl =
    Constants.expoConfig?.extra?.apiConfig?.baseUrl || 'https://soultalkapp.com/api';
  // Convert http(s)://host:port/api -> ws(s)://host:port/ws
  return apiBaseUrl
    .replace(/^http/, 'ws')
    .replace(/\/api$/, '/ws');
};

// so-605p: refresh now coalesces with every authed axios client via the
// shared single-flight helper in utils/authClient. The WS auth-failure
// reconnect path used to ship its own non-coalesced refresh — if a 4001 hit
// at the same instant as an HTTP 401, both would refresh and clobber.

export const useWebSocket = (
  isAuthenticated: boolean,
  onMessage: MessageHandler,
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const MAX_RETRIES = 8;
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const cleanup = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent reconnect loop
      wsRef.current.close();
      wsRef.current = null;
    }
    retriesRef.current = 0;
  }, []);

  const connect = useCallback(async () => {
    cleanup();

    const token = await SecureStorage.getItem('access_token');
    if (!token) return;

    const url = getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      // Send JWT as first message for authentication
      ws.send(token);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current(data);
      } catch {
        // ignore non-JSON messages
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror, reconnect handled there
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      if (retriesRef.current >= MAX_RETRIES) return;

      const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
      retriesRef.current += 1;

      if (event.code === AUTH_FAILURE_CODE) {
        // Token was rejected — refresh it before reconnecting
        reconnectTimer.current = setTimeout(async () => {
          const newToken = await refreshAccessToken();
          if (newToken) {
            connect();
          }
          // If refresh failed, stop retrying — user likely logged out
        }, delay);
      } else {
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };
  }, [cleanup]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      cleanup();
    }
    return cleanup;
  }, [isAuthenticated, connect, cleanup]);

  return wsRef;
};
