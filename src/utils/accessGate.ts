/**
 * so-etv4: the app-access (paywall) gate decision, as a pure function.
 *
 * Extracted from App.tsx's inline JSX so the security/billing truth table is
 * unit-testable in isolation (no React render, no Adapty mocks).
 *
 * Inputs:
 *  - accessGranted: the server's verdict from /auth/me (the trial-clock + pro
 *    authority). true = open, false = denied, null = unknown/loading OR an
 *    abnormal absence of the field.
 *  - sdkSettled:    has the EntitlementProvider completed its INITIAL Adapty
 *    profile pull (success or failure)? Until then accessGranted=null is
 *    "still loading", not "denied".
 *  - sdkActive:     is the Adapty SDK actually active (activated AND no
 *    activation error)? On Android / a missing-or-bad key the SDK is inactive,
 *    isPro can't be trusted, and we must NOT lock on a null accessGranted.
 *  - isPro:         Adapty paid-access flag. Always opens the gate.
 *
 * Truth table (returns true = LOCKED behind the paywall):
 *  - accessGranted=false                 → LOCKED (server explicitly denied;
 *      authoritative — overrides even a local Adapty isPro so a stale device
 *      profile from a prior comped/Pro account cannot re-open the gate)
 *  - isPro=true (& server hasn't denied) → OPEN  (paid access, fast-path)
 *  - accessGranted=true                  → OPEN  (server granted: trial or pro)
 *  - accessGranted=null & !sdkSettled    → OPEN  (still loading — fail OPEN)
 *  - accessGranted=null & settled & active   → LOCKED (fail CLOSED: this is the
 *      state so-etv4 closes — SDK is up, isPro is false, server gave no grant)
 *  - accessGranted=null & settled & !active  → OPEN  (FE-H2 escape: SDK
 *      inactive/errored, can't trust isPro, don't trap the user)
 *
 * so-7juf: accessGranted=false is intentionally checked FIRST (before isPro)
 * so that a stale Adapty device profile that still reports premium (e.g. from
 * a previously comped account on the same device) cannot bypass an explicit
 * server denial. The only path to OPEN from a false grant is a fresh /auth/me
 * that returns true (or is_pro=true), not a cached Adapty isPro reading.
 */
export interface AccessGateInputs {
  accessGranted: boolean | null;
  sdkSettled: boolean;
  sdkActive: boolean;
  isPro: boolean;
}

export const isAccessLocked = ({
  accessGranted,
  sdkSettled,
  sdkActive,
  isPro,
}: AccessGateInputs): boolean => {
  // so-7juf: server explicit denial is checked FIRST — a stale Adapty device
  // profile must not re-open the gate against the server's access_granted=false.
  if (accessGranted === false) return true;
  // Paid access opens the gate (server hasn't explicitly denied).
  if (isPro) return false;
  // A null (unknown) verdict fails CLOSED only once the SDK has settled AND is
  // active; otherwise it stays OPEN (loading window, or SDK inactive/errored).
  const effectiveAccessGranted =
    accessGranted === null && sdkSettled && sdkActive ? false : accessGranted;
  return effectiveAccessGranted === false;
};
