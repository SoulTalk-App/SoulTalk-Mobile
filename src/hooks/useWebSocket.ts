import { useRef, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
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

  // so-3wjm: re-poke the socket on AppState 'active' transition and on
  // NetInfo connectivity regain. Pre-fix: retriesRef only reset on onopen
  // or cleanup. After a long background or a flaky network, the exponential
  // backoff would burn through MAX_RETRIES (8) and the WS would silently
  // give up — live journal_ai_complete events stopped arriving until app
  // kill or isAuthenticated toggle.
  //
  // Strategy: each external "we might be alive again" signal resets
  // retriesRef and triggers a connect() if no live socket exists. Wrapped
  // in a single effect that listens to both sources so they share the same
  // gate (authenticated + open required).
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshSocket = () => {
      // No-op if a healthy socket is already open. OPEN=1, CONNECTING=0.
      const ws = wsRef.current;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
      }
      retriesRef.current = 0;
      connect();
    };

    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshSocket();
    });

    const netInfoUnsub = NetInfo.addEventListener((state) => {
      // isConnected can be null on first emit — treat unknown as "no signal,
      // don't act." Only react to a confirmed-true regain.
      if (state.isConnected === true) refreshSocket();
    });

    return () => {
      appStateSub.remove();
      netInfoUnsub();
    };
  }, [isAuthenticated, connect]);

  return wsRef;
};
