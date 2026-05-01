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
import SoulSightService, { SoulsightDetail } from '../services/SoulSightService';
import { SightsB, SightDetail, SightStatus, SoulpalVariant } from '../features/soulSightsB';

const FALLBACK_PULL_QUOTE = {
  text: 'You stopped negotiating with yourself for permission to rest.',
  tag: 'The thread of your week',
};

const FALLBACK_SIGNALS = [
  'You wrote about pacing three times this week — twice unprompted.',
  'Tone in entries softened after Wednesday.',
  'You named what you wanted, twice. That\'s rare for you.',
  'You forgave yourself in writing on Friday.',
];

function formatWindow(start: string, end: string): string {
  try {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
  } catch {
    return `${start} – ${end}`;
  }
}

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
  const window = formatWindow(detail.window_start, detail.window_end);
  const paragraphs =
    detail.reading_paragraphs && detail.reading_paragraphs.length > 0
      ? detail.reading_paragraphs
      : parsed.paragraphs;
  return {
    id: detail.id,
    title: detail.title ?? parsed.title ?? 'Your weekly Sight',
    window,
    entries: detail.entry_count,
    signals: detail.active_days,
    soulpal: detail.soulpal_variant ?? pickSoulpal(detail.id),
    reading_paragraphs: paragraphs,
    pull_quote: detail.pull_quote ?? FALLBACK_PULL_QUOTE,
    signals_summary:
      detail.signals_summary && detail.signals_summary.length > 0
        ? detail.signals_summary
        : FALLBACK_SIGNALS,
  };
}

const SoulSightDetailScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          // TODO(theme): map '#02011A' to palette key (sights detail near-black)
          backgroundColor: '#02011A',
        },
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
    try {
      await Share.share({
        title: sight.title,
        message: `${sight.title}\n\n${sight.reading_paragraphs[0] ?? ''}`,
      });
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
    <View style={styles.root}>
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
    </View>
  );
};

export default SoulSightDetailScreen;
