/**
 * Registry of personality tests. Add new tests here + transcribe their content.
 */
import { innerLens } from './innerLens';
import { focusFactor } from './focusFactor';
import { TestDefinition, TestType } from './types';

export const PERSONALITY_TESTS: Record<TestType, TestDefinition> = {
  inner_lens: innerLens,
  focus_factor: focusFactor,
};

export const PERSONALITY_TEST_ORDER: TestType[] = ['inner_lens', 'focus_factor'];

// so-xt9j MI-2: return undefined instead of crashing when an unknown testType
// is passed (deep link, state restoration, future test shipped by BE before FE).
// All call sites already guard with `if (!def)` (added in so-8hun MI-2).
export function getTest(id: TestType): TestDefinition | undefined {
  return PERSONALITY_TESTS[id];
}

export * from './types';
