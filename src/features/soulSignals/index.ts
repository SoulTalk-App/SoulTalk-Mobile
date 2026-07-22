export { SignalsB } from './SignalsB';
export { SignalsDetailModal } from './SignalsDetailModal';
export { SignalsPatternModal } from './SignalsPatternModal';
export { SignalsMuteModal } from './SignalsMuteModal';
export { SignalsTurnToShiftModal } from './SignalsTurnToShiftModal';
export type { TurnToShiftCandidate } from './SignalsTurnToShiftModal';
export { ResonanceToast } from './ResonanceToast';
// so-9kg3 M-1: buildGroups moved to groupSignals.ts (groups by tag, no cap).
// so-kajr: buildSectionedGroups adds category sectioning + divider for the hub.
// MOCK_SIGNALS remains in mockData.ts for dev tooling.
export { buildGroups, buildSectionedGroups, isDivider } from './groupSignals';
export type { DividerItem, FeedItem } from './groupSignals';
export { MOCK_SIGNALS } from './mockData';
export type {
  Signal,
  SignalDetail,
  SignalPatternAggregate,
  SignalSource,
  SignalsStatus,
  Eligibility,
  Group,
  MuteDuration,
  ResonanceVote,
  SoulpalVariant,
} from './types';
