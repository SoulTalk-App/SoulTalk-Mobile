import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { ScreenEnter } from '../components/ScreenEnter';
import {
  buildSectionedGroups,
  FeedItem,
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
import { useAppAlert } from '../components/AppAlertProvider';

// so-9kg3 MI-2: FE fallback for the eligibility threshold when the BE field is
// absent (older builds). The live value comes from EligibilityResponse.threshold
// and is tracked in state to avoid a release for any future BE tuning.
const ENTRIES_NEEDED_FALLBACK = 6;

const SoulSignalsScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? 'dark' : 'light';
  // so-1zn0: themed alert replaces native Alert across this surface.
  const { showAlert, showError } = useAppAlert();

  // so-73pj: replace the silent .catch(console.log) sites — surface a friendly,
  // normalized message (never raw axios/technical strings) and keep a dev
  // breadcrumb. Loading/submitting state is reset by each handler's finally.
  // so-iiw8 / so-9kg3 MI-1: use the caller-supplied `scope` as the dialog
  // title so the user knows WHERE the error happened instead of always seeing
  // "Couldn't load signals". Body goes through normalizeError (never raw SDK).
  const surfaceError = (scope: string, err: unknown) => {
    if (__DEV__) console.warn(`[SoulSignals] ${scope}:`, err);
    showError(err, { title: scope });
  };
  const statusOverride: SignalsStatus | undefined = route?.params?.displayStatus;

  const [signals, setSignals] = useState<Signal[]>([]);
  const [entriesSinceSight, setEntriesSinceSight] = useState(0);
  // so-9kg3 MI-2: threshold comes from the eligibility response so the FE
  // doesn't need a release when the BE tunes the required entry count.
  const [entriesNeeded, setEntriesNeeded] = useState(ENTRIES_NEEDED_FALLBACK);
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

  // Muted-signals filter state (so-8ho). Default-list excludes muted signals
  // per BE; this is the "drawer you open" filter mirroring so-2pm Released.
  const [filter, setFilter] = useState<'all' | 'muted'>('all');
  const [mutedSignals, setMutedSignals] = useState<Signal[]>([]);
  const [mutedFetched, setMutedFetched] = useState(false);

  // so-72fx SS-M2: was a mount-only useEffect([]), so the feed went stale on
  // the return seam after journaling. useFocusEffect refetches on every focus.
  // The full-screen loader only shows for the FIRST load (hasLoadedRef);
  // subsequent focuses refresh silently to avoid a loader flash. The `active`
  // flag drops any in-flight result if the screen blurs first.
  const hasLoadedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.allSettled([
        SoulSignalsService.list(),
        SoulSightService.checkEligibility(),
      ])
        .then(([sigResult, eligResult]) => {
          if (!active) return;
          if (sigResult.status === 'fulfilled') {
            setSignals(sigResult.value);
          } else {
            surfaceError("Couldn't load your signals", sigResult.reason);
          }
          if (eligResult.status === 'fulfilled') {
            setEntriesSinceSight(eligResult.value.points ?? 0);
            // so-9kg3 MI-2: update threshold from the BE response; fall back
            // to ENTRIES_NEEDED_FALLBACK when the field is absent (older BE).
            if (eligResult.value.threshold != null) {
              setEntriesNeeded(eligResult.value.threshold);
            }
          } else {
            if (__DEV__) console.warn('[SoulSignals] Eligibility fetch error:', eligResult.reason);
          }
        })
        .finally(() => {
          if (active && !hasLoadedRef.current) {
            hasLoadedRef.current = true;
            setIsLoading(false);
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  // so-kajr: buildSectionedGroups buckets groups by category and injects a
  // "Let's go even deeper" divider between loop/pattern/narrative and
  // strength/fear sections. Replaces the flat buildGroups call for the main
  // feed; muted view stays flat (no category sectioning for muted signals).
  const sectionedItems = useMemo(
    () => buildSectionedGroups(signals),
    [signals],
  );
  // Muted view renders each muted signal as its own pseudo-group (no related
  // siblings) so the existing PatternCard render path stays unchanged.
  const mutedItems = useMemo<FeedItem[]>(
    () => mutedSignals.map((s) => ({ pattern: s, related: [] })),
    [mutedSignals],
  );
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
      : entriesSinceSight < entriesNeeded
        ? 'locked'
        : 'listening');

  const handleOpenJournal = () => navigation.navigate('CreateJournal');

  const handlePatternPress = (id: string) => {
    setSelectedId(id);
    SoulSignalsService.getDetail(id)
      .then(setDetail)
      .catch((err) => surfaceError("Couldn't load signal detail", err));
  };

  const handleClose = () => {
    setSelectedId(null);
    setDetail(null);
  };

  const handleResonance = async (id: string, value: ResonanceVote) => {
    if (value === 'not_quite') {
      // so-xli / so-dyml: 'Not quite' mutes indefinitely. Confirmation is
      // handled inline inside SignalsDetailModal (Solution A from so-dyml) so
      // onResonance is only called here AFTER the user confirms — no second
      // native Modal needed, no stacking race possible.
      setResonanceSubmitting('not_quite');
      try {
        await SoulSignalsService.setResonance(id, 'not_quite');
        await SoulSignalsService.muteSignal(id, 'forever');
        // Default list excludes muted, mirror that locally.
        setSignals((prev) => prev.filter((s) => s.id !== id));
        handleClose();
      } catch (err: any) {
        surfaceError("Couldn't mute this signal", err);
      } finally {
        setResonanceSubmitting(null);
      }
      return;
    }
    setResonanceSubmitting(value);
    try {
      const updated = await SoulSignalsService.setResonance(id, value);
      setSignals((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (detail?.id === id) {
        setDetail({ ...detail, ...updated });
      }
      if (value === 'yes') setResonanceToastVisible(true);
    } catch (err: any) {
      surfaceError("Couldn't record your response", err);
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
      // so-1nde: optimistically insert the newly-muted signal into the muted
      // list (dedupe by id in case of a double-tap). Also reset the fetch latch
      // so the next Muted-pill tap re-fetches include_muted=true fresh and stays
      // in sync with the server — without this the cached muted view is stale.
      setMutedSignals((prev) => [updated, ...prev.filter((s) => s.id !== updated.id)]);
      setMutedFetched(false);
      setMuteOpen(false);
      handleClose();
    } catch (err: any) {
      surfaceError("Couldn't mute this signal", err);
    } finally {
      setMuteSubmitting(false);
    }
  };

  // so-8ho: lazy-fetch muted signals on first Muted-pill tap. BE doesn't have
  // a muted_only mode (only include_muted=true mixes muted into the default
  // list); FE filters client-side by mutedUntil/mutedForever.
  const handleFilterChange = (next: 'all' | 'muted') => {
    setFilter(next);
    if (next === 'muted' && !mutedFetched) {
      setMutedFetched(true);
      SoulSignalsService.list({ includeMuted: true })
        .then((all) => {
          setMutedSignals(
            all.filter((s) => s.muteUntil != null || s.mutedForever === true),
          );
        })
        .catch((err) => {
          // Allow a later retry since this fetch has no loading state of its own.
          setMutedFetched(false);
          surfaceError("Couldn't load muted signals", err);
        });
    }
  };

  const handleUnmute = async () => {
    if (!detail) return;
    try {
      const updated = await SoulSignalsService.unmuteSignal(detail.id);
      // Drop from the muted view; add back into the default feed so the user
      // sees it immediately when they switch back.
      setMutedSignals((prev) => prev.filter((s) => s.id !== updated.id));
      setSignals((prev) =>
        prev.find((s) => s.id === updated.id)
          ? prev.map((s) => (s.id === updated.id ? updated : s))
          : [updated, ...prev],
      );
      handleClose();
    } catch (err: any) {
      surfaceError("Couldn't unmute this signal", err);
    }
  };

  const handleViewPattern = async (tag: string) => {
    setPatternTag(tag);
    setPatternLoading(true);
    try {
      const result = await SoulSignalsService.getPatternByTag(tag);
      setPatternAggregate(result);
    } catch (err: any) {
      if (__DEV__) console.warn('[SoulSignals] Pattern fetch error:', err);
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
    // so-ans: dismiss the entire modal stack — the visibility gate would
    // otherwise let the detail modal re-show under the pattern as soon as
    // patternTag flips null. Same close-cascade pattern as so-lbw/so-h76.
    setPatternTag(null);
    setPatternAggregate(null);
    handleClose();
  };

  const handlePatternNoticingPress = (id: string) => {
    // Crossfade: clear pattern state and open the chosen noticing's detail.
    // Doesn't call handleClosePattern — that would also null selectedId, and
    // we want to swap the detail to a new signal, not dismiss it.
    setPatternTag(null);
    setPatternAggregate(null);
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
        // so-vlia SH-M4: the BE now returns the 409 detail as an object that
        // carries the existing shift's id ({ message, existing_shift_id }) —
        // prefer it. Fall back to resolving the shift ourselves (so-72fx) when
        // the field is absent (older BE / flat-string detail) so the deep-link
        // keeps working across the BE rollout.
        const detail = err?.response?.data?.detail;
        const detailObj =
          detail && typeof detail === 'object' && !Array.isArray(detail)
            ? (detail as { message?: string; existing_shift_id?: string })
            : null;
        const detailMsg =
          detailObj?.message ?? (typeof detail === 'string' ? detail : undefined);
        // so-kajr fix: source_signal_ids is not on the normalised Shift type
        // (only on ShiftSuggestionCandidate), so the list-scan fallback cannot
        // work. Rely solely on existing_shift_id from the BE 409 detail.
        const existingShiftId: string | undefined = detailObj?.existing_shift_id;
        showAlert({
          title: 'Already turned into a shift',
          message: detailMsg ?? 'This pattern already has an active shift.',
          buttons: existingShiftId
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
        });
      } else {
        surfaceError("Couldn't create shift from this pattern", err);
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
      surfaceError("Couldn't save this signal", err);
    } finally {
      setSaveSubmitting(false);
    }
  };

  return (
    <CosmicScreen tone="dawn">
      {isLoading ? (
        <View style={[styles.loadingShell, { paddingTop: insets.top + 16 }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={[styles.loadingBack, { top: insets.top + 8 }]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Feather
              name="chevron-left"
              size={28}
              color={isDarkMode ? '#FFFFFF' : '#3A0E66'}
            />
          </Pressable>
          <ActivityIndicator color={isDarkMode ? '#fff' : '#3A0E66'} size="large" />
        </View>
      ) : (
        // so-z3wj: entrance — header lives inside FlatList ListHeaderComponent
        // so we wrap the whole feature component as one animated block.
        <ScreenEnter index={0} style={{ flex: 1 }}>
        <SignalsB
          theme={theme}
          status={status}
          items={filter === 'muted' ? mutedItems : sectionedItems}
          eligibility={{ current: entriesSinceSight, needed: entriesNeeded }}
          listeningMeta={{ entries: entriesSinceSight, patterns: patternsCount }}
          onOpenJournal={handleOpenJournal}
          onBack={() => navigation.goBack()}
          onPatternPress={handlePatternPress}
          focusId={selectedId ?? undefined}
          filter={filter}
          onFilterChange={handleFilterChange}
        />
        </ScreenEnter>
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
        onUnmute={handleUnmute}
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
  loadingBack: {
    position: 'absolute',
    left: 16,
  },
});

export default SoulSignalsScreen;
