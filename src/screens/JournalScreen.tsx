import React, { useState, useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  FlatList,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, surfaces, useThemeColors } from '../theme';
import { useJournal } from '../contexts/JournalContext';
import { useTheme } from '../contexts/ThemeContext';
import JournalLoader from '../components/JournalLoader';
import GlassCard from '../components/GlassCard';
import SoulPalAnimated from '../components/SoulPalAnimated';
import { useSoulPal, getSoulPalHex } from '../contexts/SoulPalContext';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { cosmicTextShadow } from '../components/CosmicText';
import { CardInfoModal } from '../features/homeV2/CardInfoModal';
import { BottomTabBar } from '../components/BottomTabBar';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Assets
const FilterIconDark = require('../../assets/images/journal/dark/FilterIcon.png');
const HomeIconImg = require('../../assets/images/home/HomeIcon.png');
const JournalIconImg = require('../../assets/images/home/JournalIconPng.png');
const ProfileIconImg = require('../../assets/images/home/ProfileIconPng.png');

type TabName = 'Home' | 'Journal' | 'Profile';

// =============================================
// Shared helpers
// =============================================
function getEmotionColor(item: any): string {
  const tags = item.tags;
  if (!tags?.emotion_primary) return surfaces.emotionAccent.neutral;
  const e = tags.emotion_primary.toLowerCase();
  if (['joy', 'happy', 'calm', 'gratitude', 'love', 'hope'].some(k => e.includes(k))) return surfaces.emotionAccent.warm;
  if (['sad', 'grief', 'lonely', 'loneliness', 'melancholy'].some(k => e.includes(k))) return surfaces.emotionAccent.cool;
  if (['anxious', 'anxiety', 'fear', 'dread', 'worry', 'nervous'].some(k => e.includes(k))) return surfaces.emotionAccent.alert;
  if (['anger', 'angry', 'frustrat', 'irritat', 'rage'].some(k => e.includes(k))) return surfaces.emotionAccent.hot;
  return surfaces.emotionAccent.neutral;
}

// =============================================
// Unified styles — forks on isDark for tokens that don't pass through useThemeColors
// =============================================
const buildStyles = (colors: ReturnType<typeof useThemeColors>, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1 },
    screen: { flex: 1, paddingHorizontal: 20 },

    // ── Header card (manual glass surface) ──
    headerCard: {
      marginBottom: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? colors.border : 'rgba(58, 14, 102, 0.06)',
      overflow: 'hidden',
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 },
    soulPalWrap: {
      position: 'relative',
      width: 52,
      height: 66,
      justifyContent: 'center',
      alignItems: 'center',
    },
    soulPalGlow: {
      position: 'absolute',
      width: 48,
      height: 48,
      borderRadius: 24,
      opacity: 0.35,
    },
    headerText: { flex: 1, marginLeft: 14 },
    headerTitle: {
      fontFamily: fonts.edensor.bold,
      fontSize: 20,
      lineHeight: 26,
      color: colors.text.primary,
      // so-jkgo: dark-mode header card is rgba(255,255,255,0.10) — nearly
      // transparent, so stars from the cosmic backdrop pass under the
      // title text. Halo-shadow separates glyphs from any star pixels.
      ...(isDark ? cosmicTextShadow : {}),
    },
    headerSubtitle: {
      fontFamily: fonts.outfit.regular,
      fontSize: 13,
      lineHeight: 18,
      color: isDark ? 'rgba(255,255,255,0.55)' : colors.text.secondary,
      marginTop: 2,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(58, 14, 102, 0.08)',
    },
    streakBadge: {
      fontFamily: fonts.outfit.medium, fontSize: 12, color: colors.accent.yellow,
      textShadowColor: 'rgba(255, 215, 87, 0.5)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 6,
    },
    filterWrap: { position: 'relative' },
    filterToggle: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(79, 23, 134, 0.08)',
      borderWidth: 1, borderColor: colors.inputBorder,
      justifyContent: 'center', alignItems: 'center',
    },
    journalInfoBadge: {
      position: 'absolute', top: -8, left: -8,
      width: 18, height: 18, borderRadius: 9,
      borderWidth: 1, borderColor: colors.primary,
      backgroundColor: isDark ? '#0E0820' : '#FFFFFF',
      justifyContent: 'center', alignItems: 'center',
      zIndex: 2,
    },
    journalInfoBadgeText: {
      fontFamily: fonts.outfit.semiBold,
      fontSize: 11, lineHeight: 13,
      color: colors.primary,
    },
    filterToggleIcon: { width: 20, height: 20, tintColor: colors.primary },
    filterBadge: {
      position: 'absolute', top: -4, right: -4,
      backgroundColor: colors.success, borderRadius: 8,
      width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
    },
    filterBadgeText: { fontFamily: fonts.outfit.medium, fontSize: 10, color: colors.white },

    activeFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    activeFilterPill: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)',
      borderRadius: 10,
      paddingHorizontal: 10, paddingVertical: 4,
      borderWidth: 1, borderColor: colors.inputBorder,
    },
    activeFilterText: {
      fontFamily: fonts.outfit.medium,
      fontSize: 11,
      color: isDark ? 'rgba(255,255,255,0.8)' : colors.text.primary,
    },

    filterSection: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
      borderRadius: 14,
      padding: 14, marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(58, 14, 102, 0.06)',
    },
    pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    pill: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(79, 23, 134, 0.08)',
      borderRadius: 8,
      paddingHorizontal: 14, paddingVertical: 5,
      borderWidth: 1, borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : colors.primary,
      borderColor: isDark ? 'rgba(255,255,255,0.4)' : colors.primary,
    },
    pillText: { fontFamily: fonts.outfit.regular, fontSize: 13, color: colors.text.secondary },
    pillTextActive: { color: colors.white, fontFamily: fonts.outfit.medium },

    entriesScroll: { flex: 1 },
    entriesList: { gap: 12, paddingTop: 4 },
    entryCard: { borderRadius: 14 },
    accentStrip: { height: 3, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
    entryContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
    entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    entryDate: {
      fontFamily: fonts.edensor.bold,
      fontSize: 14,
      // Light path bumped from text.secondary → text.primary (so-zb4):
      // date headers were reading too faded on the new lavender bg.
      // Dark stays at 0.6-opacity white per the existing dark visual.
      color: isDark ? 'rgba(255,255,255,0.6)' : colors.text.primary,
    },
    aiIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    aiDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
    aiLabel: { fontFamily: fonts.outfit.regular, fontSize: 10, color: 'rgba(76, 175, 80, 0.8)' },
    entryText: {
      fontFamily: fonts.outfit.regular,
      fontSize: 13,
      lineHeight: 20,
      color: isDark ? 'rgba(255,255,255,0.85)' : colors.text.primary,
    },

    emptyState: { alignItems: 'center', paddingVertical: 80 },
    emptyTitle: {
      fontFamily: fonts.outfit.medium,
      fontSize: 17,
      color: isDark ? 'rgba(255,255,255,0.9)' : colors.text.primary,
      marginBottom: 6,
    },
    emptySub: {
      fontFamily: fonts.outfit.regular,
      fontSize: 14,
      color: isDark ? 'rgba(255,255,255,0.45)' : colors.text.secondary,
    },

    fab: {
      position: 'absolute', alignSelf: 'center', left: '50%', marginLeft: -26,
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: colors.primary,
      justifyContent: 'center', alignItems: 'center', zIndex: 20,
      shadowColor: colors.primary,
      shadowOpacity: 0.5,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    fabDisabled: { opacity: 0.25 },
    fabText: {
      fontFamily: fonts.outfit.medium,
      fontSize: 28,
      color: isDark ? colors.background : colors.white,
      marginTop: -2,
    },

    tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
    tabBarInner: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : colors.white,
      borderRadius: 200,
      width: 269, height: 62, alignItems: 'center', justifyContent: 'space-evenly',
      paddingHorizontal: 16, paddingTop: 14,
      borderWidth: 1, borderColor: colors.inputBorder,
    },
    tabItem: { alignItems: 'center', justifyContent: 'center', minWidth: 50 },
    tabPressable: { alignItems: 'center', justifyContent: 'center' },
    activeTabBg: {
      backgroundColor: isDark ? 'rgba(61, 84, 120, 0.4)' : colors.primary,
      borderRadius: 24,
      width: 52, height: 40, justifyContent: 'center', alignItems: 'center',
      shadowColor: colors.primary,
      shadowOpacity: 0.4,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
    },
    tabIcon: { width: 28, height: 26, tintColor: colors.white },
    tabIconInactive: {
      width: 33, height: 30, opacity: isDark ? 0.6 : 0.85,
      tintColor: isDark ? colors.white : colors.primary,
    },
    activeTabLabel: {
      fontFamily: fonts.edensor.bold,
      fontSize: 12,
      lineHeight: 17,
      color: isDark ? colors.white : colors.primary,
      marginTop: 2,
    },
  });

// so-urv4 #5: 6 filter/UI useStates collapsed into a single reducer. The
// selected/applied year+month pairs are always updated together (one
// dispatch flips both halves), so the prior multi-setState pattern was
// dispatching redundant work. The filter-expanded and info-modal toggles
// move into the same reducer for a single UI-state source of truth.
type JournalUIState = {
  selectedYears: number[];
  selectedMonths: number[];
  appliedYears: number[];
  appliedMonths: number[];
  filtersExpanded: boolean;
  journalInfoOpen: boolean;
};

type JournalUIAction =
  | { type: 'SET_YEARS'; value: number[] }
  | { type: 'SET_MONTHS'; value: number[] }
  | { type: 'TOGGLE_FILTERS_EXPANDED' }
  | { type: 'SET_INFO_OPEN'; value: boolean };

const INITIAL_JOURNAL_UI_STATE: JournalUIState = {
  selectedYears: [],
  selectedMonths: [],
  appliedYears: [],
  appliedMonths: [],
  filtersExpanded: false,
  journalInfoOpen: false,
};

function journalUIReducer(
  state: JournalUIState,
  action: JournalUIAction,
): JournalUIState {
  switch (action.type) {
    case 'SET_YEARS':
      return { ...state, selectedYears: action.value, appliedYears: action.value };
    case 'SET_MONTHS':
      return { ...state, selectedMonths: action.value, appliedMonths: action.value };
    case 'TOGGLE_FILTERS_EXPANDED':
      return { ...state, filtersExpanded: !state.filtersExpanded };
    case 'SET_INFO_OPEN':
      return { ...state, journalInfoOpen: action.value };
    default:
      return state;
  }
}

const JournalScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const { entries, isLoading, fetchEntries, streak, hasEntryToday } = useJournal();
  const { colorId } = useSoulPal();
  const soulPalHex = getSoulPalHex(colorId, isDarkMode);

  const [activeTab, setActiveTab] = useState<TabName>('Journal');
  const [ui, dispatchUI] = useReducer(journalUIReducer, INITIAL_JOURNAL_UI_STATE);
  const {
    selectedYears,
    selectedMonths,
    appliedYears,
    appliedMonths,
    filtersExpanded,
    journalInfoOpen,
  } = ui;

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // so-tfx7: derive selectable years from the entries themselves so beta
  // users with pre-2026 history (launch was May 2025) can actually filter
  // them. Always include the current year so the pill exists before any
  // entry is written. Newest year first.
  const YEARS = useMemo(() => {
    const ys = new Set(entries.map(e => new Date(e.created_at).getFullYear()));
    ys.add(new Date().getFullYear());
    return Array.from(ys).sort((a, b) => b - a);
  }, [entries]);

  // --- Filter logic (auto-apply on toggle) ---
  const buildParams = (years: number[], months: number[]) => {
    const params: any = {};
    if (years.length === 1) params.year = years[0];
    if (months.length === 1) params.month = months[0] + 1;
    return params;
  };

  // so-6n2l: single-select per axis. buildParams only sends a year/month
  // param when exactly one is selected, so the previous multi-select toggle
  // let users pick e.g. Jan+Feb and silently get the unfiltered list (two
  // selected == zero params). Until the backend accepts repeated query
  // params (path B), tapping a pill replaces that axis's selection; tapping
  // the active pill clears it. Guarantees length <= 1, so the filter always
  // applies.
  const toggleYear = (year: number) => {
    const next = selectedYears.includes(year) ? [] : [year];
    dispatchUI({ type: 'SET_YEARS', value: next });
    fetchEntries(buildParams(next, appliedMonths));
  };

  const toggleMonth = (month: number) => {
    const next = selectedMonths.includes(month) ? [] : [month];
    dispatchUI({ type: 'SET_MONTHS', value: next });
    fetchEntries(buildParams(appliedYears, next));
  };

  const removePill = (type: 'year' | 'month', value: number) => {
    // so-6n2l: removing a pill must also re-query — previously it only
    // updated state, so the list kept showing the now-removed filter until
    // the next toggle.
    if (type === 'year') {
      const next = selectedYears.filter(y => y !== value);
      dispatchUI({ type: 'SET_YEARS', value: next });
      fetchEntries(buildParams(next, appliedMonths));
    } else {
      const next = selectedMonths.filter(m => m !== value);
      dispatchUI({ type: 'SET_MONTHS', value: next });
      fetchEntries(buildParams(appliedYears, next));
    }
  };

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    dispatchUI({ type: 'TOGGLE_FILTERS_EXPANDED' });
  };

  const activeFilterCount = appliedYears.length + appliedMonths.length;

  // so-loo3: tab raise/label animations live in BottomTabBar now. The
  // outer scroll-hide translateY stays here for parity with the other
  // tab-host screens.
  const tabTranslateY = useSharedValue(0);
  const tabBarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabTranslateY.value }],
  }));

  const handleTabPress = useCallback((tab: TabName) => {
    if (tab === 'Home') { navigation.navigate('Home'); return; }
    if (tab === 'Profile') { navigation.navigate('Profile'); return; }
    setActiveTab(tab);
  }, [navigation]);

  // --- Date formatting ---
  // so-tfx7: append the year only when the entry is not from the current
  // year, so a 2025 "May 7" and a 2026 "May 7" no longer render identically
  // while current-year entries stay terse.
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    return d.getFullYear() === new Date().getFullYear()
      ? base
      : `${base}, ${d.getFullYear()}`;
  };

  // --- Streak text ---
  const currentStreak = streak?.current_streak ?? 0;

  const journalTitle = hasEntryToday
    ? "You've written today!"
    : currentStreak > 0
      ? `${currentStreak}-day streak!`
      : 'Your Journal';
  const journalSubtitle = hasEntryToday
    ? 'Come back tomorrow'
    : currentStreak > 0
      ? 'Keep it up!'
      : 'Write and reflect';

  const tabBarHeight = 62 + (insets.bottom > 0 ? insets.bottom - 6 : 8) + 20;

  const styles = useMemo(() => buildStyles(colors, isDarkMode), [colors, isDarkMode]);

  return (
    <CosmicScreen tone="dawn">
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        {/* Header Card — manual glass surface */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.soulPalWrap}>
              <View style={[styles.soulPalGlow, { backgroundColor: soulPalHex }]} />
              <SoulPalAnimated pose="journal" size={48} animate showEyes={false} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{journalTitle}</Text>
              <Text style={styles.headerSubtitle}>{journalSubtitle}</Text>
            </View>
            <View style={styles.filterWrap}>
              <Pressable onPress={toggleFilters} style={styles.filterToggle}>
                <Image source={FilterIconDark} style={styles.filterToggleIcon} resizeMode="contain" />
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => dispatchUI({ type: 'SET_INFO_OPEN', value: true })}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.journalInfoBadge}
                accessibilityRole="button"
                accessibilityLabel="About Daily Reflection"
              >
                <Text style={styles.journalInfoBadgeText}>i</Text>
              </Pressable>
            </View>
          </View>
          {currentStreak > 0 && (
            <View style={styles.streakRow}>
              <Text style={styles.streakBadge}>
                {'🔥'} {currentStreak} day{currentStreak !== 1 ? 's' : ''} streak
              </Text>
            </View>
          )}
        </View>

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <View style={styles.activeFilters}>
            {appliedYears.map(y => (
              <Pressable key={`y-${y}`} style={styles.activeFilterPill} onPress={() => removePill('year', y)}>
                <Text style={styles.activeFilterText}>{y} {'✕'}</Text>
              </Pressable>
            ))}
            {appliedMonths.map(m => (
              <Pressable key={`m-${m}`} style={styles.activeFilterPill} onPress={() => removePill('month', m)}>
                <Text style={styles.activeFilterText}>{MONTHS[m]} {'✕'}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Collapsible filter section */}
        {filtersExpanded && (
          <View style={styles.filterSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.pillRow}>
                {YEARS.map(year => (
                  <Pressable
                    key={year}
                    style={[styles.pill, selectedYears.includes(year) && styles.pillActive]}
                    onPress={() => toggleYear(year)}
                  >
                    <Text style={[styles.pillText, selectedYears.includes(year) && styles.pillTextActive]}>{year}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={styles.pillRow}>
                {MONTHS.map((month, idx) => (
                  <Pressable
                    key={idx}
                    style={[styles.pill, selectedMonths.includes(idx) && styles.pillActive]}
                    onPress={() => toggleMonth(idx)}
                  >
                    <Text style={[styles.pillText, selectedMonths.includes(idx) && styles.pillTextActive]}>{month}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Entry list — so-bl51: FlatList virtualizes off-screen rows so the
            simultaneously-mounted ShadowNode tree stays small even with
            50+ entries. Previously a ScrollView+entries.map kept all
            GlassCards (~10 nested layers each) in the live tree, so when
            JournalScreen sat in the background and a downstream .map()
            triggered Hermes GC, the recursive ShadowNode destructor
            blew the JS-thread stack tearing down the deep tree. */}
        {isLoading && entries.length === 0 ? (
          <ScrollView
            style={styles.entriesScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.entriesList, { paddingBottom: tabBarHeight + 20 }]}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={() => fetchEntries()} tintColor={colors.white} />
            }
          >
            <JournalLoader />
          </ScrollView>
        ) : entries.length === 0 ? (
          <ScrollView
            style={styles.entriesScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.entriesList, { paddingBottom: tabBarHeight + 20 }]}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={() => fetchEntries()} tintColor={colors.white} />
            }
          >
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {activeFilterCount > 0 ? 'No entries found' : 'No journal entries yet'}
              </Text>
              <Text style={styles.emptySub}>
                {activeFilterCount > 0 ? 'Try different filters' : 'Tap + to start writing'}
              </Text>
            </View>
          </ScrollView>
        ) : (
          <FlatList
            style={styles.entriesScroll}
            data={entries}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.entriesList, { paddingBottom: tabBarHeight + 20 }]}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={() => fetchEntries()} tintColor={colors.white} />
            }
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews
            renderItem={({ item, index }) => {
              const emotionColor = getEmotionColor(item);
              return (
                <GlassCard
                  intensity="light"
                  style={[styles.entryCard, {
                    shadowColor: emotionColor,
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 2 },
                  }] as any}
                  onPress={() => navigation.navigate('JournalEntry', { entryId: item.id, isLatest: index === 0 })}
                >
                  <View style={[styles.accentStrip, { backgroundColor: emotionColor }]} />
                  <View style={styles.entryContent}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryDate}>{formatDate(item.created_at)}</Text>
                    </View>
                    <Text style={styles.entryText} numberOfLines={3}>{item.raw_text}</Text>
                  </View>
                </GlassCard>
              );
            }}
          />
        )}

      </View>

      {/* FAB — centered above tab bar */}
      <Pressable
        style={[styles.fab, { bottom: tabBarHeight + 6 }, hasEntryToday && styles.fabDisabled]}
        onPress={() => { if (!hasEntryToday) navigation.navigate('CreateJournal'); }}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* so-loo3: BottomTabBar replaces the inline tab JSX + map-over-
          useAnimatedStyle pattern. */}
      <BottomTabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        tabBarAnimStyle={tabBarAnimStyle}
      />

      <CardInfoModal
        visible={journalInfoOpen}
        onClose={() => dispatchUI({ type: 'SET_INFO_OPEN', value: false })}
        theme={isDarkMode ? 'dark' : 'light'}
        title="Daily Reflection"
        body={"Every journal entry you submit gets a reflection from your SoulPal. These are meant to be immediate, useful reflections that mirror back what showed up in your writing and gives you something to carry forward.\n\nBuilt on Soulcology, our signature reflection framework, your SoulPal acknowledges the sentiment underneath what you wrote, names patterns, and offers something grounding for you to sit with that day. The more you reflect, the more your SoulPal learns about who you are and what you're moving through, and the richer your insights become in both the journaling reflections and SoulSights."}
      />
    </CosmicScreen>
  );
};


export default JournalScreen;
