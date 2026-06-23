/**
 * so-jyw0: EntitlementContext + useEntitlement().
 *
 * Single source of truth for "can this user access SoulTalk Pro
 * features right now?" Composes two authorities:
 *
 *   1. Adapty SDK profile — the device-side cache of the user's paid
 *      access level. `isPro` derives from
 *      profile.accessLevels[ACCESS_LEVEL_PREMIUM]?.isActive. The SDK
 *      itself is updated server-side after purchases, restores, or
 *      external lifecycle events (renewals, cancellations) and
 *      pushes those through the onLatestProfileLoad listener.
 *
 *   2. Server /auth/me — the trial-clock authority. The backend owns
 *      `accessGranted` / `trialEndsAt` / `daysLeft` because the trial
 *      window must keep ticking when the device is offline, and we
 *      must not let a user game the clock locally. The Adapty profile
 *      does NOT carry the trial window — it tracks paid subscriptions
 *      only.
 *
 *   Together: a user has Pro features open when EITHER isPro (paid
 *   sub active) OR accessGranted (trial still valid OR explicit
 *   server grant).
 *
 * Mount inside <AuthProvider> so useAuth() is available. The
 * EntitlementProvider drives:
 *   - adapty.identify(user.id) when user transitions to non-null
 *   - adapty.logout() when user transitions to null
 *   - an onLatestProfileLoad listener for live SDK refreshes
 *   - a refresh() method consumers can call after a paywall close /
 *     restore / etc.
 *
 * Fail-closed: any SDK error path leaves isPro at false. We never
 * crash boot. We never grant Pro on error. Callers see
 * `accessGranted` (server-side, authoritative for the trial path) as
 * the floor for entitled access in degraded states.
 *
 * NON-GOAL (so-fwva is the follow-up): this provider DOES NOT render
 * a paywall, route to gating UI, or block navigation. It only exposes
 * state.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AdaptyProfile } from 'react-native-adapty';
import { useAuth } from './AuthContext';
import {
  ACCESS_LEVEL_PREMIUM,
  addProfileListener,
  getAdaptyProfile,
  identifyAdaptyUser,
  isPremiumFromProfile,
  logoutAdaptyUser,
} from '../services/adapty';
import { registerPostUnlockHook } from '../utils/authClient';

export interface EntitlementState {
  /**
   * Adapty premium access level isActive flag. Reflects paid
   * subscriptions only; trial state is carried separately via
   * accessGranted / trialEndsAt / daysLeft.
   */
  isPro: boolean;
  /**
   * Server-side aggregate: true when the user has any access right
   * to gated features (paid OR active trial OR explicit grant). The
   * trial-clock authority — never derive this from device time. May
   * be null briefly during /auth/me boot before the user object
   * lands.
   */
  accessGranted: boolean | null;
  /** ISO timestamp the trial expires at; null when no trial / Pro. */
  trialEndsAt: string | null;
  /** Whole days remaining on the trial; null when no trial. */
  daysLeft: number | null;
  /** Re-pull the Adapty profile (server-validated). */
  refresh: () => Promise<void>;
}

const DEFAULT_STATE: EntitlementState = {
  isPro: false,
  accessGranted: null,
  trialEndsAt: null,
  daysLeft: null,
  refresh: async () => {},
};

const EntitlementContext = createContext<EntitlementState>(DEFAULT_STATE);

export const useEntitlement = (): EntitlementState =>
  useContext(EntitlementContext);

// Tolerant readers for the trial-window fields on the user object.
// The current UserInfo type doesn't declare these because the
// server-side contract (so-be trial endpoints) is paired work; we
// read them defensively so the client compiles today and lights up
// when the BE ships. snake_case mirrors the FastAPI convention used
// across /auth/me; we also try a couple of camelCase fallbacks so a
// future serialiser change doesn't silently break us.
const readBool = (u: any, ...keys: string[]): boolean | null => {
  for (const k of keys) {
    const v = u?.[k];
    if (typeof v === 'boolean') return v;
  }
  return null;
};
const readString = (u: any, ...keys: string[]): string | null => {
  for (const k of keys) {
    const v = u?.[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
};
const readInt = (u: any, ...keys: string[]): number | null => {
  for (const k of keys) {
    const v = u?.[k];
    if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  }
  return null;
};

interface EntitlementProviderProps {
  children: ReactNode;
}

export const EntitlementProvider: React.FC<EntitlementProviderProps> = ({
  children,
}) => {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [profile, setProfile] = useState<AdaptyProfile | null>(null);

  // Track the last user id we identified so we don't fire
  // adapty.identify() on every render where the user object identity
  // changes but the id is unchanged.
  const lastIdentifiedRef = useRef<string | null>(null);

  // Pull the cached Adapty profile. Setting state to whatever the
  // SDK returned — isPremiumFromProfile handles null safely so the
  // unauthenticated / inactive-SDK paths land at isPro=false without
  // a branch here.
  const pullProfile = useCallback(async () => {
    const next = await getAdaptyProfile();
    setProfile(next);
  }, []);

  // Identify / logout side effects. We do these here (not in
  // AuthContext) so the auth layer stays free of Adapty imports — a
  // single useEffect listens for user transitions and keeps the SDK
  // session in lockstep.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (user?.id) {
        if (lastIdentifiedRef.current === user.id) return;
        lastIdentifiedRef.current = user.id;
        await identifyAdaptyUser(user.id);
        if (cancelled) return;
        // Re-pull the profile post-identify so the access-level
        // resolves under the new identity (the SDK's auto-refresh
        // catches this too via onLatestProfileLoad, but pulling
        // explicitly here avoids a one-tick window where isPro lags).
        await pullProfile();
      } else if (lastIdentifiedRef.current !== null) {
        lastIdentifiedRef.current = null;
        await logoutAdaptyUser();
        if (cancelled) return;
        setProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, pullProfile]);

  // Initial profile pull when authentication settles, even if the
  // user id hasn't changed (e.g. cold start with a stored session).
  useEffect(() => {
    if (!isAuthenticated) return;
    pullProfile();
  }, [isAuthenticated, pullProfile]);

  // Live SDK refresh listener. The SDK pushes a fresh profile on
  // server-side changes (renewals, cancellations, restores,
  // background lifecycle); we just mirror it into local state.
  useEffect(() => {
    const unsubscribe = addProfileListener((next) => {
      setProfile(next);
    });
    return unsubscribe;
  }, []);

  // so-fwva: register a post-unlock hook with the shared axios layer
  // so the 402 interceptor can refetch /auth/me after a successful
  // paywall purchase + propagate the new access_granted / is_pro
  // values into the EntitlementContext (and the rest of the app) in
  // the same tick the original request gets retried. Also pulls a
  // fresh Adapty profile so isPro reflects the unlock immediately.
  useEffect(() => {
    registerPostUnlockHook(async () => {
      try {
        await refreshUser();
      } catch (err) {
        // Ignored; refreshUser logs its own failures and the next
        // natural refresh will catch up.
      }
      await pullProfile();
    });
    return () => registerPostUnlockHook(null);
  }, [refreshUser, pullProfile]);

  const isPro = useMemo(() => isPremiumFromProfile(profile), [profile]);

  // Trial-window fields come straight from /auth/me via the user
  // object. Server is the trial-clock authority; we never compute
  // daysLeft from device time here.
  const accessGranted = useMemo(
    () => readBool(user, 'access_granted', 'accessGranted'),
    [user],
  );
  const trialEndsAt = useMemo(
    () => readString(user, 'trial_ends_at', 'trialEndsAt'),
    [user],
  );
  const daysLeft = useMemo(
    () => readInt(user, 'days_left', 'daysLeft'),
    [user],
  );

  const value = useMemo<EntitlementState>(
    () => ({
      isPro,
      accessGranted,
      trialEndsAt,
      daysLeft,
      refresh: pullProfile,
    }),
    [isPro, accessGranted, trialEndsAt, daysLeft, pullProfile],
  );

  return (
    <EntitlementContext.Provider value={value}>
      {children}
    </EntitlementContext.Provider>
  );
};

// Re-export the access-level constant from the service module so
// callers that need to reference the Adapty id (e.g. so-fwva paywall
// presentation) can pull it from one consistent entry point.
export { ACCESS_LEVEL_PREMIUM };

export default EntitlementProvider;
