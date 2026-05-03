import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { fonts, useThemeColors } from '../theme';
import GlassCard from '../components/GlassCard';
import SoulPalAnimated from '../components/SoulPalAnimated';
import { useSoulPal, getSoulPalPalette } from '../contexts/SoulPalContext';
import { usePersonality } from '../contexts/PersonalityContext';
import { PersonalityTestResult } from '../services/PersonalityService';
import { TestType } from '../data/personalityTests/types';
import { CosmicScreen } from '../components/CosmicBackdrop';

const TEST_TYPE_LABEL: Record<TestType, string> = {
  inner_lens: 'Inner Lens',
  focus_factor: 'Focus Factor',
};

function formatTakenAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

// Assets — light mode
const LockIcon = require('../../assets/images/home/LockIcon.png');
const ProfileGearIcon = require('../../assets/images/profile/ProfileGearIcon.png');
const ProfileAvatar = require('../../assets/images/profile/ProfileAvatar-f054e3.png');
const ProfileSoulPalChar = require('../../assets/images/profile/ProfileSoulPalChar.png');
const ThreeDots = require('../../assets/images/profile/ThreeDots.png');
// Assets — dark mode variants
const LockIconDark = require('../../assets/images/home/dark/LockIcon.png');
const ProfileAvatarDark = require('../../assets/images/profile/dark/ProfileAvatar.png');
const HomeIconImg = require('../../assets/images/home/HomeIcon.png');
const JournalIconImg = require('../../assets/images/home/JournalIconPng.png');
const ProfileIconImg = require('../../assets/images/home/ProfileIconPng.png');

type TabName = 'Home' | 'Journal' | 'Profile';

const ProfileScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const { colorId, setColorId } = useSoulPal();
  const soulPalPalette = getSoulPalPalette(isDarkMode);
  const { latestByType } = usePersonality();
  const pastResults: PersonalityTestResult[] = (
    Object.values(latestByType).filter(Boolean) as PersonalityTestResult[]
  ).sort((a, b) => b.completed_at.localeCompare(a.completed_at));
  const openResult = useCallback(
    (resultId: string) => {
      navigation.navigate('PersonalityResult', { resultId });
    },
    [navigation],
  );
  const [activeTab, setActiveTab] = useState<TabName>('Profile');

  // Tab bar animations
  const tabTranslateY = useSharedValue(0);
  const tabRiseValues = [useSharedValue(0), useSharedValue(0), useSharedValue(-20)];
  const tabLabelOpacities = [useSharedValue(0), useSharedValue(0), useSharedValue(1)];

  const TAB_POSITIONS: Record<TabName, number> = { Home: 0, Journal: 1, Profile: 2 };

  const handleTabPress = useCallback((tab: TabName) => {
    if (tab === 'Home') {
      navigation.navigate('Home');
      return;
    }
    if (tab === 'Journal') {
      navigation.navigate('Journal');
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

  const { dk, lt } = useMemo(() => buildStyles(colors), [colors]);

  /* ───────────────────────── DARK MODE (current liquid glass design) ───────────────────────── */
  if (isDarkMode) {
    return (
      <CosmicScreen tone="dusk">
        <ScrollView
          style={dk.scrollView}
          contentContainerStyle={[
            dk.scrollContent,
            { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Row: Back & Gear */}
          <View style={dk.topRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
              <Feather name="chevron-left" size={32} color="#FFFFFF" />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Settings')}>
              <Image source={ProfileGearIcon} style={dk.topIcon} resizeMode="contain" />
            </Pressable>
          </View>

          {/* Avatar */}
          <View style={dk.avatarContainer}>
            <View style={dk.avatarCircle}>
              <Image source={ProfileAvatarDark} style={dk.avatarImage} resizeMode="cover" />
            </View>
          </View>

          {/* Display Name */}
          <Text style={dk.displayNameText}>
            {user?.display_first_name || user?.first_name || 'User'}
          </Text>

          {/* @username */}
          <Text style={dk.usernameText}>
            {user?.username ? `@${user.username}` : '@username'}
          </Text>

          {/* Edit Profile Button */}
          <View style={dk.editProfileContainer}>
            <Pressable
              style={dk.editProfileButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={dk.editProfileText}>Edit Profile</Text>
            </Pressable>
          </View>

          {/* Badges Card */}
          <GlassCard style={dk.badgesCard}>
            <View style={dk.badgesHeader}>
              <Text style={dk.sectionTitle}>Badges</Text>
              <Pressable>
                <Image source={ThreeDots} style={dk.threeDots} resizeMode="contain" />
              </Pressable>
            </View>
            <View style={dk.badgesRow}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={dk.badgeCircle} />
              ))}
            </View>
            <View style={dk.comingSoonOverlay}>
              <Image source={LockIconDark} style={dk.comingSoonLock} resizeMode="contain" />
              <Text style={dk.comingSoonLabel}>Coming Soon</Text>
            </View>
          </GlassCard>

          {/* Two Column Layout — Personality (past results) + Achievement */}
          <View style={dk.twoColumns}>
            <GlassCard style={dk.personalityCard}>
              <View style={dk.personalityHeader}>
                <Text style={dk.personalityTitle}>Personality</Text>
              </View>
              <View style={dk.personalityBody}>
                {pastResults.length === 0 ? (
                  <Text style={dk.personalityEmptyText}>No tests taken yet</Text>
                ) : (
                  pastResults.map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => openResult(r.id)}
                      style={dk.personalityResultRow}
                    >
                      <Text style={dk.personalityResultLabel} numberOfLines={1}>
                        {TEST_TYPE_LABEL[r.test_type] || r.test_type}
                      </Text>
                      <Text style={dk.personalityResultProfile} numberOfLines={1}>
                        {r.dominant_type}
                      </Text>
                      <Text style={dk.personalityResultDate}>
                        {formatTakenAt(r.completed_at)}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            </GlassCard>

            <GlassCard style={dk.achievementCard}>
              <View style={dk.achievementHeader}>
                <Text style={dk.achievementHeaderText}>Achievement</Text>
              </View>
              <View style={dk.achievementGrid}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={dk.achievementItem} />
                ))}
              </View>
              <View style={dk.comingSoonOverlay}>
                <Image source={LockIconDark} style={dk.comingSoonLock} resizeMode="contain" />
                <Text style={dk.comingSoonLabel}>Coming Soon</Text>
              </View>
            </GlassCard>
          </View>

          {/* Soul Pal Customization Card */}
          <GlassCard style={dk.soulPalCard}>
            <View style={dk.soulPalCardInner}>
              <View style={dk.soulPalCharArea}>
                <SoulPalAnimated pose="profile" size={65} animate={true} />
              </View>
              <View style={dk.soulPalRight}>
                <Text style={dk.soulPalLabel}>Soul Pal</Text>
                <View style={dk.colorPickerGrid}>
                  {soulPalPalette.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => setColorId(c.id)}
                      style={[
                        dk.colorCircle,
                        { backgroundColor: c.hex },
                        colorId === c.id && dk.colorCircleActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>
          </GlassCard>
        </ScrollView>

        {/* Bottom Tab Bar */}
        <Animated.View
          style={[
            dk.tabBar,
            { paddingBottom: insets.bottom > 0 ? insets.bottom - 6 : 8 },
            tabBarAnimStyle,
          ]}
        >
          <View style={dk.tabBarInner}>
            {/* Home Tab */}
            <Animated.View style={[dk.tabItem, tabAnimStyles[0]]}>
              <Pressable onPress={() => handleTabPress('Home')} style={dk.tabPressable}>
                <View style={activeTab === 'Home' ? dk.activeTabBg : null}>
                  <Image
                    source={HomeIconImg}
                    style={activeTab === 'Home' ? dk.tabIcon : dk.tabIconInactive}
                    resizeMode="contain"
                  />
                </View>
                <Animated.Text style={[dk.activeTabLabel, labelAnimStyles[0]]}>Home</Animated.Text>
              </Pressable>
            </Animated.View>

            {/* Journal Tab */}
            <Animated.View style={[dk.tabItem, tabAnimStyles[1]]}>
              <Pressable onPress={() => handleTabPress('Journal')} style={dk.tabPressable}>
                <View style={activeTab === 'Journal' ? dk.activeTabBg : null}>
                  <Image
                    source={JournalIconImg}
                    style={activeTab === 'Journal' ? dk.tabIcon : dk.tabIconInactive}
                    resizeMode="contain"
                  />
                </View>
                <Animated.Text style={[dk.activeTabLabel, labelAnimStyles[1]]}>Journal</Animated.Text>
              </Pressable>
            </Animated.View>

            {/* Profile Tab */}
            <Animated.View style={[dk.tabItem, tabAnimStyles[2]]}>
              <Pressable onPress={() => handleTabPress('Profile')} style={dk.tabPressable}>
                <View style={activeTab === 'Profile' ? dk.activeTabBg : null}>
                  <Image
                    source={ProfileIconImg}
                    style={activeTab === 'Profile' ? dk.tabIcon : dk.tabIconInactive}
                    resizeMode="contain"
                  />
                </View>
                <Animated.Text style={[dk.activeTabLabel, labelAnimStyles[2]]}>Profile</Animated.Text>
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      </CosmicScreen>
    );
  }

  /* ───────────────────────── LIGHT MODE (original design) ───────────────────────── */
  return (
    <CosmicScreen tone="dusk">
      <ScrollView
        style={lt.scrollView}
        contentContainerStyle={[
          lt.scrollContent,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Row: Back & Gear */}
        <View style={lt.topRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Feather name="chevron-left" size={32} color="#3A0E66" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Settings')}>
            <Image source={ProfileGearIcon} style={lt.topIcon} resizeMode="contain" />
          </Pressable>
        </View>

        {/* Avatar */}
        <View style={lt.avatarContainer}>
          <View style={lt.avatarCircle}>
            <Image source={ProfileAvatar} style={lt.avatarImage} resizeMode="cover" />
          </View>
        </View>

        {/* Display Name */}
        <Text style={lt.displayNameText}>
          {user?.display_first_name || user?.first_name || 'User'}
        </Text>

        {/* @username */}
        <Text style={lt.usernameText}>
          {user?.username ? `@${user.username}` : '@username'}
        </Text>

        {/* Edit Profile Button */}
        <View style={lt.editProfileContainer}>
          <Pressable
            style={lt.editProfileButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={lt.editProfileText}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* Badges Card */}
        <View style={lt.badgesCard}>
          <View style={lt.badgesHeader}>
            <Text style={lt.sectionTitle}>Badges</Text>
            <Pressable>
              <Image source={ThreeDots} style={lt.threeDots} resizeMode="contain" />
            </Pressable>
          </View>
          <View style={lt.badgesRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={lt.badgeCircle} />
            ))}
          </View>
          <View style={lt.comingSoonOverlay}>
            <Image source={LockIcon} style={lt.comingSoonLock} resizeMode="contain" />
            <Text style={lt.comingSoonLabel}>Coming Soon</Text>
          </View>
        </View>

        {/* Two Column Layout — Personality (past results) + Achievement */}
        <View style={lt.twoColumns}>
          <View style={lt.personalityCard}>
            <View style={lt.personalityHeader}>
              <Text style={lt.personalityTitle}>Personality</Text>
            </View>
            <View style={lt.personalityBody}>
              {pastResults.length === 0 ? (
                <Text style={lt.personalityEmptyText}>No tests taken yet</Text>
              ) : (
                pastResults.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => openResult(r.id)}
                    style={lt.personalityResultRow}
                  >
                    <Text style={lt.personalityResultLabel} numberOfLines={1}>
                      {TEST_TYPE_LABEL[r.test_type] || r.test_type}
                    </Text>
                    <Text style={lt.personalityResultProfile} numberOfLines={1}>
                      {r.dominant_type}
                    </Text>
                    <Text style={lt.personalityResultDate}>
                      {formatTakenAt(r.completed_at)}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          </View>

          <View style={lt.achievementCard}>
            <View style={lt.achievementHeader}>
              <Text style={lt.achievementHeaderText}>Achievement</Text>
            </View>
            <View style={lt.achievementGrid}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={lt.achievementItem} />
              ))}
            </View>
            <View style={lt.comingSoonOverlay}>
              <Image source={LockIcon} style={lt.comingSoonLock} resizeMode="contain" />
              <Text style={lt.comingSoonLabel}>Coming Soon</Text>
            </View>
          </View>
        </View>

        {/* Soul Pal Customization Card */}
        <View style={lt.soulPalCard}>
          <View style={lt.soulPalCardInner}>
            <View style={lt.soulPalCharArea}>
              <SoulPalAnimated pose="profile" size={65} animate={true} />
            </View>
            <View style={lt.soulPalRight}>
              <Text style={lt.soulPalLabel}>Soul Pal</Text>
              <View style={lt.colorPickerGrid}>
                {soulPalPalette.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setColorId(c.id)}
                    style={[
                      lt.colorCircle,
                      { backgroundColor: c.hex },
                      colorId === c.id && lt.colorCircleActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <Animated.View
        style={[
          lt.tabBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom - 6 : 8 },
          tabBarAnimStyle,
        ]}
      >
        <View style={lt.tabBarInner}>
          {/* Home Tab */}
          <Animated.View style={[lt.tabItem, tabAnimStyles[0]]}>
            <Pressable onPress={() => handleTabPress('Home')} style={lt.tabPressable}>
              <View style={activeTab === 'Home' ? lt.activeTabBg : null}>
                <Image
                  source={HomeIconImg}
                  style={activeTab === 'Home' ? lt.tabIcon : lt.tabIconInactive}
                  resizeMode="contain"
                />
              </View>
              <Animated.Text style={[lt.activeTabLabel, labelAnimStyles[0]]}>Home</Animated.Text>
            </Pressable>
          </Animated.View>

          {/* Journal Tab */}
          <Animated.View style={[lt.tabItem, tabAnimStyles[1]]}>
            <Pressable onPress={() => handleTabPress('Journal')} style={lt.tabPressable}>
              <View style={activeTab === 'Journal' ? lt.activeTabBg : null}>
                <Image
                  source={JournalIconImg}
                  style={activeTab === 'Journal' ? lt.tabIcon : lt.tabIconInactive}
                  resizeMode="contain"
                />
              </View>
              <Animated.Text style={[lt.activeTabLabel, labelAnimStyles[1]]}>Journal</Animated.Text>
            </Pressable>
          </Animated.View>

          {/* Profile Tab */}
          <Animated.View style={[lt.tabItem, tabAnimStyles[2]]}>
            <Pressable onPress={() => handleTabPress('Profile')} style={lt.tabPressable}>
              <View style={activeTab === 'Profile' ? lt.activeTabBg : null}>
                <Image
                  source={ProfileIconImg}
                  style={activeTab === 'Profile' ? lt.tabIcon : lt.tabIconInactive}
                  resizeMode="contain"
                />
              </View>
              <Animated.Text style={[lt.activeTabLabel, labelAnimStyles[2]]}>Profile</Animated.Text>
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
    </CosmicScreen>
  );
};

/* ═══════════════════════════════════════════════════════════════
   STYLES — built per-render from useThemeColors()
   ═══════════════════════════════════════════════════════════════ */
function buildStyles(colors: ReturnType<typeof useThemeColors>) {
  // Dark mode — liquid glass design
  const dk = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 27,
  },

  // Top Row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  topIcon: {
    width: 42,
    height: 42,
  },

  // Avatar
  avatarContainer: {
    alignItems: 'center',
    marginTop: -34,
    marginBottom: 2,
  },
  // so-k3d: synced with light mode — same size, same solid teal bg.
  // Border softened to 18% white so it doesn't read as a hard ring on cosmic.
  avatarCircle: {
    width: 109,
    height: 109,
    borderRadius: 55,
    backgroundColor: '#70CACF',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 109,
    height: 109,
  },

  // Display Name
  displayNameText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 24,
    lineHeight: 24 * 1.4,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 2,
  },

  // Username
  usernameText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    // matches dark text.light (inkFaint convention) — slated for hoist in so-K
    color: colors.text.light,
    textAlign: 'center',
    marginBottom: 10,
  },

  // Edit Profile — glass style
  editProfileContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  editProfileButton: {
    backgroundColor: 'rgba(112, 202, 207, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(112, 202, 207, 0.25)',
  },
  editProfileText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    // 0.85 → colors.text.primary (#fff) — slight visual lift but tokenized
    color: colors.text.primary,
  },

  // Badges — GlassCard wrapper
  badgesCard: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 18,
    marginBottom: 16,
  },
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.edensor.bold,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    // 0.9 → colors.text.primary (#fff) — slight lift
    color: colors.text.primary,
  },
  threeDots: {
    width: 14,
    height: 4,
    opacity: 0.5,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  badgeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(112, 202, 207, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(112, 202, 207, 0.15)',
  },

  // Two Column Layout
  twoColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  // Personality Test Card
  personalityCard: {
    flex: 1,
    height: 156,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 10,
  },
  personalityHeader: {
    backgroundColor: 'rgba(112, 202, 207, 0.08)',
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  personalityTitle: {
    fontFamily: fonts.edensor.bold,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: colors.white,
  },
  personalityLoremText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    // 0.6 → colors.text.secondary (dark = rgba 0.7) — slight lift, tokenized
    color: colors.text.secondary,
    paddingHorizontal: 11,
    flex: 1,
    marginTop: 10,
  },
  personalityFooter: {
    backgroundColor: 'rgba(112, 202, 207, 0.08)',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 4,
    alignItems: 'center',
  },
  personalityProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressDot: {
    width: 5,
    height: 10,
    borderRadius: 1.5,
  },
  takeTestText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    // matches dark text.secondary exactly
    color: colors.text.secondary,
    marginTop: 2,
  },
  personalityBody: {
    flex: 1,
    paddingHorizontal: 11,
    paddingTop: 10,
    paddingBottom: 10,
  },
  personalityEmptyText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    // matches dark text.light (inkFaint) exactly
    color: colors.text.light,
  },
  personalityResultRow: {
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  personalityResultLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: colors.white,
  },
  personalityResultProfile: {
    fontFamily: fonts.edensor.bold,
    fontSize: 13,
    // lavender accent (so-9tg). 0.9 alpha kept inline since the token is
    // the full-opacity hex; per-instance alpha lives at the call site.
    color: colors.accent.lavenderSoft,
    marginTop: 2,
  },
  personalityResultDate: {
    // outfit.light + 10pt was P1 illegible per audit so-c2f. Bumped to
    // regular + 12pt (typography.caption convention).
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: colors.text.light,
    marginTop: 2,
  },

  // Achievement Card
  achievementCard: {
    flex: 1,
    height: 156,
    borderRadius: 10,
    overflow: 'hidden',
  },
  achievementHeader: {
    backgroundColor: 'rgba(112, 202, 207, 0.08)',
    height: 29,
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  achievementHeaderText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: colors.white,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 8,
    rowGap: 7,
  },
  achievementItem: {
    width: 29,
    height: 25,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: 'rgba(112, 202, 207, 0.1)',
  },

  // Soul Pal Customization Card
  soulPalCard: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  soulPalCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soulPalCharArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  soulPalRight: {
    flex: 1,
  },
  soulPalLabel: {
    fontFamily: fonts.edensor.bold,
    fontSize: 16,
    lineHeight: 16 * 1.4,
    color: colors.white,
    marginBottom: 10,
  },
  colorPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleActive: {
    borderColor: '#FFFFFF',
    borderWidth: 2.5,
  },

  // Coming Soon Overlay
  comingSoonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  comingSoonLock: {
    width: 18,
    height: 18,
    opacity: 0.8,
  },
  comingSoonLabel: {
    fontFamily: fonts.outfit.medium,
    // 11 → 12 per typography.caption floor (so-cn9)
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Bottom Tab Bar — frosted glass
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBarInner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 200,
    width: 269,
    height: 62,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    paddingTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    backgroundColor: 'rgba(112, 202, 207, 0.25)',
    borderRadius: 24,
    width: 52,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(112, 202, 207, 0.35)',
    shadowColor: '#4DE8D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  tabIcon: {
    width: 28,
    height: 26,
    tintColor: '#FFFFFF',
  },
  tabIconInactive: {
    width: 33,
    height: 30,
    opacity: 0.4,
    tintColor: '#FFFFFF',
  },
  activeTabLabel: {
    fontFamily: fonts.edensor.bold,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: colors.white,
    marginTop: 2,
  },
  });

  // Light mode — original design
  const lt = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 27,
  },

  // Top Row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  topIcon: {
    width: 42,
    height: 42,
  },

  // Avatar
  avatarContainer: {
    alignItems: 'center',
    marginTop: -34,
    marginBottom: 2,
  },
  avatarCircle: {
    width: 109,
    height: 109,
    borderRadius: 55,
    backgroundColor: '#70CACF',
    borderWidth: 2,
    borderColor: colors.white,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 109,
    height: 109,
  },

  // Display Name
  // Light path: page-bg ink for AA on the so-u1k lavender wash.
  displayNameText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 24,
    lineHeight: 24 * 1.4,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 2,
  },

  // Username
  usernameText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: 'rgba(58, 14, 102, 0.7)',
    textAlign: 'center',
    marginBottom: 10,
  },

  // Edit Profile — white bg, purple text, no border
  editProfileContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  editProfileButton: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 3,
  },
  editProfileText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    // #59168B → colors.primary (#4F1786) — minor pixel shift, brand-canonical
    color: colors.primary,
  },

  // Badges — plain white card
  badgesCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 18,
    marginBottom: 20,
  },
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.edensor.bold,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: colors.primary,
  },
  threeDots: {
    width: 14,
    height: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  badgeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(89, 22, 139, 0.1)',
  },

  // Two Column Layout
  twoColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  // Personality Test Card — plain white card
  personalityCard: {
    flex: 1,
    height: 156,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: colors.white,
  },
  personalityHeader: {
    backgroundColor: 'rgba(89, 22, 139, 0.08)',
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  personalityTitle: {
    fontFamily: fonts.edensor.bold,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: colors.primary,
  },
  personalityLoremText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    color: colors.primary,
    paddingHorizontal: 11,
    flex: 1,
    marginTop: 10,
  },
  personalityFooter: {
    backgroundColor: 'rgba(89, 22, 139, 0.08)',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 4,
    alignItems: 'center',
  },
  personalityProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressDot: {
    width: 5,
    height: 10,
    borderRadius: 1.5,
  },
  takeTestText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.primary,
    marginTop: 2,
  },
  personalityBody: {
    flex: 1,
    paddingHorizontal: 11,
    paddingTop: 10,
    paddingBottom: 10,
  },
  personalityEmptyText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    // rgba(89,22,139,0.6) drifted from canonical primary; aligned to colors.primary
    color: 'rgba(79, 23, 134, 0.6)',
  },
  personalityResultRow: {
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(89, 22, 139, 0.12)',
  },
  personalityResultLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: colors.primary,
  },
  personalityResultProfile: {
    fontFamily: fonts.edensor.bold,
    fontSize: 13,
    color: colors.primary,
    marginTop: 2,
  },
  personalityResultDate: {
    // outfit.light + 10pt was P1 illegible. Bumped to regular + 12pt
    // (typography.caption convention).
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    // rgba(89,22,139,0.55) → primary RGB at same alpha
    color: 'rgba(79, 23, 134, 0.55)',
    marginTop: 2,
  },

  // Achievement Card — plain white card
  achievementCard: {
    flex: 1,
    height: 156,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  achievementHeader: {
    backgroundColor: 'rgba(89, 22, 139, 0.08)',
    height: 29,
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  achievementHeaderText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: colors.primary,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 8,
    rowGap: 7,
  },
  achievementItem: {
    width: 29,
    height: 25,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: 'rgba(89, 22, 139, 0.08)',
  },

  // Soul Pal Customization Card — plain white card
  soulPalCard: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.white,
  },
  soulPalCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soulPalCharArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  soulPalRight: {
    flex: 1,
  },
  soulPalLabel: {
    fontFamily: fonts.edensor.bold,
    fontSize: 16,
    lineHeight: 16 * 1.4,
    color: colors.primary,
    marginBottom: 10,
  },
  colorPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleActive: {
    borderColor: '#59168B',
    borderWidth: 2.5,
  },

  // Coming Soon Overlays
  comingSoonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  comingSoonOverlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(89, 22, 139, 0.7)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  comingSoonLock: {
    width: 20,
    height: 20,
    tintColor: '#59168B',
  },
  comingSoonLockSmall: {
    width: 20,
    height: 20,
    tintColor: colors.white,
  },
  comingSoonLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: colors.primary,
  },
  comingSoonLabelLight: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: colors.white,
  },

  // Bottom Tab Bar — white background
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
    opacity: 0.6,
    tintColor: '#59168B',
  },
  activeTabLabel: {
    fontFamily: fonts.edensor.bold,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: colors.primary,
    marginTop: 2,
  },
  });

  return { dk, lt };
}

export default ProfileScreen;
