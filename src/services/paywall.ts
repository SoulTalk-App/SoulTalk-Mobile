/**
 * so-fwva: Adapty paywall presentation, restore, manage-subscription.
 *
 * Thin imperative wrapper around Adapty's Paywall Builder. We do NOT
 * hand-roll the paywall UI — `@adapty/react-native-ui` presents a
 * native iOS view configured from the Adapty dashboard.
 *
 *  - presentPaywall()          — fetch the placement, build a native
 *                                view, present it. Resolves with the
 *                                outcome (purchased / restored /
 *                                dismissed / error). Subsequent calls
 *                                while a paywall is already on-screen
 *                                coalesce onto the same promise.
 *  - restorePurchases()        — Settings affordance. Returns the
 *                                refreshed profile so callers can
 *                                surface success/failure.
 *  - openManageSubscription()  — Apple deep-link to /account/subscriptions
 *                                (Adapty has no Customer Center).
 *
 * PLACEMENT_ID is the Adapty dashboard placement that decides WHICH
 * paywall variant ships at runtime. Remote-configurable — code only
 * names the placement, never the products.
 *
 * Fail-closed:
 *   - SDK inactive (no key / Platform!=='ios' / activate() failed) →
 *     presentPaywall returns 'sdk-inactive' so the caller can fall
 *     back to a friendly themed message instead of a silent no-op.
 *   - Adapty fetch / build / present errors → return 'error' with a
 *     normalized message. Never throws; never crashes the calling
 *     screen.
 */
import { Linking, Platform } from 'react-native';
import { adapty } from 'react-native-adapty';
import { createPaywallView } from '@adapty/react-native-ui';
import {
  getAdaptyActivationError,
  getAdaptyProfile,
  isAdaptyActive,
  isPremiumFromProfile,
} from './adapty';
import { normalizeError } from '../utils/normalizeError';

/**
 * Adapty Placement that controls WHICH paywall variant ships. Remote-
 * configured in the Adapty dashboard → Placements. If Overseer renames
 * it, change this one constant.
 *
 * 'placement_main' is the live Adapty dashboard placement id; if the
 * dashboard renames it, this is the single source of truth to update.
 */
export const PAYWALL_PLACEMENT_ID = 'placement_main';

/** Apple-managed subscription centre — deep link from Settings. */
const APPLE_SUBSCRIPTIONS_URL = 'itms-apps://apps.apple.com/account/subscriptions';

const LOG_PREFIX = '[paywall]';

export type PaywallOutcome =
  | { kind: 'purchased' }
  | { kind: 'restored'; isPremium: boolean }
  | { kind: 'dismissed' }
  | { kind: 'sdk-inactive'; reason: string }
  | { kind: 'error'; message: string };

// In-flight presentation is coalesced so a 402-burst (e.g. several
// service calls firing simultaneously) results in ONE paywall view,
// not N stacked modals. Cleared in the finally of the inner promise.
let inflightPresent: Promise<PaywallOutcome> | null = null;

const friendlyError = (err: unknown): PaywallOutcome => ({
  kind: 'error',
  message: normalizeError(err),
});

/**
 * Present the Adapty paywall. Resolves once the view dismisses with
 * the outcome encoded for the caller. Concurrent calls share the same
 * presentation.
 */
export const presentPaywall = async (
  placementId: string = PAYWALL_PLACEMENT_ID,
): Promise<PaywallOutcome> => {
  if (inflightPresent) return inflightPresent;

  if (!isAdaptyActive() || Platform.OS !== 'ios') {
    return {
      kind: 'sdk-inactive',
      reason: getAdaptyActivationError() ?? 'sdk-not-active',
    };
  }

  inflightPresent = (async (): Promise<PaywallOutcome> => {
    try {
      const paywall = await adapty.getPaywall(placementId);
      const view = await createPaywallView(paywall);

      // Promise that resolves when the native view tears down with a
      // decisive outcome. We set listeners BEFORE calling present() so
      // a fast purchase (sandbox testers tap-through quickly) can't
      // race the subscription wire-up.
      const outcome = new Promise<PaywallOutcome>((resolve) => {
        view.registerEventHandlers({
          onPurchaseCompleted: (_product, _profile) => {
            view.dismiss();
            resolve({ kind: 'purchased' });
          },
          onRestoreCompleted: (profile) => {
            view.dismiss();
            resolve({
              kind: 'restored',
              isPremium: isPremiumFromProfile(profile),
            });
          },
          onCloseButtonPress: () => {
            view.dismiss();
            resolve({ kind: 'dismissed' });
          },
          onPurchaseFailed: (error) => {
            // Don't dismiss on a single failed attempt — the user may
            // retry from the paywall. Only the close button + a real
            // purchase / restore drive dismissal.
            if (__DEV__) console.warn(`${LOG_PREFIX} purchase failed:`, error);
            return false;
          },
          onRenderingFailed: (error) => {
            if (__DEV__) console.warn(`${LOG_PREFIX} render failed:`, error);
            view.dismiss();
            resolve({ kind: 'error', message: normalizeError(error) });
            return true;
          },
          onLoadingProductsFailed: (error) => {
            if (__DEV__)
              console.warn(`${LOG_PREFIX} products load failed:`, error);
            // Keep the view up — Adapty surfaces the failure inline. The
            // user may close out themselves.
            return false;
          },
        });
      });

      await view.present();
      return await outcome;
    } catch (err) {
      if (__DEV__) console.warn(`${LOG_PREFIX} presentPaywall threw:`, err);
      return friendlyError(err);
    } finally {
      inflightPresent = null;
    }
  })();

  return inflightPresent;
};

/**
 * Settings affordance. Asks Adapty to consult Apple for any prior
 * purchases tied to the current Apple ID and merge them into the
 * device profile. Returns whether the user now has Pro access.
 */
export const restorePurchases = async (): Promise<PaywallOutcome> => {
  if (!isAdaptyActive() || Platform.OS !== 'ios') {
    return {
      kind: 'sdk-inactive',
      reason: getAdaptyActivationError() ?? 'sdk-not-active',
    };
  }
  try {
    const profile = await adapty.restorePurchases();
    return {
      kind: 'restored',
      isPremium: isPremiumFromProfile(profile),
    };
  } catch (err) {
    if (__DEV__) console.warn(`${LOG_PREFIX} restorePurchases failed:`, err);
    return friendlyError(err);
  }
};

/**
 * Apple-managed subscriptions deep link. iOS opens the subscriptions
 * page; on web/Android (out of scope but defensive) we no-op.
 */
export const openManageSubscription = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;
  try {
    const supported = await Linking.canOpenURL(APPLE_SUBSCRIPTIONS_URL);
    if (!supported) return false;
    await Linking.openURL(APPLE_SUBSCRIPTIONS_URL);
    return true;
  } catch (err) {
    if (__DEV__)
      console.warn(`${LOG_PREFIX} openManageSubscription failed:`, err);
    return false;
  }
};

/**
 * Convenience used by the 402 interceptor and PaywallGateScreen: was
 * the most recent presentation a successful unlock? Either an active
 * purchase or a restore that brings the Adapty profile to Pro counts.
 */
export const wasUnlocked = (outcome: PaywallOutcome): boolean => {
  if (outcome.kind === 'purchased') return true;
  if (outcome.kind === 'restored') return outcome.isPremium;
  return false;
};

/**
 * Final-source-of-truth check that pulls a fresh Adapty profile and
 * answers "is the user Pro right now?" The 402 interceptor uses this
 * after presentPaywall so a successful purchase that took a moment
 * to propagate through Adapty's webhook isn't missed.
 */
export const checkAdaptyPro = async (): Promise<boolean> => {
  const profile = await getAdaptyProfile();
  return isPremiumFromProfile(profile);
};
