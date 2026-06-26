import { useRef, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { getValidToken, refreshAccessToken } from '../utils/authClient';
import { presentPaywall } from '../services/paywall';

type MessageHandler = (data: any) => void;

const AUTH_FAILURE_CODE = 4001;
// WS-M4: server closes with 4002 when the connection needs an active
// subscription. Terminal (like an HTTP 402) — stop reconnecting and route to
// the paywall/entitlement-refresh flow.
const SUBSCRIPTION_REQUIRED_CODE = 4002;

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
    // WS-M1: do NOT reset retriesRef here. connect() calls cleanup() first, so
    // resetting on every reconnect pinned the backoff at 2**0=1s forever and
    // MAX_RETRIES never tripped → infinite 1s reconnect on any outage. The
    // counter is reset only on a successful onopen and on auth teardown.
  }, []);

  const connect = useCallback(async () => {
    cleanup();

    // so-u0c9: use getValidToken() instead of a raw SecureStorage read so
    // the WS always authenticates with a fresh access token. getValidToken()
    // checks the JWT exp claim and calls refreshAccessToken() (coalesced with
    // any concurrent HTTP refresh) if the token is expired or near-expiry.
    // This eliminates the stale-token 4001 close that used to trigger a
    // second, uncoordinated refresh after a long background session.
    const token = await getValidToken();
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
        // WS-M2: reply to the server heartbeat so its dead-client detection
        // stays enabled. Protocol-level — not forwarded to the app handler.
        if (data?.event === 'ping') {
          ws.send(JSON.stringify({ event: 'pong' }));
          return;
        }
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

      // WS-M4/ENT-M4: subscription_required is terminal — do not reconnect.
      // Route to the same paywall/entitlement-refresh flow as an HTTP 402
      // (presentPaywall is in-flight-coalesced, so a concurrent 402 won't
      // double-present).
      if (event.code === SUBSCRIPTION_REQUIRED_CODE) {
        presentPaywall().catch(() => {});
        return;
      }

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
      // WS-M1: auth teardown is an explicit reset point for the backoff so the
      // next login starts fresh.
      retriesRef.current = 0;
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
      // WS-M1: do NOT reset retriesRef here — AppState 'active' / NetInfo
      // regain fire frequently, and resetting re-armed the 1s reconnect loop.
      // connect() still makes one attempt; a successful onopen resets the
      // counter, and if we're past MAX_RETRIES a failed attempt gives up
      // cleanly instead of looping.
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
