import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CosmicScreen } from '../components/CosmicBackdrop';
import {
  ShiftsA,
  ShiftsDetailModal,
  TendModal,
  TendToast,
  StageAdvance,
  ReleaseModal,
  SnoozeModal,
  IntegratedModal,
  SuggestModal,
} from '../features/soulShifts';
import {
  Shift,
  ShiftDetail,
  ShiftSuggestionCandidate,
  ShiftSuggestionResponse,
} from '../features/soulShifts/types';
import SoulShiftsService from '../services/SoulShiftsService';
import { normalizeError } from '../utils/normalizeError';

const SoulShiftsScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? 'dark' : 'light';

  // so-73pj: replace the silent .catch(console.log) sites — surface a friendly,
  // normalized message (never raw axios/technical strings) and keep a dev
  // breadcrumb. Loading/submitting state is reset by each handler's finally.
  const surfaceError = (scope: string, err: unknown) => {
    if (__DEV__) console.warn(`[SoulShifts] ${scope}:`, err);
    Alert.alert('Something went wrong', normalizeError(err));
  };

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Released shifts (so-2pm). Lazy-fetched on first Released-pill tap; reused
  // across re-entries for the session. `releasedFetched` tracks whether the
  // fetch has been kicked off so we don't re-fetch on every tap.
  const [releasedShifts, setReleasedShifts] = useState<Shift[]>([]);
  const [releasedFetched, setReleasedFetched] = useState(false);

  // Detail-modal state. `selectedId` is the source of truth: it drives both
  // the list's focusId (for dim/glow) and the modal's visibility.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ShiftDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Tend interaction state (so-idb).
  const [tendOpen, setTendOpen] = useState(false);
  const [tendSubmitting, setTendSubmitting] = useState(false);
  const [toastShift, setToastShift] = useState<Shift | null>(null);
  const [toastTendCount, setToastTendCount] = useState<number | null>(null);
  // Captured for the Undo affordance once the DELETE tend endpoint ships
  // (separate be_core bead). Today the toast's onUndo prop stays unwired.
  const [_toastTendId, setToastTendId] = useState<string | null>(null);
  const [advance, setAdvance] = useState<{
    detail: ShiftDetail;
    prevStage: number;
    nextStage: number;
  } | null>(null);

  // Release flow (so-7hw).
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseSubmitting, setReleaseSubmitting] = useState(false);

  // Snooze + Integrated full-modal flows (so-y4p).
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozeSubmitting, setSnoozeSubmitting] = useState(false);
  const [integratedOpen, setIntegratedOpen] = useState(false);
  const [integratedSubmitting, setIntegratedSubmitting] = useState(false);

  // Suggest flow (so-pjv).
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestResponse, setSuggestResponse] =
    useState<ShiftSuggestionResponse | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);
  // Track which suggestion ids we've already POST'd /show for this session
  // so the marker fires once per id even if the modal re-opens.
  const shownSuggestionIdsRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    SoulShiftsService.list()
      .then(setShifts)
      .catch((err) => surfaceError('List fetch error', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleShiftPress = (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    SoulShiftsService.getDetail(id)
      .then(setDetail)
      .catch((err) => surfaceError('Detail fetch error', err))
      .finally(() => setDetailLoading(false));
  };

  // Deep-link from Signals (so-8uf): when navigated with { openShiftId },
  // open that shift's detail modal once after mount. Ref-tracked so we don't
  // re-trigger on every focus.
  const openedDeepLinkRef = React.useRef<string | null>(null);
  useEffect(() => {
    const id: string | undefined = route?.params?.openShiftId;
    if (id && openedDeepLinkRef.current !== id) {
      openedDeepLinkRef.current = id;
      handleShiftPress(id);
    }
  }, [route?.params?.openShiftId]);

  const handleClose = () => {
    setSelectedId(null);
    setDetail(null);
  };

  const handleReleasedRequested = () => {
    if (releasedFetched) return;
    setReleasedFetched(true);
    SoulShiftsService.list({ statusFilter: 'released' })
      .then(setReleasedShifts)
      .catch((err) => {
        // Allow a later retry since this fetch has no loading state of its own.
        setReleasedFetched(false);
        surfaceError('Released list error', err);
      });
  };

  const handleRestore = async () => {
    if (!detail) return;
    try {
      const restored = await SoulShiftsService.restore(detail.id);
      // Move from releasedShifts back into the active list (so-8wj).
      setReleasedShifts((prev) => prev.filter((s) => s.id !== restored.id));
      setShifts((prev) => [restored, ...prev]);
      handleClose();
    } catch (err: any) {
      surfaceError('Restore error', err);
    }
  };

  const handleOpenTend = () => {
    if (!detail) return;
    setTendOpen(true);
  };

  const handleSubmitTend = async (payload: { chips: string[]; note?: string }) => {
    if (!detail) return;
    setTendSubmitting(true);
    try {
      const result = await SoulShiftsService.tend(detail.id, payload);
      const updatedDetail: ShiftDetail = {
        ...detail,
        ...result.shift,
        tendCount: result.tendCount,
        lastTend: result.lastTend,
      };

      // so-mv4t: a tend that carries the shift to status='integrated' is
      // auto-archived off the active list by the BE (so-soud) — drop the
      // row locally so it doesn't linger until the next refetch. Every
      // other tend just updates the row in place.
      const integrated = result.shift.status === 'integrated';
      setShifts((prev) =>
        integrated
          ? prev.filter((s) => s.id !== result.shift.id)
          : prev.map((s) => (s.id === result.shift.id ? result.shift : s)),
      );
      setTendOpen(false);
      // Dismiss the entire flow (so-lbw): without this, the underlying detail
      // modal re-appears once TendModal hides because all the gating booleans
      // flip back. Toast + StageAdvance carry their own data snapshots, so
      // nulling selectedId/detail here is safe.
      handleClose();

      setToastShift(result.shift);
      setToastTendCount(result.tendCount);
      setToastTendId(result.tendId);

      // so-mv4t: reaching 'integrated' always gets the celebratory moment
      // (StageAdvance with nextStage=3 → "You've integrated it."), even
      // when the BE didn't flag stage_advanced (e.g. pct was already in
      // the integrate band). Other tends use the normal stage-advance gate.
      if (integrated) {
        setAdvance({
          detail: updatedDetail,
          prevStage: result.prevStage,
          nextStage: 3,
        });
      } else if (result.stageAdvanced) {
        setAdvance({
          detail: updatedDetail,
          prevStage: result.prevStage,
          nextStage: result.nextStage,
        });
      }
    } catch (err: any) {
      surfaceError('Tend error', err);
    } finally {
      setTendSubmitting(false);
    }
  };

  const handleToastDismiss = () => {
    setToastShift(null);
    setToastTendCount(null);
    setToastTendId(null);
  };

  const handleOpenRelease = () => {
    if (!detail) return;
    setReleaseOpen(true);
  };

  const handleOpenSnooze = () => {
    if (!detail) return;
    setSnoozeOpen(true);
  };

  const handleConfirmSnooze = async (until: Date) => {
    if (!detail) return;
    setSnoozeSubmitting(true);
    try {
      const updated = await SoulShiftsService.snooze(detail.id, until);
      // Default GET hides snoozed shifts (be_core so-trc), so the row drops
      // out of the visible list. Mirror that locally.
      setShifts((prev) => prev.filter((s) => s.id !== updated.id));
      setSnoozeOpen(false);
      handleClose();
    } catch (err: any) {
      surfaceError('Snooze error', err);
    } finally {
      setSnoozeSubmitting(false);
    }
  };

  const handleOpenIntegrated = () => {
    if (!detail) return;
    setIntegratedOpen(true);
  };

  const handleConfirmIntegrated = async () => {
    if (!detail) return;
    // Stage thresholds (so-c0y): 0 / 0.25 / 0.5 / 0.75 → notice / practice /
    // embody / integrate. Capture prevStage from current pct so the
    // StageAdvance celebration shows the right transition copy.
    const prevStage =
      detail.pct >= 0.75 ? 3 : detail.pct >= 0.5 ? 2 : detail.pct >= 0.25 ? 1 : 0;

    setIntegratedSubmitting(true);
    try {
      const updated = await SoulShiftsService.markIntegrated(detail.id);
      const updatedDetail: ShiftDetail = { ...detail, ...updated };
      setShifts((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
      setIntegratedOpen(false);
      // Dismiss the entire flow (so-h76, sibling of so-lbw): without this, the
      // detail modal re-appears once IntegratedModal hides — and again after
      // StageAdvance dismisses. StageAdvance carries its own data snapshot.
      handleClose();
      if (prevStage < 3) {
        setAdvance({ detail: updatedDetail, prevStage, nextStage: 3 });
      }
    } catch (err: any) {
      surfaceError('Integrate error', err);
    } finally {
      setIntegratedSubmitting(false);
    }
  };

  const handleConfirmRelease = async (reason?: string) => {
    if (!detail) return;
    setReleaseSubmitting(true);
    try {
      const released = await SoulShiftsService.release(detail.id, reason);
      // Default list call excludes status='released' (be_core so-0aa), so the
      // shift simply drops out of the visible list. Mirror that locally.
      setShifts((prev) => prev.filter((s) => s.id !== released.id));
      setReleaseOpen(false);
      handleClose();
    } catch (err: any) {
      surfaceError('Release error', err);
    } finally {
      setReleaseSubmitting(false);
    }
  };

  const handleOpenSuggest = async () => {
    setSuggestOpen(true);
    setSuggestLoading(true);
    try {
      const result = await SoulShiftsService.getSuggestions();
      setSuggestResponse(result);
      // Fire /show once per suggestion id per session. Idempotent on BE so
      // a repeat fire is harmless, but caching avoids redundant requests.
      if (result.id && result.candidates.length > 0) {
        const seen = shownSuggestionIdsRef.current;
        if (!seen.has(result.id)) {
          seen.add(result.id);
          SoulShiftsService.markSuggestionShown(result.id).catch((err) => {
            // Fire-and-forget analytics marker — not user-facing, dev log only.
            if (__DEV__) console.warn('[SoulShifts] markSuggestionShown error:', err);
          });
        }
      }
    } catch (err: any) {
      surfaceError('Suggestions fetch error', err);
      setSuggestResponse({
        id: null,
        candidates: [],
        generated_at: null,
        next_eligible_at: null,
      });
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleAcceptSuggestion = async (
    candidateIdx: number,
    candidate: ShiftSuggestionCandidate,
  ) => {
    const suggestionId = suggestResponse?.id;
    if (!suggestionId) return;
    setSuggestSubmitting(true);
    try {
      const created = await SoulShiftsService.acceptSuggestion(
        suggestionId,
        candidateIdx,
        candidate,
      );
      setShifts((prev) => [created, ...prev]);
      setSuggestOpen(false);
      setSuggestResponse(null);
    } catch (err: any) {
      surfaceError('Accept suggestion error', err);
    } finally {
      setSuggestSubmitting(false);
    }
  };

  const ordinal = (n: number): string => {
    const v = n % 100;
    if (v >= 11 && v <= 13) return `${n}th`;
    switch (n % 10) {
      case 1:
        return `${n}st`;
      case 2:
        return `${n}nd`;
      case 3:
        return `${n}rd`;
      default:
        return `${n}th`;
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
        <ShiftsA
          theme={theme}
          shifts={shifts}
          onBack={() => navigation.goBack()}
          onShiftPress={handleShiftPress}
          focusId={selectedId ?? undefined}
          onSuggestionsPress={handleOpenSuggest}
          releasedShifts={releasedShifts}
          onReleasedRequested={handleReleasedRequested}
        />
      )}

      <ShiftsDetailModal
        visible={
          selectedId != null &&
          !tendOpen &&
          !releaseOpen &&
          !snoozeOpen &&
          !integratedOpen &&
          advance == null
        }
        detail={detail}
        theme={theme}
        onClose={handleClose}
        onTend={handleOpenTend}
        onRelease={handleOpenRelease}
        onIntegrated={handleOpenIntegrated}
        onSnooze={handleOpenSnooze}
        onRestore={handleRestore}
      />

      <ReleaseModal
        visible={releaseOpen}
        detail={detail}
        theme={theme}
        onClose={() => setReleaseOpen(false)}
        onConfirm={handleConfirmRelease}
        submitting={releaseSubmitting}
      />

      <SnoozeModal
        visible={snoozeOpen}
        detail={detail}
        theme={theme}
        onClose={() => setSnoozeOpen(false)}
        onConfirm={handleConfirmSnooze}
        submitting={snoozeSubmitting}
      />

      <IntegratedModal
        visible={integratedOpen}
        detail={detail}
        theme={theme}
        onClose={() => setIntegratedOpen(false)}
        onConfirm={handleConfirmIntegrated}
        submitting={integratedSubmitting}
      />

      <SuggestModal
        visible={suggestOpen}
        response={suggestResponse}
        loading={suggestLoading}
        theme={theme}
        onClose={() => {
          setSuggestOpen(false);
          setSuggestResponse(null);
        }}
        onAccept={handleAcceptSuggestion}
        submitting={suggestSubmitting}
      />

      <TendModal
        visible={tendOpen}
        detail={detail}
        theme={theme}
        onClose={() => setTendOpen(false)}
        onSubmit={handleSubmitTend}
        submitting={tendSubmitting}
      />

      <TendToast
        shift={toastShift}
        theme={theme}
        onDismiss={handleToastDismiss}
        tendCountLabel={
          toastTendCount != null ? `${ordinal(toastTendCount)} time` : undefined
        }
      />

      {advance && (
        <StageAdvance
          visible
          detail={advance.detail}
          prevStage={advance.prevStage}
          nextStage={advance.nextStage}
          theme={theme}
          onContinue={() => setAdvance(null)}
          onReflect={() => {
            setAdvance(null);
            navigation.navigate('CreateJournal');
          }}
        />
      )}

      {detailLoading && selectedId && !detail ? (
        <View
          pointerEvents="none"
          style={[styles.detailFetchShell, { paddingTop: insets.top + 80 }]}
        >
          <ActivityIndicator color={isDarkMode ? '#fff' : '#3A0E66'} />
        </View>
      ) : null}
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
  detailFetchShell: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
});

export default SoulShiftsScreen;
