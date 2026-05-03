import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { CosmicScreen } from '../components/CosmicBackdrop';
import {
  buildGroups,
  ResonanceToast,
  SignalsB,
  SignalsDetailModal,
  SignalsMuteModal,
  SignalsPatternModal,
  SignalsStatus,
  SignalsTurnToShiftModal,
  TurnToShiftCandidate,
} from '../features/soulSignals';
import {
  MuteDuration,
  ResonanceVote,
  Signal,
  SignalDetail,
  SignalPatternAggregate,
} from '../features/soulSignals/types';
import SoulSignalsService from '../services/SoulSignalsService';
import SoulShiftsService from '../services/SoulShiftsService';
import SoulSightService from '../services/SoulSightService';

// Matches soul_bar_service.compute_progress on the backend (is_full = entries_since >= 6).
// Design spec drafted '5 more' approximately; backend is the source of truth.
const ENTRIES_NEEDED = 6;

const SoulSignalsScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? 'dark' : 'light';
  const statusOverride: SignalsStatus | undefined = route?.params?.displayStatus;

  const [signals, setSignals] = useState<Signal[]>([]);
  const [entriesSinceSight, setEntriesSinceSight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Detail-modal state (so-4vd). selectedId drives both the feed's focusId
  // (for dim/glow) and the modal's visibility.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SignalDetail | null>(null);
  const [resonanceSubmitting, setResonanceSubmitting] =
    useState<ResonanceVote | null>(null);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [resonanceToastVisible, setResonanceToastVisible] = useState(false);

  // Pattern modal state (so-n56). When `patternTag` is set, the pattern
  // modal is up; the detail modal hides so layers don't fight.
  const [patternTag, setPatternTag] = useState<string | null>(null);
  const [patternAggregate, setPatternAggregate] =
    useState<SignalPatternAggregate | null>(null);
  const [patternLoading, setPatternLoading] = useState(false);

  // Mute modal state (so-x5g).
  const [muteOpen, setMuteOpen] = useState(false);
  const [muteSubmitting, setMuteSubmitting] = useState(false);

  // Turn-pattern-into-shift state (so-axs). Cross-feature write to Shifts.
  const [turnCandidate, setTurnCandidate] =
    useState<TurnToShiftCandidate | null>(null);
  const [turnSubmitting, setTurnSubmitting] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      SoulSignalsService.list(),
      SoulSightService.checkEligibility(),
    ])
      .then(([sigResult, eligResult]) => {
        if (sigResult.status === 'fulfilled') {
          setSignals(sigResult.value);
        } else {
          console.log('[SoulSignals] List fetch error:', sigResult.reason?.message);
        }
        if (eligResult.status === 'fulfilled') {
          setEntriesSinceSight(eligResult.value.points ?? 0);
        } else {
          console.log('[SoulSignals] Eligibility fetch error:', eligResult.reason?.message);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const groups = useMemo(() => buildGroups(signals, 6), [signals]);
  const patternsCount = useMemo(
    () => signals.filter((s) => s.kind === 'pattern').length,
    [signals],
  );

  const fallbackSignal = useMemo(
    () => (selectedId ? signals.find((s) => s.id === selectedId) ?? null : null),
    [selectedId, signals],
  );

  // Precedence: existing signals win — a user mid-cycle with prior signals never re-locks
  // just because their entries-since-last-sight count reset. Locked is for zero-signal users.
  const status: SignalsStatus =
    statusOverride ??
    (signals.length > 0
      ? 'done'
      : entriesSinceSight < ENTRIES_NEEDED
        ? 'locked'
        : 'listening');

  const handleOpenJournal = () => navigation.navigate('CreateJournal');

  const handlePatternPress = (id: string) => {
    setSelectedId(id);
    SoulSignalsService.getDetail(id)
      .then(setDetail)
      .catch((err) =>
        console.log('[SoulSignals] Detail fetch error:', err?.message),
      );
  };

  const handleClose = () => {
    setSelectedId(null);
    setDetail(null);
  };

  const handleResonance = async (id: string, value: ResonanceVote) => {
    setResonanceSubmitting(value);
    try {
      const updated = await SoulSignalsService.setResonance(id, value);
      setSignals((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (detail?.id === id) {
        setDetail({ ...detail, ...updated });
      }
      if (value === 'yes') setResonanceToastVisible(true);
    } catch (err: any) {
      console.log('[SoulSignals] Resonance error:', err?.message);
    } finally {
      setResonanceSubmitting(null);
    }
  };

  const handleOpenMute = () => {
    if (!detail) return;
    setMuteOpen(true);
  };

  const handleConfirmMute = async (duration: MuteDuration) => {
    if (!detail) return;
    setMuteSubmitting(true);
    try {
      const updated = await SoulSignalsService.muteSignal(detail.id, duration);
      // Default list call hides muted signals (per be_core so-otk), so the
      // muted signal disappears from the feed. Mirror that locally.
      setSignals((prev) => prev.filter((s) => s.id !== updated.id));
      setMuteOpen(false);
      handleClose();
    } catch (err: any) {
      console.log('[SoulSignals] Mute error:', err?.message);
    } finally {
      setMuteSubmitting(false);
    }
  };

  const handleViewPattern = async (tag: string) => {
    setPatternTag(tag);
    setPatternLoading(true);
    try {
      const result = await SoulSignalsService.getPatternByTag(tag);
      setPatternAggregate(result);
    } catch (err: any) {
      console.log('[SoulSignals] Pattern fetch error:', err?.message);
      // Surface the empty-state path inside the modal rather than catching
      // and silently dismissing — matches the so-pjv suggestion modal
      // behavior where a fetch failure shows the empty-state copy.
      setPatternAggregate({
        tag,
        tone: '#B89CE0',
        headline: 'Couldn’t load this pattern.',
        summary: '',
        noticings: [],
        date_range: { start: '', end: '' },
        soulpal: 1,
      });
    } finally {
      setPatternLoading(false);
    }
  };

  const handleClosePattern = () => {
    setPatternTag(null);
    setPatternAggregate(null);
  };

  const handlePatternNoticingPress = (id: string) => {
    // Crossfade: close pattern, open detail with the chosen noticing.
    handleClosePattern();
    handlePatternPress(id);
  };

  /**
   * Derive a TurnToShiftCandidate from a SignalPatternAggregate. The
   * pattern's headline is descriptive ("You keep coming back to pacing.");
   * for the shift we want an action-oriented title and a one-line practice.
   * Fallback chain: take the freshest noticing's headline as the practice
   * starter when the aggregate doesn't carry it explicitly. Server-side
   * distillation can replace this in a follow-up bead if needed.
   */
  const derivePatternCandidate = (
    agg: SignalPatternAggregate,
  ): TurnToShiftCandidate => {
    const freshest = agg.noticings[0];
    return {
      tag: agg.tag,
      tone: agg.tone,
      cat: agg.tag,
      soulpal: agg.soulpal,
      title: freshest?.headline ?? agg.headline,
      practice:
        freshest?.detail ??
        agg.summary ??
        'Notice when this comes up. Let one moment of awareness be enough today.',
      sourceSignalIds: agg.noticings.map((n) => n.id),
    };
  };

  const handleOpenTurnToShift = (agg: SignalPatternAggregate) => {
    setTurnCandidate(derivePatternCandidate(agg));
  };

  const handleCloseTurnToShift = () => {
    setTurnCandidate(null);
  };

  const handleConfirmTurnToShift = async (override: {
    title: string;
    practice: string;
  }) => {
    if (!turnCandidate) return;
    setTurnSubmitting(true);
    try {
      await SoulShiftsService.createFromSignalPattern({
        tag: turnCandidate.tag,
        title: override.title,
        practice: override.practice,
        cat: turnCandidate.cat,
        mood: turnCandidate.tone,
        soulpal: turnCandidate.soulpal,
        sourceSignalIds: turnCandidate.sourceSignalIds,
      });
      // Close everything and route the user to Soul Shifts so they see the
      // freshly-tended shift in its native list. Detail modal navigation
      // for the new shift requires its id; SoulShifts screen will fetch +
      // surface it on next mount.
      handleCloseTurnToShift();
      handleClosePattern();
      handleClose();
      navigation.navigate('SoulShifts');
    } catch (err: any) {
      // 409 = signal already linked to a non-released shift (be_core so-c9f).
      // Defense-in-depth: the gate on PatternModal should prevent this, but
      // races/stale state can still trigger it. Land softly.
      if (err?.response?.status === 409) {
        const existingShiftId: string | undefined =
          err.response.data?.existing_shift_id;
        Alert.alert(
          'Already turned into a shift',
          err.response.data?.message ??
            'This pattern already has an active shift.',
          existingShiftId
            ? [
                { text: 'Dismiss', style: 'cancel' },
                {
                  text: 'View shift',
                  onPress: () => {
                    handleCloseTurnToShift();
                    handleClosePattern();
                    handleClose();
                    navigation.navigate('SoulShifts', {
                      openShiftId: existingShiftId,
                    });
                  },
                },
              ]
            : [{ text: 'OK', style: 'cancel' }],
        );
      } else {
        console.log('[SoulSignals] TurnToShift error:', err?.message);
      }
    } finally {
      setTurnSubmitting(false);
    }
  };

  const handleViewExistingShift = (shiftId: string) => {
    handleClosePattern();
    handleClose();
    navigation.navigate('SoulShifts', { openShiftId: shiftId });
  };

  const handleToggleSaved = async (id: string, nextSaved: boolean) => {
    setSaveSubmitting(true);
    try {
      const updated = await SoulSignalsService.setSaved(id, nextSaved);
      setSignals((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (detail?.id === id) {
        setDetail({ ...detail, ...updated, isSaved: nextSaved });
      }
    } catch (err: any) {
      console.log('[SoulSignals] Save error:', err?.message);
    } finally {
      setSaveSubmitting(false);
    }
  };

  return (
    <CosmicScreen tone="dawn">
      {isLoading ? (
        <View style={[styles.loadingShell, { paddingTop: insets.top + 16 }]}>
          <ActivityIndicator color={isDarkMode ? '#fff' : '#3A0E66'} size="large" />
        </View>
      ) : (
        <SignalsB
          theme={theme}
          status={status}
          groups={groups}
          eligibility={{ current: entriesSinceSight, needed: ENTRIES_NEEDED }}
          listeningMeta={{ entries: entriesSinceSight, patterns: patternsCount }}
          onOpenJournal={handleOpenJournal}
          onBack={() => navigation.goBack()}
          onPatternPress={handlePatternPress}
          focusId={selectedId ?? undefined}
        />
      )}

      <SignalsDetailModal
        visible={selectedId != null && patternTag == null && !muteOpen}
        detail={detail}
        fallbackSignal={fallbackSignal}
        theme={theme}
        onClose={handleClose}
        onResonance={handleResonance}
        onToggleSaved={handleToggleSaved}
        onMute={handleOpenMute}
        onViewPattern={handleViewPattern}
        resonanceSubmitting={resonanceSubmitting}
        saveSubmitting={saveSubmitting}
      />

      <SignalsMuteModal
        visible={muteOpen}
        detail={detail}
        theme={theme}
        onClose={() => setMuteOpen(false)}
        onConfirm={handleConfirmMute}
        submitting={muteSubmitting}
      />

      <SignalsPatternModal
        visible={patternTag != null && turnCandidate == null}
        aggregate={patternAggregate}
        loading={patternLoading}
        theme={theme}
        onClose={handleClosePattern}
        onNoticingPress={handlePatternNoticingPress}
        onTurnToShift={handleOpenTurnToShift}
        onViewExistingShift={handleViewExistingShift}
      />

      <SignalsTurnToShiftModal
        visible={turnCandidate != null}
        candidate={turnCandidate}
        theme={theme}
        onClose={handleCloseTurnToShift}
        onConfirm={handleConfirmTurnToShift}
        submitting={turnSubmitting}
      />

      <ResonanceToast
        visible={resonanceToastVisible}
        theme={theme}
        onDismiss={() => setResonanceToastVisible(false)}
      />
    </CosmicScreen>
  );
};

const styles = StyleSheet.create({
  loadingShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SoulSignalsScreen;
