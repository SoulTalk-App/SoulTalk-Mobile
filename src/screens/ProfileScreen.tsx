import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../theme';

const ProfileBackIcon = require('../../assets/images/profile/ProfileBackIcon.png');
const ProfileGearIcon = require('../../assets/images/profile/ProfileGearIcon.png');
const ProfileAvatar = require('../../assets/images/profile/ProfileAvatar-f054e3.png');
const ProfileSoulPalChar = require('../../assets/images/profile/ProfileSoulPalChar.png');
const ThreeDots = require('../../assets/images/profile/ThreeDots.png');
const HomeIconImg = require('../../assets/images/home/HomeIcon.png');
const JournalIconImg = require('../../assets/images/home/JournalIconPng.png');
const ProfileIconImg = require('../../assets/images/home/ProfileIconPng.png');

type TabName = 'Home' | 'Journal' | 'Profile';

const SETTINGS_KEY = '@soultalk_settings';

const ProfileScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabName>('Profile');
  const [username, setUsername] = useState('');

  // Tab bar animations
  const tabTranslateY = useSharedValue(0);
  const tabRiseValues = [useSharedValue(0), useSharedValue(0), useSharedValue(-20)];
  const tabLabelOpacities = [useSharedValue(0), useSharedValue(0), useSharedValue(1)];

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.username) setUsername(data.username);
        }
      } catch {}
    };
    loadProfile();
  }, []);

  const TAB_POSITIONS: Record<TabName, number> = { Home: 0, Journal: 1, Profile: 2 };

  const handleTabPress = useCallback((tab: TabName) => {
    tabTranslateY.value = withSpring(-8, { damping: 12, stiffness: 300 }, () => {
      tabTranslateY.value = withSpring(0, { damping: 10, stiffness: 200 });
    });

    if (tab === 'Home') {
      navigation.navigate('Home');
      return;
    }
    if (tab === 'Journal') {
      Alert.alert('Coming Soon', 'Journal is under development.');
      return;
    }

    const newIndex = TAB_POSITIONS[tab];
    const oldIndex = TAB_POSITIONS[activeTab];

    tabRiseValues[oldIndex].value = withSpring(0, { damping: 12, stiffness: 200 });
    tabRiseValues[newIndex].value = withSpring(-20, { damping: 12, stiffness: 200 });
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

  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#F5F2F9']}
      locations={[0.1, 0.6, 1]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Row: Back & Gear */}
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()}>
            <Image source={ProfileBackIcon} style={styles.topIcon} resizeMode="contain" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Settings')}>
            <Image source={ProfileGearIcon} style={styles.topIcon} resizeMode="contain" />
          </Pressable>
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Image source={ProfileAvatar} style={styles.avatarImage} resizeMode="cover" />
          </View>
        </View>

        {/* @username */}
        <Text style={styles.usernameText}>
          {username ? `@${username}` : '@username'}
        </Text>

        {/* Edit Profile Button */}
        <View style={styles.editProfileContainer}>
          <Pressable
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* Badges Card */}
        <View style={styles.badgesCard}>
          <View style={styles.badgesHeader}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <Pressable>
              <Image source={ThreeDots} style={styles.threeDots} resizeMode="contain" />
            </Pressable>
          </View>
          <View style={styles.badgesRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.badgeCircle} />
            ))}
          </View>
        </View>

        {/* Two Column Layout */}
        <View style={styles.twoColumns}>
          {/* Left Column */}
          <View style={styles.leftColumn}>
            {/* Personality Test Card */}
            <View style={styles.personalityCard}>
              <Text style={styles.cardTitle}>Personality Test</Text>
              <View style={styles.personalityContent}>
                <Text style={styles.loremText}>
                  Lorem Ipsum Dolor Res{'\n'}Lorem...
                </Text>
              </View>
              <View style={styles.personalityProgress}>
                {Array.from({ length: 15 }).map((_, i) => (
                  <View key={i} style={styles.progressDot} />
                ))}
              </View>
              <Pressable style={styles.takeTestButton}>
                <Text style={styles.takeTestText}>Take the test</Text>
              </Pressable>
            </View>

            {/* SoulPal Character + Dots */}
            <View style={styles.soulPalCharRow}>
              <Image source={ProfileSoulPalChar} style={styles.soulPalChar} resizeMode="contain" />
              <View style={styles.dotsColumn}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.progressCircle} />
                ))}
              </View>
            </View>

            {/* Soul Pal Label Card */}
            <View style={styles.soulPalLabelCard}>
              <Text style={styles.soulPalLabelText}>Soul Pal</Text>
              <Image source={ThreeDots} style={styles.threeDots} resizeMode="contain" />
            </View>
          </View>

          {/* Right Column */}
          <View style={styles.rightColumn}>
            {/* Soul Sight Card */}
            <View style={styles.soulSightCard}>
              <Text style={styles.cardTitle}>Soul Sight</Text>
              <Text style={styles.soulSightDesc}>
                Lorem Ipsum Dolor Res{'\n'}Lorem...
              </Text>
              <View style={styles.soulSightBar} />
              <View style={styles.soulSightBlock} />
            </View>

            {/* Achievement Card */}
            <View style={styles.achievementCard}>
              <Text style={styles.achievementTitle}>Achievement</Text>
              <View style={styles.achievementGrid}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={styles.achievementItem} />
                ))}
              </View>
            </View>
          </View>
        </View>
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
    marginTop: -10,
    marginBottom: 4,
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

  // Username
  usernameText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 24,
    lineHeight: 24 * 1.4,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 4,
  },

  // Edit Profile
  editProfileContainer: {
    alignItems: 'center',
    marginBottom: 10,
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
    color: '#59168B',
  },

  // Badges
  badgesCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 12,
    marginBottom: 16,
    height: 78,
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
    color: '#59168B',
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
    backgroundColor: '#59168B',
  },

  // Two Column Layout
  twoColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftColumn: {
    width: 149,
  },
  rightColumn: {
    width: 148,
  },

  // Personality Test Card
  personalityCard: {
    width: 149,
    height: 156,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.white,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: fonts.edensor.bold,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: '#59168B',
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  personalityContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    marginHorizontal: 8,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  loremText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    color: colors.white,
  },
  personalityProgress: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginTop: 4,
    gap: 2,
  },
  progressDot: {
    width: 5,
    height: 10,
    borderRadius: 1.5,
    backgroundColor: '#A47DCB',
  },
  takeTestButton: {
    backgroundColor: colors.white,
    borderRadius: 20,
    marginTop: 4,
    paddingVertical: 2,
    alignItems: 'center',
  },
  takeTestText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: '#59168B',
  },

  // Soul Sight Card
  soulSightCard: {
    width: 148,
    height: 238,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 8,
    marginBottom: 22,
  },
  soulSightDesc: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    color: '#633093',
    marginTop: 4,
  },
  soulSightBar: {
    height: 23,
    backgroundColor: '#59168B',
    marginTop: 8,
  },
  soulSightBlock: {
    flex: 1,
    minHeight: 100,
    backgroundColor: '#59168B',
    marginTop: 4,
  },

  // SoulPal Character + Dots
  soulPalCharRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  soulPalChar: {
    width: 86,
    height: 143,
  },
  dotsColumn: {
    marginLeft: 2,
    gap: 4,
  },
  progressCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
  },

  // Soul Pal Label Card
  soulPalLabelCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    width: 148,
  },
  soulPalLabelText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: '#59168B',
  },

  // Achievement Card
  achievementCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 8,
    width: 148,
  },
  achievementTitle: {
    fontFamily: fonts.edensor.bold,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: colors.white,
    backgroundColor: '#622C92',
    borderRadius: 10,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  achievementItem: {
    width: 29,
    height: 25,
    borderRadius: 10,
    backgroundColor: '#622C92',
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
    width: 48,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIcon: {
    width: 24,
    height: 22,
    tintColor: '#FFFFFF',
  },
  tabIconInactive: {
    width: 28,
    height: 25,
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

export default ProfileScreen;
