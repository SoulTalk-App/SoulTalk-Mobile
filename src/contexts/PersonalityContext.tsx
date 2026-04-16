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
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || inFlight.current) return;
    inFlight.current = true;
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
      inFlight.current = false;
    }
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
