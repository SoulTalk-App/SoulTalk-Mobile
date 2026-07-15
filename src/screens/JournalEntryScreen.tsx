import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { fonts, useThemeColors } from '../theme';
import { useJournal } from '../contexts/JournalContext';
import { useWS } from '../contexts/WebSocketContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSoulPalName } from '../contexts/SoulPalContext';
import JournalService, { JournalEntry } from '../services/JournalService';
import SoulPalAnimated from '../components/SoulPalAnimated';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { TOUCH_HITSLOP_SMALL } from '../components/touchPrimitives';
import { useMountedRef } from '../hooks';
import AIGeneratedLabel from '../components/AIGeneratedLabel';
import JournalLoader from '../components/JournalLoader';

// so-jb0t: BE appends generate_safety_redirect text to the LLM reflection
// when mode === 'CRISIS_OVERRIDE'. The redirect block always opens with this
// phrase (app/services/ai/safety.py:123), so we can deterministically split
// the combined response_text into reflection + safety to render them on
// separate surfaces. Legacy responses without the marker fall back to
// rendering as a single blob.
const CRISIS_SAFETY_PREFIX = 'What you are feeling right now matters';

const splitCrisisText = (text: string): { reflection: string; safety: string | null } => {
  const idx = text.indexOf(CRISIS_SAFETY_PREFIX);
  if (idx < 0) return { reflection: text, safety: null };
  return {
    reflection: text.slice(0, idx).trim(),
    safety: text.slice(idx).trim(),
  };
};

const JournalEntryScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { entries } = useJournal();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const dk = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        content: { flex: 1, paddingHorizontal: 22 },
        backRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
        titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
        titleText: { fontFamily: fonts.edensor.bold, fontSize: 26, color: colors.white, flex: 1 },
        // TODO(theme): map 'rgba(77, 232, 212, 0.10)' to palette key (edit btn bg)
        editBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(77, 232, 212, 0.10)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(77, 232, 212, 0.25)' },
        editBtnText: { fontFamily: fonts.outfit.medium, fontSize: 13, color: colors.primary },
        editBtnDisabled: { opacity: 0.4 },
        // TODO(theme): map 'rgba(255, 255, 255, 0.08)' (ai card bg) and 'rgba(112, 202, 207, 0.20)' (border) to palette keys
        aiCard: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(112, 202, 207, 0.20)', padding: 18, marginBottom: 16 },
        aiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
        aiLabel: { fontFamily: fonts.edensor.bold, fontSize: 16, color: colors.primary },
        // outfit.light at 15pt body was P1 illegible per audit — bumped to regular.
        aiText: { fontFamily: fonts.outfit.regular, fontSize: 15, lineHeight: 15 * 1.65, color: 'rgba(255, 255, 255, 0.88)', marginBottom: 14 },
        pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
        // TODO(theme): map 'rgba(255, 255, 255, 0.08)' (topic pill bg) to palette key
        topicPill: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
        // 0.8 → text.secondary (dark = 0.7) — slight drop, tokenized
        pillText: { fontFamily: fonts.outfit.medium, fontSize: 12, color: colors.text.secondary },
        // teal at alpha — uses dark accent.teal (#4DE8D4) at 0.7
        themesLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 12, color: 'rgba(77, 232, 212, 0.7)', marginBottom: 6 },
        copingLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 12, color: 'rgba(77, 232, 212, 0.7)', marginBottom: 6 },
        // TODO(theme): map 'rgba(77, 232, 212, 0.08)' / '0.20' (coping pill) to palette keys
        copingPill: { backgroundColor: 'rgba(77, 232, 212, 0.08)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(77, 232, 212, 0.20)' },
        aiLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
        // outfit.light at 14pt body was P1 — bumped to regular.
        aiLoadingText: { fontFamily: fonts.outfit.regular, fontSize: 14, color: 'rgba(255, 255, 255, 0.45)', fontStyle: 'italic' },
        // TODO(theme): map 'rgba(255, 255, 255, 0.06)' / '0.10' (entry card) to palette keys
        entryCard: { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.10)', padding: 20 },
        // 0.5 matches dark text.light (inkFaint) exactly
        entryLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 14, color: colors.text.light, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
        // TODO(theme): map 'rgba(255, 255, 255, 0.88)' to palette key
        entryText: { fontFamily: fonts.outfit.regular, fontSize: 17, lineHeight: 17 * 1.65, color: 'rgba(255, 255, 255, 0.88)' },
        // so-jb0t: distinct surface for the appended safety_redirect block.
        // Warm gold accent reads as steady support rather than alarm; the
        // separator visually decouples it from the LLM's CRISIS_OVERRIDE
        // reflection above to combat the so-59ir "wonky and repetitive" feel.
        crisisCard: {
          backgroundColor: 'rgba(255, 200, 92, 0.08)',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: 'rgba(255, 200, 92, 0.22)',
          padding: 14,
          marginTop: 4,
          marginBottom: 14,
        },
        crisisHeader: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 12,
          color: '#FFC85C',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        },
        crisisText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 14,
          lineHeight: 14 * 1.6,
          color: 'rgba(255, 255, 255, 0.88)',
        },
      }),
    [colors],
  );
  const lt = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        content: { flex: 1, paddingHorizontal: 22 },
        backRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
        // Light path: page-bg ink for AA on the so-u1k lavender wash.
        titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
        titleText: { fontFamily: fonts.outfit.regular, fontSize: 24, color: colors.text.primary, flex: 1 },
        // TODO(theme): map 'rgba(255, 255, 255, 0.15)' to palette key
        actionBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(89, 22, 139, 0.10)', borderRadius: 16 },
        actionBtnText: { fontFamily: fonts.outfit.medium, fontSize: 13, color: colors.text.primary },
        actionBtnDisabled: { opacity: 0.5 },
        contentCard: { flex: 1, backgroundColor: colors.white, borderRadius: 10, padding: 20 },
        scrollContent: { flexGrow: 1 },
        aiSection: { marginBottom: 16 },
        // TODO(theme): map '#E0D4E8' (light divider) to palette key
        aiDivider: { height: 1, backgroundColor: '#E0D4E8', marginBottom: 14 },
        aiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
        aiLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 14, color: colors.primary },
        // outfit.light at 14pt body + '#333333' hex → outfit.regular + colors.text.dark
        // (light = #000, dark = #fff). High contrast on white card bg.
        aiText: { fontFamily: fonts.outfit.regular, fontSize: 14, lineHeight: 14 * 1.6, color: colors.text.dark, marginBottom: 12 },
        pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
        // TODO(theme): map '#F3ECFA' to palette key (lavender pill bg)
        topicPill: { backgroundColor: '#F3ECFA', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
        pillText: { fontFamily: fonts.outfit.medium, fontSize: 12, color: colors.primary },
        themesLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 12, color: colors.primary, marginBottom: 4 },
        copingLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 12, color: colors.primary, marginBottom: 4 },
        // TODO(theme): map '#E8F5E9' (coping pill bg) to palette key
        copingPill: { backgroundColor: '#E8F5E9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
        // '#2E7D32' (dark green) → colors.success (#4CAF50). Slight pixel
        // drift but tokenized; both pass AA on the pale-green pill bg.
        copingPillText: { fontFamily: fonts.outfit.medium, fontSize: 12, color: colors.success },
        aiLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        // P1 fix: '#888' on white = ~3.5:1 (fails AA). outfit.light at 13pt
        // body was also P1. → outfit.regular + colors.text.light (#666666 =
        // ~5.7:1 on white, passes AA).
        aiLoadingText: { fontFamily: fonts.outfit.regular, fontSize: 13, color: colors.text.light, fontStyle: 'italic' },
        journalLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 14, color: colors.primary, marginTop: 14, marginBottom: 8 },
        // '#333333' → colors.text.dark (#000 light)
        journalText: { fontFamily: fonts.outfit.regular, fontSize: 14, lineHeight: 14 * 1.6, color: colors.text.dark },
        // so-jb0t: light-mode safety_redirect surface — soft cream so it
        // reads as a steadying support panel, not an alarm, while clearly
        // breaking the visual flow from the LLM reflection above.
        crisisCard: {
          backgroundColor: '#FFF6E8',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#F2D9A8',
          padding: 14,
          marginTop: 4,
          marginBottom: 12,
        },
        crisisHeader: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 12,
          color: '#8B6914',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        },
        crisisText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 14,
          lineHeight: 14 * 1.6,
          color: colors.text.dark,
        },
      }),
    [colors],
  );
  const entryId: string = route.params?.entryId;
  const isLatest: boolean = route.params?.isLatest ?? false;

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  // so-wuy8: pull from SoulPalContext (was an inline AsyncStorage read).
  // useSoulPalName falls back to 'SoulPal' when unset, so the reflection
  // label gracefully reads "SoulPal's Reflection" pre-onboarding.
  const chosenName = useSoulPalName();
  const soulPalName = `${chosenName}'s Reflection`;

  // so-xark: gate post-await setEntry behind mountedRef so a fetch that
  // resolves after the user exits doesn't setState on an unmounted screen
  // (same crash class as so-3i78). Uses the so-pw5d useMountedRef primitive.
  const mountedRef = useMountedRef();

  const { subscribe } = useWS();

  // so-43yw: incremental streaming render. streamingText is null when no
  // stream is active for this entry; an empty string while waiting for the
  // first token; a growing string as response_token events arrive.
  // Rendered once length > 0 so the transition from the inline loader is
  // seamless (no flash of empty content between stream_start and token 1).
  const [streamingText, setStreamingText] = useState<string | null>(null);

  useEffect(() => {
    const unsubStart = subscribe('response_stream_start', (data: any) => {
      if (data.entry_id !== entryId) return;
      setStreamingText('');
    });
    const unsubToken = subscribe('response_token', (data: any) => {
      if (data.entry_id !== entryId) return;
      const delta: string = data.delta ?? '';
      if (!delta) return; // dispatch: empty delta → ignore
      setStreamingText((prev) => (prev !== null ? prev + delta : delta));
    });
    const unsubEnd = subscribe('response_stream_end', (data: any) => {
      if (data.entry_id !== entryId) return;
      const { response_text, mode, tags_summary } = data;
      setStreamingText(null);
      // Reconcile local entry to the authoritative full text immediately —
      // no need to wait for journal_ai_complete or the 5s poll tick.
      if (mountedRef.current) {
        setEntry((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ai_processing_status: 'complete',
            ai_response: response_text
              ? { text: response_text, mode: mode ?? null }
              : prev.ai_response,
            tags: tags_summary ? {
              ...prev.tags,
              emotion_primary: tags_summary.emotion_primary ?? null,
              nervous_system_state: tags_summary.nervous_system_state ?? null,
              crisis_flag: tags_summary.crisis_flag ?? false,
            } as any : prev.tags,
          };
        });
      }
    });
    const unsubError = subscribe('response_stream_error', (data: any) => {
      if (data.entry_id !== entryId) return;
      // Exit streaming mode; existing 5s poll takes over and surfaces the
      // failure state via ai_processing_status once the BE settles.
      setStreamingText(null);
    });
    return () => {
      unsubStart();
      unsubToken();
      unsubEnd();
      unsubError();
    };
  }, [entryId, subscribe, mountedRef]);

  // so-uba4: track AI-refresh surfacing — set when the detail poll runs
  // into a failed status OR times out (MAX_POLL_ATTEMPTS). Render a
  // non-blocking inline "Couldn't refresh insight — tap to retry" so the
  // user isn't silently shown a stale ai_response. Clearing the flag
  // resets the poll budget and re-arms the existing 5s loop.
  const [aiRefreshError, setAiRefreshError] = useState(false);
  // so-9bq8: separate flag for budget-exhausted-while-pending (BE still
  // working) vs a genuine fetch/status failure. Different copy; no retry
  // affordance (user just checks back later or foregrounds to re-arm).
  const [aiPendingExhausted, setAiPendingExhausted] = useState(false);

  useEffect(() => {
    JournalService.getEntry(entryId)
      .then((fetched) => {
        if (mountedRef.current) setEntry(fetched);
      })
      .catch(() => {
        const found = entries.find((e) => e.id === entryId);
        if (found && mountedRef.current) setEntry(found);
      });
  }, [entryId]);

  // so-uba4: refetch on screen focus. Returning from the editor (which
  // goBack()s here for edits) didn't change entryId, so the entryId-keyed
  // effect above never re-ran and the user saw the pre-edit text + stale
  // ai_response + edit_count 0/3. useFocusEffect runs on every focus
  // gain after the initial mount — fresh state every time the user lands
  // on this screen. Skip the very first focus (the entryId effect already
  // covers initial mount) by tracking a flag.
  const initialFocusRef = React.useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (initialFocusRef.current) {
        initialFocusRef.current = false;
        return;
      }
      // Clear any lingering surfaced AI-refresh error on re-focus — the
      // refetch below will arm a fresh poll cycle.
      setAiRefreshError(false);
      setAiPendingExhausted(false);
      JournalService.getEntry(entryId)
        .then((fetched) => {
          if (mountedRef.current) setEntry(fetched);
        })
        .catch(() => {
          // Stay on the prior entry view if the refetch fails (network);
          // the user can tap back/forward to retry. Don't blank the screen.
        });
    }, [entryId, mountedRef]),
  );

  useEffect(() => {
    const found = entries.find((e) => e.id === entryId);
    if (!found) return;
    // List endpoint doesn't include ai_response/tags — fetch detail if needed
    if (found.ai_processing_status === 'complete' && !entry?.ai_response) {
      JournalService.getEntry(entryId)
        .then((fetched) => {
          if (mountedRef.current) setEntry(fetched);
        })
        .catch(() => {});
    } else if (found.ai_response) {
      setEntry(found);
    }
  }, [entries]);

  useEffect(() => {
    // so-por9: 'skipped' is terminal (AI consent absent) — stop poll immediately.
  if (!entry || entry.ai_processing_status === 'complete' || entry.ai_processing_status === 'failed' || entry.ai_processing_status === 'skipped' || entry.is_draft) return;
    if (aiRefreshError || aiPendingExhausted) return; // so-uba4/so-9bq8: stop polling once we've surfaced an error or exhaustion; resume on re-arm.
    // so-urv4 #3: cancelled flag scoped to this poll session. clearInterval
    // stops future ticks but doesn't cancel an in-flight tick's await —
    // setEntry could land on an unmounted/blurred screen. Mirror the
    // AffirmationMirrorScreen useFocusEffect pattern: flip on cleanup,
    // check after await.
    const ctrl = { cancelled: false };
    // so-uba4: cap the poll budget. Previously the loop ran forever if the
    // BE never settled the AI processing status — and any network error
    // inside the tick was swallowed by `catch {}`, hiding real failures
    // from the user. 30 ticks × 5s = 2.5min, matches the CreateJournal
    // save-animation budget; if still 'pending' past that, the BE work
    // almost certainly failed and we surface a retry affordance.
    const MAX_POLL_ATTEMPTS = 30;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const fresh = await JournalService.getEntry(entryId);
        if (ctrl.cancelled) return;
        if (fresh.ai_processing_status === 'failed') {
          setEntry(fresh);
          clearInterval(interval);
          // so-uba4: surface the failure — don't silently show the stale
          // ai_response below.
          setAiRefreshError(true);
          return;
        }
        if (fresh.ai_processing_status === 'skipped') {
          // so-por9: AI was skipped (consent absent). Terminal — stop polling.
          // renderAiSection handles the calm "AI insights are off" display.
          // Do NOT set aiRefreshError (no retry will help without consent).
          setEntry(fresh);
          clearInterval(interval);
          return;
        }
        if (fresh.ai_processing_status === 'complete') {
          setEntry(fresh);
          clearInterval(interval);
          return;
        }
        if (attempts >= MAX_POLL_ATTEMPTS) {
          // so-uba4/so-9bq8: budget exhausted with status still pending.
          // BE is still working — signal with aiPendingExhausted (distinct
          // from aiRefreshError) so a softer "check back later" message
          // renders instead of the retry affordance.
          clearInterval(interval);
          if (!ctrl.cancelled && mountedRef.current) setAiPendingExhausted(true);
        }
      } catch {
        // so-uba4: network blip mid-poll — count toward the budget so a
        // persistent outage eventually surfaces as a retry affordance
        // instead of silently looping.
        if (attempts >= MAX_POLL_ATTEMPTS) {
          clearInterval(interval);
          if (!ctrl.cancelled && mountedRef.current) setAiRefreshError(true);
        }
      }
    }, 5000);
    return () => {
      ctrl.cancelled = true;
      clearInterval(interval);
    };
  }, [entry?.ai_processing_status, entry?.is_draft, entryId, aiRefreshError, aiPendingExhausted, mountedRef]);

  // so-uba4: retry handler for the inline "Couldn't refresh insight" affordance.
  // Refetch once + reset the error flag so the polling effect above re-arms
  // (if the entry is still pending) or settles directly (if the BE already
  // produced the AI response since we last looked).
  const handleRetryAiRefresh = useCallback(() => {
    setAiRefreshError(false);
    JournalService.getEntry(entryId)
      .then((fetched) => {
        if (mountedRef.current) setEntry(fetched);
      })
      .catch(() => {
        // Network still down — re-set the error flag so the affordance
        // stays visible.
        if (mountedRef.current) setAiRefreshError(true);
      });
  }, [entryId, mountedRef]);

  // so-9bq8: re-arm the poll when the app returns to the foreground.
  // useFocusEffect is navigation focus only — backgrounding a mounted screen
  // never triggers it. When the entry is still non-terminal, clear both error
  // flags and do an immediate refetch so the poll effect restarts and the
  // screen doesn't wait 5s for the next tick or stay stuck on "Gathering
  // your thoughts" after a background→foreground cycle.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' || !mountedRef.current) return;
      if (!entry) return;
      const s = entry.ai_processing_status;
      if (s === 'complete' || s === 'failed' || s === 'skipped' || entry.is_draft) return;
      setAiRefreshError(false);
      setAiPendingExhausted(false);
      JournalService.getEntry(entryId)
        .then((fetched) => { if (mountedRef.current) setEntry(fetched); })
        .catch(() => {});
    });
    return () => sub.remove();
  }, [entry?.ai_processing_status, entry?.is_draft, entryId, mountedRef]);

  const editCount = entry?.edit_count ?? 0;
  const canEdit = isLatest && editCount < 3;

  const handleEdit = () => {
    if (!entry || !canEdit) return;
    navigation.navigate('CreateJournal', { entry });
  };

  // so-uba4: tappable inline affordance. Sits below the failure/loading
  // copy so the user sees the cause AND a retry path in the same row.
  const renderAiRetryRow = () => (
    <Pressable
      onPress={handleRetryAiRefresh}
      hitSlop={TOUCH_HITSLOP_SMALL}
      accessibilityRole="button"
      accessibilityLabel="Retry refreshing insight"
      style={{ marginTop: 8 }}
    >
      <Text
        style={[
          isDarkMode ? dk.aiLoadingText : lt.aiLoadingText,
          { color: isDarkMode ? colors.primary : colors.primary, textDecorationLine: 'underline' },
        ]}
      >
        Couldn’t refresh insight — tap to retry
      </Text>
    </Pressable>
  );

  // ── Shared content helpers ──
  const renderAiSection = () => {
    // so-43yw: streaming branch — show incremental text once the first
    // token has arrived (length > 0). While streamingText === '' (stream
    // started but no tokens yet) we fall through to the existing loader so
    // there's no flash of empty content. On response_stream_end,
    // streamingText is set back to null and the entry is reconciled to
    // 'complete', so the normal complete branch renders from then on.
    if (streamingText !== null && streamingText.length > 0) {
      return (
        <>
          <View style={isDarkMode ? dk.aiLabelRow : lt.aiLabelRow}>
            {isDarkMode && <SoulPalAnimated size={32} animate={true} />}
            <Text style={isDarkMode ? dk.aiLabel : lt.aiLabel}>{soulPalName}</Text>
          </View>
          <Text style={isDarkMode ? dk.aiText : lt.aiText}>
            {streamingText.replace(/\*+/g, '')}
          </Text>
          {/* so-gozt: moved below reflection text — de-emphasised metadata
              position per client feedback. Transparent bg = pill-less,
              matches so-cdis affirmation approach. Disclosure stays visible. */}
          <AIGeneratedLabel
            size="compact"
            tone="auto"
            style={{ marginTop: 10, backgroundColor: 'transparent', borderColor: 'transparent' }}
          />
        </>
      );
    }

    // so-uba4: error surfacing takes precedence over the optimistic
    // ‘complete’ branch — otherwise a stale ai_response from before an
    // edit would render as the current report even though we know the
    // re-run failed.
    // so-9bq8: budget-exhausted-while-pending gets its own softer copy
    // (BE is still working, not a hard failure). No retry button — the
    // AppState listener re-arms on next foreground.
    if (aiPendingExhausted) {
      return (
        <Text style={isDarkMode ? dk.aiLoadingText : lt.aiLoadingText}>
          Still working on your reflection. Check back in a bit.
        </Text>
      );
    }
    if (aiRefreshError) {
      return (
        <>
          <Text style={isDarkMode ? dk.aiLoadingText : lt.aiLoadingText}>
            Insight couldn’t be refreshed right now.
          </Text>
          {renderAiRetryRow()}
        </>
      );
    }
    if (entry!.ai_processing_status === 'complete') {
      return (
        <>
          <View style={isDarkMode ? dk.aiLabelRow : lt.aiLabelRow}>
            {isDarkMode && <SoulPalAnimated size={32} animate={false} />}
            <Text style={isDarkMode ? dk.aiLabel : lt.aiLabel}>{soulPalName}</Text>
          </View>
          {entry!.ai_response?.text ? (() => {
            const raw = entry!.ai_response.text.replace(/\*+/g, '');
            const isCrisis = entry!.ai_response.mode === 'CRISIS_OVERRIDE';
            if (!isCrisis) {
              return <Text style={isDarkMode ? dk.aiText : lt.aiText}>{raw}</Text>;
            }
            const { reflection, safety } = splitCrisisText(raw);
            return (
              <>
                {reflection ? (
                  <Text style={isDarkMode ? dk.aiText : lt.aiText}>{reflection}</Text>
                ) : null}
                {safety ? (
                  <View style={isDarkMode ? dk.crisisCard : lt.crisisCard}>
                    <Text style={isDarkMode ? dk.crisisHeader : lt.crisisHeader}>
                      Support resources
                    </Text>
                    <Text style={isDarkMode ? dk.crisisText : lt.crisisText}>{safety}</Text>
                  </View>
                ) : null}
              </>
            );
          })() : (
            <Text style={isDarkMode ? dk.aiLoadingText : lt.aiLoadingText}>No reflection available.</Text>
          )}
          {!entry!.tags?.crisis_flag && entry!.ai_response?.mode !== 'CRISIS_OVERRIDE' &&
            entry!.tags?.topics && entry!.tags.topics.length > 0 && (
            <View>
              <Text style={isDarkMode ? dk.themesLabel : lt.themesLabel}>Themes in this reflection</Text>
              <View style={isDarkMode ? dk.pillRow : lt.pillRow}>
                {entry!.tags.topics.map((topic, idx) => (
                  <View key={idx} style={isDarkMode ? dk.topicPill : lt.topicPill}>
                    <Text style={isDarkMode ? dk.pillText : lt.pillText}>{topic}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {!entry!.tags?.crisis_flag && entry!.ai_response?.mode !== 'CRISIS_OVERRIDE' &&
            entry!.tags?.coping_mechanisms && entry!.tags.coping_mechanisms.length > 0 && (
            <View>
              <Text style={isDarkMode ? dk.copingLabel : lt.copingLabel}>General coping suggestions</Text>
              <View style={isDarkMode ? dk.pillRow : lt.pillRow}>
                {entry!.tags.coping_mechanisms.map((mech, idx) => (
                  <View key={idx} style={isDarkMode ? dk.copingPill : lt.copingPill}>
                    <Text style={isDarkMode ? dk.pillText : lt.copingPillText}>{mech}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {/* so-gozt / so-7r4y: AI-disclosure label — moved below all reflection
              content per Chelsea's feedback (inconspicuous positioning). Transparent
              bg removes the pill chrome so it reads as faint metadata at the bottom
              of the AI card. Legal disclosure remains visible + legible. */}
          <AIGeneratedLabel
            size="compact"
            tone="auto"
            style={{ marginTop: 12, backgroundColor: 'transparent', borderColor: 'transparent' }}
          />
        </>
      );
    }
    if (entry!.ai_processing_status === 'failed') {
      // so-uba4: pair the failure copy with the retry affordance so the
      // user can re-attempt without leaving the screen.
      return (
        <>
          <Text style={isDarkMode ? dk.aiLoadingText : lt.aiLoadingText}>AI processing failed.</Text>
          {renderAiRetryRow()}
        </>
      );
    }
    if (entry!.ai_processing_status === 'skipped') {
      // so-por9: AI was skipped because the user has not given AI consent.
      // Calm informational state — no retry affordance (re-trying won't help
      // without consent). Direct the user to Settings to enable AI insights.
      return (
        <>
          <Text style={isDarkMode ? dk.aiLoadingText : lt.aiLoadingText}>
            AI insights are off for this entry.
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            hitSlop={TOUCH_HITSLOP_SMALL}
            accessibilityRole="button"
            accessibilityLabel="Go to Settings to enable AI insights"
            style={{ marginTop: 8 }}
          >
            <Text
              style={[
                isDarkMode ? dk.aiLoadingText : lt.aiLoadingText,
                { color: colors.primary, textDecorationLine: 'underline' },
              ]}
            >
              Enable in Settings
            </Text>
          </Pressable>
        </>
      );
    }
    // so-4j34: unify the pending UI with the submit-flow loader. The
    // legacy ActivityIndicator + faint "Preparing your reflection..."
    // line read as a different visual language from
    // CreateJournalScreen's overlay; mid-processing navigation to the
    // detail flipped the user from one loader to a noticeably
    // different one. JournalLoader.inline now reuses the same SoulPal
    // breathing + writing-dots + rotating status scene, theme-aware
    // via useThemeColors. The old TODO(theme) at #59168B is folded
    // into colors.loaderAccent inside the component.
    return <JournalLoader variant="inline" />;
  };

  // ════════════════════════════════════════
  // LOADING STATE
  // ════════════════════════════════════════
  if (!entry) {
    return (
      <CosmicScreen tone="dawn">
        <View style={[isDarkMode ? dk.content : lt.content, { paddingTop: insets.top + 16 }]}>
          <Pressable
            style={isDarkMode ? dk.backRow : lt.backRow}
            onPress={() => navigation.goBack()}
            hitSlop={TOUCH_HITSLOP_SMALL}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather
              name="chevron-left"
              size={28}
              color={isDarkMode ? '#FFFFFF' : '#3A0E66'}
            />
          </Pressable>
          <ActivityIndicator
            color={isDarkMode ? colors.primary : colors.white}
            size="large"
            style={{ flex: 1 }}
          />
        </View>
      </CosmicScreen>
    );
  }

  // ════════════════════════════════════════
  // DARK MODE
  // ════════════════════════════════════════
  if (isDarkMode) {
    return (
      <CosmicScreen tone="dawn">
        <ScrollView
          style={[dk.content, { paddingTop: insets.top + 16 }]}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={dk.backRow}
            onPress={() => navigation.goBack()}
            hitSlop={TOUCH_HITSLOP_SMALL}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="chevron-left" size={28} color="#FFFFFF" />
          </Pressable>
          <View style={dk.titleRow}>
            <Text style={dk.titleText}>Journal Entry</Text>
            {isLatest && (
              <Pressable
                style={[dk.editBtn, !canEdit && dk.editBtnDisabled]}
                onPress={handleEdit}
                disabled={!canEdit}
              >
                <Text style={[dk.editBtnText, !canEdit && { opacity: 0.5 }]}>Edit {editCount}/3</Text>
              </Pressable>
            )}
          </View>
          <View style={dk.aiCard}>{renderAiSection()}</View>
          <View style={dk.entryCard}>
            <Text style={dk.entryLabel}>Your Entry</Text>
            <Text style={dk.entryText}>{entry.raw_text}</Text>
          </View>
        </ScrollView>
      </CosmicScreen>
    );
  }

  // ════════════════════════════════════════
  // LIGHT MODE
  // ════════════════════════════════════════
  return (
    <CosmicScreen tone="dawn">
      <View style={[lt.content, { paddingTop: insets.top + 16 }]}>
        <Pressable
          style={lt.backRow}
          onPress={() => navigation.goBack()}
          hitSlop={TOUCH_HITSLOP_SMALL}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="chevron-left" size={28} color="#3A0E66" />
        </Pressable>
        <View style={lt.titleRow}>
          <Text style={lt.titleText}>Journal Entry</Text>
          {isLatest && (
            <Pressable
              style={[lt.actionBtn, !canEdit && lt.actionBtnDisabled]}
              onPress={handleEdit}
              disabled={!canEdit}
            >
              <Text style={[lt.actionBtnText, !canEdit && { opacity: 0.5 }]}>Edit {editCount}/3</Text>
            </Pressable>
          )}
        </View>
        <View style={lt.contentCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={lt.scrollContent}
          >
            <View style={lt.aiSection}>{renderAiSection()}</View>
            <View style={lt.aiDivider} />
            <Text style={lt.journalLabel}>Your Entry</Text>
            <Text style={lt.journalText}>{entry.raw_text}</Text>
          </ScrollView>
        </View>
        <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }} />
      </View>
    </CosmicScreen>
  );
};


export default JournalEntryScreen;
