import React, { useState, useCallback, useEffect, useMemo } from 'react';
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const YEARS = [new Date().getFullYear()];

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
    filterToggle: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(79, 23, 134, 0.08)',
      borderWidth: 1, borderColor: colors.inputBorder,
      justifyContent: 'center', alignItems: 'center',
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
    reflectedPill: { borderWidth: 1.5, borderColor: colors.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
    reflectedPillActive: { backgroundColor: colors.success },
    reflectedText: { fontFamily: fonts.outfit.medium, fontSize: 12, color: colors.success },

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

const JournalScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const { entries, isLoading, fetchEntries, streak, hasEntryToday } = useJournal();
  const { colorId } = useSoulPal();
  const soulPalHex = getSoulPalHex(colorId, isDarkMode);

  const [activeTab, setActiveTab] = useState<TabName>('Journal');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [appliedYears, setAppliedYears] = useState<number[]>([]);
  const [appliedMonths, setAppliedMonths] = useState<number[]>([]);
  const [selectedReflected, setSelectedReflected] = useState<boolean | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // --- Filter logic (auto-apply on toggle) ---
  const buildParams = (years: number[], months: number[], reflected: boolean | null) => {
    const params: any = {};
    if (years.length === 1) params.year = years[0];
    if (months.length === 1) params.month = months[0] + 1;
    if (reflected !== null) params.ai_processing_status = reflected ? 'complete' : 'pending';
    return params;
  };

  const toggleYear = (year: number) => {
    const next = selectedYears.includes(year) ? selectedYears.filter(y => y !== year) : [...selectedYears, year];
    setSelectedYears(next);
    setAppliedYears(next);
    fetchEntries(buildParams(next, appliedMonths, selectedReflected));
  };

  const toggleMonth = (month: number) => {
    const next = selectedMonths.includes(month) ? selectedMonths.filter(m => m !== month) : [...selectedMonths, month];
    setSelectedMonths(next);
    setAppliedMonths(next);
    fetchEntries(buildParams(appliedYears, next, selectedReflected));
  };

  const toggleReflected = (val: boolean) => {
    const next = selectedReflected === val ? null : val;
    setSelectedReflected(next);
    fetchEntries(buildParams(appliedYears, appliedMonths, next));
  };

  const removePill = (type: 'year' | 'month', value: number) => {
    if (type === 'year') {
      setSelectedYears(prev => prev.filter(y => y !== value));
      setAppliedYears(prev => prev.filter(y => y !== value));
    } else {
      setSelectedMonths(prev => prev.filter(m => m !== value));
      setAppliedMonths(prev => prev.filter(m => m !== value));
    }
  };

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFiltersExpanded(!filtersExpanded);
  };

  const activeFilterCount = appliedYears.length + appliedMonths.length + (selectedReflected !== null ? 1 : 0);

  // --- Tab bar animations ---
  const tabTranslateY = useSharedValue(0);
  const tabRiseValues = [useSharedValue(0), useSharedValue(-20), useSharedValue(0)];
  const tabLabelOpacities = [useSharedValue(0), useSharedValue(1), useSharedValue(0)];
  const TAB_POSITIONS: Record<TabName, number> = { Home: 0, Journal: 1, Profile: 2 };

  const handleTabPress = useCallback((tab: TabName) => {
    if (tab === 'Home') { navigation.navigate('Home'); return; }
    if (tab === 'Profile') { navigation.navigate('Profile'); return; }
    const newIdx = TAB_POSITIONS[tab];
    const oldIdx = TAB_POSITIONS[activeTab];
    tabRiseValues[oldIdx].value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    tabRiseValues[newIdx].value = withTiming(-20, { duration: 300, easing: Easing.out(Easing.ease) });
    tabLabelOpacities[oldIdx].value = withTiming(0, { duration: 150 });
    tabLabelOpacities[newIdx].value = withTiming(1, { duration: 250 });
    setActiveTab(tab);
  }, [activeTab, navigation]);

  const tabBarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabTranslateY.value }],
  }));

  const tabAnimStyles = tabRiseValues.map(v =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({ transform: [{ translateY: v.value }] }))
  );
  const labelAnimStyles = tabLabelOpacities.map(v =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({ opacity: v.value }))
  );

  // --- Date formatting ---
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
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
            <Pressable onPress={toggleFilters} style={styles.filterToggle}>
              <Image source={FilterIconDark} style={styles.filterToggleIcon} resizeMode="contain" />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </Pressable>
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
            {selectedReflected !== null && (
              <Pressable style={styles.activeFilterPill} onPress={() => toggleReflected(selectedReflected)}>
                <Text style={styles.activeFilterText}>
                  {selectedReflected ? 'Reflected' : 'Unreflected'} {'✕'}
                </Text>
              </Pressable>
            )}
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
            <View style={[styles.pillRow, { marginTop: 10 }]}>
              <Pressable
                style={[styles.reflectedPill, selectedReflected === true && styles.reflectedPillActive]}
                onPress={() => toggleReflected(true)}
              >
                <Text style={[styles.reflectedText, selectedReflected === true && { color: colors.white }]}>Reflected</Text>
              </Pressable>
              <Pressable
                style={[styles.reflectedPill, selectedReflected === false && styles.reflectedPillActive]}
                onPress={() => toggleReflected(false)}
              >
                <Text style={[styles.reflectedText, selectedReflected === false && { color: colors.white }]}>Unreflected</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Entry list */}
        <ScrollView
          style={styles.entriesScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.entriesList, { paddingBottom: tabBarHeight + 20 }]}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={() => fetchEntries()} tintColor={colors.white} />
          }
        >
          {isLoading && entries.length === 0 ? (
            <JournalLoader />
          ) : entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {activeFilterCount > 0 ? 'No entries found' : 'No journal entries yet'}
              </Text>
              <Text style={styles.emptySub}>
                {activeFilterCount > 0 ? 'Try different filters' : 'Tap + to start writing'}
              </Text>
            </View>
          ) : (
            entries.map((item, index) => {
              const emotionColor = getEmotionColor(item);
              return (
                <GlassCard
                  key={item.id}
                  intensity="light"
                  style={[styles.entryCard, {
                    shadowColor: emotionColor,
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 2 },
                  }] as any}
                  onPress={() => navigation.navigate('JournalEntry', { entryId: item.id, isLatest: index === 0 })}
                >
                  {/* Top accent strip */}
                  <View style={[styles.accentStrip, { backgroundColor: emotionColor }]} />
                  <View style={styles.entryContent}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryDate}>{formatDate(item.created_at)}</Text>
                    </View>
                    <Text style={styles.entryText} numberOfLines={3}>{item.raw_text}</Text>
                  </View>
                </GlassCard>
              );
            })
          )}
        </ScrollView>

      </View>

      {/* FAB — centered above tab bar */}
      <Pressable
        style={[styles.fab, { bottom: tabBarHeight + 6 }, hasEntryToday && styles.fabDisabled]}
        onPress={() => { if (!hasEntryToday) navigation.navigate('CreateJournal'); }}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Tab Bar */}
      <Animated.View style={[styles.tabBar, { paddingBottom: insets.bottom > 0 ? insets.bottom - 6 : 8 }, tabBarAnimStyle]}>
        <View style={styles.tabBarInner}>
          {(['Home', 'Journal', 'Profile'] as TabName[]).map((tab, i) => (
            <Animated.View key={tab} style={[styles.tabItem, tabAnimStyles[i]]}>
              <Pressable onPress={() => handleTabPress(tab)} style={styles.tabPressable}>
                <View style={activeTab === tab ? styles.activeTabBg : undefined}>
                  <Image
                    source={tab === 'Home' ? HomeIconImg : tab === 'Journal' ? JournalIconImg : ProfileIconImg}
                    style={activeTab === tab ? styles.tabIcon : styles.tabIconInactive}
                    resizeMode="contain"
                  />
                </View>
                <Animated.Text style={[styles.activeTabLabel, labelAnimStyles[i]]}>{tab}</Animated.Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </CosmicScreen>
  );
};


export default JournalScreen;
