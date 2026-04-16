/**
 * Shared types for Personality Tests (Inner Lens, Focus Factor, future tests).
 *
 * Source of truth: /Users/vidishraj/Desktop/SoulTalk/Personality Test *.docx
 */

export type LikertValue = 1 | 2 | 3 | 4 | 5;

export type TestType = 'inner_lens' | 'focus_factor';

export interface Question {
  id: string;          // "q1" .. "q25"
  text: string;        // statement the user rates
  category: string;    // archetype this question scores into
}

export interface WatchOut {
  title: string;       // e.g. "The Idealism-Reality Gap"
  insight: string;     // "The Personal Insight" paragraph
  tips: string[];      // "Actionable Solvency & Tips" items
}

export interface ResultProfile {
  category: string;                 // "Visionary"
  motto: string;                    // "What's possible?"
  atYourBest: string;               // one-line summary of peak state
  summary: string;                  // 1-2 paragraph opening narrative
  work: string;                     // Work & Career block (incl. Pro-Tip)
  relationships: string;            // Relationships block (incl. Pro-Tip)
  growth: string[];                 // Growth Strategies bullets
  watchOutFor: WatchOut[];          // may be one or more blocks
}

export interface TestDefinition {
  id: TestType;
  version: string;                  // "v1"
  title: string;                    // "Inner Lens"
  tagline: string;                  // short one-liner for the hub card
  about: string;                    // longer intro shown on the intro screen
  locked: boolean;                  // true = "Coming soon"
  categories: string[];             // ordered list of archetype labels
  questions: Question[];            // 25 questions
  results: Record<string, ResultProfile>;
}

export const LIKERT_LABELS: Record<LikertValue, string> = {
  1: 'Strongly Disagree',
  2: 'Disagree',
  3: 'Neutral',
  4: 'Agree',
  5: 'Strongly Agree',
};
