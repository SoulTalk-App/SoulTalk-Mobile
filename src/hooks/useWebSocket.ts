import { useRef, useEffect, useCallback } from 'react';
import Constants from 'expo-constants';
import axios from 'axios';
import SecureStorage from '../utils/SecureStorage';

type MessageHandler = (data: any) => void;

const AUTH_FAILURE_CODE = 4001;

const getWsUrl = (): string => {
  const apiBaseUrl =
    Constants.expoConfig?.extra?.apiConfig?.baseUrl || 'http://localhost:8000/api';
  // Convert http(s)://host:port/api -> ws(s)://host:port/ws
  return apiBaseUrl
    .replace(/^http/, 'ws')
    .replace(/\/api$/, '/ws');
};

const getApiBaseUrl = (): string =>
  Constants.expoConfig?.extra?.apiConfig?.baseUrl || 'http://localhost:8000/api';

const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await SecureStorage.getItem('refresh_token');
    if (!refreshToken) return null;

    const resp = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    const { access_token, refresh_token: newRefresh } = resp.data;
    await SecureStorage.setItem('access_token', access_token);
    await SecureStorage.setItem('refresh_token', newRefresh);
    return access_token;
  } catch {
    return null;
  }
};

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
