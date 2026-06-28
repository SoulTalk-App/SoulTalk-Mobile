import { isAccessLocked } from '../accessGate';

// so-etv4: unit test over the paywall-gate truth table. This gate is a
// security/billing boundary, so every row is pinned. `true` = LOCKED behind
// the paywall, `false` = OPEN.
describe('isAccessLocked (so-etv4 gate truth table)', () => {
  const base = {
    accessGranted: null as boolean | null,
    sdkSettled: false,
    sdkActive: false,
    isPro: false,
  };

  it('null + settled + active → LOCKED (fail closed — the state so-etv4 closes)', () => {
    expect(
      isAccessLocked({ ...base, accessGranted: null, sdkSettled: true, sdkActive: true }),
    ).toBe(true);
  });

  it('null + NOT settled → OPEN (still loading — fail open)', () => {
    expect(
      isAccessLocked({ ...base, accessGranted: null, sdkSettled: false, sdkActive: true }),
    ).toBe(false);
  });

  it('null + settled + NOT active → OPEN (FE-H2 escape: SDK inactive/errored)', () => {
    expect(
      isAccessLocked({ ...base, accessGranted: null, sdkSettled: true, sdkActive: false }),
    ).toBe(false);
  });

  it('access_granted=false → LOCKED (server denied), regardless of SDK state', () => {
    expect(
      isAccessLocked({ ...base, accessGranted: false, sdkSettled: true, sdkActive: true }),
    ).toBe(true);
    // false stays locked even before the SDK settles.
    expect(
      isAccessLocked({ ...base, accessGranted: false, sdkSettled: false, sdkActive: false }),
    ).toBe(true);
  });

  it('access_granted=true → OPEN (server granted: active trial or pro)', () => {
    expect(
      isAccessLocked({ ...base, accessGranted: true, sdkSettled: true, sdkActive: true }),
    ).toBe(false);
  });

  it('isPro=true overrides everything → OPEN', () => {
    // Would otherwise lock (null+settled+active, and explicit false).
    expect(
      isAccessLocked({ accessGranted: null, sdkSettled: true, sdkActive: true, isPro: true }),
    ).toBe(false);
    expect(
      isAccessLocked({ accessGranted: false, sdkSettled: true, sdkActive: true, isPro: true }),
    ).toBe(false);
  });
});
