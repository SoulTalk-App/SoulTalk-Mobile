/**
 * so-chyd: module-level bridge that carries the re-acceptance callback from
 * TermsReacceptanceModal into TermsScreen (mode='reaccept') without passing a
 * non-serializable function through React Navigation params.
 *
 * Usage:
 *   Modal — before navigating:
 *     setReacceptCallback(onAccept);
 *     navigation.navigate('Terms', { mode: 'reaccept', currentVersion });
 *
 *   TermsScreen — on final Accept tap:
 *     callReaccept();   // fires + clears the callback
 *     navigation.goBack();
 *
 * The callback is consumed (cleared) on first call so it can never fire twice
 * even if TermsScreen somehow unmounts and remounts.
 */

let _cb: (() => void) | null = null;

export const setReacceptCallback = (cb: () => void): void => {
  _cb = cb;
};

export const callReaccept = (): void => {
  const cb = _cb;
  _cb = null;
  cb?.();
};

// so-v82u MINOR 2: explicit clear so TermsScreen can drop a stale callback on
// unmount (e.g. if the user dismisses via the back chevron without accepting).
// Prevents the old onAccept from firing if the modal is reopened and the user
// completes a fresh reaccept session before the module re-runs.
export const clearReacceptCallback = (): void => {
  _cb = null;
};
