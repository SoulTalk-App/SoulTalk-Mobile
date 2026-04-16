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

export function getTest(id: TestType): TestDefinition {
  return PERSONALITY_TESTS[id];
}

export * from './types';
