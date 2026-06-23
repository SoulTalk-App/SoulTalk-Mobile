/**
 * so-jyw0: Adapty mobile SDK foundation.
 *
 * Thin wrapper around `react-native-adapty` so the rest of the app
 * touches one module and never imports the SDK directly. The
 * EntitlementContext (src/contexts/EntitlementContext.tsx) consumes
 * this surface; App.tsx calls activateAdapty() at module load.
 *
 *  - activateAdapty()           — boot the SDK once with the public
 *                                  SDK key (config-supplied per
 *                                  infra so-153d). Idempotent; later
 *                                  calls no-op so a hot reload doesn't
 *                                  double-activate.
 *  - identifyAdaptyUser(userId) — link the device session to the
 *                                  authenticated SoulTalk user id so
 *                                  Adapty profiles + access levels
 *                                  resolve per user.
 *  - logoutAdaptyUser()         — break the link on app logout /
 *                                  account delete so a subsequent
 *                                  sign-in starts fresh.
 *  - getAdaptyProfile()         — one-shot read of the cached profile
 *                                  (entitlement provider uses this on
 *                                  mount).
 *  - addProfileListener(cb)     — subscribe to the SDK's
 *                                  `onLatestProfileLoad` event so the
 *                                  entitlement provider refreshes
 *                                  whenever the SDK pulls a new
 *                                  server-side profile.
 *
 * Premium access-level id is held here as a named constant so call
 * sites read `ACCESS_LEVEL_PREMIUM` instead of a raw string. The id
 * itself comes from the Adapty dashboard ("premium" is the default
 * Adapty starter id; if Overseer configures a different id the value
 * here is the single source of truth to change).
 *
 * Fail-closed design:
 *   - Missing publicSdkKey → log a single warning and SKIP activation.
 *     getAdaptyProfile() / identifyAdaptyUser() / logoutAdaptyUser()
 *     become safe no-ops so the rest of the app keeps booting.
 *   - SDK exceptions are caught at every boundary and logged. The
 *     entitlement provider falls back to the server-side accessGranted
 *     value in that case (server is the trial-clock authority — see
 *     EntitlementContext for the policy).
 *
 * iOS-only target this round. Android initialisation is a no-op (the
 * native module is iOS-bound per the bead spec, and we don't want a
 * partial Adapty init to surface ambiguous entitlement state on
 * Android while it's out of scope). When Android lands, drop the
 * Platform gate.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { adapty, type AdaptyProfile } from 'react-native-adapty';

/**
 * The Adapty dashboard access-level id that gates SoulTalk premium
 * features. 'premium' is the Adapty starter default; if Overseer
 * renames it in the dashboard, update this constant. Read at every
 * call site via `ACCESS_LEVEL_PREMIUM` so a rename is one-line.
 */
export const ACCESS_LEVEL_PREMIUM = 'premium';

const LOG_PREFIX = '[adapty]';

// Module-scope flag so a hot reload or duplicate activate() call
// doesn't re-activate the native SDK (which logs warnings and is
// wasteful). React StrictMode in dev also triggers effects twice; this
// is a backstop for that path.
let activated = false;
let activationFailedReason: string | null = null;
// Caches the in-flight activation so concurrent callers (App.tsx's boot-side
// kick-off + EntitlementProvider's mount/identify effects) coalesce onto a
// single adapty.activate() instead of racing two native activations. Cleared
// is unnecessary: once resolved, `activated` short-circuits before we look here.
let activationPromise: Promise<void> | null = null;

const getPublicSdkKey = (): string | null => {
  // so-153d wired the key through Constants.expoConfig.extra.adaptyConfig.
  // Defensive optional chains in case the infra commit hasn't landed in
  // a given environment — we'd rather no-op than crash boot.
  const key = (Constants.expoConfig as any)?.extra?.adaptyConfig
    ?.publicSdkKey;
  if (typeof key !== 'string') return null;
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const isAdaptyActive = (): boolean => activated;

export const getAdaptyActivationError = (): string | null =>
  activationFailedReason;

/**
 * Boot the SDK once. Safe to call multiple times. Async so callers
 * can await first activation if they need profile data immediately;
 * fire-and-forget is fine for App.tsx's boot-side call.
 */
export const activateAdapty = (): Promise<void> => {
  if (activated) return Promise.resolve();
  if (activationPromise) return activationPromise;
  activationPromise = activateAdaptyInner();
  return activationPromise;
};

const activateAdaptyInner = async (): Promise<void> => {
  if (Platform.OS !== 'ios') {
    // iOS-only this round (see file header). Mark "activated" so
    // identify/logout calls become no-ops without per-call Platform
    // checks scattered around the entitlement layer.
    activated = true;
    activationFailedReason = 'android-not-yet-supported';
    return;
  }
  const apiKey = getPublicSdkKey();
  if (!apiKey) {
    activationFailedReason = 'missing-public-sdk-key';
    if (__DEV__) {
      console.warn(
        `${LOG_PREFIX} ADAPTY_PUBLIC_SDK_KEY missing from app.config extra — skipping activate(). ` +
          `Entitlement layer will fall back to server-side accessGranted only.`,
      );
    }
    // Mark activated so subsequent identify/logout calls no-op
    // quietly. We treat "no key configured" as a soft-disable, not an
    // error.
    activated = true;
    return;
  }
  try {
    await adapty.activate(apiKey);
    activated = true;
    activationFailedReason = null;
  } catch (err: any) {
    activationFailedReason = err?.message ?? 'unknown-activate-error';
    // Don't rethrow — fail closed (no Pro), but the app must keep
    // booting. The entitlement provider falls back to the server-side
    // accessGranted in this state.
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} activate() failed:`, err);
    }
  }
};

/**
 * Tag the current Adapty session with our authenticated user id so
 * profiles + paid access levels resolve per user across devices.
 * Idempotent at the SDK level — repeated calls with the same id are
 * safe (Adapty short-circuits internally).
 */
export const identifyAdaptyUser = async (userId: string): Promise<void> => {
  if (!activated) return;
  if (activationFailedReason) return;
  if (Platform.OS !== 'ios') return;
  if (!userId) return;
  try {
    await adapty.identify(userId);
  } catch (err) {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} identify(${userId}) failed:`, err);
    }
  }
};

/**
 * Break the device → user link on logout / delete-account so a
 * subsequent sign-in (possibly a different user on the same device)
 * starts with a clean Adapty session.
 */
export const logoutAdaptyUser = async (): Promise<void> => {
  if (!activated) return;
  if (activationFailedReason) return;
  if (Platform.OS !== 'ios') return;
  try {
    await adapty.logout();
  } catch (err) {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} logout() failed:`, err);
    }
  }
};

/**
 * One-shot read of the cached Adapty profile. Returns null when the
 * SDK isn't active or the call fails — the entitlement provider
 * treats null as "no Pro from SDK" and falls back to the server-side
 * accessGranted. Never throws.
 */
export const getAdaptyProfile = async (): Promise<AdaptyProfile | null> => {
  if (!activated || activationFailedReason) return null;
  if (Platform.OS !== 'ios') return null;
  try {
    const profile = await adapty.getProfile();
    return profile ?? null;
  } catch (err) {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} getProfile() failed:`, err);
    }
    return null;
  }
};

/**
 * Subscribe to the SDK's onLatestProfileLoad event. The SDK fires
 * this whenever it pulls a new server-side profile (post-purchase,
 * post-restore, periodic refresh) — the entitlement provider uses it
 * to re-derive isPro without polling.
 *
 * Returns the unsubscribe function; callers must invoke it on
 * cleanup so the listener is detached before the provider unmounts.
 */
export const addProfileListener = (
  callback: (profile: AdaptyProfile) => void,
): (() => void) => {
  if (!activated || activationFailedReason) {
    return () => {};
  }
  if (Platform.OS !== 'ios') {
    return () => {};
  }
  try {
    const subscription = adapty.addEventListener(
      'onLatestProfileLoad',
      callback,
    );
    // react-native-adapty's addEventListener returns an EmitterSubscription
    // with a .remove() — wrap it as the standard unsubscribe shape so the
    // caller doesn't depend on the SDK's exact return type.
    return () => {
      try {
        subscription?.remove?.();
      } catch (err) {
        if (__DEV__) {
          console.warn(`${LOG_PREFIX} listener remove() failed:`, err);
        }
      }
    };
  } catch (err) {
    if (__DEV__) {
      console.warn(`${LOG_PREFIX} addEventListener failed:`, err);
    }
    return () => {};
  }
};

/**
 * Pure helper: derive the SoulTalk premium isPro flag from an Adapty
 * profile. Exposed for the entitlement provider so the access-level
 * lookup lives in one place.
 */
export const isPremiumFromProfile = (
  profile: AdaptyProfile | null,
): boolean => {
  if (!profile) return false;
  const level = profile.accessLevels?.[ACCESS_LEVEL_PREMIUM];
  return Boolean(level?.isActive);
};
