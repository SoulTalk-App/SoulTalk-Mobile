import React, { useState, useCallback, useEffect } from 'react';
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
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, surfaces } from '../theme';
import { useJournal } from '../contexts/JournalContext';
import { useTheme } from '../contexts/ThemeContext';
import JournalLoader from '../components/JournalLoader';
import GlassCard from '../components/GlassCard';
import SoulPalAnimated from '../components/SoulPalAnimated';
import { useSoulPal, SOULPAL_COLORS } from '../contexts/SoulPalContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const YEARS = [new Date().getFullYear()];

// Assets
const JournalSoulPal = require('../../assets/images/journal/JournalSoulPalChar.png');
const SoulPalArmLeft = require('../../assets/images/journal/SoulPalArmLeft.png');
const SoulPalArmRight = require('../../assets/images/journal/SoulPalArmRight.png');
const FilterIcon = require('../../assets/images/journal/FilterIcon.png');
const FilterIconDark = require('../../assets/images/journal/dark/FilterIcon.png');
const ThreeDotsImg = require('../../assets/images/journal/ThreeDotsJournal.png');
const HomeIconImg = require('../../assets/images/home/HomeIcon.png');
const JournalIconImg = require('../../assets/images/home/JournalIconPng.png');
const ProfileIconImg = require('../../assets/images/home/ProfileIconPng.png');

// Rich star field
const JOURNAL_STARS = Array.from({ length: 55 }, (_, i) => ({
  left: ((i * 41 + 19) % 100),
  top: ((i * 59 + 11) % 100),
  size: i < 3 ? 2.8 : i < 7 ? 2 : (i % 4 === 0) ? 1.5 : i % 3 === 0 ? 1 : 0.7,
  opacity: i < 3 ? 0.55 : i < 7 ? 0.35 : (0.08 + (i % 5) * 0.06),
}));

// Shooting stars
const JOURNAL_METEORS = [
  { startLeft: 10, startTop: 6, length: 42, angle: 33 },
  { startLeft: 75, startTop: 4, length: 30, angle: 40 },
];

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

const JournalScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { entries, isLoading, fetchEntries, streak, hasEntryToday } = useJournal();
  const { colorId } = useSoulPal();
  const soulPalHex = SOULPAL_COLORS.find(c => c.id === colorId)?.hex ?? '#70CACF';

  const [activeTab, setActiveTab] = useState<TabName>('Journal');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [appliedYears, setAppliedYears] = useState<number[]>([]);
  const [appliedMonths, setAppliedMonths] = useState<number[]>([]);
  const [selectedReflected, setSelectedReflected] = useState<boolean | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // --- Filter logic (dark mode: auto-apply, light mode: manual apply) ---
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
    if (isDarkMode) {
      setAppliedYears(next);
      fetchEntries(buildParams(next, appliedMonths, selectedReflected));
    }
  };

  const toggleMonth = (month: number) => {
    const next = selectedMonths.includes(month) ? selectedMonths.filter(m => m !== month) : [...selectedMonths, month];
    setSelectedMonths(next);
    if (isDarkMode) {
      setAppliedMonths(next);
      fetchEntries(buildParams(appliedYears, next, selectedReflected));
    }
  };

  const toggleReflected = (val: boolean) => {
    const next = selectedReflected === val ? null : val;
    setSelectedReflected(next);
    if (isDarkMode) {
      fetchEntries(buildParams(appliedYears, appliedMonths, next));
    }
  };

  const applyFilters = () => {
    setAppliedYears([...selectedYears]);
    setAppliedMonths([...selectedMonths]);
    fetchEntries(buildParams(selectedYears, selectedMonths, selectedReflected));
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

  // --- Space backdrop animations (dark mode) ---
  const planet1Y = useSharedValue(0);
  const planet2Y = useSharedValue(0);
  const planet3Y = useSharedValue(0);
  const planet4Y = useSharedValue(0);
  const nebulaScale = useSharedValue(1);
  const galaxyRotation = useSharedValue(0);
  const jMeteor0Op = useSharedValue(0);
  const jMeteor0TX = useSharedValue(0);
  const jMeteor0TY = useSharedValue(0);
  const jMeteor1Op = useSharedValue(0);
  const jMeteor1TX = useSharedValue(0);
  const jMeteor1TY = useSharedValue(0);

  useEffect(() => {
    if (!isDarkMode) return;
    planet1Y.value = withRepeat(withSequence(
      withTiming(-16, { duration: 4800, easing: Easing.inOut(Easing.sin) }),
      withTiming(16, { duration: 4800, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    planet2Y.value = withRepeat(withSequence(
      withTiming(13, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      withTiming(-13, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    planet3Y.value = withRepeat(withSequence(
      withTiming(-10, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
      withTiming(10, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    planet4Y.value = withRepeat(withSequence(
      withTiming(8, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
      withTiming(-8, { duration: 3400, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    nebulaScale.value = withRepeat(withSequence(
      withTiming(1.07, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    galaxyRotation.value = withRepeat(
      withTiming(360, { duration: 58000, easing: Easing.linear }), -1,
    );

    // Shooting stars
    const animateMeteor = (opVal: any, txVal: any, tyVal: any, m: typeof JOURNAL_METEORS[0], delay: number) => {
      const rad = (m.angle * Math.PI) / 180;
      const dx = Math.cos(rad) * m.length * 3;
      const dy = Math.sin(rad) * m.length * 3;
      const fire = () => {
        opVal.value = 0; txVal.value = 0; tyVal.value = 0;
        opVal.value = withDelay(delay, withSequence(
          withTiming(1, { duration: 100 }), withTiming(1, { duration: 500 }), withTiming(0, { duration: 300 }),
        ));
        txVal.value = withDelay(delay, withTiming(dx, { duration: 900, easing: Easing.out(Easing.quad) }));
        tyVal.value = withDelay(delay, withTiming(dy, { duration: 900, easing: Easing.out(Easing.quad) }));
      };
      fire();
      return setInterval(fire, 13000);
    };
    const i0 = animateMeteor(jMeteor0Op, jMeteor0TX, jMeteor0TY, JOURNAL_METEORS[0], 0);
    const i1 = animateMeteor(jMeteor1Op, jMeteor1TX, jMeteor1TY, JOURNAL_METEORS[1], 5000);
    return () => { clearInterval(i0); clearInterval(i1); };
  }, [isDarkMode]);

  const planet1Style = useAnimatedStyle(() => ({ transform: [{ translateY: planet1Y.value }] }));
  const planet2Style = useAnimatedStyle(() => ({ transform: [{ translateY: planet2Y.value }] }));
  const planet3Style = useAnimatedStyle(() => ({ transform: [{ translateY: planet3Y.value }] }));
  const planet4Style = useAnimatedStyle(() => ({ transform: [{ translateY: planet4Y.value }] }));
  const nebulaAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: nebulaScale.value }] }));
  const galaxyAnimStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${galaxyRotation.value}deg` }] }));
  const jMeteor0Style = useAnimatedStyle(() => ({
    opacity: jMeteor0Op.value, transform: [{ translateX: jMeteor0TX.value }, { translateY: jMeteor0TY.value }],
  }));
  const jMeteor1Style = useAnimatedStyle(() => ({
    opacity: jMeteor1Op.value, transform: [{ translateX: jMeteor1TX.value }, { translateY: jMeteor1TY.value }],
  }));

  // --- Date formatting ---
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isDarkMode) return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  // --- Streak text ---
  const currentStreak = streak?.current_streak ?? 0;

  // Dark mode: split into title + subtitle for visual hierarchy
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

  // Light mode: single combined text
  const streakText = hasEntryToday
    ? (isDarkMode
        ? "You've written today!\nCome back tomorrow"
        : "One journal a day, keeps\nawareness at bay!\nCome back tomorrow")
    : currentStreak > 0
      ? `${currentStreak}-day streak! Keep it up!`
      : 'Welcome to your journal!\nYour personal space\nto write and reflect';

  const streakStars = currentStreak > 0
    ? currentStreak <= 7 ? '\u2B50'.repeat(currentStreak) : '\u2B50'.repeat(7) + '+'
    : '';

  const tabBarHeight = 62 + (insets.bottom > 0 ? insets.bottom - 6 : 8) + 20;

  // =============================================
  // DARK MODE — Liquid Glass Design
  // =============================================
  if (isDarkMode) {
    return (
      <LinearGradient
        colors={[...surfaces.journalGradient]}
        locations={[0, 0.3, 0.65, 1]}
        style={dk.container}
      >
        {/* ═══ Rich space backdrop ═══ */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {/* Nebula glows */}
          <Animated.View style={[dk.nebula, nebulaAnimStyle]}>
            <LinearGradient
              colors={['rgba(91, 141, 184, 0.15)', 'rgba(61, 84, 120, 0.07)', 'transparent']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 0, y: 0 }}
              style={dk.nebulaFill}
            />
          </Animated.View>
          <Animated.View style={[dk.nebula2, nebulaAnimStyle]}>
            <LinearGradient
              colors={['rgba(42, 85, 112, 0.12)', 'rgba(61, 84, 120, 0.05)', 'transparent']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
              style={dk.nebulaFill}
            />
          </Animated.View>

          {/* Galaxy swirl */}
          <Animated.View style={[dk.galaxy, galaxyAnimStyle]}>
            <View style={dk.galaxyCore} />
            <View style={[dk.galaxyArm, { width: 50, transform: [{ rotate: '0deg' }] }]} />
            <View style={[dk.galaxyArm, { width: 40, transform: [{ rotate: '60deg' }], opacity: 0.7 }]} />
            <View style={[dk.galaxyArm, { width: 45, transform: [{ rotate: '120deg' }], opacity: 0.8 }]} />
          </Animated.View>

          {/* Stars */}
          {JOURNAL_STARS.map((s, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: `${s.left}%` as any,
                top: `${s.top}%` as any,
                width: s.size,
                height: s.size,
                borderRadius: s.size,
                backgroundColor: '#FFFFFF',
                opacity: s.opacity,
              }}
            />
          ))}

          {/* Planet 1 — large blue, top right */}
          <Animated.View style={[dk.planet, dk.planet1, planet1Style]}>
            <LinearGradient
              colors={['rgba(91, 141, 184, 0.30)', 'rgba(91, 141, 184, 0.08)', 'rgba(0, 0, 0, 0.20)']}
              start={{ x: 0.2, y: 0.15 }}
              end={{ x: 0.9, y: 0.85 }}
              style={dk.planetFill}
            />
            <View style={[dk.planetHighlight, { top: '16%', left: '20%', width: 16, height: 16 }]} />
            <View style={dk.atmosphere} />
          </Animated.View>

          {/* Planet 2 — ringed silver, mid left */}
          <Animated.View style={[dk.planet, dk.planet2, planet2Style]}>
            <LinearGradient
              colors={['rgba(123, 143, 168, 0.26)', 'rgba(123, 143, 168, 0.06)', 'rgba(0, 0, 0, 0.18)']}
              start={{ x: 0.25, y: 0.1 }}
              end={{ x: 0.85, y: 0.9 }}
              style={dk.planetFill}
            />
            <View style={[dk.planetHighlight, { top: '15%', left: '25%', width: 12, height: 12 }]} />
            <View style={dk.planetRing} />
          </Animated.View>

          {/* Planet 3 — tiny teal moon */}
          <Animated.View style={[dk.planet, dk.planet3, planet3Style]}>
            <LinearGradient
              colors={['rgba(77, 232, 212, 0.18)', 'rgba(77, 232, 212, 0.04)', 'rgba(0, 0, 0, 0.10)']}
              start={{ x: 0.3, y: 0.2 }}
              end={{ x: 0.8, y: 0.85 }}
              style={dk.planetFill}
            />
            <View style={[dk.planetHighlight, { top: '20%', left: '28%', width: 6, height: 6 }]} />
          </Animated.View>

          {/* Planet 4 — indigo, bottom right */}
          <Animated.View style={[dk.planet, dk.planet4, planet4Style]}>
            <LinearGradient
              colors={['rgba(74, 94, 128, 0.24)', 'rgba(74, 94, 128, 0.06)', 'rgba(0, 0, 0, 0.15)']}
              start={{ x: 0.2, y: 0.15 }}
              end={{ x: 0.85, y: 0.9 }}
              style={dk.planetFill}
            />
            <View style={[dk.planetHighlight, { top: '18%', left: '22%', width: 8, height: 8 }]} />
          </Animated.View>

          {/* Shooting stars */}
          {JOURNAL_METEORS.map((m, idx) => (
            <Animated.View
              key={idx}
              style={[
                dk.meteor,
                { left: `${m.startLeft}%` as any, top: `${m.startTop}%` as any, width: m.length, transform: [{ rotate: `${m.angle}deg` }] },
                idx === 0 ? jMeteor0Style : jMeteor1Style,
              ]}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.3)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={dk.meteorTrail}
              />
            </Animated.View>
          ))}

          {/* Asteroids */}
          <View style={[dk.asteroid, { top: '22%', left: '6%', width: 4, height: 3 }]} />
          <View style={[dk.asteroid, { top: '23%', left: '9%', width: 3, height: 2 }]} />
          <View style={[dk.asteroid, { bottom: '30%', right: '7%', width: 4, height: 3 }]} />
          <View style={[dk.asteroid, { bottom: '32%', right: '11%', width: 3, height: 2 }]} />

          {/* Dust lane */}
          <View style={dk.dustLane}>
            <LinearGradient
              colors={['transparent', 'rgba(91, 141, 184, 0.03)', 'rgba(61, 84, 120, 0.05)', 'rgba(91, 141, 184, 0.03)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </View>

        <View style={[dk.screen, { paddingTop: insets.top + 8 }]}>
          {/* Header Card — manual glass surface */}
          <View style={dk.headerCard}>
            <View style={dk.headerTop}>
              <View style={dk.soulPalWrap}>
                <View style={[dk.soulPalGlow, { backgroundColor: soulPalHex }]} />
                <SoulPalAnimated pose="journal" size={48} animate showEyes={false} />
              </View>
              <View style={dk.headerText}>
                <Text style={dk.headerTitle}>{journalTitle}</Text>
                <Text style={dk.headerSubtitle}>{journalSubtitle}</Text>
              </View>
              <Pressable onPress={toggleFilters} style={dk.filterToggle}>
                <Image source={FilterIconDark} style={dk.filterToggleIcon} resizeMode="contain" />
                {activeFilterCount > 0 && (
                  <View style={dk.filterBadge}>
                    <Text style={dk.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>
            {currentStreak > 0 && (
              <View style={dk.streakRow}>
                <Text style={dk.streakBadge}>
                  {'\uD83D\uDD25'} {currentStreak} day{currentStreak !== 1 ? 's' : ''} streak
                </Text>
              </View>
            )}
          </View>

          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <View style={dk.activeFilters}>
              {appliedYears.map(y => (
                <Pressable key={`y-${y}`} style={dk.activeFilterPill} onPress={() => removePill('year', y)}>
                  <Text style={dk.activeFilterText}>{y} {'\u2715'}</Text>
                </Pressable>
              ))}
              {appliedMonths.map(m => (
                <Pressable key={`m-${m}`} style={dk.activeFilterPill} onPress={() => removePill('month', m)}>
                  <Text style={dk.activeFilterText}>{MONTHS[m]} {'\u2715'}</Text>
                </Pressable>
              ))}
              {selectedReflected !== null && (
                <Pressable style={dk.activeFilterPill} onPress={() => toggleReflected(selectedReflected)}>
                  <Text style={dk.activeFilterText}>
                    {selectedReflected ? 'Reflected' : 'Unreflected'} {'\u2715'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Collapsible filter section */}
          {filtersExpanded && (
            <View style={dk.filterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={dk.pillRow}>
                  {YEARS.map(year => (
                    <Pressable
                      key={year}
                      style={[dk.pill, selectedYears.includes(year) && dk.pillActive]}
                      onPress={() => toggleYear(year)}
                    >
                      <Text style={[dk.pillText, selectedYears.includes(year) && dk.pillTextActive]}>{year}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                <View style={dk.pillRow}>
                  {MONTHS.map((month, idx) => (
                    <Pressable
                      key={idx}
                      style={[dk.pill, selectedMonths.includes(idx) && dk.pillActive]}
                      onPress={() => toggleMonth(idx)}
                    >
                      <Text style={[dk.pillText, selectedMonths.includes(idx) && dk.pillTextActive]}>{month}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <View style={[dk.pillRow, { marginTop: 10 }]}>
                <Pressable
                  style={[dk.reflectedPill, selectedReflected === true && dk.reflectedPillActive]}
                  onPress={() => toggleReflected(true)}
                >
                  <Text style={[dk.reflectedText, selectedReflected === true && { color: '#fff' }]}>Reflected</Text>
                </Pressable>
                <Pressable
                  style={[dk.reflectedPill, selectedReflected === false && dk.reflectedPillActive]}
                  onPress={() => toggleReflected(false)}
                >
                  <Text style={[dk.reflectedText, selectedReflected === false && { color: '#fff' }]}>Unreflected</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Entry list */}
          <ScrollView
            style={dk.entriesScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[dk.entriesList, { paddingBottom: tabBarHeight + 20 }]}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={() => fetchEntries()} tintColor="#fff" />
            }
          >
            {isLoading && entries.length === 0 ? (
              <JournalLoader />
            ) : entries.length === 0 ? (
              <View style={dk.emptyState}>
                <Text style={dk.emptyTitle}>
                  {activeFilterCount > 0 ? 'No entries found' : 'No journal entries yet'}
                </Text>
                <Text style={dk.emptySub}>
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
                    style={[dk.entryCard, {
                      shadowColor: emotionColor,
                      shadowOpacity: 0.25,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 2 },
                    }] as any}
                    onPress={() => navigation.navigate('JournalEntry', { entryId: item.id, isLatest: index === 0 })}
                  >
                    {/* Top accent strip */}
                    <View style={[dk.accentStrip, { backgroundColor: emotionColor }]} />
                    <View style={dk.entryContent}>
                      <View style={dk.entryHeader}>
                        <Text style={dk.entryDate}>{formatDate(item.created_at)}</Text>
                      </View>
                      <Text style={dk.entryText} numberOfLines={3}>{item.raw_text}</Text>
                    </View>
                  </GlassCard>
                );
              })
            )}
          </ScrollView>

        </View>

        {/* FAB — centered above tab bar */}
        <Pressable
          style={[dk.fab, { bottom: tabBarHeight + 6 }, hasEntryToday && dk.fabDisabled]}
          onPress={() => { if (!hasEntryToday) navigation.navigate('CreateJournal'); }}
        >
          <Text style={dk.fabText}>+</Text>
        </Pressable>

        {/* Tab Bar */}
        <Animated.View style={[dk.tabBar, { paddingBottom: insets.bottom > 0 ? insets.bottom - 6 : 8 }, tabBarAnimStyle]}>
          <View style={dk.tabBarInner}>
            {(['Home', 'Journal', 'Profile'] as TabName[]).map((tab, i) => (
              <Animated.View key={tab} style={[dk.tabItem, tabAnimStyles[i]]}>
                <Pressable onPress={() => handleTabPress(tab)} style={dk.tabPressable}>
                  <View style={activeTab === tab ? dk.activeTabBg : undefined}>
                    <Image
                      source={tab === 'Home' ? HomeIconImg : tab === 'Journal' ? JournalIconImg : ProfileIconImg}
                      style={activeTab === tab ? dk.tabIcon : dk.tabIconInactive}
                      resizeMode="contain"
                    />
                  </View>
                  <Animated.Text style={[dk.activeTabLabel, labelAnimStyles[i]]}>{tab}</Animated.Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </LinearGradient>
    );
  }

  // =============================================
  // LIGHT MODE — Original Design (from git HEAD)
  // =============================================
  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#F5F2F9']}
      locations={[0.1, 0.6, 1]}
      style={lt.container}
    >
      <View style={[lt.mainContent, { paddingTop: insets.top + 10 }]}>
        {/* SoulPal Header */}
        <View style={lt.headerSection}>
          <Image source={JournalSoulPal} style={lt.soulPalImage} resizeMode="contain" />
          <View style={lt.speechBubble}>
            <Text style={lt.speechText}>{streakText}</Text>
            {streakStars.length > 0 && (
              <Text style={lt.streakStars}>{streakStars}</Text>
            )}
          </View>
        </View>

        {/* Journal Content Card */}
        <View style={[lt.journalCard, { marginBottom: tabBarHeight }]}>
          {/* Year Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={lt.yearScroll}>
            <View style={lt.yearRow}>
              {YEARS.map((year) => (
                <Pressable
                  key={year}
                  style={[lt.yearPill, selectedYears.includes(year) && lt.yearPillActive]}
                  onPress={() => toggleYear(year)}
                >
                  <Text style={[lt.yearText, selectedYears.includes(year) && lt.yearTextActive]}>{year}</Text>
                </Pressable>
              ))}
              <Pressable style={lt.yearPill}>
                <Image source={ThreeDotsImg} style={lt.yearDots} resizeMode="contain" />
              </Pressable>
            </View>
          </ScrollView>

          {/* Divider */}
          <View style={lt.divider} />

          {/* Month Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={lt.monthScroll}>
            <View style={lt.monthRow}>
              {MONTHS.map((month, idx) => (
                <Pressable
                  key={idx}
                  style={[lt.monthPill, selectedMonths.includes(idx) && lt.monthPillActive]}
                  onPress={() => toggleMonth(idx)}
                >
                  <Text style={[lt.monthText, selectedMonths.includes(idx) && lt.monthTextActive]}>{month}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Reflected Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={lt.filterScroll}>
            <View style={lt.filterRow}>
              <Pressable
                style={[lt.reflectedPill, selectedReflected === true && lt.reflectedPillActive]}
                onPress={() => setSelectedReflected(selectedReflected === true ? null : true)}
              >
                <Text style={[lt.reflectedText, selectedReflected === true && lt.reflectedTextActive]}>Reflected</Text>
              </Pressable>
              <Pressable
                style={[lt.reflectedPill, selectedReflected === false && lt.reflectedPillActive]}
                onPress={() => setSelectedReflected(selectedReflected === false ? null : false)}
              >
                <Text style={[lt.reflectedText, selectedReflected === false && lt.reflectedTextActive]}>Unreflected</Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* Sort Row */}
          <View style={lt.sortRow}>
            <View style={lt.sortBar}>
              <Text style={lt.sortText}>Sort By:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={lt.sortPillsScroll}>
                <View style={lt.sortPillsRow}>
                  {selectedYears.map((year) => (
                    <View key={`y-${year}`} style={lt.sortPill}>
                      <Text style={lt.sortPillText}>{year}</Text>
                      <Pressable onPress={() => removePill('year', year)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Text style={lt.sortPillX}>{'\u2715'}</Text>
                      </Pressable>
                    </View>
                  ))}
                  {selectedMonths.map((monthIdx) => (
                    <View key={`m-${monthIdx}`} style={lt.sortPill}>
                      <Text style={lt.sortPillText}>{MONTHS[monthIdx]}</Text>
                      <Pressable onPress={() => removePill('month', monthIdx)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Text style={lt.sortPillX}>{'\u2715'}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
            <Pressable onPress={applyFilters}>
              <Image source={FilterIcon} style={lt.filterIcon} resizeMode="contain" />
            </Pressable>
          </View>

          {/* Entries */}
          <ScrollView
            style={lt.entriesScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={lt.entriesList}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={() => fetchEntries()} tintColor="#59168B" />
            }
          >
            {isLoading && entries.length === 0 ? (
              <JournalLoader />
            ) : entries.length === 0 ? (
              <View style={lt.emptyState}>
                <Text style={lt.emptyText}>No journal entries yet.</Text>
                <Text style={lt.emptySubtext}>Tap + to start writing!</Text>
              </View>
            ) : (
              entries.map((item) => (
                <Pressable
                  key={item.id}
                  style={lt.entryCard}
                  onPress={() => navigation.navigate('JournalEntry', { entryId: item.id })}
                >
                  <View style={lt.entryHeader}>
                    <Text style={lt.entryDate}>{formatDate(item.created_at)}</Text>
                    {item.ai_processing_status === 'complete' && <View style={lt.aiDot} />}
                  </View>
                  <Text style={lt.entryContent} numberOfLines={3}>{item.raw_text}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>

        {/* Arms */}
        <Image source={SoulPalArmLeft} style={[lt.soulPalArmLeft, { top: insets.top + 10 + 55 }]} resizeMode="contain" />
        <Image source={SoulPalArmRight} style={[lt.soulPalArmRight, { top: insets.top + 10 + 55 }]} resizeMode="contain" />

        {/* FAB */}
        <Pressable
          style={[lt.fab, { bottom: tabBarHeight + 12 }, hasEntryToday && lt.fabDisabled]}
          onPress={() => { if (!hasEntryToday) navigation.navigate('CreateJournal'); }}
        >
          <Text style={lt.fabText}>+</Text>
        </Pressable>
      </View>

      {/* Tab Bar */}
      <Animated.View style={[lt.tabBar, { paddingBottom: insets.bottom > 0 ? insets.bottom - 6 : 8 }, tabBarAnimStyle]}>
        <View style={lt.tabBarInner}>
          {(['Home', 'Journal', 'Profile'] as TabName[]).map((tab, i) => (
            <Animated.View key={tab} style={[lt.tabItem, tabAnimStyles[i]]}>
              <Pressable onPress={() => handleTabPress(tab)} style={lt.tabPressable}>
                <View style={activeTab === tab ? lt.activeTabBg : undefined}>
                  <Image
                    source={tab === 'Home' ? HomeIconImg : tab === 'Journal' ? JournalIconImg : ProfileIconImg}
                    style={activeTab === tab ? lt.tabIcon : lt.tabIconInactive}
                    resizeMode="contain"
                  />
                </View>
                <Animated.Text style={[lt.activeTabLabel, labelAnimStyles[i]]}>{tab}</Animated.Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

// =============================================
// DARK MODE STYLES — Liquid Glass
// =============================================
const dk = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 20 },

  // ── Nebulae ──
  nebula: {
    position: 'absolute',
    width: 280,
    height: 280,
    top: -40,
    right: -70,
    borderRadius: 140,
  },
  nebula2: {
    position: 'absolute',
    width: 230,
    height: 230,
    bottom: 100,
    left: -55,
    borderRadius: 115,
  },
  nebulaFill: {
    width: '100%',
    height: '100%',
    borderRadius: 140,
  },

  // ── Galaxy swirl ──
  galaxy: {
    position: 'absolute',
    width: 70,
    height: 70,
    top: '48%',
    left: '8%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galaxyCore: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(91, 141, 184, 0.22)',
    shadowColor: 'rgba(91, 141, 184, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  galaxyArm: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(61, 84, 120, 0.07)',
    borderRadius: 1,
  },

  // ── Planets ──
  planet: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
  planet1: {
    width: 140,
    height: 140,
    top: 30,
    right: -30,
    borderWidth: 1,
    borderColor: 'rgba(91, 141, 184, 0.15)',
  },
  planet2: {
    width: 100,
    height: 100,
    top: 400,
    left: -25,
    borderWidth: 1,
    borderColor: 'rgba(123, 143, 168, 0.10)',
  },
  planet3: {
    width: 32,
    height: 32,
    top: '35%',
    left: '6%',
    borderWidth: 1,
    borderColor: 'rgba(77, 232, 212, 0.10)',
  },
  planet4: {
    width: 55,
    height: 55,
    bottom: 140,
    right: -15,
    borderWidth: 1,
    borderColor: 'rgba(74, 94, 128, 0.08)',
  },
  planetFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  planetHighlight: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
  },
  atmosphere: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(91, 141, 184, 0.08)',
  },
  planetRing: {
    position: 'absolute',
    width: '175%',
    height: 14,
    top: '44%',
    left: '-37%',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(123, 143, 168, 0.20)',
    transform: [{ rotate: '-25deg' }],
  },

  // ── Meteors ──
  meteor: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
  },
  meteorTrail: {
    width: '100%',
    height: '100%',
    borderRadius: 1,
  },

  // ── Asteroids ──
  asteroid: {
    position: 'absolute',
    backgroundColor: 'rgba(160, 175, 200, 0.14)',
    borderRadius: 1.5,
    transform: [{ rotate: '20deg' }],
  },

  // ── Dust lane ──
  dustLane: {
    position: 'absolute',
    width: '150%',
    height: 70,
    top: '58%',
    left: '-25%',
    transform: [{ rotate: '-16deg' }],
    opacity: 0.5,
  },

  headerCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
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
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  streakBadge: {
    fontFamily: fonts.outfit.medium, fontSize: 12, color: '#FFD757',
    textShadowColor: 'rgba(255, 215, 87, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  filterToggle: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  filterToggleIcon: { width: 20, height: 20, tintColor: '#4DE8D4' },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#4CAF50', borderRadius: 8,
    width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  filterBadgeText: { fontFamily: fonts.outfit.medium, fontSize: 10, color: '#fff' },

  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  activeFilterPill: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  activeFilterText: { fontFamily: fonts.outfit.medium, fontSize: 11, color: 'rgba(255,255,255,0.8)' },

  filterSection: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  pillActive: { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.4)' },
  pillText: { fontFamily: fonts.outfit.regular, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  pillTextActive: { color: '#fff', fontFamily: fonts.outfit.medium },
  reflectedPill: { borderWidth: 1.5, borderColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  reflectedPillActive: { backgroundColor: '#4CAF50' },
  reflectedText: { fontFamily: fonts.outfit.medium, fontSize: 12, color: '#4CAF50' },

  entriesScroll: { flex: 1 },
  entriesList: { gap: 12, paddingTop: 4 },
  entryCard: { borderRadius: 14 },
  accentStrip: { height: 3, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  entryContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryDate: { fontFamily: fonts.edensor.bold, fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  aiIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  aiDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50' },
  aiLabel: { fontFamily: fonts.outfit.regular, fontSize: 10, color: 'rgba(76, 175, 80, 0.8)' },
  entryText: { fontFamily: fonts.outfit.regular, fontSize: 13, lineHeight: 20, color: 'rgba(255,255,255,0.85)' },

  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontFamily: fonts.outfit.medium, fontSize: 17, color: 'rgba(255,255,255,0.9)', marginBottom: 6 },
  emptySub: { fontFamily: fonts.outfit.regular, fontSize: 14, color: 'rgba(255,255,255,0.45)' },

  fab: {
    position: 'absolute', alignSelf: 'center', left: '50%', marginLeft: -26,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#4DE8D4',
    justifyContent: 'center', alignItems: 'center', zIndex: 20,
    shadowColor: '#4DE8D4',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  fabDisabled: { opacity: 0.25 },
  fabText: { fontFamily: fonts.outfit.medium, fontSize: 28, color: '#0F1B2D', marginTop: -2 },

  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  tabBarInner: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 200,
    width: 269, height: 62, alignItems: 'center', justifyContent: 'space-evenly',
    paddingHorizontal: 16, paddingTop: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', minWidth: 50 },
  tabPressable: { alignItems: 'center', justifyContent: 'center' },
  activeTabBg: {
    backgroundColor: 'rgba(61, 84, 120, 0.4)', borderRadius: 24,
    width: 52, height: 40, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4DE8D4',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  tabIcon: { width: 28, height: 26, tintColor: '#fff' },
  tabIconInactive: { width: 33, height: 30, opacity: 0.6, tintColor: '#fff' },
  activeTabLabel: { fontFamily: fonts.edensor.bold, fontSize: 12, lineHeight: 17, color: '#fff', marginTop: 2 },
});

// =============================================
// LIGHT MODE STYLES — Original Design
// =============================================
const lt = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1, paddingHorizontal: 20 },

  // Header
  headerSection: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: -20, zIndex: 0 },
  soulPalImage: { width: 70, height: 98, marginLeft: -6 },
  soulPalArmLeft: { position: 'absolute', width: 28, height: 33, left: 26, zIndex: 2 },
  soulPalArmRight: { position: 'absolute', width: 30, height: 32, left: 40, zIndex: 2 },
  speechBubble: {
    flex: 1, backgroundColor: colors.white, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6, marginLeft: -8, marginTop: 10,
  },
  speechText: {
    fontFamily: fonts.outfit.regular, fontSize: 11, lineHeight: 11 * 1.3,
    color: '#59168B', textAlign: 'center',
  },
  streakStars: { fontSize: 11, textAlign: 'center', marginTop: 2 },

  // Journal Card
  journalCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 10,
    paddingHorizontal: 17, paddingTop: 22, paddingBottom: 18, zIndex: 1,
  },
  entriesScroll: { flex: 1 },

  // Year Pills
  yearScroll: { marginBottom: 12, flexShrink: 0, flexGrow: 0 },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yearPill: {
    backgroundColor: '#59168B', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 4, justifyContent: 'center', alignItems: 'center',
  },
  yearPillActive: { backgroundColor: '#3A0D5E' },
  yearText: { fontFamily: fonts.outfit.regular, fontSize: 16, lineHeight: 16 * 1.26, color: colors.white },
  yearTextActive: { color: colors.white, fontFamily: fonts.outfit.medium },
  yearDots: { width: 14, height: 4, tintColor: colors.white },

  // Divider
  divider: { height: 1, backgroundColor: '#59168B', marginBottom: 12, flexShrink: 0 },

  // Month Pills
  monthScroll: { marginBottom: 8, flexShrink: 0, flexGrow: 0 },
  monthRow: { flexDirection: 'row', gap: 8 },
  monthPill: {
    backgroundColor: '#59168B', borderRadius: 5,
    paddingHorizontal: 16, paddingVertical: 4, justifyContent: 'center', alignItems: 'center',
  },
  monthPillActive: { backgroundColor: '#3A0D5E' },
  monthText: { fontFamily: fonts.outfit.regular, fontSize: 16, lineHeight: 16 * 1.26, color: colors.white },
  monthTextActive: { color: colors.white, fontFamily: fonts.outfit.medium },

  // Reflected Filters
  filterScroll: { marginBottom: 8, flexShrink: 0, flexGrow: 0 },
  filterRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  reflectedPill: { borderWidth: 1.5, borderColor: '#4CAF50', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  reflectedPillActive: { backgroundColor: '#4CAF50' },
  reflectedText: { fontFamily: fonts.outfit.medium, fontSize: 12, color: '#4CAF50' },
  reflectedTextActive: { color: colors.white },

  // Sort Row
  sortRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexShrink: 0 },
  sortBar: {
    flex: 1, backgroundColor: '#59168B', borderRadius: 5, minHeight: 35,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, marginRight: 10,
  },
  sortText: { fontFamily: fonts.outfit.regular, fontSize: 10, lineHeight: 10 * 1.26, color: colors.white, marginRight: 6 },
  sortPillsScroll: { flex: 1 },
  sortPillsRow: { flexDirection: 'row', gap: 6 },
  sortPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, gap: 4,
  },
  sortPillText: { fontFamily: fonts.outfit.medium, fontSize: 10, color: '#59168B' },
  sortPillX: { fontFamily: fonts.outfit.medium, fontSize: 10, color: '#59168B' },
  filterIcon: { width: 35, height: 35 },

  // Entries
  entriesList: { gap: 12 },
  entryCard: { backgroundColor: '#59168B', borderRadius: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryDate: { fontFamily: fonts.outfit.regular, fontSize: 12, lineHeight: 12 * 1.26, color: colors.white },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  entryContent: { fontFamily: fonts.outfit.light, fontSize: 12, lineHeight: 12 * 1.4, color: colors.white },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: fonts.outfit.medium, fontSize: 16, color: '#59168B', marginBottom: 4 },
  emptySubtext: { fontFamily: fonts.outfit.light, fontSize: 14, color: '#59168B' },

  // FAB
  fab: {
    position: 'absolute', right: 4, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#59168B', justifyContent: 'center', alignItems: 'center', zIndex: 10,
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
  fabDisabled: { opacity: 0.4 },
  fabText: { fontFamily: fonts.outfit.light, fontSize: 32, color: colors.white, marginTop: -2 },

  // Tab Bar
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  tabBarInner: {
    flexDirection: 'row', backgroundColor: colors.white, borderRadius: 200,
    width: 269, height: 62, alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 16, paddingTop: 14,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', minWidth: 50 },
  tabPressable: { alignItems: 'center', justifyContent: 'center' },
  activeTabBg: {
    backgroundColor: '#59168B', borderRadius: 24, width: 52, height: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  tabIcon: { width: 28, height: 26, tintColor: '#FFFFFF' },
  tabIconInactive: { width: 33, height: 30, opacity: 0.85, tintColor: '#59168B' },
  activeTabLabel: { fontFamily: fonts.edensor.bold, fontSize: 12, lineHeight: 12 * 1.4, color: '#59168B', marginTop: 2 },
});

export default JournalScreen;
