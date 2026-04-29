import { CYAN, LILAC, ORANGE, PINK, TEAL, YELLOW } from './tokens';
import { Signal } from './types';

// TODO: replace mock with real /soul-signals/ data once backend supports
// kind/strength/tag/tone/soulpal/fedSight (see [ASK] to soultalk_be_core).
export const MOCK_SIGNALS: Signal[] = [
  {
    id: 's1', kind: 'pattern', strength: 0.85, tag: 'Pacing',
    tone: TEAL, soulpal: 2, when: 'this week',
    headline: 'You keep coming back to pacing.',
    detail: 'Three entries this week, two unprompted. The word "slowing" shows up twice.',
    quotes: ['"I want to do less today."', '"I\'m allowed to slow down."'],
    fedSight: 'The week of letting go',
  },
  {
    id: 's2', kind: 'observation', tone: PINK, soulpal: 5, when: 'Saturday',
    headline: 'You forgave yourself in writing.',
    detail: 'A first this month — softer self-talk closing your Saturday entry.',
    quotes: ['"It\'s okay that I didn\'t finish."'],
    fedSight: null,
  },
  {
    id: 's3', kind: 'pattern', strength: 0.62, tag: 'Self-talk',
    tone: YELLOW, soulpal: 3, when: 'past 14 days',
    headline: 'Tone is softening.',
    detail: 'Sentiment trended 38% gentler vs. your two-week baseline.',
    quotes: [],
    fedSight: 'The week of letting go',
  },
  {
    id: 's4', kind: 'observation', tone: LILAC, soulpal: 1, when: 'Wednesday',
    headline: 'You named what you wanted, twice.',
    detail: 'Direct asks are rare for you — both came mid-entry without hedge words.',
    quotes: ['"I want a quiet evening."', '"I want to be heard at this meeting."'],
    fedSight: null,
  },
  {
    id: 's5', kind: 'pattern', strength: 0.71, tag: 'Mornings',
    tone: ORANGE, soulpal: 4, when: 'past month',
    headline: 'Mornings carry your sharpest entries.',
    detail: '6 of your last 8 morning entries name a tension. Evenings are gentler.',
    quotes: [],
    fedSight: 'Returning to yourself',
  },
  {
    id: 's6', kind: 'observation', tone: CYAN, soulpal: 5, when: 'Friday',
    headline: 'You wrote about rest without guilt.',
    detail: 'No hedges, no "should". Just a clear sentence.',
    quotes: ['"I rested. It was enough."'],
    fedSight: null,
  },
  {
    id: 's7', kind: 'pattern', strength: 0.48, tag: 'Boundaries',
    tone: PINK, soulpal: 2, when: 'past 10 days',
    headline: 'Boundaries are forming.',
    detail: '4 entries reference saying no or holding limits — up from 1 last fortnight.',
    quotes: [],
    fedSight: null,
  },
  {
    id: 's8', kind: 'observation', tone: TEAL, soulpal: 3, when: 'Sunday',
    headline: 'You ended the week gentler than you started it.',
    detail: 'Sentiment delta of +0.6 across Sunday alone.',
    quotes: [],
    fedSight: 'The week of letting go',
  },
];

export function buildGroups(signals: Signal[], count: number): { pattern: Signal; related: Signal[] }[] {
  return signals
    .filter((s) => s.kind === 'pattern')
    .slice(0, Math.ceil(count / 2))
    .map((p) => ({
      pattern: p,
      related: signals
        .filter((s) => s.kind === 'observation' && s.tone === p.tone)
        .slice(0, 2),
    }));
}
