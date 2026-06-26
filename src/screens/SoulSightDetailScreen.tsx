import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useThemeColors } from '../theme';
import { CosmicScreen } from '../components/CosmicBackdrop';
import SoulSightService, { SoulsightDetail } from '../services/SoulSightService';
import { SightsB, SightDetail, SightStatus, SoulpalVariant } from '../features/soulSightsB';

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

function deriveStatus(detail: SoulsightDetail | null, override?: SightStatus): SightStatus {
  if (override) return override;
  if (!detail) return 'processing';
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
  // to the BE split only if content is absent. Dedupe paragraphs that equal
  // the pull-quote text so the body doesn't render the quoted sentence twice.
  const pullQuoteText = (detail.pull_quote?.text ?? '').trim();
  let paragraphs: string[];
  if (parsed.paragraphs.length > 0) {
    paragraphs = pullQuoteText
      ? parsed.paragraphs.filter((p) => p.trim() !== pullQuoteText)
      : parsed.paragraphs;
  } else {
    paragraphs = detail.reading_paragraphs ?? [];
  }
  return {
    id: detail.id,
    title: detail.title ?? parsed.title ?? 'Your weekly Sight',
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
  const [archivedAt, setArchivedAt] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    if (!soulsightId) {
      setIsLoading(false);
      return;
    }
    SoulSightService.getById(soulsightId)
      .then((d) => {
        setDetail(d);
        setArchivedAt(d.archived_at ?? null);
      })
      .catch((err) => console.log('[SoulSight] Detail fetch error:', err.message))
      .finally(() => setIsLoading(false));
  }, [soulsightId]);

  const status = useMemo(
    () => deriveStatus(detail, displayStatusOverride),
    [detail, displayStatusOverride],
  );
  const sight = useMemo(
    () => (detail ? buildSightDetail(detail) : undefined),
    [detail],
  );

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
          eligibility={{ current: 5, needed: 7 }}
          processingMeta={{
            entries: detail?.entry_count ?? 0,
            signals: detail?.active_days ?? 0,
          }}
          onOpenJournal={handleOpenJournal}
          onSave={handleSave}
          onShare={handleShare}
          onBack={() => navigation.goBack()}
          isArchived={!!archivedAt}
          isArchiving={isArchiving}
        />
      )}
    </CosmicScreen>
  );
};

export default SoulSightDetailScreen;
