import React, { useState, useCallback } from 'react';
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
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { colors, fonts, surfaces } from '../theme';
import GlassCard from '../components/GlassCard';
import SoulPalAnimated from '../components/SoulPalAnimated';
import { useSoulPal, SOULPAL_COLORS } from '../contexts/SoulPalContext';
import { usePersonality } from '../contexts/PersonalityContext';
import { PersonalityTestResult } from '../services/PersonalityService';
import { TestType } from '../data/personalityTests/types';

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
const ProfileBackIcon = require('../../assets/images/profile/ProfileBackIcon.png');
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

// Rich star field — more stars with varied sizes for depth
const PROFILE_STARS = Array.from({ length: 60 }, (_, i) => ({
  left: ((i * 41 + 19) % 100),
  top: ((i * 59 + 11) % 100),
  size: i < 3 ? 3 : i < 8 ? 2.2 : (i % 5 === 0) ? 1.8 : i % 3 === 0 ? 1.2 : 0.8,
  opacity: i < 3 ? 0.6 : i < 8 ? 0.4 : (0.08 + (i % 6) * 0.06),
}));

// Shooting stars / meteors
const METEORS = [
  { startLeft: 15, startTop: 8, length: 45, angle: 35, delay: 0 },
  { startLeft: 70, startTop: 3, length: 30, angle: 40, delay: 4000 },
  { startLeft: 45, startTop: 12, length: 35, angle: 30, delay: 8000 },
];

type TabName = 'Home' | 'Journal' | 'Profile';

const ProfileScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { colorId, setColorId } = useSoulPal();
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

  // Floating animations for space elements
  const planet1Y = useSharedValue(0);
  const planet2Y = useSharedValue(0);
  const planet3Y = useSharedValue(0);
  const planet4Y = useSharedValue(0);
  const nebulaScale = useSharedValue(1);
  const meteor0Opacity = useSharedValue(0);
  const meteor1Opacity = useSharedValue(0);
  const meteor2Opacity = useSharedValue(0);
  const meteor0TranslateX = useSharedValue(0);
  const meteor0TranslateY = useSharedValue(0);
  const meteor1TranslateX = useSharedValue(0);
  const meteor1TranslateY = useSharedValue(0);
  const meteor2TranslateX = useSharedValue(0);
  const meteor2TranslateY = useSharedValue(0);
  const galaxyRotation = useSharedValue(0);

  React.useEffect(() => {
    // Planets floating at different speeds
    planet1Y.value = withRepeat(
      withSequence(
        withTiming(-18, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
        withTiming(18, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
    planet2Y.value = withRepeat(
      withSequence(
        withTiming(14, { duration: 3800, easing: Easing.inOut(Easing.sin) }),
        withTiming(-14, { duration: 3800, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
    planet3Y.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(10, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );
    planet4Y.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-8, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );

    // Nebula breathing
    nebulaScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      ), -1, true,
    );

    // Galaxy slow rotation
    galaxyRotation.value = withRepeat(
      withTiming(360, { duration: 60000, easing: Easing.linear }),
      -1,
    );

    // Shooting stars — each fires, streaks across, fades
    const animateMeteor = (
      opacityVal: any, txVal: any, tyVal: any, delay: number, length: number, angle: number,
    ) => {
      const rad = (angle * Math.PI) / 180;
      const dx = Math.cos(rad) * length * 3;
      const dy = Math.sin(rad) * length * 3;
      const fire = () => {
        opacityVal.value = 0;
        txVal.value = 0;
        tyVal.value = 0;
        opacityVal.value = withDelay(delay,
          withSequence(
            withTiming(1, { duration: 100 }),
            withTiming(1, { duration: 500 }),
            withTiming(0, { duration: 300 }),
          ),
        );
        txVal.value = withDelay(delay,
          withTiming(dx, { duration: 900, easing: Easing.out(Easing.quad) }),
        );
        tyVal.value = withDelay(delay,
          withTiming(dy, { duration: 900, easing: Easing.out(Easing.quad) }),
        );
      };
      fire();
      // Repeat every 12s
      const interval = setInterval(fire, 12000);
      return interval;
    };

    const i0 = animateMeteor(meteor0Opacity, meteor0TranslateX, meteor0TranslateY, METEORS[0].delay, METEORS[0].length, METEORS[0].angle);
    const i1 = animateMeteor(meteor1Opacity, meteor1TranslateX, meteor1TranslateY, METEORS[1].delay, METEORS[1].length, METEORS[1].angle);
    const i2 = animateMeteor(meteor2Opacity, meteor2TranslateX, meteor2TranslateY, METEORS[2].delay, METEORS[2].length, METEORS[2].angle);

    return () => {
      clearInterval(i0);
      clearInterval(i1);
      clearInterval(i2);
    };
  }, []);

  const planet1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: planet1Y.value }],
  }));
  const planet2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: planet2Y.value }],
  }));
  const planet3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: planet3Y.value }],
  }));
  const planet4Style = useAnimatedStyle(() => ({
    transform: [{ translateY: planet4Y.value }],
  }));
  const nebulaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nebulaScale.value }],
  }));
  const galaxyStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${galaxyRotation.value}deg` }],
  }));
  const meteor0Style = useAnimatedStyle(() => ({
    opacity: meteor0Opacity.value,
    transform: [{ translateX: meteor0TranslateX.value }, { translateY: meteor0TranslateY.value }],
  }));
  const meteor1Style = useAnimatedStyle(() => ({
    opacity: meteor1Opacity.value,
    transform: [{ translateX: meteor1TranslateX.value }, { translateY: meteor1TranslateY.value }],
  }));
  const meteor2Style = useAnimatedStyle(() => ({
    opacity: meteor2Opacity.value,
    transform: [{ translateX: meteor2TranslateX.value }, { translateY: meteor2TranslateY.value }],
  }));

  /* ───────────────────────── DARK MODE (current liquid glass design) ───────────────────────── */
  if (isDarkMode) {
    return (
      <LinearGradient
        colors={[...surfaces.profileGradient]}
        locations={[0, 0.3, 0.65, 1]}
        style={dk.container}
      >
        {/* ═══ Rich space backdrop ═══ */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {/* ── Nebula glow — soft radial cloud ── */}
          <Animated.View style={[dk.nebula, nebulaStyle]}>
            <LinearGradient
              colors={['rgba(155, 89, 182, 0.18)', 'rgba(123, 104, 238, 0.08)', 'transparent']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 0, y: 0 }}
              style={dk.nebulaFill}
            />
          </Animated.View>

          {/* ── Second nebula — warm accent ── */}
          <Animated.View style={[dk.nebula2, nebulaStyle]}>
            <LinearGradient
              colors={['rgba(196, 122, 219, 0.12)', 'rgba(79, 23, 134, 0.06)', 'transparent']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
              style={dk.nebulaFill}
            />
          </Animated.View>

          {/* ── Galaxy swirl — slowly rotating disc ── */}
          <Animated.View style={[dk.galaxy, galaxyStyle]}>
            <View style={dk.galaxyCore} />
            <View style={dk.galaxyArm1} />
            <View style={dk.galaxyArm2} />
            <View style={dk.galaxyArm3} />
          </Animated.View>

          {/* ── Stars ── */}
          {PROFILE_STARS.map((s, i) => (
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

          {/* ── Planet 1 — large purple, top right ── */}
          <Animated.View style={[dk.planet, dk.planet1, planet1Style]}>
            <LinearGradient
              colors={['rgba(155, 89, 182, 0.30)', 'rgba(155, 89, 182, 0.08)', 'rgba(0, 0, 0, 0.20)']}
              start={{ x: 0.2, y: 0.15 }}
              end={{ x: 0.9, y: 0.85 }}
              style={dk.planetFill}
            />
            <View style={[dk.planetHighlight, { top: '16%', left: '20%', width: 16, height: 16 }]} />
            {/* Atmosphere haze */}
            <View style={dk.atmosphere} />
          </Animated.View>

          {/* ── Planet 2 — ringed indigo, bottom left ── */}
          <Animated.View style={[dk.planet, dk.planet2, planet2Style]}>
            <LinearGradient
              colors={['rgba(123, 104, 238, 0.25)', 'rgba(123, 104, 238, 0.06)', 'rgba(0, 0, 0, 0.20)']}
              start={{ x: 0.25, y: 0.1 }}
              end={{ x: 0.85, y: 0.9 }}
              style={dk.planetFill}
            />
            <View style={[dk.planetHighlight, { top: '15%', left: '25%', width: 12, height: 12 }]} />
            <View style={dk.planetRing} />
          </Animated.View>

          {/* ── Planet 3 — tiny teal moon, mid left ── */}
          <Animated.View style={[dk.planet, dk.planet3, planet3Style]}>
            <LinearGradient
              colors={['rgba(77, 232, 212, 0.20)', 'rgba(77, 232, 212, 0.04)', 'rgba(0, 0, 0, 0.12)']}
              start={{ x: 0.3, y: 0.2 }}
              end={{ x: 0.8, y: 0.85 }}
              style={dk.planetFill}
            />
            <View style={[dk.planetHighlight, { top: '20%', left: '28%', width: 6, height: 6 }]} />
          </Animated.View>

          {/* ── Planet 4 — warm rose, far bottom right ── */}
          <Animated.View style={[dk.planet, dk.planet4, planet4Style]}>
            <LinearGradient
              colors={['rgba(196, 122, 219, 0.22)', 'rgba(196, 122, 219, 0.05)', 'rgba(0, 0, 0, 0.15)']}
              start={{ x: 0.2, y: 0.15 }}
              end={{ x: 0.85, y: 0.9 }}
              style={dk.planetFill}
            />
            <View style={[dk.planetHighlight, { top: '18%', left: '22%', width: 8, height: 8 }]} />
          </Animated.View>

          {/* ── Shooting stars / meteors ── */}
          {METEORS.map((m, idx) => {
            const meteorStyles = [meteor0Style, meteor1Style, meteor2Style];
            return (
              <Animated.View
                key={idx}
                style={[
                  dk.meteor,
                  {
                    left: `${m.startLeft}%` as any,
                    top: `${m.startTop}%` as any,
                    width: m.length,
                    transform: [{ rotate: `${m.angle}deg` }],
                  },
                  meteorStyles[idx],
                ]}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.3)', 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={dk.meteorTrail}
                />
              </Animated.View>
            );
          })}

          {/* ── Asteroid cluster — small irregular shapes ── */}
          <View style={[dk.asteroid, { top: '25%', left: '8%', width: 5, height: 4 }]} />
          <View style={[dk.asteroid, { top: '26%', left: '11%', width: 3, height: 3 }]} />
          <View style={[dk.asteroid, { top: '24%', left: '13%', width: 4, height: 3 }]} />
          <View style={[dk.asteroid, { bottom: '35%', right: '6%', width: 4, height: 3 }]} />
          <View style={[dk.asteroid, { bottom: '37%', right: '10%', width: 3, height: 2 }]} />

          {/* ── Dust lane — faint diagonal strip ── */}
          <View style={dk.dustLane}>
            <LinearGradient
              colors={['transparent', 'rgba(155, 89, 182, 0.04)', 'rgba(123, 104, 238, 0.06)', 'rgba(155, 89, 182, 0.04)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </View>

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
            <Pressable onPress={() => navigation.goBack()}>
              <Image source={ProfileBackIcon} style={dk.topIcon} resizeMode="contain" />
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
                  {SOULPAL_COLORS.map((c) => (
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
      </LinearGradient>
    );
  }

  /* ───────────────────────── LIGHT MODE (original design) ───────────────────────── */
  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#F5F2F9']}
      locations={[0.1, 0.6, 1]}
      style={lt.container}
    >
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
          <Pressable onPress={() => navigation.goBack()}>
            <Image source={ProfileBackIcon} style={lt.topIcon} resizeMode="contain" />
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
                {SOULPAL_COLORS.map((c) => (
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
    </LinearGradient>
  );
};

/* ═══════════════════════════════════════════════════════════════
   DARK MODE STYLES (dk) — liquid glass design
   ═══════════════════════════════════════════════════════════════ */
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

  // ── Nebula ──
  nebula: {
    position: 'absolute',
    width: 300,
    height: 300,
    top: -50,
    right: -80,
    borderRadius: 150,
  },
  nebula2: {
    position: 'absolute',
    width: 250,
    height: 250,
    bottom: 100,
    left: -60,
    borderRadius: 125,
  },
  nebulaFill: {
    width: '100%',
    height: '100%',
    borderRadius: 150,
  },

  // ── Galaxy swirl ──
  galaxy: {
    position: 'absolute',
    width: 80,
    height: 80,
    top: '42%',
    right: '12%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galaxyCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(196, 122, 219, 0.25)',
    shadowColor: 'rgba(196, 122, 219, 0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  galaxyArm1: {
    position: 'absolute',
    width: 60,
    height: 1,
    backgroundColor: 'rgba(155, 89, 182, 0.08)',
    borderRadius: 1,
    transform: [{ rotate: '0deg' }],
  },
  galaxyArm2: {
    position: 'absolute',
    width: 50,
    height: 1,
    backgroundColor: 'rgba(123, 104, 238, 0.06)',
    borderRadius: 1,
    transform: [{ rotate: '60deg' }],
  },
  galaxyArm3: {
    position: 'absolute',
    width: 55,
    height: 1,
    backgroundColor: 'rgba(155, 89, 182, 0.07)',
    borderRadius: 1,
    transform: [{ rotate: '120deg' }],
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
    top: 55,
    right: -40,
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.12)',
  },
  planet2: {
    width: 100,
    height: 100,
    bottom: 200,
    left: -28,
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.10)',
  },
  planet3: {
    width: 35,
    height: 35,
    top: '38%',
    left: '5%',
    borderWidth: 1,
    borderColor: 'rgba(77, 232, 212, 0.10)',
  },
  planet4: {
    width: 55,
    height: 55,
    bottom: '12%',
    right: '8%',
    borderWidth: 1,
    borderColor: 'rgba(196, 122, 219, 0.08)',
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
    borderColor: 'rgba(155, 89, 182, 0.08)',
  },
  planetRing: {
    position: 'absolute',
    width: '180%',
    height: 16,
    top: '44%',
    left: '-40%',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(123, 104, 238, 0.20)',
    transform: [{ rotate: '-22deg' }],
  },

  // ── Meteors / shooting stars ──
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
    backgroundColor: 'rgba(180, 170, 200, 0.15)',
    borderRadius: 1.5,
    transform: [{ rotate: '25deg' }],
  },

  // ── Dust lane ──
  dustLane: {
    position: 'absolute',
    width: '150%',
    height: 80,
    top: '55%',
    left: '-25%',
    transform: [{ rotate: '-15deg' }],
    opacity: 0.6,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(112, 202, 207, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(112, 202, 207, 0.3)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
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
    color: 'rgba(255, 255, 255, 0.5)',
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
    color: 'rgba(255, 255, 255, 0.85)',
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
    color: 'rgba(255, 255, 255, 0.9)',
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
    color: 'rgba(255, 255, 255, 0.6)',
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
    color: 'rgba(255, 255, 255, 0.7)',
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
    color: 'rgba(255, 255, 255, 0.5)',
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
    color: 'rgba(167, 139, 250, 0.9)',
    marginTop: 2,
  },
  personalityResultDate: {
    fontFamily: fonts.outfit.light,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
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
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
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

/* ═══════════════════════════════════════════════════════════════
   LIGHT MODE STYLES (lt) — original design
   ═══════════════════════════════════════════════════════════════ */
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
    color: 'rgba(255, 255, 255, 0.7)',
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
    color: '#59168B',
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
    color: '#59168B',
  },
  personalityLoremText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    lineHeight: 12 * 1.26,
    color: '#59168B',
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
    color: '#59168B',
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
    color: 'rgba(89, 22, 139, 0.6)',
  },
  personalityResultRow: {
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(89, 22, 139, 0.12)',
  },
  personalityResultLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: '#59168B',
  },
  personalityResultProfile: {
    fontFamily: fonts.edensor.bold,
    fontSize: 13,
    color: '#59168B',
    marginTop: 2,
  },
  personalityResultDate: {
    fontFamily: fonts.outfit.light,
    fontSize: 10,
    color: 'rgba(89, 22, 139, 0.55)',
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
    color: '#59168B',
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
    color: '#59168B',
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
    color: '#59168B',
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
    color: '#59168B',
    marginTop: 2,
  },
});

export default ProfileScreen;
