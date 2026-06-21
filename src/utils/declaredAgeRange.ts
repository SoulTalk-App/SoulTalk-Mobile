// so-cbhq: thin JS bridge for Apple's Declared Age Range API (iOS 17+, native).
//
// SCOPE NOTE: the NATIVE side (an iOS module exposing AgeRangeService /
// DeclaredAgeRange, plus build config / Info.plist entitlement) is rn_core +
// infra territory — NOT editable from this rn_features worktree. This wrapper
// is the JS contract the native module should satisfy; until that module ships
// it returns 'unavailable', so signup transparently falls back to the manual
// DOB entry (which is itself backed by the authoritative backend check).
//
// Expected native module shape (to be provided by rn_core):
//   NativeModules.DeclaredAgeRange.requestAgeRange(thresholds: number[])
//     => Promise<{ status: 'sharing' | 'declined' | 'notDetermined',
//                  isAtLeast18?: boolean }>
// We keep the JS surface minimal: callers only need "is this person 18+ per
// Apple, or do we not know".

import { NativeModules, Platform } from 'react-native';

export type DeclaredAgeResult =
  | { available: true; isAtLeast18: boolean }
  | { available: false };

const UNAVAILABLE: DeclaredAgeResult = { available: false };

interface DeclaredAgeRangeNativeModule {
  requestAgeRange?: (thresholds: number[]) => Promise<{
    status: string;
    isAtLeast18?: boolean;
  }>;
}

/**
 * Ask Apple's Declared Age Range API whether the user is 18+. Returns
 * `{ available: false }` on any platform/OS/module gap (Android, iOS < 17, no
 * native module, user declined, or any error) so the caller falls back to DOB.
 */
export const getDeclaredAgeIs18Plus = async (): Promise<DeclaredAgeResult> => {
  if (Platform.OS !== 'ios') return UNAVAILABLE;

  const native = (NativeModules as Record<string, unknown>)
    .DeclaredAgeRange as DeclaredAgeRangeNativeModule | undefined;
  if (!native || typeof native.requestAgeRange !== 'function') {
    // Native module not installed yet (rn_core/infra to provide).
    return UNAVAILABLE;
  }

  try {
    const res = await native.requestAgeRange([18]);
    if (res?.status === 'sharing' && typeof res.isAtLeast18 === 'boolean') {
      return { available: true, isAtLeast18: res.isAtLeast18 };
    }
    return UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }
};
