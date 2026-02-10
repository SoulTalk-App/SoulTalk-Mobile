import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  FlatList,
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
import {
  journalEntries,
  MOOD_COLORS,
  MONTHS,
  YEARS,
  Mood,
  JournalEntry,
} from '../data/journalMockData';

const JournalSoulPal = require('../../assets/images/journal/JournalSoulPal.png');
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
  const [activeTab, setActiveTab] = useState<TabName>('Journal');
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

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

  // Filter entries by selected year and month
  const filteredEntries = useMemo(() => {
    return journalEntries.filter((entry) => {
      if (entry.year !== selectedYear) return false;
      if (selectedMonth !== null && entry.month !== selectedMonth) return false;
      return true;
    });
  }, [selectedYear, selectedMonth]);

  // Get available months for selected year
  const availableMonths = useMemo(() => {
    const months = new Set(
      journalEntries
        .filter((e) => e.year === selectedYear)
        .map((e) => e.month)
    );
    return Array.from(months).sort((a, b) => b - a);
  }, [selectedYear]);

  const renderEntry = ({ item }: { item: JournalEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{item.date}</Text>
        <View style={styles.entryMoodRow}>
          <View style={styles.moodPill}>
            <Text style={[styles.moodText, { color: MOOD_COLORS[item.mood] }]}>
              {item.mood}
            </Text>
            <Image source={MOOD_ICONS[item.mood]} style={styles.moodIcon} resizeMode="contain" />
          </View>
          <Pressable>
            <Image source={ThreeDotsImg} style={styles.threeDots} resizeMode="contain" />
          </Pressable>
        </View>
      </View>
      <Text style={styles.entryContent}>{item.content}</Text>
    </View>
  );

  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#F5F2F9']}
      locations={[0.1, 0.6, 1]}
      style={styles.container}
    >
      <ScrollView
        style={[styles.scrollView, { paddingTop: insets.top + 10 }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
        <View style={styles.journalCard}>
          {/* Year Pills */}
          <View style={styles.yearRow}>
            {YEARS.map((year) => (
              <Pressable
                key={year}
                style={[styles.yearPill, selectedYear === year && styles.yearPillActive]}
                onPress={() => { setSelectedYear(year); setSelectedMonth(null); }}
              >
                <Text style={[styles.yearText, selectedYear === year && styles.yearTextActive]}>
                  {year}
                </Text>
              </Pressable>
            ))}
            <Pressable style={styles.yearPill}>
              <Image source={ThreeDotsImg} style={styles.yearDots} resizeMode="contain" />
            </Pressable>
          </View>

          {/* Purple Divider */}
          <View style={styles.divider} />

          {/* Month Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
            <View style={styles.monthRow}>
              {availableMonths.map((monthIdx) => (
                <Pressable
                  key={monthIdx}
                  style={[styles.monthPill, selectedMonth === monthIdx && styles.monthPillActive]}
                  onPress={() => setSelectedMonth(selectedMonth === monthIdx ? null : monthIdx)}
                >
                  <Text style={[styles.monthText, selectedMonth === monthIdx && styles.monthTextActive]}>
                    {MONTHS[monthIdx]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Sort By Row */}
          <View style={styles.sortRow}>
            <View style={styles.sortBar}>
              <Text style={styles.sortText}>Sort By:</Text>
            </View>
            <Pressable>
              <Image source={FilterIcon} style={styles.filterIcon} resizeMode="contain" />
            </Pressable>
          </View>

          {/* Journal Entries */}
          <FlatList
            data={filteredEntries}
            renderItem={renderEntry}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.entriesList}
          />
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 140 + (insets.bottom || 16) }} />
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Header
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  soulPalImage: {
    width: 155,
    height: 218,
    marginLeft: -10,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginLeft: -10,
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
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 17,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // Year Pills
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  yearPill: {
    backgroundColor: '#59168B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearPillActive: {
    backgroundColor: '#59168B',
  },
  yearText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 16,
    lineHeight: 16 * 1.26,
    color: colors.white,
  },
  yearTextActive: {
    color: colors.white,
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
  },

  // Month Pills
  monthScroll: {
    marginBottom: 8,
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
  },
  sortBar: {
    flex: 1,
    backgroundColor: '#59168B',
    borderRadius: 5,
    height: 35,
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginRight: 10,
  },
  sortText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 10,
    lineHeight: 10 * 1.26,
    color: colors.white,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  moodText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    lineHeight: 12 * 1.26,
  },
  moodIcon: {
    width: 16,
    height: 16,
  },
  threeDots: {
    width: 14,
    height: 4,
  },
  entryContent: {
    fontFamily: fonts.outfit.thin,
    fontSize: 10,
    lineHeight: 10 * 1.26,
    color: colors.white,
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
