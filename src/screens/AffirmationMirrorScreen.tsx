import React, { useCallback, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useJournal } from '../contexts/JournalContext';
import { useAuth } from '../contexts/AuthContext';
import JournalService from '../services/JournalService';
import { formatLocalDateKey, getDeviceTimezone } from '../utils/timezone';
import { useAppAlert } from '../components/AppAlertProvider';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { ReadyState, AffirmationItem } from '../features/affirmationMirror/ReadyState';
import { AffirmationReveal } from '../features/affirmationMirror/AffirmationReveal';
import { ink } from '../features/soulSignals/tokens';

// so-dtuh: state machine collapsed to loading | reveal | ready. The 'reveal'
// kind covers both cold entry (from the Home grid, with no affirmation_text
// yet — AffirmationReveal renders idle + a context-aware central button) and
// the replay-from-ready path (with affirmation_text supplied — AffirmationReveal
// auto-jumps via its existing AsyncStorage REVEALED_DATE_KEY check).
// so-lt40 MI-2: history now carries historyTotal so ReadyState can show a
// load-more button when more pages exist.
type ScreenState =
  | { kind: 'loading' }
  | { kind: 'reveal'; affirmation_text?: string; date_key?: string }
  | { kind: 'ready'; today: AffirmationItem; history: AffirmationItem[]; historyTotal: number }
  // so-a95p: BE returns 200 {code:'no_entry_today'} when user hasn't journaled
  // today. Distinct state so the FE can show a friendly prompt-to-journal UI
  // without routing through the error/toast path.
  | { kind: 'no_entry_today'; message: string };

const AffirmationMirrorScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const theme = isDarkMode ? 'dark' : 'light';
  const { hasEntryToday } = useJournal();
  // so-zmjn: pull the BE-authoritative user.timezone so the client's
  // "today" date_key matches the BE's computation exactly. Falls back
  // to device tz, then UTC, mirroring JournalContext.hasEntryToday.
  const { user } = useAuth();
  // so-1zn0: themed alert replaces native Alert.
  const { showError, showAlert } = useAppAlert();

  // so-urv4 #2: optimistic-reveal on mount. Previously the screen blocked
  // first paint on listAffirmations(30,0); users saw a spinner while the
  // 30-item history loaded. Now we render AffirmationReveal immediately
  // (its own idle video + clouds is the perceived launch) and upgrade to
  // 'ready' only if the list resolves with today's row present. Cost:
  // returning users with an already-generated today flash reveal briefly
  // before snapping to ready; the AffirmationReveal AsyncStorage replay
  // marker already softens that for users who tapped reveal once today.
  const [state, setState] = useState<ScreenState>({ kind: 'reveal' });
  // so-pq3o: false until fetchData has decided reveal-vs-ready at least once
  // this mount. The initial optimistic {kind:'reveal'} paints AffirmationReveal
  // instantly (so-urv4 launch feel), but its interactive Reveal CTA must stay
  // gated until we know there's no today-row — otherwise a returning user sees
  // the reveal page flash + can tap Reveal during that window (racing /today).
  // Reset to false on every mount (re-entry remounts), so the gate re-arms.
  const [settled, setSettled] = useState(false);
  // so-lt40 MI-2: tracks whether a load-more page request is in flight.
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchData = useCallback(async (isCancelled?: () => boolean) => {
    // so-vjzo / so-dtuh: no early-return on !hasEntryToday — AffirmationReveal
    // handles that visually now via its 'Journal to Unlock' button. Always
    // hit the list endpoint so a returning user with prior entries still
    // sees their history once they journal.
    //
    // so-3i78: isCancelled is supplied by the useFocusEffect caller so a
    // mid-fetch blur discards results instead of setting state on a
    // backgrounded screen (one of the post-#41 P0 crash classes Chelsea
    // hit on TF49).
    const cancelled = () => Boolean(isCancelled?.());
    try {
      const list = await JournalService.listAffirmations(30, 0);
      if (cancelled()) return;
      // so-pq3o: fetchData has decided — release the CTA gate. Either we flip
      // to 'ready' (history; the reveal CTA never becomes interactive) or stay
      // 'reveal' as a genuine first-time-today (CTA now enabled).
      setSettled(true);
      // so-zmjn: format the date_key in the USER'S timezone. The
      // previous `new Date().toISOString().slice(0, 10)` was UTC, which
      // disagrees with the BE (BE uses users.timezone) at every
      // UTC/local boundary — the "today" check then missed today's row
      // and offered a duplicate reveal. Match the BE exactly.
      const userTz = user?.timezone || getDeviceTimezone() || 'UTC';
      const todayIso = formatLocalDateKey(new Date(), userTz);
      // BE includes today's row in history when /today has already generated;
      // detect it by date_key matching today's local date.
      const today = list.items.find((it) => it.date_key === todayIso) ?? null;
      if (today) {
        // so-lt40 MI-2: carry historyTotal so ReadyState can show load-more.
        setState({ kind: 'ready', today, history: list.items, historyTotal: list.total });
      } else {
        setState({ kind: 'reveal' });
      }
    } catch (err: any) {
      if (cancelled()) return;
      // so-pq3o: the fetch resolved (with an error); settle so the CTA gate
      // releases and the genuine first-time reveal flow stays usable.
      setSettled(true);
      // History endpoint may not exist on older BE deploys; fall back to the
      // reveal entry screen so the user can still trigger /today.
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        setState({ kind: 'reveal' });
      } else {
        // so-fntk: friendly fallback via normalizeError.
        showError(err, { title: 'Affirmation Mirror' });
        setState({ kind: 'reveal' });
      }
    }
  }, [user?.timezone, showError, showAlert]);

  useFocusEffect(
    useCallback(() => {
      // so-3i78: track a cancelled flag scoped to this focus session so a
      // blur (user backed out before listAffirmations resolved) stops the
      // post-await setState from landing on a backgrounded/unmounted screen.
      // The fetchData function itself can't be cancelled — axios in this
      // codebase has no abort wiring — so we just discard its result on
      // resolve/reject when the focus session is gone.
      let cancelled = false;
      // so-urv4 #2: no longer flip to 'loading' on every focus — keep the
      // current screen (initial 'reveal' optimistic state, or persistent
      // 'ready' from a prior focus) while fetchData resolves in the
      // background. fetchData itself transitions to 'ready' when today is
      // present in the response, and to 'reveal' when it isn't.
      fetchData(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [fetchData]),
  );

  // so-dtuh: handleGenerate is now a Promise the AffirmationReveal entry
  // button awaits — it returns the affirmation payload so AffirmationReveal
  // can immediately play its reveal animation with the new text. The screen
  // state stays as `{kind:'reveal'}` (no text), which is also the marker
  // handleRevealClose uses to know this was a cold-entry generate vs a replay.
  const handleGenerate = useCallback(async (): Promise<{
    affirmation_text: string;
    date_key: string;
  }> => {
    try {
      const data = await JournalService.getTodayAffirmation();
      // so-a95p: BE returns 200 {code:'no_entry_today'} when user hasn't journaled
      // today. This is NOT an error — do not route through showError/toast. Set the
      // dedicated screen state and throw a sentinel so handleGeneratePress resets its
      // spinner. Real failures (503, network) fall through to the catch below.
      if ('code' in data && data.code === 'no_entry_today') {
        setState({ kind: 'no_entry_today', message: data.message });
        throw Object.assign(new Error('no_entry_today'), { _noToast: true });
      }
      // so-zmjn: surface a friendly error instead of animating to a
      // blank mirror if the BE returns an empty/whitespace text OR
      // omits date_key entirely (defensive guard — the reveal-once
      // AsyncStorage write below depends on a real key, see
      // AffirmationReveal handleReveal).
      const trimmedText = data.affirmation_text?.trim();
      if (!trimmedText) {
        throw new Error('Affirmation came back empty. Please try again in a moment.');
      }
      if (!data.date_key) {
        throw new Error("Couldn't tag today's affirmation. Please try again in a moment.");
      }
      return {
        affirmation_text: trimmedText,
        date_key: data.date_key,
      };
    } catch (err: any) {
      // so-a95p: no_entry_today sentinel — setState already called; skip toast.
      if (err?._noToast) throw err;
      // so-lt40 MI-1: consent-revoked (403 ai_consent_required) dead-ends in
      // a toast loop today — every tap re-toasts without offering an exit.
      // Detect the specific code and offer navigation to Settings instead.
      if (
        err?.response?.status === 403 &&
        err?.response?.data?.detail?.code === 'ai_consent_required'
      ) {
        showAlert({
          title: 'AI Insights Required',
          message:
            err?.response?.data?.detail?.message ||
            'Enable AI Insights in Settings to generate your affirmation.',
          buttons: [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Enable in Settings',
              onPress: () => navigation.navigate('Settings'),
            },
          ],
        });
        throw err;
      }
      // so-lt40 MI-5(d): BE returns 503 when the user hasn't met the journal
      // ritual criteria. Its generic message ("write a journal entry first")
      // describes a different rule than the FE gate (hasEntryToday). Replace
      // with copy that matches the FE's canonical "today" requirement.
      if (err?.response?.status === 503) {
        showError(
          new Error("Write today's journal entry to unlock your affirmation."),
          { title: 'Affirmation Mirror' },
        );
        throw err;
      }
      // so-fntk: friendly text via normalizeError. The thrown Error
      // messages above (trimmed-text / missing date_key) pass through
      // because they're already user-grade.
      showError(err, { title: 'Affirmation Mirror' });
      throw err;
    }
  }, [showError, showAlert, navigation]);

  const handleReplay = useCallback(() => {
    if (state.kind !== 'ready') return;
    setState({
      kind: 'reveal',
      affirmation_text: state.today.affirmation_text,
      date_key: state.today.date_key,
    });
  }, [state]);

  const handleRevealClose = useCallback(() => {
    // so-dzfx: from a cold-entry generate the user came straight from Home
    // with no list screen in between — back should exit the mirror, not drop
    // them onto a list they never opened. The list refreshes on the next
    // focus via useFocusEffect. Replay (state.affirmation_text was supplied
    // upfront) refetches and returns to the list the user came from.
    if (state.kind === 'reveal' && !state.affirmation_text) {
      navigation.goBack();
      return;
    }
    setState({ kind: 'loading' });
    fetchData();
  }, [state, fetchData, navigation]);

  // so-lt40 MI-2: load the next page of history (offset = current list length).
  // State is updated by appending to the existing history array so the list
  // never flickers back to the top. Uses the cancelled flag pattern from
  // so-3i78 — if the user leaves mid-fetch, the result is discarded.
  const loadMoreCancelledRef = useRef(false);
  const handleLoadMore = useCallback(async () => {
    if (state.kind !== 'ready' || isLoadingMore) return;
    const currentLen = state.history.length;
    if (currentLen >= state.historyTotal) return;
    loadMoreCancelledRef.current = false;
    setIsLoadingMore(true);
    try {
      const more = await JournalService.listAffirmations(30, currentLen);
      if (loadMoreCancelledRef.current) return;
      setState((prev) => {
        if (prev.kind !== 'ready') return prev;
        return {
          ...prev,
          history: [...prev.history, ...more.items],
          historyTotal: more.total,
        };
      });
    } catch (err) {
      if (!loadMoreCancelledRef.current) {
        showError(err, { title: 'Affirmation Mirror' });
      }
    } finally {
      if (!loadMoreCancelledRef.current) setIsLoadingMore(false);
    }
  }, [state, isLoadingMore, showError]);

  const handleOpenJournal = useCallback(() => {
    // so-jqk1: replace (not navigate/push) so we don't leave AffirmationMirror
    // sitting under Journal in the stack. If we push, a subsequent Home-tab
    // tap from Journal would pop two screens at once across two different
    // transition specs (Journal's fast fade + AffirmationMirror's default
    // slide), which renders Home half-mounted as a side strip.
    navigation.replace('Journal');
  }, [navigation]);

  // so-dtuh: AffirmationReveal owns its own full-bleed chrome (clouds + videos
  // + back button), so render it on its own without the CosmicScreen wrapper.
  if (state.kind === 'reveal') {
    return (
      <AffirmationReveal
        isDarkMode={isDarkMode}
        hasEntryToday={hasEntryToday}
        affirmation_text={state.affirmation_text}
        date_key={state.date_key}
        onGenerate={handleGenerate}
        onOpenJournal={handleOpenJournal}
        onClose={handleRevealClose}
        // so-pq3o: gate the interactive CTA until fetchData settles. Replay
        // (affirmation_text supplied) only happens from a settled 'ready'
        // state, so settled is already true there — the gate only bites on
        // the cold optimistic-reveal window.
        ctaReady={settled}
        // so-lt40 MI-5(c): per-user AsyncStorage key so same-day account
        // switch doesn't inherit the previous user's revealed state.
        userId={user?.id}
      />
    );
  }

  // so-a95p: friendly empty state when user hasn't journaled today. Uses the
  // BE message verbatim + a CTA to open the journal. Not an error — no toast.
  if (state.kind === 'no_entry_today') {
    return (
      <CosmicScreen tone="dawn">
        <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
            <Feather
              name="chevron-left"
              size={26}
              color={isDarkMode ? '#FFFFFF' : '#3A0E66'}
            />
          </Pressable>
          <Text style={[styles.headerTitle, { color: ink(theme) }]}>
            Affirmation Mirror
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.noEntryShell}>
          <Text style={[styles.noEntryMsg, { color: ink(theme) }]}>
            {state.message}
          </Text>
          <Pressable
            onPress={handleOpenJournal}
            style={[
              styles.noEntryCta,
              {
                borderColor: isDarkMode
                  ? 'rgba(255,255,255,0.30)'
                  : 'rgba(58,14,102,0.25)',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open journal to write today's entry"
          >
            <Text style={[styles.noEntryCtaText, { color: ink(theme) }]}>
              Write today's entry
            </Text>
          </Pressable>
        </View>
      </CosmicScreen>
    );
  }

  return (
    <CosmicScreen tone="dawn">
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
          <Feather
            name="chevron-left"
            size={26}
            color={isDarkMode ? '#FFFFFF' : '#3A0E66'}
          />
        </Pressable>
        <Text style={[styles.headerTitle, { color: ink(theme) }]}>
          Affirmation Mirror
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {state.kind === 'loading' ? (
          <View style={styles.loadingShell}>
            <ActivityIndicator
              size="large"
              color={isDarkMode ? colors.text.primary : '#3A0E66'}
            />
          </View>
        ) : (
          <ReadyState
            theme={theme}
            today={state.today}
            history={state.history}
            historyTotal={state.historyTotal}
            onReplay={handleReplay}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore}
          />
        )}
      </ScrollView>
    </CosmicScreen>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.edensor.regular,
    fontSize: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  loadingShell: {
    paddingTop: 120,
    alignItems: 'center',
  },
  // so-a95p: no_entry_today state
  noEntryShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  noEntryMsg: {
    fontFamily: fonts.edensor.regular,
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  noEntryCta: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: 1,
  },
  noEntryCtaText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default AffirmationMirrorScreen;
