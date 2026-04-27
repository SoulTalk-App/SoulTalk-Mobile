import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { fonts } from '../theme';
import SoulSightService, { SoulsightDetail } from '../services/SoulSightService';
import { SightsB, SightDetail, SightStatus, SoulpalVariant } from '../features/soulSightsB';

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');
const ProfileBackIcon = require('../../assets/images/profile/ProfileBackIcon.png');

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
  const theme = isDarkMode ? 'dark' : 'light';
  const soulsightId: string = route.params?.soulsightId;
  const displayStatusOverride: SightStatus | undefined = route.params?.displayStatus;

  const [detail, setDetail] = useState<SoulsightDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!soulsightId) {
      setIsLoading(false);
      return;
    }
    SoulSightService.getById(soulsightId)
      .then(setDetail)
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

  const handleSave = () => {
    // TODO: backend endpoint for archive (idempotent) — pending [ASK] to soultalk_be_core
    console.log('[SoulSight] Save tapped (stub)', sight?.id);
  };

  const handleOpenJournal = () => {
    navigation.navigate('CreateJournal');
  };

  const backIconSource = isDarkMode ? BackIcon : ProfileBackIcon;

  return (
    <View style={styles.root}>
      {isLoading ? (
        <View style={[styles.loadingShell, { paddingTop: insets.top + 16 }]}>
          <ActivityIndicator color={isDarkMode ? '#fff' : '#3A0E66'} size="large" />
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
        />
      )}

      <View style={[styles.backRow, { top: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Image source={backIconSource} style={styles.backIcon} resizeMode="contain" />
        </Pressable>
        <Text
          style={[
            styles.backText,
            { color: isDarkMode ? '#fff' : '#3A0E66' },
          ]}
        >
          Back
        </Text>
      </View>
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
  backRow: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backIcon: {
    width: 36,
    height: 36,
  },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 18,
  },
});

export default SoulSightDetailScreen;
