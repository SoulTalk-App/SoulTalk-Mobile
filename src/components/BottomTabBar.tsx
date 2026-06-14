import React, { useCallback, useEffect, useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import {
  TOUCH_HITSLOP_MED,
  TOUCH_PRESS_OPACITY,
  TOUCH_PRESS_SPRING_IN,
  TOUCH_PRESS_SPRING_OUT,
} from './touchPrimitives';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// so-wgmp: nudge the icon down + fade slightly on press-in so the tap
// registers visually *before* the rise/label-fade transition starts.
// Spring-driven values keep the animation on the UI thread (Reanimated
// worklet) so JS thread load can't stall the feedback.
//
// so-zd1z: deliberate deviation from TOUCH_PRESS_SCALE (0.94) — the tab
// bar lives inside a 62pt-tall pill and the rise/fall animation already
// communicates selection state. A 0.94 squash would be too subtle against
// that backdrop; 0.88 gives the press a more decisive "registered" beat
// matched to the tab UX, not the general-purpose button UX. TOUCH_PRESS_OPACITY
// stays at TOUCH_PRESS_OPACITY (no reason to diverge).
const PRESS_SCALE_DOWN = 0.88;

const HomeIconImg = require('../../assets/images/home/HomeIcon.png');
const JournalIconImg = require('../../assets/images/home/JournalIconPng.png');
const ProfileIconImg = require('../../assets/images/home/ProfileIconPng.png');

export type TabName = 'Home' | 'Journal' | 'Profile';

const TABS: TabName[] = ['Home', 'Journal', 'Profile'];
const TAB_ICONS: Record<TabName, any> = {
  Home: HomeIconImg,
  Journal: JournalIconImg,
  Profile: ProfileIconImg,
};

type Props = {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  // Optional outer animated style — parents that hide/show the bar on
  // scroll pass their own translateY shared value here; the component
  // applies it on the wrapper without owning it.
  tabBarAnimStyle?: any;
};

// so-loo3: extracted from HomeScreen / JournalScreen / ProfileScreen, all of
// which previously called `useAnimatedStyle` inside `.map()` over a length-3
// array and triple-suppressed react-hooks/rules-of-hooks. The map shape was
// safe at runtime (length never changes) but the moment someone adds a 4th
// tab it crashes — and the suppression had to be re-added three times. This
// component holds three EXPLICIT useSharedValue + useAnimatedStyle pairs;
// no map over hooks anywhere. activeTab transitions are driven by a single
// useEffect on the activeTab prop.
export function BottomTabBar({ activeTab, onTabPress, tabBarAnimStyle }: Props) {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();

  const riseHome = useSharedValue(activeTab === 'Home' ? -20 : 0);
  const riseJournal = useSharedValue(activeTab === 'Journal' ? -20 : 0);
  const riseProfile = useSharedValue(activeTab === 'Profile' ? -20 : 0);
  const opacityHome = useSharedValue(activeTab === 'Home' ? 1 : 0);
  const opacityJournal = useSharedValue(activeTab === 'Journal' ? 1 : 0);
  const opacityProfile = useSharedValue(activeTab === 'Profile' ? 1 : 0);

  useEffect(() => {
    const rises: Record<TabName, ReturnType<typeof useSharedValue<number>>> = {
      Home: riseHome,
      Journal: riseJournal,
      Profile: riseProfile,
    };
    const opacities: Record<TabName, ReturnType<typeof useSharedValue<number>>> = {
      Home: opacityHome,
      Journal: opacityJournal,
      Profile: opacityProfile,
    };
    (Object.keys(rises) as TabName[]).forEach((t) => {
      const isActive = t === activeTab;
      rises[t].value = withTiming(isActive ? -20 : 0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      opacities[t].value = withTiming(isActive ? 1 : 0, {
        duration: isActive ? 250 : 150,
      });
    });
  }, [activeTab, riseHome, riseJournal, riseProfile, opacityHome, opacityJournal, opacityProfile]);

  const homeRiseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: riseHome.value }],
  }));
  const journalRiseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: riseJournal.value }],
  }));
  const profileRiseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: riseProfile.value }],
  }));
  const homeLabelStyle = useAnimatedStyle(() => ({ opacity: opacityHome.value }));
  const journalLabelStyle = useAnimatedStyle(() => ({ opacity: opacityJournal.value }));
  const profileLabelStyle = useAnimatedStyle(() => ({ opacity: opacityProfile.value }));

  // so-wgmp: per-tab press-feedback shared values. Explicit (not via map)
  // for the same react-hooks/rules-of-hooks reason the rise/opacity refs
  // above are explicit (see so-loo3 header comment).
  const pressHome = useSharedValue(1);
  const pressJournal = useSharedValue(1);
  const pressProfile = useSharedValue(1);
  const homePressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressHome.value }],
    opacity: 1 - (1 - TOUCH_PRESS_OPACITY) * (1 - pressHome.value) / (1 - PRESS_SCALE_DOWN),
  }));
  const journalPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressJournal.value }],
    opacity: 1 - (1 - TOUCH_PRESS_OPACITY) * (1 - pressJournal.value) / (1 - PRESS_SCALE_DOWN),
  }));
  const profilePressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressProfile.value }],
    opacity: 1 - (1 - TOUCH_PRESS_OPACITY) * (1 - pressProfile.value) / (1 - PRESS_SCALE_DOWN),
  }));
  const pressStyles: Record<TabName, any> = {
    Home: homePressStyle,
    Journal: journalPressStyle,
    Profile: profilePressStyle,
  };
  const pressValues: Record<TabName, ReturnType<typeof useSharedValue<number>>> = {
    Home: pressHome,
    Journal: pressJournal,
    Profile: pressProfile,
  };

  const handlePressIn = useCallback(
    (tab: TabName) => {
      pressValues[tab].value = withSpring(PRESS_SCALE_DOWN, TOUCH_PRESS_SPRING_IN);
    },
    // pressValues is rebuilt every render but the shared values inside
    // are stable; eslint-disable to avoid churning the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const handlePressOut = useCallback(
    (tab: TabName) => {
      pressValues[tab].value = withSpring(1, TOUCH_PRESS_SPRING_OUT);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const riseStyles: Record<TabName, any> = {
    Home: homeRiseStyle,
    Journal: journalRiseStyle,
    Profile: profileRiseStyle,
  };
  const labelStyles: Record<TabName, any> = {
    Home: homeLabelStyle,
    Journal: journalLabelStyle,
    Profile: profileLabelStyle,
  };

  const styles = useMemo(() => buildStyles(colors, isDarkMode), [colors, isDarkMode]);

  return (
    <Animated.View
      style={[
        styles.tabBar,
        { paddingBottom: insets.bottom > 0 ? insets.bottom - 6 : 8 },
        tabBarAnimStyle,
      ]}
    >
      <View style={styles.tabBarInner}>
        {TABS.map((tab) => (
          <Animated.View key={tab} style={[styles.tabItem, riseStyles[tab]]}>
            {/* so-wgmp: hitSlop extends the 50pt-wide tab item to a comfortable
                ~60pt tap region without rearranging the visual layout. AnimatedPressable
                wraps the icon+label so the press-in scale is on the UI thread. */}
            <AnimatedPressable
              onPress={() => onTabPress(tab)}
              onPressIn={() => handlePressIn(tab)}
              onPressOut={() => handlePressOut(tab)}
              hitSlop={TOUCH_HITSLOP_MED}
              accessibilityRole="tab"
              accessibilityLabel={tab}
              accessibilityState={{ selected: activeTab === tab }}
              style={[styles.tabPressable, pressStyles[tab]]}
            >
              <View style={activeTab === tab ? styles.activeTabBg : undefined}>
                <Image
                  source={TAB_ICONS[tab]}
                  style={activeTab === tab ? styles.tabIcon : styles.tabIconInactive}
                  resizeMode="contain"
                />
              </View>
              <Animated.Text style={[styles.activeTabLabel, labelStyles[tab]]}>
                {tab}
              </Animated.Text>
            </AnimatedPressable>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

const buildStyles = (colors: ReturnType<typeof useThemeColors>, isDark: boolean) =>
  StyleSheet.create({
    tabBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    },
    tabBarInner: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : colors.white,
      borderRadius: 200,
      width: 269,
      height: 62,
      alignItems: 'center',
      justifyContent: 'space-evenly',
      paddingHorizontal: 16,
      paddingTop: 14,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    tabItem: { alignItems: 'center', justifyContent: 'center', minWidth: 50 },
    tabPressable: { alignItems: 'center', justifyContent: 'center' },
    activeTabBg: {
      backgroundColor: isDark ? 'rgba(61, 84, 120, 0.4)' : colors.primary,
      borderRadius: 24,
      width: 52,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOpacity: 0.4,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
    },
    tabIcon: { width: 28, height: 26, tintColor: colors.white },
    tabIconInactive: {
      width: 33,
      height: 30,
      opacity: isDark ? 0.6 : 0.85,
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
