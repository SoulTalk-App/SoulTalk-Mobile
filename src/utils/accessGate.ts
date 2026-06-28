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
 *  - isPro=true                          → OPEN  (paid access overrides all)
 *  - accessGranted=true                  → OPEN  (server granted: trial or pro)
 *  - accessGranted=false                 → LOCKED (server denied)
 *  - accessGranted=null & !sdkSettled    → OPEN  (still loading — fail OPEN)
 *  - accessGranted=null & settled & active   → LOCKED (fail CLOSED: this is the
 *      state so-etv4 closes — SDK is up, isPro is false, server gave no grant)
 *  - accessGranted=null & settled & !active  → OPEN  (FE-H2 escape: SDK
 *      inactive/errored, can't trust isPro, don't trap the user)
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
  // Paid access always opens the gate.
  if (isPro) return false;
  // A null (unknown) verdict fails CLOSED only once the SDK has settled AND is
  // active; otherwise it stays OPEN (loading window, or SDK inactive/errored).
  const effectiveAccessGranted =
    accessGranted === null && sdkSettled && sdkActive ? false : accessGranted;
  return effectiveAccessGranted === false;
};
