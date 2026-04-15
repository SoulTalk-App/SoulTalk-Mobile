import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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
import { colors, fonts, surfaces } from '../theme';
import { useJournal } from '../contexts/JournalContext';
import JournalService from '../services/JournalService';
import GlassCard from '../components/GlassCard';
import SoulPalAnimated from '../components/SoulPalAnimated';
import { useSoulPal, SOULPAL_COLORS } from '../contexts/SoulPalContext';

// Star field — deterministic positions seeded once
const STARS = Array.from({ length: 45 }, (_, i) => ({
  left: ((i * 37 + 13) % 100),
  top: ((i * 53 + 7) % 100),
  size: i < 3 ? 2.5 : (i % 3 === 0) ? 2 : 1,
  opacity: i < 3 ? 0.55 : (0.12 + (i % 5) * 0.1),
}));

// Assets — light mode (original)
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

// Assets — dark mode variants
const LockIconDark = require('../../assets/images/home/dark/LockIcon.png');
const SoulpalEyesDark = require('../../assets/images/home/dark/SoulpalIcon.png');
const AffirmationMirrorCardDark = require('../../assets/images/home/dark/AffirmationMirrorCard.png');


type TabName = 'Home' | 'Journal' | 'Profile';

const TOTAL_BARS = 15;
const SOUL_BAR_SEGMENTS = 6;

const HomeScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { homeImage, bodyImage, colorId } = useSoulPal();
  const soulPalHex = SOULPAL_COLORS.find(c => c.id === colorId)?.hex ?? '#70CACF';
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

  // Eye blink animation for feeling bar
  const eyeOpacity = useSharedValue(1);
  const eyeTranslateX = useSharedValue(0);

  // Debounce timer for mood PUT
  const moodDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Floating orb animations (dark mode only, but hooks must always run)
  const orb1Y = useSharedValue(0);
  const orb2Y = useSharedValue(0);

  useEffect(() => {
    const loadLocalName = async () => {
      const stored = await AsyncStorage.getItem('@soultalk_username');
      if (stored) setLocalName(stored);
    };
    loadLocalName();
  }, []);

  // Blinking + looking animation loop for feeling bar eyes
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

    // Floating orbs
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(20, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    orb2Y.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
        withTiming(-15, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  const eyeAnimStyle = useAnimatedStyle(() => ({
    opacity: eyeOpacity.value,
    transform: [{ translateX: eyeTranslateX.value }],
  }));

  const orb1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: orb1Y.value }],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: orb2Y.value }],
  }));

  const persistMood = useCallback((newCount: number) => {
    if (moodDebounceRef.current) clearTimeout(moodDebounceRef.current);
    moodDebounceRef.current = setTimeout(async () => {
      try {
        await JournalService.upsertTodayMood(newCount);
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
    const segmentPitch = 6 + 5;
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

  const displayName = user?.display_first_name || user?.first_name || localName;

  // Shared affirmation press handler
  const handleAffirmationPress = useCallback(async () => {
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
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Something went wrong. Please try again later.';
      Alert.alert('Affirmation Mirror', msg);
    } finally {
      setAffirmationLoading(false);
    }
  }, [affirmationLoading, navigation]);

  // ─── DARK MODE (current liquid glass design) ─────────────────────────
  if (isDarkMode) {
    return (
      <LinearGradient
        colors={[...surfaces.homeGradient]}
        locations={[0, 0.3, 0.65, 1]}
        style={dk.container}
      >
        {/* Star field + Planets — non-interactive backdrop */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {STARS.map((s, i) => (
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

          <Animated.View style={[dk.orb, dk.orb1, orb1Style]}>
            <LinearGradient
              colors={['rgba(112, 202, 207, 0.25)', 'rgba(112, 202, 207, 0.06)', 'rgba(0, 0, 0, 0.15)']}
              start={{ x: 0.2, y: 0.15 }}
              end={{ x: 0.9, y: 0.85 }}
              style={dk.planetFill}
            />
            <View style={[dk.planetHighlight, { top: '18%', left: '22%', width: 18, height: 18 }]} />
          </Animated.View>

          <Animated.View style={[dk.orb, dk.orb2, orb2Style]}>
            <LinearGradient
              colors={['rgba(123, 104, 238, 0.22)', 'rgba(123, 104, 238, 0.05)', 'rgba(0, 0, 0, 0.18)']}
              start={{ x: 0.25, y: 0.1 }}
              end={{ x: 0.85, y: 0.9 }}
              style={dk.planetFill}
            />
            <View style={[dk.planetHighlight, { top: '15%', left: '25%', width: 14, height: 14 }]} />
            <View style={dk.planetRing} />
          </Animated.View>

          <View style={[dk.orb, dk.orb3]}>
            <LinearGradient
              colors={['rgba(155, 89, 182, 0.20)', 'rgba(155, 89, 182, 0.04)', 'rgba(0, 0, 0, 0.12)']}
              start={{ x: 0.3, y: 0.15 }}
              end={{ x: 0.8, y: 0.9 }}
              style={dk.planetFill}
            />
            <View style={[dk.planetHighlight, { top: '20%', left: '28%', width: 10, height: 10 }]} />
          </View>
        </View>

        <ScrollView
          style={[dk.scrollView, { paddingTop: insets.top + 10 }]}
          contentContainerStyle={dk.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Header Card */}
          <GlassCard intensity="medium" glowColor={surfaces.homeGlow} style={dk.welcomeCard}>
            <View style={dk.welcomeInner}>
              <View style={dk.headerRow}>
                <View style={dk.soulpalAvatarWrap}>
                  <View style={[dk.soulpalGlow, { backgroundColor: soulPalHex }]} />
                  <Image
                    source={homeImage}
                    style={dk.soulpalAvatar}
                    resizeMode="contain"
                  />
                </View>
                <View style={dk.headerTextSection}>
                  <Text style={dk.welcomeText}>
                    Welcome Back, {displayName}!
                  </Text>
                  <Text style={dk.dayText}>Ready to learn more about yourself?</Text>
                </View>
                <Pressable style={dk.gearButton} onPress={() => navigation.navigate('Settings')}>
                  <Image
                    source={GearIconImg}
                    style={dk.gearIcon}
                    resizeMode="contain"
                  />
                </Pressable>
              </View>

              {/* Mood Bar */}
              <View style={dk.moodBarSection}>
                <Text style={dk.moodBarLabel}>I'm Feeling</Text>
                <Pressable onPress={handleBarAreaPress} style={dk.moodBarTrack}>
                  {Array.from({ length: TOTAL_BARS }).map((_, i) => {
                    const filled = i < filledBars;
                    return (
                      <Pressable key={i} onPress={() => handleBarPress(i)} style={{ flex: 1 }}>
                        <View
                          style={[
                            dk.moodBarSegment,
                            {
                              backgroundColor: filled
                                ? '#4DE8D4'
                                : 'rgba(255, 255, 255, 0.04)',
                            },
                            filled && dk.moodBarSegmentGlow,
                          ]}
                        />
                      </Pressable>
                    );
                  })}
                </Pressable>
                <View style={dk.moodBarEndpoints}>
                  <Text style={dk.moodBarEndText}>Low</Text>
                  <Text style={dk.moodBarEndText}>High</Text>
                </View>
              </View>

              {/* SoulBar Section */}
              <Pressable style={dk.soulBarCard} onPress={() => navigation.navigate('SoulSight')}>
                <View style={dk.soulBarHeader}>
                  <Text style={dk.soulBarTitle}>SoulSight</Text>
                  <Text style={dk.soulBarCount}>
                    {soulBar?.points ?? 0}/{SOUL_BAR_SEGMENTS}
                  </Text>
                </View>
                <View style={dk.soulBarSegments}>
                  {Array.from({ length: SOUL_BAR_SEGMENTS }).map((_, i) => {
                    const pts = soulBar?.points ?? 0;
                    const isFull = pts >= i + 1;
                    const isHalf = !isFull && pts > i;
                    return (
                      <View
                        key={i}
                        style={[
                          dk.soulBarSegment,
                          {
                            backgroundColor: isFull
                              ? '#4DE8D4'
                              : isHalf
                                ? 'rgba(77, 232, 212, 0.5)'
                                : 'rgba(255, 255, 255, 0.08)',
                          },
                          isFull && dk.soulBarSegmentGlow,
                        ]}
                      />
                    );
                  })}
                </View>
                {(soulBar?.total_filled ?? 0) > 0 && (
                  <Text style={dk.soulBarFilled}>
                    Filled {soulBar?.total_filled} time{(soulBar?.total_filled ?? 0) !== 1 ? 's' : ''}
                  </Text>
                )}
              </Pressable>
            </View>
          </GlassCard>

          {/* Goal Garden Card */}
          <GlassCard intensity="light" style={dk.goalGardenCard}>
            <View style={dk.goalGardenInner}>
              <Image source={LockIconDark} style={dk.comingSoonLockLarge} resizeMode="contain" />
              <Text style={dk.comingSoonText}>Coming Soon</Text>
            </View>
          </GlassCard>

          {/* Two Cards Row */}
          <View style={dk.cardsRow}>
            {/* Coming Soon Card */}
            <View style={dk.smallCardWrapper}>
              <GlassCard intensity="light" style={dk.smallCard}>
                <View style={dk.smallCardInner}>
                  <Image
                    source={LockIconDark}
                    style={dk.lockIcon}
                    resizeMode="contain"
                  />
                </View>
              </GlassCard>
              <View style={dk.cardLabel}>
                <Text style={dk.cardLabelText}>Coming Soon</Text>
              </View>
            </View>

            {/* Affirmation Mirror Card */}
            <Pressable style={dk.smallCardWrapper} onPress={handleAffirmationPress}>
              <GlassCard intensity="light" style={dk.smallCard}>
                <View style={dk.smallCardInner}>
                  {affirmationLoading ? (
                    <ActivityIndicator size="large" color="#4DE8D4" />
                  ) : (
                    <Image
                      source={AffirmationMirrorCardDark}
                      style={dk.affirmationCardImage}
                      resizeMode="cover"
                    />
                  )}
                </View>
              </GlassCard>
              <View style={dk.cardLabel}>
                <Text style={dk.cardLabelText}>Affirmation Mirror</Text>
              </View>
            </Pressable>
          </View>

          {/* Bottom spacing for tab bar */}
          <View style={{ height: 140 + (insets.bottom || 16) }} />
        </ScrollView>

        {/* Bottom Tab Bar — frosted glass pill */}
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
      </LinearGradient>
    );
  }

  // ─── LIGHT MODE (original design) ────────────────────────────────────
  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#F5F2F9']}
      locations={[0.1, 0.6, 1]}
      style={lt.container}
    >
      <ScrollView
        style={[lt.scrollView, { paddingTop: insets.top + 10 }]}
        contentContainerStyle={lt.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header Card */}
        <View style={lt.welcomeCard}>
          <View style={lt.headerRow}>
            <Image
              source={homeImage}
              style={lt.soulpalAvatar}
              resizeMode="contain"
            />
            <View style={lt.headerTextSection}>
              <Text style={lt.welcomeText}>
                Welcome Back, {displayName}!
              </Text>
              <Text style={lt.dayText}>Ready to learn more about yourself?</Text>
            </View>
            <Pressable style={lt.gearButton} onPress={() => navigation.navigate('Settings')}>
              <Image
                source={GearIconImg}
                style={lt.gearIcon}
                resizeMode="contain"
              />
            </Pressable>
          </View>

          {/* I'm Feeling Bar */}
          <Pressable
            style={lt.feelingBar}
            onPress={() => navigation.navigate('CreateJournal')}
          >
            <View style={lt.soulpalEyesContainer}>
              <Image
                source={bodyImage}
                style={lt.soulpalEyes}
                resizeMode="contain"
              />
            </View>
            <Text style={lt.feelingText}>Guess what happened today....</Text>
            <View style={lt.sendButton}>
              <Image
                source={SendIconImg}
                style={lt.sendIcon}
                resizeMode="contain"
              />
            </View>
          </Pressable>

          {/* SoulBar Section */}
          <Pressable style={lt.soulBarCard} onPress={() => navigation.navigate('SoulSight')}>
            <View style={lt.soulBarHeader}>
              <Text style={lt.soulBarTitle}>SoulSight</Text>
              <Text style={lt.soulBarCount}>
                {soulBar?.points ?? 0}/{SOUL_BAR_SEGMENTS}
              </Text>
            </View>
            <View style={lt.soulBarSegments}>
              {Array.from({ length: SOUL_BAR_SEGMENTS }).map((_, i) => {
                const pts = soulBar?.points ?? 0;
                const isFull = pts >= i + 1;
                const isHalf = !isFull && pts > i;
                return (
                  <View
                    key={i}
                    style={[
                      lt.soulBarSegment,
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
              <Text style={lt.soulBarFilled}>
                Filled {soulBar?.total_filled} time{(soulBar?.total_filled ?? 0) !== 1 ? 's' : ''}
              </Text>
            )}
          </Pressable>

        </View>

        {/* Goal Garden Card */}
        <View style={lt.goalGardenCard}>
          <Image source={LockIcon} style={lt.comingSoonLockLarge} resizeMode="contain" />
          <Text style={lt.comingSoonText}>Coming Soon</Text>
        </View>

        {/* Two Cards Row */}
        <View style={lt.cardsRow}>
          {/* Coming Soon Card */}
          <View style={lt.smallCardWrapper}>
            <View style={lt.smallCard}>
              <Image
                source={LockIcon}
                style={lt.lockIcon}
                resizeMode="contain"
              />
            </View>
            <View style={lt.cardLabel}>
              <Text style={lt.cardLabelText}>Coming Soon</Text>
            </View>
          </View>

          {/* Affirmation Mirror Card */}
          <Pressable style={lt.smallCardWrapper} onPress={handleAffirmationPress}>
            <View style={lt.smallCard}>
              {affirmationLoading ? (
                <ActivityIndicator size="large" color="#59168B" />
              ) : (
                <Image
                  source={AffirmationMirrorCard}
                  style={lt.affirmationCardImage}
                  resizeMode="cover"
                />
              )}
            </View>
            <View style={lt.cardLabel}>
              <Text style={lt.cardLabelText}>Affirmation Mirror</Text>
            </View>
          </Pressable>
        </View>

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 140 + (insets.bottom || 16) }} />
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
    </LinearGradient>
  );
};

// ─── DARK MODE STYLES (liquid glass design) ──────────────────────────────
const CARD_HORIZONTAL_MARGIN = 20;

const dk = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: CARD_HORIZONTAL_MARGIN,
  },

  // Planets
  orb: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
  orb1: {
    width: 160,
    height: 160,
    top: 80,
    right: -40,
    borderWidth: 1,
    borderColor: 'rgba(112, 202, 207, 0.12)',
  },
  orb2: {
    width: 120,
    height: 120,
    top: 480,
    left: -30,
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.10)',
  },
  orb3: {
    width: 90,
    height: 90,
    bottom: 200,
    right: -20,
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.08)',
  },
  planetFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  planetHighlight: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  planetRing: {
    position: 'absolute',
    width: '170%',
    height: 18,
    top: '46%',
    left: '-35%',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(123, 104, 238, 0.18)',
    transform: [{ rotate: '-20deg' }],
  },

  // Welcome Header Card
  welcomeCard: {
    marginBottom: 0,
  },
  welcomeInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soulpalAvatarWrap: {
    position: 'relative',
    width: 56,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soulpalGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    opacity: 0.25,
    top: 4,
  },
  soulpalAvatar: {
    width: 48,
    height: 67,
  },
  headerTextSection: {
    flex: 1,
    marginLeft: 10,
  },
  welcomeText: {
    fontFamily: fonts.edensor.bold,
    fontSize: 24,
    lineHeight: 24 * 1.35,
    color: colors.white,
  },
  dayText: {
    fontFamily: fonts.outfit.light,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  gearButton: {
    padding: 4,
  },
  gearIcon: {
    width: 32,
    height: 32,
    tintColor: 'rgba(255, 255, 255, 0.5)',
  },

  // Mood Bar
  moodBarSection: {
    marginTop: 16,
  },
  moodBarLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
  },
  moodBarTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  moodBarSegment: {
    flex: 1,
    height: 20,
    borderRadius: 4,
  },
  moodBarSegmentGlow: {
    shadowColor: '#4DE8D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 4,
  },
  moodBarEndpoints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  moodBarEndText: {
    fontFamily: fonts.outfit.light,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  sendButton: {
    padding: 4,
  },
  sendIcon: {
    width: 18,
    height: 18,
    tintColor: 'rgba(255, 255, 255, 0.75)',
  },

  // SoulBar Card — glass inner card
  soulBarCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  soulBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  soulBarTitle: {
    fontFamily: fonts.outfit.medium,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: colors.white,
  },
  soulBarCount: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
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
  soulBarSegmentGlow: {
    shadowColor: '#4DE8D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  soulBarFilled: {
    fontFamily: fonts.outfit.light,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 6,
    textAlign: 'right',
  },

  // Goal Garden Card
  goalGardenCard: {
    marginTop: 16,
  },
  goalGardenInner: {
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonLockLarge: {
    width: 44,
    height: 44,
    opacity: 0.4,
  },
  comingSoonText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 8,
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
    width: 155,
  },
  smallCardInner: {
    width: '100%',
    height: 155,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 16,
  },
  lockIcon: {
    width: 60,
    height: 60,
    opacity: 0.6,
  },
  affirmationCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  cardLabel: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardLabelText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 200,
    width: 269,
    height: 62,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    paddingTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
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

// ─── LIGHT MODE STYLES (original design) ─────────────────────────────────
const lt = StyleSheet.create({
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
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(89, 22, 139, 0.1)',
  },
  soulpalEyes: {
    width: 26,
    height: 36,
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

  // Goal Garden Card
  goalGardenCard: {
    borderRadius: 20,
    backgroundColor: colors.white,
    marginTop: 16,
    height: 174,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonLockLarge: {
    width: 80,
    height: 80,
  },
  comingSoonText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: '#59168B',
    marginTop: 8,
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
