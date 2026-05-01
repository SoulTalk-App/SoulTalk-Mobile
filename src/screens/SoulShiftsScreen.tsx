import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import {
  ShiftsA,
  ShiftsDetailModal,
  TendModal,
  TendToast,
  StageAdvance,
  ReleaseModal,
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
      setDetail(updatedDetail);
      setTendOpen(false);

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

    const submit = async (untilDate: Date) => {
      try {
        const updated = await SoulShiftsService.snooze(detail.id, untilDate);
        // Default GET hides snoozed shifts (be_core so-trc), so the row
        // drops out of the visible list. Mirror that locally.
        setShifts((prev) => prev.filter((s) => s.id !== updated.id));
        handleClose();
      } catch (err: any) {
        console.log('[SoulShifts] Snooze error:', err?.message);
      }
    };

    const addDays = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return d;
    };

    Alert.alert(
      'Snooze this shift',
      'It’ll disappear from your list and reappear when the snooze ends.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '1 day', onPress: () => submit(addDays(1)) },
        { text: '1 week', onPress: () => submit(addDays(7)) },
        { text: '1 month', onPress: () => submit(addDays(30)) },
      ],
    );
  };

  const handleMarkIntegrated = () => {
    if (!detail) return;
    // Stage thresholds (so-c0y): 0 / 0.25 / 0.5 / 0.75 → notice / practice /
    // embody / integrate. Capture prevStage from current pct so the
    // StageAdvance celebration shows the right transition copy.
    const prevStage =
      detail.pct >= 0.75 ? 3 : detail.pct >= 0.5 ? 2 : detail.pct >= 0.25 ? 1 : 0;

    const submit = async () => {
      try {
        const updated = await SoulShiftsService.markIntegrated(detail.id);
        const updatedDetail: ShiftDetail = { ...detail, ...updated };
        setShifts((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
        setDetail(updatedDetail);
        if (prevStage < 3) {
          setAdvance({ detail: updatedDetail, prevStage, nextStage: 3 });
        } else {
          // Already at integrate stage — just close the detail so the user
          // sees the list-level reflection of the new status.
          handleClose();
        }
      } catch (err: any) {
        console.log('[SoulShifts] markIntegrated error:', err?.message);
      }
    };

    Alert.alert(
      'Mark this shift integrated?',
      'It’ll move to the Integrated bucket and stop nudging you to tend it. You can keep tending it any time.',
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Mark integrated', style: 'default', onPress: submit },
      ],
    );
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
    <View style={styles.root}>
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
          selectedId != null && !tendOpen && !releaseOpen && advance == null
        }
        detail={detail}
        theme={theme}
        onClose={handleClose}
        onTend={handleOpenTend}
        onRelease={handleOpenRelease}
        onIntegrated={handleMarkIntegrated}
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
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#02011A',
  },
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
