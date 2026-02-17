import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { useJournal } from '../contexts/JournalContext';
import { Mood } from '../services/JournalService';

const MOOD_COLORS: Record<Mood, string> = {
  Normal: '#59168B',
  Happy: '#EFDE11',
  Mad: '#F20F0F',
  Sad: '#0F3BF2',
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const YEARS = [2026, 2025, 2024];

const JournalSoulPal = require('../../assets/images/journal/JournalSoulPalChar.png');
const SoulPalArmLeft = require('../../assets/images/journal/SoulPalArmLeft.png');
const SoulPalArmRight = require('../../assets/images/journal/SoulPalArmRight.png');
const FilterIcon = require('../../assets/images/journal/FilterIcon.png');
const MoodNormal = require('../../assets/images/journal/MoodNormal.png');
const MoodHappy = require('../../assets/images/journal/MoodHappy.png');
const MoodMad = require('../../assets/images/journal/MoodMad.png');
const MoodSad = require('../../assets/images/journal/MoodSad.png');
const ThreeDotsImg = require('../../assets/images/journal/ThreeDotsJournal.png');
const HomeIconImg = require('../../assets/images/home/HomeIcon.png');
const JournalIconImg = require('../../assets/images/home/JournalIconPng.png');
const ProfileIconImg = require('../../assets/images/home/ProfileIconPng.png');

const MOOD_ICONS: Record<Mood, any> = {
  Normal: MoodNormal,
  Happy: MoodHappy,
  Mad: MoodMad,
  Sad: MoodSad,
};

type TabName = 'Home' | 'Journal' | 'Profile';

const JournalScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { entries, isLoading, fetchEntries } = useJournal();

  const [activeTab, setActiveTab] = useState<TabName>('Journal');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [appliedYears, setAppliedYears] = useState<number[]>([]);
  const [appliedMonths, setAppliedMonths] = useState<number[]>([]);

  // Fetch entries on mount
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const applyFilters = () => {
    setAppliedYears([...selectedYears]);
    setAppliedMonths([...selectedMonths]);

    // Build API params — use first selected year/month if any
    const params: any = {};
    if (selectedYears.length === 1) params.year = selectedYears[0];
    if (selectedMonths.length === 1) params.month = selectedMonths[0] + 1; // months are 0-indexed in UI, 1-indexed in API
    fetchEntries(params);
  };

  const removePill = (type: 'year' | 'month', value: number) => {
    if (type === 'year') {
      setSelectedYears((prev) => prev.filter((y) => y !== value));
      setAppliedYears((prev) => prev.filter((y) => y !== value));
    } else {
      setSelectedMonths((prev) => prev.filter((m) => m !== value));
      setAppliedMonths((prev) => prev.filter((m) => m !== value));
    }
  };

  // Tab bar animations
  const tabTranslateY = useSharedValue(0);
  const tabRiseValues = [useSharedValue(0), useSharedValue(-20), useSharedValue(0)];
  const tabLabelOpacities = [useSharedValue(0), useSharedValue(1), useSharedValue(0)];

  const TAB_POSITIONS: Record<TabName, number> = { Home: 0, Journal: 1, Profile: 2 };

  const handleTabPress = useCallback((tab: TabName) => {
    if (tab === 'Home') {
      navigation.navigate('Home');
      return;
    }
    if (tab === 'Profile') {
      navigation.navigate('Profile');
      return;
    }

    const newIndex = TAB_POSITIONS[tab];
    const oldIndex = TAB_POSITIONS[activeTab];

    tabRiseValues[oldIndex].value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    tabRiseValues[newIndex].value = withTiming(-20, { duration: 300, easing: Easing.out(Easing.ease) });
    tabLabelOpacities[oldIndex].value = withTiming(0, { duration: 150 });
    tabLabelOpacities[newIndex].value = withTiming(1, { duration: 250 });

    setActiveTab(tab);
  }, [activeTab, navigation]);

  const tabBarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabTranslateY.value }],
  }));

  const tabAnimStyles = tabRiseValues.map((riseVal) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({
      transform: [{ translateY: riseVal.value }],
    }))
  );

  const labelAnimStyles = tabLabelOpacities.map((opVal) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({
      opacity: opVal.value,
    }))
  );

  // Format date from ISO string
  const formatDate = (isoDate: string) => {
    const d = new Date(isoDate);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  };

  const tabBarHeight = 62 + (insets.bottom > 0 ? insets.bottom - 6 : 8) + 20;

  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#F5F2F9']}
      locations={[0.1, 0.6, 1]}
      style={styles.container}
    >
      <View style={[styles.mainContent, { paddingTop: insets.top + 10 }]}>
        {/* SoulPal Header */}
        <View style={styles.headerSection}>
          <Image source={JournalSoulPal} style={styles.soulPalImage} resizeMode="contain" />
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>
              Welcome to your journal!{'\n'}Your personal space{'\n'}to write and reflect
            </Text>
          </View>
        </View>

        {/* Journal Content Card */}
        <View style={[styles.journalCard, { marginBottom: tabBarHeight }]}>
          {/* Year Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
            <View style={styles.yearRow}>
              {YEARS.map((year) => (
                <Pressable
                  key={year}
                  style={[styles.yearPill, selectedYears.includes(year) && styles.yearPillActive]}
                  onPress={() => toggleYear(year)}
                >
                  <Text style={[styles.yearText, selectedYears.includes(year) && styles.yearTextActive]}>
                    {year}
                  </Text>
                </Pressable>
              ))}
              <Pressable style={styles.yearPill}>
                <Image source={ThreeDotsImg} style={styles.yearDots} resizeMode="contain" />
              </Pressable>
            </View>
          </ScrollView>

          {/* Purple Divider */}
          <View style={styles.divider} />

          {/* Month Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
            <View style={styles.monthRow}>
              {MONTHS.map((month, idx) => (
                <Pressable
                  key={idx}
                  style={[styles.monthPill, selectedMonths.includes(idx) && styles.monthPillActive]}
                  onPress={() => toggleMonth(idx)}
                >
                  <Text style={[styles.monthText, selectedMonths.includes(idx) && styles.monthTextActive]}>
                    {month}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Sort By Row */}
          <View style={styles.sortRow}>
            <View style={styles.sortBar}>
              <Text style={styles.sortText}>Sort By:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortPillsScroll}>
                <View style={styles.sortPillsRow}>
                  {selectedYears.map((year) => (
                    <View key={`y-${year}`} style={styles.sortPill}>
                      <Text style={styles.sortPillText}>{year}</Text>
                      <Pressable onPress={() => removePill('year', year)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Text style={styles.sortPillX}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                  {selectedMonths.map((monthIdx) => (
                    <View key={`m-${monthIdx}`} style={styles.sortPill}>
                      <Text style={styles.sortPillText}>{MONTHS[monthIdx]}</Text>
                      <Pressable onPress={() => removePill('month', monthIdx)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Text style={styles.sortPillX}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
            <Pressable onPress={applyFilters}>
              <Image source={FilterIcon} style={styles.filterIcon} resizeMode="contain" />
            </Pressable>
          </View>

          {/* Journal Entries */}
          <ScrollView
            style={styles.entriesScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.entriesList}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={() => fetchEntries()}
                tintColor="#59168B"
              />
            }
          >
            {entries.length === 0 && !isLoading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No journal entries yet.</Text>
                <Text style={styles.emptySubtext}>Tap + to start writing!</Text>
              </View>
            ) : (
              entries.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.entryCard}
                  onPress={() => navigation.navigate('JournalEntry', { entryId: item.id })}
                >
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>{formatDate(item.created_at)}</Text>
                    <View style={styles.entryMoodRow}>
                      {item.mood && (
                        <View style={styles.moodPill}>
                          <Text style={[styles.moodText, { color: MOOD_COLORS[item.mood as Mood] || '#59168B' }]}>
                            {item.mood}
                          </Text>
                          {MOOD_ICONS[item.mood as Mood] && (
                            <Image source={MOOD_ICONS[item.mood as Mood]} style={styles.moodIcon} resizeMode="contain" />
                          )}
                        </View>
                      )}
                      {item.is_ai_processed && <View style={styles.aiDot} />}
                      <Pressable>
                        <Image source={ThreeDotsImg} style={styles.threeDots} resizeMode="contain" />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.entryContent} numberOfLines={3}>
                    {item.raw_text}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>

        {/* Arms */}
        <Image source={SoulPalArmLeft} style={styles.soulPalArmLeft} resizeMode="contain" />
        <Image source={SoulPalArmRight} style={styles.soulPalArmRight} resizeMode="contain" />

        {/* FAB */}
        <Pressable
          style={[styles.fab, { bottom: tabBarHeight + 12 }]}
          onPress={() => navigation.navigate('CreateJournal')}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>

      {/* Bottom Tab Bar */}
      <Animated.View
        style={[
          styles.tabBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom - 6 : 8 },
          tabBarAnimStyle,
        ]}
      >
        <View style={styles.tabBarInner}>
          {/* Home Tab */}
          <Animated.View style={[styles.tabItem, tabAnimStyles[0]]}>
            <Pressable onPress={() => handleTabPress('Home')} style={styles.tabPressable}>
              <View style={activeTab === 'Home' ? styles.activeTabBg : null}>
                <Image
                  source={HomeIconImg}
                  style={activeTab === 'Home' ? styles.tabIcon : styles.tabIconInactive}
                  resizeMode="contain"
                />
              </View>
              <Animated.Text style={[styles.activeTabLabel, labelAnimStyles[0]]}>Home</Animated.Text>
            </Pressable>
          </Animated.View>

          {/* Journal Tab */}
          <Animated.View style={[styles.tabItem, tabAnimStyles[1]]}>
            <Pressable onPress={() => handleTabPress('Journal')} style={styles.tabPressable}>
              <View style={activeTab === 'Journal' ? styles.activeTabBg : null}>
                <Image
                  source={JournalIconImg}
                  style={activeTab === 'Journal' ? styles.tabIcon : styles.tabIconInactive}
                  resizeMode="contain"
                />
              </View>
              <Animated.Text style={[styles.activeTabLabel, labelAnimStyles[1]]}>Journal</Animated.Text>
            </Pressable>
          </Animated.View>

          {/* Profile Tab */}
          <Animated.View style={[styles.tabItem, tabAnimStyles[2]]}>
            <Pressable onPress={() => handleTabPress('Profile')} style={styles.tabPressable}>
              <View style={activeTab === 'Profile' ? styles.activeTabBg : null}>
                <Image
                  source={ProfileIconImg}
                  style={activeTab === 'Profile' ? styles.tabIcon : styles.tabIconInactive}
                  resizeMode="contain"
                />
              </View>
              <Animated.Text style={[styles.activeTabLabel, labelAnimStyles[2]]}>Profile</Animated.Text>
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Header
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: -35,
    zIndex: 0,
  },
  soulPalImage: {
    width: 115,
    height: 161,
    marginLeft: -10,
  },
  soulPalArmLeft: {
    position: 'absolute',
    width: 46,
    height: 54,
    left: 32,
    top: 142,
    zIndex: 2,
  },
  soulPalArmRight: {
    position: 'absolute',
    width: 50,
    height: 52,
    left: 52,
    top: 144,
    zIndex: 2,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginLeft: -15,
    marginTop: 20,
  },
  speechText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    lineHeight: 16 * 1.26,
    color: '#59168B',
    textAlign: 'center',
  },

  // Journal Card
  journalCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 17,
    paddingTop: 22,
    paddingBottom: 18,
    zIndex: 1,
  },
  entriesScroll: {
    flex: 1,
  },

  // Year Pills
  yearScroll: {
    marginBottom: 12,
    flexShrink: 0,
    flexGrow: 0,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yearPill: {
    backgroundColor: '#59168B',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearPillActive: {
    backgroundColor: '#3A0D5E',
  },
  yearText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    lineHeight: 16 * 1.26,
    color: colors.white,
  },
  yearTextActive: {
    color: colors.white,
    fontFamily: fonts.outfit.medium,
  },
  yearDots: {
    width: 14,
    height: 4,
    tintColor: colors.white,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#59168B',
    marginBottom: 12,
    flexShrink: 0,
  },

  // Month Pills
  monthScroll: {
    marginBottom: 8,
    flexShrink: 0,
    flexGrow: 0,
  },
  monthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  monthPill: {
    backgroundColor: '#59168B',
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthPillActive: {
    backgroundColor: '#3A0D5E',
  },
  monthText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    lineHeight: 16 * 1.26,
    color: colors.white,
  },
  monthTextActive: {
    color: colors.white,
    fontFamily: fonts.outfit.medium,
  },

  // Sort Row
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexShrink: 0,
  },
  sortBar: {
    flex: 1,
    backgroundColor: '#59168B',
    borderRadius: 5,
    minHeight: 35,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 10,
  },
  sortText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 10,
    lineHeight: 10 * 1.26,
    color: colors.white,
    marginRight: 6,
  },
  sortPillsScroll: {
    flex: 1,
  },
  sortPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  sortPillText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 10,
    color: '#59168B',
  },
  sortPillX: {
    fontFamily: fonts.outfit.medium,
    fontSize: 10,
    color: '#59168B',
  },
  filterIcon: {
    width: 35,
    height: 35,
  },

  // Entries
  entriesList: {
    gap: 12,
  },
  entryCard: {
    backgroundColor: '#59168B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDate: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    color: colors.white,
  },
  entryMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moodPill: {
    backgroundColor: colors.white,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
    height: 26,
  },
  moodText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    lineHeight: 12 * 1.26,
  },
  moodIcon: {
    width: 18,
    height: 18,
  },
  threeDots: {
    width: 14,
    height: 4,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  entryContent: {
    fontFamily: fonts.outfit.light,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: colors.white,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 16,
    color: '#59168B',
    marginBottom: 4,
  },
  emptySubtext: {
    fontFamily: fonts.outfit.light,
    fontSize: 14,
    color: '#59168B',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 4,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#59168B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontFamily: fonts.outfit.light,
    fontSize: 32,
    color: colors.white,
    marginTop: -2,
  },

  // Bottom Tab Bar
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBarInner: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 200,
    width: 269,
    height: 62,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  tabPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabBg: {
    backgroundColor: '#59168B',
    borderRadius: 24,
    width: 52,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIcon: {
    width: 28,
    height: 26,
    tintColor: '#FFFFFF',
  },
  tabIconInactive: {
    width: 33,
    height: 30,
    opacity: 0.85,
    tintColor: '#59168B',
  },
  activeTabLabel: {
    fontFamily: fonts.edensor.bold,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: '#59168B',
    marginTop: 2,
  },
});

export default JournalScreen;
