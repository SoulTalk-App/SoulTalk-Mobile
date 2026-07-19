import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useWS } from '../contexts/WebSocketContext';
import { useThemeColors } from '../theme';
import { CosmicScreen } from '../components/CosmicBackdrop';
import SoulSightService, { SoulsightDetail } from '../services/SoulSightService';
import { SightsB, SightDetail, SightStatus, SoulpalVariant } from '../features/soulSightsB';
import { useSoulsightStatus } from '../hooks/useSoulsightStatus';

// so-dwqk: FALLBACK_PULL_QUOTE + FALLBACK_SIGNALS removed. When BE returned
// null/empty for these (common on fresh users with sparse data), the FE was
// rendering hardcoded first-person therapeutic claims AS IF they were the
// user's own reflection — "You forgave yourself in writing on Friday"
// attributed to a tester who never wrote on Friday. P0 trust rupture for a
// mental-health product. Pass through null/empty; ReadingBody now gates
// both blocks on truthy/non-empty. Paired ASK to be_core to add telemetry
// on empty pull_quote/signals_summary so the upstream LLM prompt can be
// tuned (or the eligibility gate tightened) if it's frequent.

function pickSoulpal(id: string): SoulpalVariant {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 5) + 1) as SoulpalVariant;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^---+$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    // so-9t3d MI-5: strip LLM section-prefix labels that leak through from the
    // prompt structure (e.g. "Big picture snapshot:\n", "Soul signal pattern:\n").
    // Pattern: Title-case word(s) followed by colon at the start of a line.
    .replace(/^[A-Z][^:\n]{2,50}:\s*\n/gm, '')
    .trim();
}

function parseContent(content: string): { title?: string; paragraphs: string[] } {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : undefined;
  const stripped = stripMarkdown(content.replace(/^#+\s+.+$/gm, ''));
  const paragraphs = stripped
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);
  return { title, paragraphs };
}

// so-9t3d M-3: `fetchFailed` distinguishes "still loading" (null detail,
// fetchFailed=false → show ProcessingState) from "fetch error" (null detail,
// fetchFailed=true → show error + retry). Previously deriveStatus(null) always
// returned 'processing', causing an eternal spinner on offline/failed fetches.
function deriveStatus(
  detail: SoulsightDetail | null,
  fetchFailed: boolean,
  override?: SightStatus,
): SightStatus {
  if (override) return override;
  if (!detail) return fetchFailed ? 'error' : 'processing';
  const s = (detail.status || '').toLowerCase();
  if (s === 'processing' || s === 'pending' || s === 'generating') return 'processing';
  if (!detail.content || detail.content.trim().length === 0) return 'processing';
  return 'done';
}

function buildSightDetail(detail: SoulsightDetail): SightDetail {
  const parsed = detail.content
    ? parseContent(detail.content)
    : { title: undefined, paragraphs: [] };
  // so-y818: use BE-provided relative label; drop client-side tz math.
  const window = detail.window_label ?? '';
  // so-knjv: BE-provided reading_paragraphs has truncated mid-analysis in the
  // wild (lead-confirmed 7k+ chars in detail.content vs a shorter array). The
  // raw `content` is canonical, so parse from it when present and fall back
  // to the BE split only if content is absent.
  // so-9t3d MI-5: dedupe uses `includes` (not ===) — the pull-quote sentence
  // typically appears verbatim inside a longer body paragraph, so an exact
  // match fails and the body renders the same sentence twice.
  const pullQuoteText = (detail.pull_quote?.text ?? '').trim();
  let paragraphs: string[];
  if (parsed.paragraphs.length > 0) {
    paragraphs = pullQuoteText
      ? parsed.paragraphs.filter((p) => !p.includes(pullQuoteText))
      : parsed.paragraphs;
  } else {
    paragraphs = detail.reading_paragraphs ?? [];
  }
  // so-9t3d MI-4: safety_redirect content gets a neutral default title so the
  // header doesn't read "Your weekly Sight" for crisis resource content.
  const isSafetyRedirect = detail.status === 'safety_redirect';
  // so-6xir: strip leading '#' heading prefix the BE sometimes sends. Use ||
  // (not ??) so an empty string after stripping ("# " → "") still falls back.
  const rawTitle = (detail.title ?? parsed.title)?.replace(/^#+\s*/, '').trim();
  return {
    id: detail.id,
    title: rawTitle || (isSafetyRedirect ? 'Support Resources' : 'Your weekly Sight'),
    window,
    entries: detail.entry_count,
    signals: detail.active_days,
    soulpal: detail.soulpal_variant ?? pickSoulpal(detail.id),
    reading_paragraphs: paragraphs,
    pull_quote: detail.pull_quote ?? null,
    signals_summary: detail.signals_summary ?? [],
  };
}

const SoulSightDetailScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        loadingShell: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors],
  );
  const theme = isDarkMode ? 'dark' : 'light';
  const soulsightId: string = route.params?.soulsightId;
  const displayStatusOverride: SightStatus | undefined = route.params?.displayStatus;

  const [detail, setDetail] = useState<SoulsightDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // so-9t3d M-3: distinguishes a failed fetch from "still loading" so we can
  // show error + retry instead of an eternal ProcessingState spinner.
  const [detailFetchFailed, setDetailFetchFailed] = useState(false);
  // Incrementing this triggers a fresh getById fetch (retry affordance).
  const [retryKey, setRetryKey] = useState(0);
  const [archivedAt, setArchivedAt] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  // so-nmqq: null = waiting for soulsight_signals_ready event (extraction in
  // progress); non-null = extraction done, flags tell us which parts succeeded.
  const [signalsReady, setSignalsReady] = useState<{ signals_ok: boolean; shifts_ok: boolean } | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!soulsightId) {
      setIsLoading(false);
      return;
    }
    // Reset on every fetch (including retries from the error UI).
    setDetailFetchFailed(false);
    setDetail(null);
    setIsLoading(true);
    SoulSightService.getById(soulsightId)
      .then((d) => {
        if (!mountedRef.current) return;
        setDetail(d);
        setArchivedAt(d.archived_at ?? null);
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        // so-9t3d M-3: record fetch failure so deriveStatus can return 'error'
        // instead of 'processing', surfacing retry instead of an eternal spinner.
        setDetailFetchFailed(true);
        console.log('[SoulSight] Detail fetch error:', err.message);
      })
      .finally(() => {
        if (mountedRef.current) setIsLoading(false);
      });
  }, [soulsightId, retryKey]);

  // so-nmqq: listen for deferred signal/shift extraction completion. When the
  // BE finishes asyncio.gather(_extract_shifts, _extract_signals) it publishes
  // soulsight_signals_ready with {soulsight_id, signals_ok, shifts_ok}.
  // so-9t3d M-1: refetch regardless of signals_ok — a shifts-only extraction
  // failure still updates content; always get the latest detail on this event.
  const { subscribe } = useWS();
  useEffect(() => {
    if (!soulsightId) return;
    const unsub = subscribe('soulsight_signals_ready', (data: any) => {
      if (data.soulsight_id !== soulsightId) return;
      const { signals_ok, shifts_ok } = data;
      setSignalsReady({ signals_ok, shifts_ok });
      // so-9t3d M-1: unconditional refetch (removed the `if (signals_ok)` gate
      // that caused shifts-only failures to never update the displayed detail).
      SoulSightService.getById(soulsightId)
        .then((d) => { if (mountedRef.current) setDetail(d); })
        .catch(() => {});
    });
    return unsub;
  }, [soulsightId, subscribe]);

  const status = useMemo(
    () => deriveStatus(detail, detailFetchFailed, displayStatusOverride),
    [detail, detailFetchFailed, displayStatusOverride],
  );

  // so-9t3d M-1 / M-3 systemic: poll /status while the sight is generating so
  // Detail has liveness — signals resolve within ~10s even if the WS event
  // doesn't arrive. When polledStatus flips to complete/safety_redirect we
  // refetch the full detail to surface content + signals.
  const { status: polledStatus } = useSoulsightStatus(
    status === 'processing' ? soulsightId : null,
    { intervalMs: 10000 },
  );

  const refetchDetail = useCallback(() => {
    if (!soulsightId || !mountedRef.current) return;
    SoulSightService.getById(soulsightId)
      .then((d) => { if (mountedRef.current) setDetail(d); })
      .catch(() => {});
  }, [soulsightId]);

  useEffect(() => {
    if (status !== 'processing') return;
    if (polledStatus === 'complete' || polledStatus === 'safety_redirect') {
      refetchDetail();
    }
  }, [polledStatus, status, refetchDetail]);
  const sight = useMemo(
    () => (detail ? buildSightDetail(detail) : undefined),
    [detail],
  );

  // so-nmqq: skeleton is shown when the report is done but signals_summary is
  // still empty (extraction in flight) and the event hasn't arrived yet.
  // Past SoulSights always have signals_summary populated — they never see this
  // state. The failed case shows a non-alarming empty-state note instead.
  const signalsLoading = status === 'done' && signalsReady === null && !(detail?.signals_summary?.length);
  const signalsFailed = signalsReady !== null && !signalsReady.signals_ok;

  const handleShare = async () => {
    if (!sight) return;
    const body = sight.reading_paragraphs.filter(Boolean).join('\n\n');
    const message = [sight.title, body, 'Shared from SoulTalk']
      .filter(Boolean)
      .join('\n\n');
    try {
      await Share.share(
        {
          title: sight.title,
          message,
        },
        { subject: sight.title },
      );
    } catch (e: any) {
      console.log('[SoulSight] Share error:', e?.message);
    }
  };

  const handleSave = async () => {
    if (!sight || isArchiving || archivedAt) return;
    const previous = archivedAt;
    setIsArchiving(true);
    setArchivedAt(new Date().toISOString());
    try {
      const updated = await SoulSightService.setArchived(sight.id, true);
      setArchivedAt(updated.archived_at ?? new Date().toISOString());
    } catch (e: any) {
      console.log('[SoulSight] Archive error:', e?.message);
      setArchivedAt(previous);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleOpenJournal = () => {
    navigation.navigate('CreateJournal');
  };

  return (
    <CosmicScreen tone="dawn">
      {isLoading ? (
        <View style={[styles.loadingShell, { paddingTop: insets.top + 16 }]}>
          {/* TODO(theme): map '#3A0E66' (light deep purple) to palette key */}
          <ActivityIndicator color={isDarkMode ? colors.text.primary : '#3A0E66'} size="large" />
        </View>
      ) : (
        <SightsB
          theme={theme}
          status={status}
          sight={sight}
          // so-9t3d MI-5: Detail screen doesn't fetch eligibility — LockedState
          // omits the progress bar when eligibility is absent. The hardcoded
          // {current:5,needed:7} was a landmine that showed fake numbers.
          processingMeta={detail ? {
            entries: detail.entry_count,
            signals: detail.active_days,
          } : undefined}
          onOpenJournal={handleOpenJournal}
          onSave={handleSave}
          onShare={handleShare}
          onBack={() => navigation.goBack()}
          // so-9t3d M-3: onRetry increments retryKey which re-triggers getById.
          onRetry={detailFetchFailed ? () => setRetryKey((k) => k + 1) : undefined}
          isArchived={!!archivedAt}
          isArchiving={isArchiving}
          signalsLoading={signalsLoading}
          signalsFailed={signalsFailed}
          // so-9t3d MI-4: suppress Share + enable crisis link tappability.
          isSafetyRedirect={detail?.status === 'safety_redirect'}
          // so-c7oq: data-gate the entrance — fires only when content is ready,
          // not while ProcessingState/loader is visible (double-animation risk).
          entranceTrigger={{ revealed: status === 'done' }}
        />
      )}
    </CosmicScreen>
  );
};

export default SoulSightDetailScreen;
