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
  isLoading: boolean;
  hasLoadedOnce: boolean;
  refresh: () => Promise<void>;
  setResult: (result: PersonalityTestResult) => void;
}

const defaultLatest: Record<TestType, PersonalityTestResult | null> = {
  inner_lens: null,
  focus_factor: null,
};

const PersonalityContext = createContext<PersonalityContextValue>({
  latestByType: defaultLatest,
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
        const results = await Promise.all(
          PERSONALITY_TEST_ORDER.map(async (testType) => {
            try {
              const r = await PersonalityService.getLatest(testType);
              return [testType, r] as const;
            } catch {
              return [testType, null] as const;
            }
          }),
        );
        const next: Record<TestType, PersonalityTestResult | null> = { ...defaultLatest };
        for (const [testType, result] of results) {
          next[testType] = result;
        }
        setLatestByType(next);
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
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setLatestByType(defaultLatest);
      setHasLoadedOnce(false);
    }
  }, [isAuthenticated, refresh]);

  return (
    <PersonalityContext.Provider
      value={{ latestByType, isLoading, hasLoadedOnce, refresh, setResult }}
    >
      {children}
    </PersonalityContext.Provider>
  );
};

export const usePersonality = () => useContext(PersonalityContext);
