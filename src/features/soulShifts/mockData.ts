import { Shift } from './types';

// TODO: replace with real data once SoulShiftsService exists. Backend bead pending.
export const MOCK_SHIFTS: Shift[] = [
  { id: 's1', title: 'Speaking up in meetings',  cat: 'Voice',      status: 'active',     pct: 0.62, since: '12 days', mood: '#FFC85C', soulpal: 5 },
  { id: 's2', title: 'Less self-criticism',      cat: 'Inner talk', status: 'integrated', pct: 1.00, since: '6 weeks', mood: '#70CACF', soulpal: 1 },
  { id: 's3', title: 'Holding boundaries',       cat: 'Relating',   status: 'processing', pct: 0.30, since: '4 days',  mood: '#E93678', soulpal: 2 },
  { id: 's4', title: 'Resting without guilt',    cat: 'Body',       status: 'active',     pct: 0.45, since: '9 days',  mood: '#C8A6FF', soulpal: 3 },
  { id: 's5', title: 'Asking for what I need',   cat: 'Voice',      status: 'locked',     pct: 0.00, since: null,      mood: '#67D1FF', soulpal: 4 },
  { id: 's6', title: 'Slowing my pace',          cat: 'Body',       status: 'active',     pct: 0.78, since: '3 weeks', mood: '#FF8A4C', soulpal: 5 },
];
