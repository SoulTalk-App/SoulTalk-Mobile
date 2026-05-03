import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const SoulShiftsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? 'dark' : 'light';

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      .catch((err) => console.log('[SoulShifts] List fetch error:', err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const handleShiftPress = (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    SoulShiftsService.getDetail(id)
      .then(setDetail)
      .catch((err) => console.log('[SoulShifts] Detail fetch error:', err.message))
      .finally(() => setDetailLoading(false));
  };

  const handleClose = () => {
    setSelectedId(null);
    setDetail(null);
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

      setShifts((prev) =>
        prev.map((s) => (s.id === result.shift.id ? result.shift : s)),
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

      if (result.stageAdvanced) {
        setAdvance({
          detail: updatedDetail,
          prevStage: result.prevStage,
          nextStage: result.nextStage,
        });
      }
    } catch (err: any) {
      console.log('[SoulShifts] Tend error:', err?.message);
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
      console.log('[SoulShifts] Snooze error:', err?.message);
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
      console.log('[SoulShifts] markIntegrated error:', err?.message);
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
      console.log('[SoulShifts] Release error:', err?.message);
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
          SoulShiftsService.markSuggestionShown(result.id).catch((err) =>
            console.log('[SoulShifts] markSuggestionShown error:', err?.message),
          );
        }
      }
    } catch (err: any) {
      console.log('[SoulShifts] Suggestions fetch error:', err?.message);
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
      console.log('[SoulShifts] Accept suggestion error:', err?.message);
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
  detailFetchShell: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
});

export default SoulShiftsScreen;
