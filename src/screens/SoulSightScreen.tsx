import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useSoulPalName } from '../contexts/SoulPalContext';
import { useJournal } from '../contexts/JournalContext';
import { useAppAlert } from '../components/AppAlertProvider';
import { CosmicScreen } from '../components/CosmicBackdrop';
import SoulSightService, {
  EligibilityResponse,
  SoulsightSummary,
} from '../services/SoulSightService';
import { useSoulsightStatus } from '../hooks/useSoulsightStatus';

type SoulpalVariant = 1 | 2 | 3 | 4 | 5;

const SOULPAL_SRC: Record<SoulpalVariant, any> = {
  1: require('../../assets/images/home-v2/soulpal-1.png'),
  2: require('../../assets/images/home-v2/soulpal-2.png'),
  3: require('../../assets/images/home-v2/soulpal-3.png'),
  4: require('../../assets/images/home-v2/soulpal-4.png'),
  5: require('../../assets/images/home-v2/soulpal-5.png'),
};

const TEAL = '#70CACF';
const PINK = '#E93678';
const YELLOW = '#FFC85C';
const LILAC = '#C8A6FF';
const ORANGE = '#FF8A4C';
const CYAN = '#67D1FF';
const PURPLE = '#4F1786';

const TONE_PALETTE = [TEAL, PINK, YELLOW, LILAC, ORANGE, CYAN];

/** Stable per-id hash → tone, so the same sight always paints the same
 *  color across rerenders. Saves a service-side enum until the wire surfaces
 *  per-sight tone (see [ASK] to be_core in so-ry4 handoff). */
function toneForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONE_PALETTE[h % TONE_PALETTE.length];
}

function soulpalForId(id: string): SoulpalVariant {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 5) + 1) as SoulpalVariant;
}

const formatCreatedDate = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Buckets a list of summaries into "current" (still forming) + "past" (done). */
function bucketSights(summaries: SoulsightSummary[]) {
  const current = summaries.find(
    (s) => s.status === 'processing' || s.status === 'pending' || s.status === 'generating',
  ) ?? null;
  const past = summaries.filter((s) => s !== current && s.status !== 'pending');
  return { current, past };
}


const SoulSightScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const isDark = isDarkMode;
  const soulPalName = useSoulPalName();
  // so-rhap: refetch the SoulBar whenever a generation settles. The
  // BE resets the bar server-side on complete/safety_redirect (a new
  // SoulSight rolls forward the "since" boundary in the on-demand
  // computation) and the eligibility refresh on failed paths can also
  // shift the cap. checkEligibility doesn't return bar state, so the
  // local soulBar in JournalContext would stay stale until the next
  // Home focus without an explicit refetch here.
  const { fetchSoulBar } = useJournal();
  // so-1zn0: themed alert replaces native Alert across this surface.
  const { showAlert, showError } = useAppAlert();

  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [soulsights, setSoulsights] = useState<SoulsightSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  // so-9t3d MI-1: pagination state.
  const [listTotal, setListTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // so-9t3d MI-2: surface fetch failures instead of silently swallowing them.
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setFetchError(null);
    try {
      const [elig, list] = await Promise.all([
        SoulSightService.checkEligibility(),
        SoulSightService.list(),
      ]);
      setEligibility(elig);
      setSoulsights(list.soulsights);
      setListTotal(list.total);
    } catch (err: any) {
      // so-9t3d MI-2: surface error so the user can see a retry affordance
      // instead of the "Your first SoulSight is forming" empty card (false).
      setFetchError(err?.message || 'Could not load SoulSights.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchData();
    }, [fetchData]),
  );

  // so-9t3d systemic fix: replaced manual setInterval with shared useSoulsightStatus
  // hook. This makes generation progress resumable — if the user nav-away and
  // returns while a forming card is visible, the hook polls current?.id and
  // navigates when complete (M-3). Active sessions still poll at 3s; resumed
  // sessions poll at 10s (same pattern as Detail).
  const { current, past } = useMemo(() => bucketSights(soulsights), [soulsights]);

  // Poll whichever ID is active: the just-generated one (fast) OR any forming
  // card visible on return from nav-away (slow). generatingId takes precedence.
  const activePollId = useMemo(
    () => generatingId ?? current?.id ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [generatingId, current?.id],
  );
  const { status: polledGenStatus, isFinal: polledIsFinal, errorMessage: polledErrorMsg } =
    useSoulsightStatus(activePollId, { intervalMs: generatingId ? 3000 : 10000 });

  useEffect(() => {
    if (!activePollId) return;
    if (polledGenStatus === 'complete') {
      setIsGenerating(false);
      setGeneratingId(null);
      // so-rhap: BE rolls the SoulBar forward on completion; pull the new value.
      fetchSoulBar();
      navigation.navigate('SoulSightDetail', { soulsightId: activePollId });
    } else if (polledGenStatus === 'failed' && polledIsFinal) {
      // so-9t3d M-2b: only show the terminal error when final===true. While
      // retries_remaining > 0 the arq worker will retry; keep the drafting
      // state and keep polling so users don't see spurious "Generation Failed"
      // alerts that resolve on their own.
      setIsGenerating(false);
      setGeneratingId(null);
      showAlert({
        title: 'Generation Failed',
        message: polledErrorMsg || 'Something went wrong. Please try again.',
      });
      fetchData();
      // so-rhap: on a failed generate the BE may still have rolled intermediate
      // state; refetch defensively so the Home bar stays in sync.
      fetchSoulBar();
    } else if (polledGenStatus === 'safety_redirect') {
      setIsGenerating(false);
      setGeneratingId(null);
      // so-rhap: safety_redirect counts as a generated SoulSight and advances
      // the bar-reset boundary.
      fetchSoulBar();
      navigation.navigate('SoulSightDetail', { soulsightId: activePollId });
    }
  }, [polledGenStatus, polledIsFinal, activePollId]);

  // so-9t3d MI-1: load the next page of past sights (offset = current list length).
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || soulsights.length >= listTotal) return;
    setIsLoadingMore(true);
    try {
      const more = await SoulSightService.list(10, soulsights.length);
      setSoulsights((prev) => [...prev, ...more.soulsights]);
      setListTotal(more.total);
    } catch (err: any) {
      showError(err, { title: 'SoulSight' });
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, soulsights.length, listTotal, showError]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const result = await SoulSightService.generate();
      setGeneratingId(result.soulsight_id);
    } catch (err: any) {
      setIsGenerating(false);
      // so-fntk: normalize handles BE detail (string or Pydantic array),
      // status-based copy, and network/timeout fallbacks. Drops the
      // bespoke detail/message/literal cascade that used to surface raw
      // axios strings on a generate failure.
      showError(err);
    }
  };

  // so-9t3d MI-1: only filter on fields the BE actually returns in the list
  // response. headline + content_preview are not sent by the list endpoint —
  // filtering on them always returns false and makes the search box appear
  // broken. Filter on window_label (always present) + title (optional).
  const filteredPast = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return past;
    return past.filter((s) => {
      const label = (s.window_label || '').toLowerCase();
      const title = (s.title || '').toLowerCase();
      return label.includes(q) || title.includes(q);
    });
  }, [past, query]);

  const showCurrent = current != null || isGenerating;
  // so-9t3d MI-3: consent_required branch — user has enough entries but AI
  // consent is off; show a targeted CTA instead of the generate button.
  const showConsentRequired =
    !showCurrent && !isLoading && eligibility !== null &&
    !eligibility.eligible && !!eligibility.consent_required;
  const showGenerateCta =
    !showCurrent && !isLoading && !showConsentRequired && eligibility?.eligible === true;
  const isEmpty =
    !isLoading && !showCurrent && !showGenerateCta && !showConsentRequired &&
    past.length === 0 && !fetchError;

  // ─── Style trees ─────────────────────────────────
  const styles = useMemo(() => buildStyles(colors, isDark), [colors, isDark]);

  // ─── Sub-renderers ───────────────────────────────
  const renderCurrentCard = () => {
    if (isGenerating) {
      const sample = current ?? null;
      return (
        <View style={styles.currentCard}>
          {isDark && <View style={styles.currentAuroraGlow} />}
          <View style={styles.currentTopRow}>
            <View style={styles.currentSoulpalWrap}>
              <Image
                source={SOULPAL_SRC[sample ? soulpalForId(sample.id) : 5]}
                style={styles.currentSoulpal}
                resizeMode="contain"
              />
            </View>
            <View style={styles.currentTextCol}>
              <View style={[styles.formingPill, { borderColor: TEAL + '88' }]}>
                <View style={[styles.formingDot, { backgroundColor: TEAL }]} />
                <Text style={[styles.formingPillText, { color: TEAL }]}>
                  Generating
                </Text>
              </View>
              <Text style={styles.currentTitle}>Drafting your SoulSight…</Text>
              <Text style={styles.currentBlurb}>
                {soulPalName} is reading the week. This usually takes a minute.
              </Text>
            </View>
          </View>
          <View style={styles.currentBottomRow}>
            <ActivityIndicator color={isDark ? '#FFFFFF' : PURPLE} />
          </View>
        </View>
      );
    }
    if (!current) return null;
    const tone = toneForId(current.id);
    const soulpal = current.soulpal ?? soulpalForId(current.id);
    const title = current.title || 'A new chapter is forming';
    const blurb =
      current.content_preview ||
      `${current.entry_count} entries · ${current.active_days} active days.`;
    return (
      <Pressable
        onPress={() =>
          navigation.navigate('SoulSightDetail', { soulsightId: current.id })
        }
        style={styles.currentCard}
      >
        {isDark && (
          <View
            style={[
              styles.currentAuroraGlow,
              { backgroundColor: tone + '40' },
            ]}
          />
        )}
        <View style={styles.currentTopRow}>
          <View
            style={[
              styles.currentSoulpalWrap,
              isDark
                ? {
                    shadowColor: tone,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 12,
                  }
                : null,
            ]}
          >
            <Image
              source={SOULPAL_SRC[soulpal]}
              style={styles.currentSoulpal}
              resizeMode="contain"
            />
          </View>
          <View style={styles.currentTextCol}>
            <View style={[styles.formingPill, { borderColor: TEAL + '88' }]}>
              <View style={[styles.formingDot, { backgroundColor: TEAL }]} />
              <Text style={[styles.formingPillText, { color: TEAL }]}>
                This week · forming
              </Text>
            </View>
            <Text style={styles.currentTitle}>{title}</Text>
            <Text style={styles.currentBlurb}>{blurb}</Text>
          </View>
        </View>
        <View style={styles.currentBottomRow}>
          <Text style={styles.currentMeta}>
            {current.window_label} ·{' '}
            {current.entry_count} entries · {current.active_days} active days
          </Text>
          <View style={styles.currentOpenBtn}>
            <LinearGradient
              colors={[TEAL, PURPLE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.currentOpenBtnGradient}
            >
              <Text style={styles.currentOpenBtnText}>Open →</Text>
            </LinearGradient>
          </View>
        </View>
      </Pressable>
    );
  };

  // so-9t3d MI-3: consent_required → "Enable AI Insights in Settings" CTA.
  // The eligibility endpoint returns {eligible:false, consent_required:true}
  // when the user has enough entries but AI consent is disabled. Previously
  // there was no branch for this — the feature went silently inert.
  const renderConsentRequired = () => (
    <View style={styles.currentCard}>
      <View style={styles.currentTopRow}>
        <View style={styles.currentSoulpalWrap}>
          <Image source={SOULPAL_SRC[5]} style={styles.currentSoulpal} resizeMode="contain" />
        </View>
        <View style={styles.currentTextCol}>
          <Text style={styles.currentTitle}>AI Insights Required</Text>
          <Text style={styles.currentBlurb}>
            Enable AI Insights in Settings to generate your SoulSight.
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => navigation.navigate('Settings')}
        style={styles.currentOpenBtn}
        accessibilityRole="button"
        accessibilityLabel="Enable AI Insights in Settings"
      >
        <LinearGradient
          colors={[TEAL, PURPLE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.generateBtnGradient}
        >
          <Text style={styles.currentOpenBtnText}>Enable in Settings</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  const renderGenerateCta = () => (
    <View style={styles.currentCard}>
      <View style={styles.currentTopRow}>
        <View style={styles.currentSoulpalWrap}>
          <Image source={SOULPAL_SRC[5]} style={styles.currentSoulpal} resizeMode="contain" />
        </View>
        <View style={styles.currentTextCol}>
          <Text style={styles.currentTitle}>Your SoulSight is ready</Text>
          {eligibility?.window_label ? (
            <Text style={styles.currentBlurb}>
              {eligibility.window_label} ·{' '}
              {eligibility.entry_count} entries · {eligibility.active_days} active days
            </Text>
          ) : (
            <Text style={styles.currentBlurb}>
              You've filled the SoulBar — {soulPalName} is ready to draft this week's chapter.
            </Text>
          )}
        </View>
      </View>
      <Pressable onPress={handleGenerate} style={styles.currentOpenBtn}>
        <LinearGradient
          colors={[TEAL, PURPLE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.generateBtnGradient}
        >
          <Text style={styles.currentOpenBtnText}>Generate your next SoulSight</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  const renderPastCard = (item: SoulsightSummary) => {
    const tone = toneForId(item.id);
    const soulpal = item.soulpal ?? soulpalForId(item.id);
    const title = item.title || item.window_label || '';
    const blurb =
      item.content_preview ||
      `${item.entry_count} entries · ${item.active_days} active days`;
    return (
      <Pressable
        key={item.id}
        onPress={() => navigation.navigate('SoulSightDetail', { soulsightId: item.id })}
        style={styles.pastCard}
        accessibilityRole="button"
        accessibilityLabel={`SoulSight: ${title || item.window_label || 'Untitled'}`}
        accessibilityHint="Opens this SoulSight reading"
      >
        <View style={[styles.pastAccentBar, { backgroundColor: tone }]} />
        <Image source={SOULPAL_SRC[soulpal]} style={styles.pastSoulpal} resizeMode="contain" />
        <View style={styles.pastTextCol}>
          <Text style={[styles.pastEyebrow, { color: tone }]}>
            {item.window_label ?? ''}
          </Text>
          <Text style={styles.pastTitle}>{title}</Text>
          <Text style={styles.pastBlurb} numberOfLines={1}>
            {blurb}
          </Text>
          <Text style={styles.pastFooter}>
            {item.entry_count} entries · {item.active_days} active days
            {item.created_at ? ` · ${formatCreatedDate(item.created_at)}` : ''}
          </Text>
        </View>
        <Svg width={14} height={14} viewBox="0 0 24 24" style={styles.pastChevron}>
          <Path
            d="M9 6l6 6-6 6"
            stroke={isDark ? '#FFFFFF' : '#3A0E66'}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyCard}>
      {/* so-qnkr: was [4] (angry/slashed-eye) — wrong tone for a gentle
          "forming" empty state. [5] = wide-eyed friendly, consistent
          with the sibling forming-cards at ~L254 and ~L359. */}
      <Image source={SOULPAL_SRC[5]} style={styles.emptySoulpal} resizeMode="contain" />
      <Text style={styles.emptyTitle}>Your first SoulSight is forming.</Text>
      <Text style={styles.emptySubtitle}>
        Keep writing. After your first 6 entries, {soulPalName} will draft your first chapter.
      </Text>
    </View>
  );

  // Single-row header (so-rlz): back + title + (optional) count ride one
  // baseline. Subtitle below. Title scaled 36 → 30 so the row fits on
  // iPhone 16e width without wrapping.
  const headerCopy = (
    <View style={styles.heroBlock}>
      <View style={styles.heroTopRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backInline}
        >
          <Feather
            name="chevron-left"
            size={28}
            color={isDark ? '#FFFFFF' : '#3A0E66'}
          />
        </Pressable>
        <Text style={styles.heroTitle} numberOfLines={1}>
          SoulSight
        </Text>
        {past.length > 0 ? (
          <Text style={styles.heroCount}>
            {past.length} chapter{past.length === 1 ? '' : 's'}
          </Text>
        ) : null}
      </View>
      <Text style={styles.heroSubtitle}>
        Each SoulSight is a chapter {soulPalName} writes from your entries.
      </Text>
    </View>
  );

  return (
    <CosmicScreen tone="dawn">
      <View style={[styles.content, { paddingTop: insets.top + 12 }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          // so-7vun: without this the ScrollView defaults to
          // keyboardShouldPersistTaps="never", so while the search keyboard is
          // open the first tap on a filtered result is swallowed by keyboard
          // dismissal instead of navigating — the search reads as "not working".
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        >
          {headerCopy}

          {isLoading ? (
            <ActivityIndicator color={isDark ? '#FFFFFF' : PURPLE} style={{ marginTop: 40 }} />
          ) : (
            <>
              {showCurrent && renderCurrentCard()}
              {showGenerateCta && renderGenerateCta()}
              {/* so-9t3d MI-3: consent gate — enough entries but AI consent off. */}
              {showConsentRequired && renderConsentRequired()}

              {/* so-9t3d MI-2: surface fetch failures so the user can retry.
                  Shown below the current/generate/consent section so a transient
                  error doesn't wipe visible forming-card state. */}
              {fetchError && !isLoading ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>Couldn't load SoulSights.</Text>
                  <Pressable
                    onPress={() => { setIsLoading(true); fetchData(); }}
                    style={styles.retryButton}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading SoulSights"
                  >
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Search bar */}
              {past.length > 0 ? (
                <View style={styles.searchBar}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" style={styles.searchIcon}>
                    <Circle
                      cx={11}
                      cy={11}
                      r={7}
                      stroke={isDark ? '#FFFFFF' : '#3A0E66'}
                      strokeWidth={1.6}
                      fill="none"
                    />
                    <Path
                      d="M16 16l4 4"
                      stroke={isDark ? '#FFFFFF' : '#3A0E66'}
                      strokeWidth={1.6}
                      strokeLinecap="round"
                    />
                  </Svg>
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search past SoulSights"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(58,14,102,0.5)'}
                    style={styles.searchInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              ) : null}

              {/* Past sights / empty state */}
              {past.length > 0 ? (
                <>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeaderText}>
                      {query.trim()
                        ? `Results (${filteredPast.length})`
                        : 'Past SoulSights'}
                    </Text>
                    {/* Past-sight count moved to the title row in so-rlz; only
                        the search-result count stays here as a contextual cue. */}
                  </View>
                  <View style={styles.pastList}>
                    {filteredPast.map(renderPastCard)}
                  </View>
                  {/* so-9t3d MI-1: load-more when there are more past sights
                      on the server than are currently displayed. Hidden while
                      a search query is active (offset paging and filtered
                      results don't compose cleanly). */}
                  {soulsights.length < listTotal && past.length > 0 && !query.trim() ? (
                    <Pressable
                      onPress={handleLoadMore}
                      disabled={isLoadingMore}
                      style={styles.loadMoreBtn}
                      accessibilityRole="button"
                      accessibilityState={{ busy: isLoadingMore }}
                      accessibilityLabel="Load more SoulSights"
                    >
                      {isLoadingMore
                        ? <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : PURPLE} />
                        : <Text style={styles.loadMoreText}>Load more</Text>}
                    </Pressable>
                  ) : null}
                </>
              ) : isEmpty ? (
                renderEmptyState()
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    </CosmicScreen>
  );
};

const buildStyles = (colors: ReturnType<typeof useThemeColors>, isDark: boolean) =>
  StyleSheet.create({
    root: { flex: 1 },
    content: { flex: 1 },
    backInline: { flexShrink: 0 },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },

    // Hero
    heroBlock: { marginBottom: 18, paddingHorizontal: 0 },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 0,
    },
    heroTitle: {
      flex: 1,
      minWidth: 0,
      fontFamily: fonts.edensor.regular,
      fontSize: 30,
      lineHeight: 32,
      letterSpacing: -0.4,
      // Light path forks to ink(theme) for AA on the so-u1k lavender bg
      // (white was inheriting the legacy purple-page assumption).
      color: isDark ? colors.white : colors.text.primary,
    },
    heroCount: {
      flexShrink: 0,
      fontFamily: fonts.outfit.medium,
      fontSize: 12,
      letterSpacing: 0.3,
      color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(58,14,102,0.65)',
    },
    heroSubtitle: {
      marginTop: 4,
      fontFamily: fonts.edensor.italic,
      fontSize: 16,
      lineHeight: 16 * 1.45,
      letterSpacing: 0.2,
      color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(58,14,102,0.85)',
    },

    // Current sight card
    currentCard: {
      position: 'relative',
      paddingVertical: 20,
      paddingHorizontal: 18,
      borderRadius: 22,
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(255,255,255,0.95)',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(112,202,207,0.30)'
        : 'rgba(58,14,102,0.08)',
      marginBottom: 20,
      overflow: 'hidden',
    },
    currentAuroraGlow: {
      position: 'absolute',
      top: -40,
      right: -50,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(112,202,207,0.30)',
      opacity: 0.7,
    },
    currentTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    currentSoulpalWrap: {
      flexShrink: 0,
      marginTop: 2,
    },
    currentSoulpal: { width: 64, height: 64 },
    currentTextCol: { flex: 1, minWidth: 0 },
    formingPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(112,202,207,0.18)' : `${TEAL}1F`,
      borderWidth: 1,
    },
    formingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      shadowColor: TEAL,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
    },
    formingPillText: {
      fontFamily: fonts.outfit.bold,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    currentTitle: {
      marginTop: 8,
      fontFamily: fonts.edensor.regular,
      fontSize: 24,
      lineHeight: 24 * 1.1,
      letterSpacing: -0.3,
      color: isDark ? '#FFFFFF' : '#3A0E66',
    },
    currentBlurb: {
      marginTop: 6,
      fontFamily: fonts.edensor.italic,
      fontSize: 16,
      lineHeight: 16 * 1.45,
      letterSpacing: 0.2,
      color: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(58,14,102,0.85)',
    },
    currentBottomRow: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    currentMeta: {
      flex: 1,
      fontFamily: fonts.outfit.medium,
      fontSize: 11,
      letterSpacing: 0.2,
      color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(58,14,102,0.7)',
    },
    currentOpenBtn: {
      flexShrink: 0,
      borderRadius: 999,
      overflow: 'hidden',
    },
    currentOpenBtnGradient: {
      paddingVertical: 9,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    generateBtnGradient: {
      marginTop: 14,
      paddingVertical: 12,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currentOpenBtnText: {
      color: colors.white,
      fontFamily: fonts.outfit.bold,
      fontSize: 12,
      letterSpacing: 0.3,
    },

    // Search
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(58,14,102,0.06)',
      marginBottom: 14,
    },
    searchIcon: { opacity: 0.6 },
    searchInput: {
      flex: 1,
      padding: 0,
      fontFamily: fonts.outfit.regular,
      fontSize: 13,
      color: isDark ? '#FFFFFF' : '#3A0E66',
    },

    // Section header
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionHeaderText: {
      fontFamily: fonts.outfit.bold,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: isDark ? 'rgba(255,255,255,0.78)' : 'rgba(58,14,102,0.78)',
    },
    sectionHeaderCount: {
      fontFamily: fonts.outfit.medium,
      fontSize: 11,
      letterSpacing: 0.2,
      color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(58,14,102,0.6)',
    },

    // Past list
    pastList: { gap: 10 },
    pastCard: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      paddingLeft: 22,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(58,14,102,0.06)',
    },
    pastAccentBar: {
      position: 'absolute',
      left: 0,
      top: 14,
      bottom: 14,
      width: 3,
      borderRadius: 2,
    },
    pastSoulpal: { width: 36, height: 36, marginTop: 2, flexShrink: 0 },
    pastTextCol: { flex: 1, minWidth: 0 },
    pastEyebrow: {
      fontFamily: fonts.outfit.bold,
      fontSize: 10,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    pastTitle: {
      fontFamily: fonts.edensor.regular,
      fontSize: 17,
      lineHeight: 17 * 1.15,
      letterSpacing: -0.1,
      color: isDark ? '#FFFFFF' : '#3A0E66',
    },
    pastBlurb: {
      marginTop: 4,
      fontFamily: fonts.edensor.italic,
      fontSize: 14,
      lineHeight: 14 * 1.4,
      letterSpacing: 0.2,
      color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(58,14,102,0.7)',
    },
    pastFooter: {
      marginTop: 6,
      fontFamily: fonts.outfit.medium,
      fontSize: 10,
      letterSpacing: 0.3,
      color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(58,14,102,0.55)',
    },
    pastChevron: { alignSelf: 'center', flexShrink: 0, opacity: 0.5 },

    // so-9t3d MI-2: fetch-error card
    errorCard: {
      paddingVertical: 32,
      paddingHorizontal: 18,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.92)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(58,14,102,0.14)',
      alignItems: 'center',
      marginBottom: 20,
    },
    errorText: {
      fontFamily: fonts.edensor.regular,
      fontSize: 18,
      color: isDark ? '#FFFFFF' : '#3A0E66',
      marginBottom: 12,
      textAlign: 'center',
    },
    retryButton: {
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 999,
      backgroundColor: PURPLE,
    },
    retryText: {
      fontFamily: fonts.outfit.semiBold,
      fontSize: 13,
      color: '#FFFFFF',
    },

    // so-9t3d MI-1: load-more button
    loadMoreBtn: {
      marginTop: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },
    loadMoreText: {
      fontFamily: fonts.outfit.semiBold,
      fontSize: 14,
      color: isDark ? TEAL : PURPLE,
    },

    // Empty state
    emptyCard: {
      paddingVertical: 32,
      paddingHorizontal: 18,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.92)',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(58,14,102,0.14)',
      alignItems: 'center',
    },
    emptySoulpal: { width: 70, height: 70, marginBottom: 10 },
    emptyTitle: {
      fontFamily: fonts.edensor.regular,
      fontSize: 19,
      color: isDark ? '#FFFFFF' : '#3A0E66',
      marginBottom: 6,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontFamily: fonts.edensor.italic,
      fontSize: 16,
      lineHeight: 16 * 1.45,
      letterSpacing: 0.2,
      textAlign: 'center',
      maxWidth: 260,
      color: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(58,14,102,0.7)',
    },
  });

export default SoulSightScreen;
