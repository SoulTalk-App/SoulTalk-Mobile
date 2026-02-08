import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../theme';

const SoulpalHome = require('../../assets/images/home/SoulpalHome.png');
const HomeIconImg = require('../../assets/images/home/HomeIcon.png');
const JournalIconImg = require('../../assets/images/home/JournalIconPng.png');
const ProfileIconImg = require('../../assets/images/home/ProfileIconPng.png');
const GearIconImg = require('../../assets/images/home/GearIcon.png');
const GoalGardenCharacterImg = require('../../assets/images/home/GoalGardenCharacter.png');
const GoalGardenBg = require('../../assets/images/home/GoalGardenBg.png');
const PalmTree1 = require('../../assets/images/home/PalmTree1.png');
const PalmTree2 = require('../../assets/images/home/PalmTree2.png');
const PalmTree3 = require('../../assets/images/home/PalmTree3.png');
const SoulpalEyes = require('../../assets/images/home/SoulpalIcon-f02c98.png');
const LockIcon = require('../../assets/images/home/LockIcon.png');
const AffirmationMirrorChars = require('../../assets/images/home/AffirmationMirrorChars.png');
const ProgressBarImg = require('../../assets/images/home/ProgressBarPng.png');
const SendIconImg = require('../../assets/images/home/SendIconPng.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TabName = 'Home' | 'Journal' | 'Profile';

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('User');
  const [activeTab, setActiveTab] = useState<TabName>('Home');

  // Tab bar animation
  const tabTranslateY = useSharedValue(0);

  useEffect(() => {
    const loadUsername = async () => {
      const stored = await AsyncStorage.getItem('@soultalk_username');
      if (stored) setUsername(stored);
    };
    loadUsername();
  }, []);

  const handleTabPress = useCallback((tab: TabName) => {
    // Bounce up animation
    tabTranslateY.value = withSpring(-8, { damping: 12, stiffness: 300 }, () => {
      tabTranslateY.value = withSpring(0, { damping: 10, stiffness: 200 });
    });
    setActiveTab(tab);
  }, []);

  const tabBarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabTranslateY.value }],
  }));

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
        {/* Welcome Header Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.headerRow}>
            <Image
              source={SoulpalHome}
              style={styles.soulpalAvatar}
              resizeMode="contain"
            />
            <View style={styles.headerTextSection}>
              <Text style={styles.welcomeText}>
                Welcome Back, {username}!
              </Text>
              <Image
                source={ProgressBarImg}
                style={styles.progressBar}
                resizeMode="contain"
              />
              <Text style={styles.dayText}>How's your day today?</Text>
            </View>
            <Pressable style={styles.gearButton}>
              <Image
                source={GearIconImg}
                style={styles.gearIcon}
                resizeMode="contain"
              />
            </Pressable>
          </View>

          {/* I'm Feeling Bar */}
          <View style={styles.feelingBar}>
            <Image
              source={SoulpalEyes}
              style={styles.soulpalEyes}
              resizeMode="contain"
            />
            <Text style={styles.feelingText}>I'm Feeling........</Text>
            <Pressable style={styles.sendButton}>
              <Image
                source={SendIconImg}
                style={styles.sendIcon}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        </View>

        {/* Soul Sight Card */}
        <View style={styles.soulSightCard}>
          <View style={styles.soulSightTextSection}>
            <Text style={styles.soulSightTitle}>Soul Sight</Text>
            <Text style={styles.goalsText}>0/10 Goals Completed</Text>
          </View>
          <View style={styles.soulSightProgress} />
        </View>

        {/* Charge Up Section */}
        <Text style={styles.chargeUpTitle}>Charge Up</Text>

        {/* Goal Garden Card */}
        <View style={styles.goalGardenCard}>
          <LinearGradient
            colors={['#59168B', '#3A0D5E']}
            style={styles.goalGardenGradient}
          >
            {/* Sunset background */}
            <Image
              source={GoalGardenBg}
              style={styles.goalGardenBgImage}
              resizeMode="cover"
            />
            {/* Palm tree silhouettes */}
            <Image
              source={PalmTree3}
              style={styles.palmTree3}
              resizeMode="contain"
            />
            <Image
              source={PalmTree2}
              style={styles.palmTree2}
              resizeMode="contain"
            />
            <Image
              source={PalmTree1}
              style={styles.palmTree1}
              resizeMode="contain"
            />
            {/* SoulPal character */}
            <View style={styles.goalGardenCharacter}>
              <Image
                source={GoalGardenCharacterImg}
                style={styles.goalGardenCharImg}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>
          {/* White overlay bar at bottom */}
          <View style={styles.goalGardenOverlay}>
            <Text style={styles.goalGardenTitle}>Goal Garden</Text>
            <Text style={styles.goalGardenSubtitle}>
              0/10 Goals Completed
            </Text>
          </View>
        </View>

        {/* Two Cards Row - Smaller */}
        <View style={styles.cardsRow}>
          {/* Coming Soon Card */}
          <View style={styles.smallCardWrapper}>
            <View style={styles.smallCard}>
              <Image
                source={LockIcon}
                style={styles.lockIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.cardLabel}>
              <Text style={styles.cardLabelText}>Coming Soon</Text>
            </View>
          </View>

          {/* Affirmation Mirror Card */}
          <View style={styles.smallCardWrapper}>
            <View style={[styles.smallCard, styles.affirmationCard]}>
              <Image
                source={AffirmationMirrorChars}
                style={styles.affirmationImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.cardLabel}>
              <Text style={styles.cardLabelText}>Affirmation Mirror</Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 120 + (insets.bottom || 16) }} />
      </ScrollView>

      {/* Bottom Tab Bar */}
      <Animated.View
        style={[
          styles.tabBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
          tabBarAnimStyle,
        ]}
      >
        <View style={styles.tabBarInner}>
          {/* Home Tab */}
          <AnimatedPressable
            style={styles.tabItem}
            onPress={() => handleTabPress('Home')}
          >
            {activeTab === 'Home' ? (
              <>
                <View style={styles.activeTabBg}>
                  <Image source={HomeIconImg} style={styles.tabIcon} resizeMode="contain" />
                </View>
                <Text style={styles.activeTabLabel}>Home</Text>
              </>
            ) : (
              <Image source={HomeIconImg} style={styles.tabIconInactive} resizeMode="contain" />
            )}
          </AnimatedPressable>

          {/* Journal Tab */}
          <AnimatedPressable
            style={styles.tabItem}
            onPress={() => handleTabPress('Journal')}
          >
            {activeTab === 'Journal' ? (
              <>
                <View style={styles.activeTabBg}>
                  <Image source={JournalIconImg} style={styles.tabIcon} resizeMode="contain" />
                </View>
                <Text style={styles.activeTabLabel}>Journal</Text>
              </>
            ) : (
              <Image source={JournalIconImg} style={styles.tabIconInactive} resizeMode="contain" />
            )}
          </AnimatedPressable>

          {/* Profile Tab */}
          <AnimatedPressable
            style={styles.tabItem}
            onPress={() => handleTabPress('Profile')}
          >
            {activeTab === 'Profile' ? (
              <>
                <View style={styles.activeTabBg}>
                  <Image source={ProfileIconImg} style={styles.tabIcon} resizeMode="contain" />
                </View>
                <Text style={styles.activeTabLabel}>Profile</Text>
              </>
            ) : (
              <Image source={ProfileIconImg} style={styles.tabIconInactive} resizeMode="contain" />
            )}
          </AnimatedPressable>
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

const CARD_HORIZONTAL_MARGIN = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_MARGIN * 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: CARD_HORIZONTAL_MARGIN,
  },

  // Welcome Header Card
  welcomeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 85, 158, 0.2)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  soulpalAvatar: {
    width: 48,
    height: 67,
  },
  headerTextSection: {
    flex: 1,
    marginLeft: 12,
    marginTop: 2,
  },
  welcomeText: {
    fontFamily: fonts.edensor.light,
    fontSize: 24,
    lineHeight: 24 * 1.4,
    color: colors.white,
    marginBottom: 6,
  },
  progressBar: {
    width: 178,
    height: 19,
  },
  dayText: {
    fontFamily: fonts.outfit.light,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    color: colors.white,
    marginTop: 6,
  },
  gearButton: {
    marginTop: 2,
  },
  gearIcon: {
    width: 44,
    height: 43,
  },

  // Feeling Bar
  feelingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    height: 36,
    marginTop: 16,
    paddingHorizontal: 10,
  },
  soulpalEyes: {
    width: 28,
    height: 20,
  },
  feelingText: {
    flex: 1,
    fontFamily: fonts.outfit.light,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    color: 'rgba(89, 22, 139, 0.5)',
    marginLeft: 8,
  },
  sendButton: {
    padding: 4,
  },
  sendIcon: {
    width: 18,
    height: 18,
  },

  // Soul Sight Card
  soulSightCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  soulSightTextSection: {
    flex: 1,
  },
  soulSightTitle: {
    fontFamily: fonts.edensor.medium,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: '#59168B',
  },
  goalsText: {
    fontFamily: fonts.outfit.light,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    color: '#59168B',
    marginTop: 4,
  },
  soulSightProgress: {
    width: 102,
    height: 43,
    backgroundColor: '#59168B',
    borderRadius: 4,
  },

  // Charge Up
  chargeUpTitle: {
    fontFamily: fonts.edensor.semiBold,
    fontSize: 24,
    lineHeight: 24 * 1.4,
    color: colors.white,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Goal Garden Card
  goalGardenCard: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 85, 158, 0.2)',
  },
  goalGardenGradient: {
    height: 174,
    borderRadius: 10,
  },
  goalGardenBgImage: {
    position: 'absolute',
    width: 310,
    height: 223,
    left: 21,
    top: -1,
  },
  // Palm trees positioned from Figma coordinates (relative to 331×222 group)
  palmTree1: {
    position: 'absolute',
    left: 200,
    top: 9,
    width: 99,
    height: 162,
    tintColor: '#231F20',
    opacity: 0.5,
  },
  palmTree2: {
    position: 'absolute',
    left: 145,
    top: 40,
    width: 86,
    height: 130,
    tintColor: '#231F20',
    opacity: 0.5,
  },
  palmTree3: {
    position: 'absolute',
    left: 91,
    top: 49,
    width: 78,
    height: 120,
    tintColor: '#231F20',
    opacity: 0.5,
  },
  goalGardenCharacter: {
    position: 'absolute',
    top: 54,
    left: 21,
  },
  goalGardenCharImg: {
    width: 34,
    height: 82,
  },
  goalGardenOverlay: {
    position: 'absolute',
    bottom: 9,
    left: 12,
    right: 12,
    backgroundColor: colors.white,
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  goalGardenTitle: {
    fontFamily: fonts.edensor.medium,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: '#59168B',
  },
  goalGardenSubtitle: {
    fontFamily: fonts.outfit.light,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    color: '#59168B',
    marginTop: 2,
  },

  // Small Cards Row — compact
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  smallCardWrapper: {
    width: (CARD_WIDTH - 16) / 2,
    alignItems: 'center',
  },
  smallCard: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  affirmationCard: {
    borderRadius: 20,
  },
  lockIcon: {
    width: '60%',
    height: '60%',
  },
  affirmationImage: {
    width: '85%',
    height: '85%',
  },
  cardLabel: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  cardLabelText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    color: '#59168B',
    textAlign: 'center',
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
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
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
  },
  tabIconInactive: {
    width: 28,
    height: 25,
    opacity: 0.5,
  },
  activeTabLabel: {
    fontFamily: fonts.edensor.regular,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: '#59168B',
    marginTop: 2,
  },
});

export default HomeScreen;
