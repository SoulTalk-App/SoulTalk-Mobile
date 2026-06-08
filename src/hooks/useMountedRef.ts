import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

/**
 * so-pw5d Pass 1 primitive — the rn_core half of the systemic mountedRef
 * sweep across mobile async setState paths. Consumers (rn_features screens
 * and contexts) gate setState calls that follow an `await` on
 * `mountedRef.current` to avoid "setState on unmounted component" warnings
 * (same crash class as so-3i78).
 *
 * Usage:
 *
 *   const mountedRef = useMountedRef();
 *
 *   useEffect(() => {
 *     (async () => {
 *       const data = await fetchSomething();
 *       if (mountedRef.current) setData(data);
 *     })();
 *   }, []);
 *
 * Why a hook instead of a per-screen `let cancelled = false` flag? The flag
 * pattern works for a single effect but doesn't survive across handlers
 * (modal action `handleX` async functions that touch state after a
 * navigate/dismiss). A ref hoisted to the component scope covers both.
 *
 * Reference implementation we're standardising on:
 * SettingsScreen.tsx:64-75 + 142-177 (so-punu) — mountedRef + savingRef.
 */
export const useMountedRef = (): MutableRefObject<boolean> => {
  const mountedRef = useRef(true);

  useEffect(() => {
    // Effect body intentionally empty — the ref starts true (component is
    // mounted by the time effects run) and only flips on unmount cleanup.
    // Defending against a future StrictMode double-invoke: re-set true on
    // each effect run so an unmount→remount cycle in dev doesn't leave the
    // ref stuck false.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return mountedRef;
};

export default useMountedRef;
