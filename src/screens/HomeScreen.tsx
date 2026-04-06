import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fonts } from '../theme';
import { useJournal } from '../contexts/JournalContext';
import JournalService from '../services/JournalService';

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
const AffirmationMirrorCard = require('../../assets/images/home/AffirmationMirrorCard.png');

const SendIconImg = require('../../assets/images/home/SendIconPng.png');


type TabName = 'Home' | 'Journal' | 'Profile';

const TOTAL_BARS = 15;
const SOUL_BAR_SEGMENTS = 6;

const HomeScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [localName, setLocalName] = useState('User');
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  const [filledBars, setFilledBars] = useState(0);
  const [affirmationLoading, setAffirmationLoading] = useState(false);
  const { soulBar, fetchSoulBar } = useJournal();

  // Refresh soul bar and mood whenever Home screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchSoulBar();
      JournalService.getTodayMood()
        .then((data) => setFilledBars(data.filled_count))
        .catch(() => {});
    }, [fetchSoulBar])
  );

  // Tab bar animation
  const tabTranslateY = useSharedValue(0);

  // Tab rise and label animations: Home=0, Journal=1, Profile=2
  const TAB_POSITIONS: Record<TabName, number> = { Home: 0, Journal: 1, Profile: 2 };
  const tabRiseValues = [useSharedValue(-20), useSharedValue(0), useSharedValue(0)];
  const tabLabelOpacities = [useSharedValue(1), useSharedValue(0), useSharedValue(0)];

  // Eye blink animation
  const eyeOpacity = useSharedValue(1);
  const eyeTranslateX = useSharedValue(0);

  // Debounce timer for mood PUT
  const moodDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadLocalName = async () => {
      const stored = await AsyncStorage.getItem('@soultalk_username');
      if (stored) setLocalName(stored);
    };
    loadLocalName();
  }, []);

  // Blinking + looking animation loop
  useEffect(() => {
    eyeOpacity.value = withRepeat(
      withSequence(
        withDelay(2000, withTiming(0, { duration: 80 })),
        withTiming(1, { duration: 80 }),
        withDelay(3000, withTiming(0, { duration: 80 })),
        withTiming(1, { duration: 80 }),
      ),
      -1,
    );
    eyeTranslateX.value = withRepeat(
      withSequence(
        withDelay(1500, withTiming(3, { duration: 400, easing: Easing.inOut(Easing.ease) })),
        withDelay(1000, withTiming(-3, { duration: 400, easing: Easing.inOut(Easing.ease) })),
        withDelay(800, withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) })),
      ),
      -1,
    );
  }, []);

  const eyeAnimStyle = useAnimatedStyle(() => ({
    opacity: eyeOpacity.value,
    transform: [{ translateX: eyeTranslateX.value }],
  }));

  const persistMood = useCallback((newCount: number) => {
    if (moodDebounceRef.current) clearTimeout(moodDebounceRef.current);
    moodDebounceRef.current = setTimeout(async () => {
      try {
        await JournalService.upsertTodayMood(newCount);
        // Refresh SoulBar in case points were awarded
        fetchSoulBar();
      } catch (e) {
        console.warn('[Mood] Failed to persist mood:', e);
      }
    }, 300);
  }, [fetchSoulBar]);

  const handleBarPress = useCallback((index: number) => {
    const newCount = index + 1 === filledBars ? 0 : index + 1;
    setFilledBars(newCount);
    persistMood(newCount);
  }, [filledBars, persistMood]);

  const handleBarAreaPress = useCallback((event: any) => {
    const { locationX } = event.nativeEvent;
    const paddingLeft = 10;
    const segmentPitch = 6 + 5; // segment width + gap
    let index = Math.floor((locationX - paddingLeft) / segmentPitch);
    index = Math.max(0, Math.min(index, TOTAL_BARS - 1));
    handleBarPress(index);
  }, [handleBarPress]);

  const handleTabPress = useCallback((tab: TabName) => {
    if (tab === 'Profile') {
      navigation.navigate('Profile');
      return;
    }
    if (tab === 'Journal') {
      navigation.navigate('Journal');
      return;
    }

    const newIndex = TAB_POSITIONS[tab];
    const oldIndex = TAB_POSITIONS[activeTab];

    // Smooth rise/lower
    tabRiseValues[oldIndex].value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    tabRiseValues[newIndex].value = withTiming(-20, { duration: 300, easing: Easing.out(Easing.ease) });

    // Fade out old label, fade in new label
    tabLabelOpacities[oldIndex].value = withTiming(0, { duration: 150 });
    tabLabelOpacities[newIndex].value = withTiming(1, { duration: 250 });

    setActiveTab(tab);
  }, [activeTab, navigation]);

  const tabBarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabTranslateY.value }],
  }));

  // Per-tab animated styles
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
                Welcome Back, {user?.display_first_name || user?.first_name || localName}!
              </Text>
              <Text style={styles.dayText}>Ready to learn more about yourself?</Text>
            </View>
            <Pressable style={styles.gearButton} onPress={() => navigation.navigate('Settings')}>
              <Image
                source={GearIconImg}
                style={styles.gearIcon}
                resizeMode="contain"
              />
            </Pressable>
          </View>

          {/* I'm Feeling Bar */}
          <Pressable
            style={styles.feelingBar}
            onPress={() => navigation.navigate('CreateJournal')}
          >
            <View style={styles.soulpalEyesContainer}>
              <Animated.Image
                source={SoulpalEyes}
                style={[styles.soulpalEyes, eyeAnimStyle]}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.feelingText}>Guess what happened today....</Text>
            <View style={styles.sendButton}>
              <Image
                source={SendIconImg}
                style={styles.sendIcon}
                resizeMode="contain"
              />
            </View>
          </Pressable>

          {/* SoulBar Section */}
          <Pressable style={styles.soulBarCard} onPress={() => navigation.navigate('SoulSight')}>
            <View style={styles.soulBarHeader}>
              <Text style={styles.soulBarTitle}>SoulSight</Text>
              <Text style={styles.soulBarCount}>
                {soulBar?.points ?? 0}/{SOUL_BAR_SEGMENTS}
              </Text>
            </View>
            <View style={styles.soulBarSegments}>
              {Array.from({ length: SOUL_BAR_SEGMENTS }).map((_, i) => {
                const pts = soulBar?.points ?? 0;
                const isFull = pts >= i + 1;
                const isHalf = !isFull && pts > i;
                return (
                  <View
                    key={i}
                    style={[
                      styles.soulBarSegment,
                      {
                        backgroundColor: isFull
                          ? '#59168B'
                          : isHalf
                            ? 'rgba(89, 22, 139, 0.5)'
                            : 'rgba(89, 22, 139, 0.15)',
                      },
                    ]}
                  />
                );
              })}
            </View>
            {(soulBar?.total_filled ?? 0) > 0 && (
              <Text style={styles.soulBarFilled}>
                Filled {soulBar?.total_filled} time{(soulBar?.total_filled ?? 0) !== 1 ? 's' : ''}
              </Text>
            )}
          </Pressable>

        </View>

        {/* Goal Garden Card */}
        <View style={styles.goalGardenCard}>
          <Image source={LockIcon} style={styles.comingSoonLockLarge} resizeMode="contain" />
          <Text style={styles.comingSoonText}>Coming Soon</Text>
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
          <Pressable style={styles.smallCardWrapper} onPress={async () => {
            if (affirmationLoading) return;
            setAffirmationLoading(true);
            try {
              const data = await JournalService.getTodayAffirmation();
              if (data?.affirmation_text) {
                navigation.navigate('AffirmationMirror', {
                  affirmation_text: data.affirmation_text,
                  date_key: data.date_key,
                });
              }
            } catch {} finally {
              setAffirmationLoading(false);
            }
          }}>
            <View style={styles.smallCard}>
              {affirmationLoading ? (
                <ActivityIndicator size="large" color="#59168B" />
              ) : (
                <Image
                  source={AffirmationMirrorCard}
                  style={styles.affirmationCardImage}
                  resizeMode="cover"
                />
              )}
            </View>
            <View style={styles.cardLabel}>
              <Text style={styles.cardLabelText}>Affirmation Mirror</Text>
            </View>
          </Pressable>
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

const CARD_HORIZONTAL_MARGIN = 20;

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
    alignItems: 'center',
  },
  soulpalAvatar: {
    width: 48,
    height: 67,
  },
  headerTextSection: {
    flex: 1,
    marginLeft: 12,
  },
  welcomeText: {
    fontFamily: fonts.edensor.light,
    fontSize: 24,
    lineHeight: 24 * 1.3,
    color: colors.white,
  },
  progressBarContainer: {
    width: 178,
    height: 19,
    backgroundColor: colors.white,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    gap: 5,
  },
  progressBarSegment: {
    width: 6,
    height: 12,
    borderRadius: 1.5,
  },
  dayText: {
    fontFamily: fonts.outfit.light,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  gearButton: {
    padding: 4,
  },
  gearIcon: {
    width: 32,
    height: 32,
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
  soulpalEyesContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  soulpalEyes: {
    width: 28,
    height: 28,
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

  // SoulBar Card
  soulBarCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
  },
  soulBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  soulBarTitle: {
    fontFamily: fonts.edensor.medium,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: '#59168B',
  },
  soulBarCount: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: '#59168B',
  },
  soulBarSegments: {
    flexDirection: 'row',
    gap: 6,
    height: 14,
  },
  soulBarSegment: {
    flex: 1,
    height: 12,
    borderRadius: 3,
  },
  soulBarFilled: {
    fontFamily: fonts.outfit.light,
    fontSize: 11,
    color: '#59168B',
    marginTop: 6,
    textAlign: 'right',
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
    marginTop: 16,
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
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Goal Garden Card
  goalGardenCard: {
    borderRadius: 20,
    backgroundColor: colors.white,
    marginTop: 16,
    height: 174,
    justifyContent: 'center',
    alignItems: 'center',
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
    opacity: 0.25,
  },
  palmTree2: {
    position: 'absolute',
    left: 145,
    top: 40,
    width: 86,
    height: 130,
    opacity: 0.25,
  },
  palmTree3: {
    position: 'absolute',
    left: 91,
    top: 49,
    width: 78,
    height: 120,
    opacity: 0.25,
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

  // Coming Soon Overlays
  comingSoonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonLock: {
    width: 16,
    height: 16,
    tintColor: '#59168B',
  },
  comingSoonText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: '#59168B',
    marginTop: 8,
  },
  comingSoonOverlayFull: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(89, 22, 139, 0.7)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  comingSoonLockLarge: {
    width: 80,
    height: 80,
  },
  comingSoonTextLight: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: colors.white,
  },

  // Small Cards Row
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  smallCardWrapper: {
    width: 155,
    alignItems: 'center',
  },
  smallCard: {
    width: '100%',
    height: 155,
    backgroundColor: colors.white,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  lockIcon: {
    width: '110%',
    height: '110%',
  },
  affirmationCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
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

export default HomeScreen;
