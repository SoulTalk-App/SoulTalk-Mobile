/**
 * so-etv4: regression guard for the sdkSettled / fail-closed gate path.
 *
 * Tests that EntitlementProvider.sdkSettled becomes true:
 *   (a) on a normal pullProfile() resolution, AND
 *   (b) even when the initial pullProfile() REJECTS (the MAJOR-1 fix:
 *       .finally not .then). Without .finally, a rejected pull leaves
 *       sdkSettled=false for the whole session — the fail-closed gate
 *       never engages and the app stays open despite a live Adapty SDK +
 *       missing access_granted. This test pins that behaviour permanently.
 *
 * Also tests:
 *   (c) sdkSettled resets to false when isAuthenticated goes false (logout).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { EntitlementProvider, useEntitlement } from '../EntitlementContext';

// ── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('../../services/adapty', () => ({
  ACCESS_LEVEL_PREMIUM: 'premium',
  // addProfileListener must return an unsubscribe fn; default is a no-op.
  addProfileListener: jest.fn(() => () => {}),
  getAdaptyProfile: jest.fn().mockResolvedValue(null),
  identifyAdaptyUser: jest.fn().mockResolvedValue(undefined),
  isPremiumFromProfile: jest.fn().mockReturnValue(false),
  logoutAdaptyUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/authClient', () => ({
  registerPostUnlockHook: jest.fn(),
}));

jest.mock('../AuthContext', () => ({
  useAuth: jest.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const adapty = jest.requireMock('../../services/adapty') as {
  getAdaptyProfile: jest.Mock;
};
const { useAuth } = jest.requireMock('../AuthContext') as { useAuth: jest.Mock };

const makeAuthState = (overrides: Record<string, unknown> = {}) => ({
  user: { id: 'test-user', access_granted: null },
  isAuthenticated: true,
  refreshUser: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

/** Mounts EntitlementProvider and captures sdkSettled values via a probe. */
const mountAndCapture = async (
  authState: ReturnType<typeof makeAuthState>,
): Promise<{ values: boolean[]; renderer: TestRenderer.ReactTestRenderer }> => {
  useAuth.mockReturnValue(authState);
  const values: boolean[] = [];

  const Probe: React.FC = () => {
    values.push(useEntitlement().sdkSettled);
    return null;
  };

  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <EntitlementProvider>
        <Probe />
      </EntitlementProvider>,
    );
  });

  return { values, renderer };
};

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Default: normal profile pull that resolves with null (no Pro, SDK inactive).
  adapty.getAdaptyProfile.mockResolvedValue(null);
  useAuth.mockReturnValue(makeAuthState());
});

describe('EntitlementProvider.sdkSettled (so-etv4 MAJOR-1 regression guard)', () => {
  it('(a) sdkSettled becomes true when pullProfile resolves normally', async () => {
    adapty.getAdaptyProfile.mockResolvedValue(null);
    const { values } = await mountAndCapture(makeAuthState());

    // The last render must show sdkSettled=true (pull completed).
    expect(values.at(-1)).toBe(true);
  });

  it('(b) sdkSettled becomes true even when pullProfile REJECTS — MAJOR-1 fix (.finally not .then)', async () => {
    // Force getAdaptyProfile to reject, bypassing its own try/catch.
    // This makes pullProfile() reject — with .then, sdkSettled would stay
    // false; with .finally it must flip to true.
    adapty.getAdaptyProfile.mockRejectedValue(new Error('Adapty transient error'));

    const { values } = await mountAndCapture(makeAuthState());

    // If this fails, the .finally fix was not applied (or was reverted back to .then).
    expect(values.at(-1)).toBe(true);
  });

  it('(c) sdkSettled resets to false when isAuthenticated becomes false (logout)', async () => {
    adapty.getAdaptyProfile.mockResolvedValue(null);
    const authedState = makeAuthState({ isAuthenticated: true });
    const { values, renderer } = await mountAndCapture(authedState);

    // Confirm settled after auth.
    expect(values.at(-1)).toBe(true);

    // Simulate logout: update auth state to unauthenticated.
    const loggedOutState = makeAuthState({ isAuthenticated: false, user: null });
    useAuth.mockReturnValue(loggedOutState);

    await act(async () => {
      renderer.update(
        <EntitlementProvider>
          {/* Probe needs to be re-used — re-instantiate inline */}
          {React.createElement(() => {
            values.push(useEntitlement().sdkSettled);
            return null;
          })}
        </EntitlementProvider>,
      );
    });

    // sdkSettled must reset to false on logout so the NEXT session starts unsettled.
    expect(values.at(-1)).toBe(false);
  });
});
