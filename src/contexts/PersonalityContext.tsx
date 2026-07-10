import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import PersonalityService, {
  PersonalityTestResult,
} from '../services/PersonalityService';
import { TestType } from '../data/personalityTests/types';
import { PERSONALITY_TEST_ORDER } from '../data/personalityTests';

interface PersonalityContextValue {
  latestByType: Record<TestType, PersonalityTestResult | null>;
  // so-8hun MI-1: track per-test fetch failures separately from the result
  // so the hub can distinguish "not taken" (null, no error) from "fetch
  // failed" (null, error). Previously both swallowed into null → a completed
  // test rendered as "Take test" and the taken-count read 0 on offline/error.
  fetchErrorByType: Record<TestType, boolean>;
  isLoading: boolean;
  hasLoadedOnce: boolean;
  refresh: () => Promise<void>;
  setResult: (result: PersonalityTestResult) => void;
}

const defaultLatest: Record<TestType, PersonalityTestResult | null> = {
  inner_lens: null,
  focus_factor: null,
};

const defaultFetchErrors: Record<TestType, boolean> = {
  inner_lens: false,
  focus_factor: false,
};

const PersonalityContext = createContext<PersonalityContextValue>({
  latestByType: defaultLatest,
  fetchErrorByType: defaultFetchErrors,
  isLoading: false,
  hasLoadedOnce: false,
  refresh: async () => {},
  setResult: () => {},
});

export const PersonalityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const [latestByType, setLatestByType] =
    useState<Record<TestType, PersonalityTestResult | null>>(defaultLatest);
  // so-8hun MI-1: separate error state so hub can show a real error affordance
  // instead of a false "Take test" card on a network failure.
  const [fetchErrorByType, setFetchErrorByType] =
    useState<Record<TestType, boolean>>(defaultFetchErrors);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  // so-yl4y: hold the in-flight promise (not just a boolean) so concurrent
  // callers await the SAME load instead of getting an instant undefined and
  // running on stale context state. Pre-fix:
  //   if (inFlight.current) return;   // second caller returned nothing
  // Callers doing `await refresh()` (e.g. screen onFocus expecting fresh
  // data) lost their await contract on every overlap.
  const inFlightPromise = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;
    if (inFlightPromise.current) return inFlightPromise.current;

    const p = (async () => {
      setIsLoading(true);
      try {
        // so-8hun MI-1: track success/error per test so hub can distinguish
        // "never taken" from "fetch failed". Keep last-known result on error
        // (don't reset to null) so a re-fetch failure on focus doesn't flip a
        // "Taken" card back to "Take test" while the user is looking at it.
        const results = await Promise.all(
          PERSONALITY_TEST_ORDER.map(async (testType) => {
            try {
              const r = await PersonalityService.getLatest(testType);
              return { testType, result: r, error: false } as const;
            } catch {
              return { testType, result: undefined, error: true } as const;
            }
          }),
        );
        const nextResults: Record<TestType, PersonalityTestResult | null> = { ...defaultLatest };
        const nextErrors: Record<TestType, boolean> = { ...defaultFetchErrors };
        for (const { testType, result, error } of results) {
          nextErrors[testType] = error;
          if (!error) {
            // Only update the cached result when the fetch actually succeeded;
            // on error keep the previous value (last-known) for last-known UX.
            nextResults[testType] = result ?? null;
          }
        }
        // For tests with errors, preserve the last-known value from state.
        setLatestByType((prev) => {
          const merged = { ...nextResults };
          for (const t of PERSONALITY_TEST_ORDER) {
            if (nextErrors[t]) merged[t] = prev[t];
          }
          return merged;
        });
        setFetchErrorByType(nextErrors);
        setHasLoadedOnce(true);
      } finally {
        setIsLoading(false);
        // Clear the latch BEFORE the promise resolves — the next call after
        // this resolves should kick off a fresh fetch, not glom onto an
        // already-resolved stale promise.
        inFlightPromise.current = null;
      }
    })();

    inFlightPromise.current = p;
    return p;
  }, [isAuthenticated]);

  const setResult = useCallback((result: PersonalityTestResult) => {
    setLatestByType((prev) => ({ ...prev, [result.test_type]: result }));
    // Clear any error flag for this test type when we get a fresh result.
    setFetchErrorByType((prev) => ({ ...prev, [result.test_type]: false }));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setLatestByType(defaultLatest);
      setFetchErrorByType(defaultFetchErrors);
      setHasLoadedOnce(false);
    }
  }, [isAuthenticated, refresh]);

  return (
    <PersonalityContext.Provider
      value={{ latestByType, fetchErrorByType, isLoading, hasLoadedOnce, refresh, setResult }}
    >
      {children}
    </PersonalityContext.Provider>
  );
};

export const usePersonality = () => useContext(PersonalityContext);
