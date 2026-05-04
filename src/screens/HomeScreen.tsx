import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
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
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { fonts, useThemeColors } from '../theme';
import { useJournal } from '../contexts/JournalContext';
import JournalService from '../services/JournalService';
import SoulPalAnimated from '../components/SoulPalAnimated';
import { useSoulPal, getSoulPalHex } from '../contexts/SoulPalContext';
import { ChargeUpGrid } from '../features/homeV2';
import { CosmicScreen } from '../components/CosmicBackdrop';

// Assets — light mode (original)
const SoulpalHome = require('../../assets/images/home/SoulpalHome.png');
const HomeIconImg = require('../../assets/images/home/HomeIcon.png');
const JournalIconImg = require('../../assets/images/home/JournalIconPng.png');
const ProfileIconImg = require('../../assets/images/home/ProfileIconPng.png');
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

// Greeting hero avatar (canonical home-v2 design)
const Soulpal5 = require('../../assets/images/home-v2/soulpal-5.png');


type TabName = 'Home' | 'Journal' | 'Profile';

const SOUL_BAR_SEGMENTS = 6;
const CARD_HORIZONTAL_MARGIN = 20;
// Canonical SoulBar accent gradient (Design/handoff/.../home-v2.jsx GreetingHero).
const SOULBAR_TEAL = '#70CACF';
const SOULBAR_PINK = '#E93678';
const NOTEBOOK_BADGE_PINK = '#E93678';

const HomeScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const { homeImage, bodyImage, colorId } = useSoulPal();
  const soulPalHex = getSoulPalHex(colorId, isDarkMode);
  const [localName, setLocalName] = useState('User');
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  const [moodWord, setMoodWord] = useState('');
  const [moodSaved, setMoodSaved] = useState(false);
  const [affirmationLoading, setAffirmationLoading] = useState(false);
  // SoulBar (i) popover toggle (so-o61). Tap the badge to expand the
  // description copy in-place; tap again to collapse.
  const [soulBarInfoOpen, setSoulBarInfoOpen] = useState(false);
  const { soulBar, fetchSoulBar, hasEntryToday } = useJournal();

  // SoulBar wiring (canonical GreetingHero).
  const soulBarFilled = Math.min(SOUL_BAR_SEGMENTS, soulBar?.points ?? 0);
  const soulBarRemaining = Math.max(0, SOUL_BAR_SEGMENTS - soulBarFilled);

  const dk = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          paddingHorizontal: CARD_HORIZONTAL_MARGIN,
        },

        // Greeting Hero card (so-c0o, dark) — canonical home-v2 design
        welcomeCard: {
          borderRadius: 24,
          padding: 18,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.10)',
        },
        greetingTopRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          position: 'relative',
        },
        avatarBtn: {
          flexShrink: 0,
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'flex-end',
          overflow: 'hidden',
        },
        avatarBtnDark: {
          backgroundColor: '#5A674E',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        avatarBtnLight: {
          backgroundColor: '#A6BD7B',
          borderWidth: 1,
          borderColor: 'rgba(79, 23, 134, 0.08)',
        },
        avatarImg: {
          width: 56,
          height: 56,
          marginBottom: -2,
        },
        greetingTextSection: {
          flex: 1,
          minWidth: 0,
        },
        welcomeLine: {
          fontFamily: fonts.edensor.regular,
          fontSize: 28,
          lineHeight: 28 * 1.05,
          color: colors.white,
          letterSpacing: -0.2,
        },
        settingsBtn: {
          flexShrink: 0,
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: 'rgba(255, 255, 255, 0.10)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        },

        // Daily feeling block
        moodBlock: {
          marginTop: 18,
        },
        moodLabel: {
          fontFamily: fonts.outfit.medium,
          fontSize: 12,
          letterSpacing: 0.4,
          // 0.78 → text.secondary (dark = 0.7) — slight drop, tokenized
          color: colors.text.secondary,
          marginBottom: 6,
        },
        moodInputRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.10)',
          borderRadius: 14,
          paddingVertical: 11,
          paddingHorizontal: 14,
        },
        moodInput: {
          flex: 1,
          fontFamily: fonts.edensor.italic,
          fontSize: 16,
          color: colors.white,
          padding: 0,
        },
        notebookBtn: {
          flexShrink: 0,
          width: 30,
          height: 30,
          borderRadius: 9,
          backgroundColor: 'rgba(255, 255, 255, 0.10)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.18)',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        },
        notebookBadge: {
          position: 'absolute',
          top: -3,
          right: -3,
          width: 11,
          height: 11,
          borderRadius: 6,
          backgroundColor: NOTEBOOK_BADGE_PINK,
          borderWidth: 1,
          borderColor: '#110428',
          alignItems: 'center',
          justifyContent: 'center',
        },
        notebookBadgeText: {
          color: colors.white,
          // Badge text on a colored pill bg — sub-12pt is acceptable for
          // a 10pt badge digit, but bumping to 11 still fits and aligns
          // with the so-cn9 floor.
          fontSize: 11,
          lineHeight: 11,
          fontFamily: fonts.outfit.bold,
        },

        // SoulBar block
        soulBarBlock: {
          marginTop: 14,
          paddingTop: 14,
          paddingHorizontal: 14,
          paddingBottom: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.16)',
        },
        soulBarHeaderRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        },
        soulBarTitleGroup: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        soulBarTitle: {
          fontFamily: fonts.outfit.bold,
          fontSize: 14,
          letterSpacing: 0.2,
          color: colors.white,
        },
        soulBarInfoBadge: {
          width: 14,
          height: 14,
          borderRadius: 7,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.16)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        soulBarInfoText: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 11,
          lineHeight: 14,
          // 0.78 → text.secondary (dark = 0.7) — slight drop, tokenized
          color: colors.text.secondary,
        },
        soulBarCounter: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 13,
          color: colors.white,
        },
        soulBarCounterTotal: {
          opacity: 0.55,
        },
        soulBarSegments: {
          flexDirection: 'row',
          gap: 6,
        },
        soulBarSeg: {
          flex: 1,
          height: 12,
          borderRadius: 4,
        },
        soulBarSegFilled: {
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.25)',
          shadowColor: SOULBAR_TEAL,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 8,
          elevation: 3,
        },
        soulBarSegEmpty: {
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.16)',
        },
        soulBarFooter: {
          marginTop: 8,
          flexDirection: 'row',
          // so-cvs: footer is single-cell after dropping the 'Filled X time(s)
          // this week' label — anchor the remaining status message to the right.
          justifyContent: 'flex-end',
        },
        soulBarFooterRight: {
          fontFamily: fonts.edensor.italic,
          fontSize: 12,
          color: colors.text.secondary,
        },
        // so-o61: visible only when SoulBar is full (6/6). Sits above the
        // footer row so the user gets explicit cue beyond the counter.
        soulBarAvailableText: {
          marginTop: 10,
          fontFamily: fonts.outfit.semiBold,
          fontSize: 13,
          color: SOULBAR_TEAL,
          textAlign: 'center',
        },
        // so-o61: in-place expand of the (i) badge — collapsed by default.
        soulBarInfoCopy: {
          marginTop: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.10)',
          fontFamily: fonts.outfit.regular,
          fontSize: 13,
          lineHeight: 13 * 1.5,
          color: colors.text.secondary,
        },

        // Charge Up grid wrap
        chargeUpWrap: {
          marginTop: 16,
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
          color: colors.text.secondary,
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
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 6,
        },
        tabIcon: {
          width: 28,
          height: 26,
          tintColor: colors.white,
        },
        tabIconInactive: {
          width: 33,
          height: 30,
          opacity: 0.4,
          tintColor: colors.white,
        },
        activeTabLabel: {
          fontFamily: fonts.edensor.bold,
          fontSize: 12,
          lineHeight: 12 * 1.4,
          color: colors.text.primary,
          marginTop: 2,
        },
      }),
    [colors]
  );

  const lt = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          paddingHorizontal: CARD_HORIZONTAL_MARGIN,
        },

        // Greeting Hero card (so-c0o, light) — canonical home-v2 design
        welcomeCard: {
          borderRadius: 24,
          padding: 18,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: 'rgba(79, 23, 134, 0.10)',
        },
        greetingTopRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          position: 'relative',
        },
        avatarBtn: {
          flexShrink: 0,
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'flex-end',
          overflow: 'hidden',
        },
        avatarBtnDark: {
          backgroundColor: '#5A674E',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        avatarBtnLight: {
          backgroundColor: '#A6BD7B',
          borderWidth: 1,
          borderColor: 'rgba(79, 23, 134, 0.08)',
        },
        avatarImg: {
          width: 56,
          height: 56,
          marginBottom: -2,
        },
        greetingTextSection: {
          flex: 1,
          minWidth: 0,
        },
        welcomeLine: {
          fontFamily: fonts.edensor.regular,
          fontSize: 28,
          lineHeight: 28 * 1.05,
          // #3A0E66 → colors.text.primary (#4F1786, brand canonical)
          color: colors.text.primary,
          letterSpacing: -0.2,
        },
        settingsBtn: {
          flexShrink: 0,
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderWidth: 1,
          borderColor: 'rgba(79, 23, 134, 0.10)',
          alignItems: 'center',
          justifyContent: 'center',
        },

        // Daily feeling block
        moodBlock: {
          marginTop: 18,
        },
        moodLabel: {
          fontFamily: fonts.outfit.medium,
          fontSize: 12,
          letterSpacing: 0.4,
          color: 'rgba(58, 14, 102, 0.7)',
          marginBottom: 6,
        },
        moodInputRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: '#F5F0FB',
          borderWidth: 1,
          borderColor: 'rgba(79, 23, 134, 0.08)',
          borderRadius: 14,
          paddingVertical: 11,
          paddingHorizontal: 14,
        },
        moodInput: {
          flex: 1,
          fontFamily: fonts.edensor.italic,
          fontSize: 16,
          color: colors.text.primary,
          padding: 0,
        },
        notebookBtn: {
          flexShrink: 0,
          width: 30,
          height: 30,
          borderRadius: 9,
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: 'rgba(79, 23, 134, 0.12)',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        },
        notebookBadge: {
          position: 'absolute',
          top: -3,
          right: -3,
          width: 11,
          height: 11,
          borderRadius: 6,
          backgroundColor: NOTEBOOK_BADGE_PINK,
          borderWidth: 1,
          borderColor: colors.white,
          alignItems: 'center',
          justifyContent: 'center',
        },
        notebookBadgeText: {
          color: colors.white,
          // 10 → 11 per audit floor (badge sits on opaque pink — still legible)
          fontSize: 11,
          lineHeight: 11,
          fontFamily: fonts.outfit.bold,
        },

        // SoulBar block
        soulBarBlock: {
          marginTop: 14,
          paddingTop: 14,
          paddingHorizontal: 14,
          paddingBottom: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(79, 23, 134, 0.10)',
        },
        soulBarHeaderRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        },
        soulBarTitleGroup: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        soulBarTitle: {
          fontFamily: fonts.outfit.bold,
          fontSize: 14,
          letterSpacing: 0.2,
          color: colors.text.primary,
        },
        soulBarInfoBadge: {
          width: 14,
          height: 14,
          borderRadius: 7,
          borderWidth: 1,
          borderColor: 'rgba(79, 23, 134, 0.10)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        soulBarInfoText: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 11,
          lineHeight: 14,
          color: 'rgba(58, 14, 102, 0.7)',
        },
        soulBarCounter: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 13,
          color: colors.text.primary,
        },
        soulBarCounterTotal: {
          opacity: 0.55,
        },
        soulBarSegments: {
          flexDirection: 'row',
          gap: 6,
        },
        soulBarSeg: {
          flex: 1,
          height: 12,
          borderRadius: 4,
        },
        soulBarSegFilled: {
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.25)',
          shadowColor: SOULBAR_TEAL,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 8,
          elevation: 3,
        },
        soulBarSegEmpty: {
          backgroundColor: 'rgba(79, 23, 134, 0.08)',
          borderWidth: 1,
          borderColor: 'rgba(79, 23, 134, 0.10)',
        },
        soulBarFooter: {
          marginTop: 8,
          flexDirection: 'row',
          // so-cvs: single-cell footer post-label-removal — right-anchor the status.
          justifyContent: 'flex-end',
        },
        soulBarFooterRight: {
          fontFamily: fonts.edensor.italic,
          fontSize: 12,
          color: 'rgba(58, 14, 102, 0.7)',
        },
        // so-o61: visible only when SoulBar is full (6/6).
        soulBarAvailableText: {
          marginTop: 10,
          fontFamily: fonts.outfit.semiBold,
          fontSize: 13,
          color: colors.primary,
          textAlign: 'center',
        },
        // so-o61: in-place expand of the (i) badge — collapsed by default.
        soulBarInfoCopy: {
          marginTop: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: 'rgba(58,14,102,0.10)',
          fontFamily: fonts.outfit.regular,
          fontSize: 13,
          lineHeight: 13 * 1.5,
          color: 'rgba(58, 14, 102, 0.85)',
        },

        // Charge Up grid wrap
        chargeUpWrap: {
          marginTop: 16,
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
          color: colors.primary,
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
          color: colors.primary,
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
          color: colors.primary,
          marginTop: 2,
        },
      }),
    [colors]
  );

  // Refresh soul bar and mood whenever Home screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchSoulBar();
      JournalService.getTodayMood()
        .then((data) => {
          if (data.mood_word) {
            setMoodWord(data.mood_word);
            setMoodSaved(true);
          }
        })
        .catch(() => {});
    }, [fetchSoulBar])
  );

  // Tab bar animation
  const tabTranslateY = useSharedValue(0);

  // Tab rise and label animations: Home=0, Journal=1, Profile=2
  const TAB_POSITIONS: Record<TabName, number> = { Home: 0, Journal: 1, Profile: 2 };
  const tabRiseValues = [useSharedValue(-20), useSharedValue(0), useSharedValue(0)];
  const tabLabelOpacities = [useSharedValue(1), useSharedValue(0), useSharedValue(0)];

  // SoulPal avatar animation — bob (3.6s ease-in-out) + blink every ~4.2s
  const palBobY = useSharedValue(0);
  const palBlinkScaleY = useSharedValue(1);


  useEffect(() => {
    const loadLocalName = async () => {
      const stored = await AsyncStorage.getItem('@soultalk_username');
      if (stored) setLocalName(stored);
    };
    loadLocalName();
  }, []);

  // SoulPal bob + blink (canonical GreetingHero).
  useEffect(() => {
    palBobY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    // Blink: every 4.2s, eyes squeeze shut for 140ms.
    const blinkId = setInterval(() => {
      palBlinkScaleY.value = withSequence(
        withTiming(0.05, { duration: 70 }),
        withTiming(1, { duration: 70 }),
      );
    }, 4200);

    return () => clearInterval(blinkId);
  }, []);

  const palBobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: palBobY.value }],
  }));
  const palBlinkStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: palBlinkScaleY.value }],
  }));

  const handleMoodChange = useCallback((text: string) => {
    // Allow only alphabetic characters, no spaces or special chars
    const sanitized = text.replace(/[^a-zA-Z]/g, '');
    setMoodWord(sanitized);
  }, []);

  const submitMoodWord = useCallback(async () => {
    const word = moodWord.trim();
    if (!word) return;
    try {
      await JournalService.upsertTodayMood(word);
      setMoodSaved(true);
      fetchSoulBar();
    } catch (e) {
      console.warn('[Mood] Failed to persist mood:', e);
    }
  }, [fetchSoulBar]);

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
      <CosmicScreen tone="night">
        <ScrollView
          style={[dk.scrollView, { paddingTop: insets.top + 10 }]}
          contentContainerStyle={dk.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting Hero (so-c0o) — canonical home-v2 design */}
          <View style={dk.welcomeCard}>
            {/* Top row: avatar + welcome + settings cog */}
            <View style={dk.greetingTopRow}>
              {/* TODO(so-c0o): no SoulPal route exists yet — avatar tap is a no-op for now (FYI lead). */}
              <Animated.View style={[dk.avatarBtn, dk.avatarBtnDark, palBobStyle]}>
                <Animated.Image
                  source={Soulpal5}
                  style={[dk.avatarImg, palBlinkStyle]}
                  resizeMode="contain"
                />
              </Animated.View>
              <View style={dk.greetingTextSection}>
                <Text style={dk.welcomeLine}>Welcome back,</Text>
                <Text style={dk.welcomeLine}>{displayName}.</Text>
              </View>
              <Pressable
                style={dk.settingsBtn}
                onPress={() => navigation.navigate('Settings')}
                accessibilityLabel="Settings"
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
                    fill="#fff"
                  />
                  <Path
                    d="M19.4 13.6c.04-.5.06-1 .06-1.6s-.02-1.1-.06-1.6l2-1.5a.5.5 0 00.12-.65l-1.9-3.3a.5.5 0 00-.6-.22l-2.35.95a7 7 0 00-2.7-1.55l-.36-2.5a.5.5 0 00-.5-.43h-3.8a.5.5 0 00-.5.43l-.36 2.5a7 7 0 00-2.7 1.55l-2.35-.95a.5.5 0 00-.6.22l-1.9 3.3a.5.5 0 00.12.65l2 1.5c-.04.5-.06 1-.06 1.6s.02 1.1.06 1.6l-2 1.5a.5.5 0 00-.12.65l1.9 3.3a.5.5 0 00.6.22l2.35-.95a7 7 0 002.7 1.55l.36 2.5c.04.25.25.43.5.43h3.8c.25 0 .46-.18.5-.43l.36-2.5a7 7 0 002.7-1.55l2.35.95c.23.09.5 0 .6-.22l1.9-3.3a.5.5 0 00-.12-.65l-2-1.5z"
                    stroke="#fff"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </Pressable>
            </View>

            {/* Daily feeling block */}
            <View style={dk.moodBlock}>
              <Text style={dk.moodLabel}>
                {hasEntryToday ? "You've written today!" : 'Today, I am feeling…'}
              </Text>
              <View style={dk.moodInputRow}>
                <TextInput
                  style={dk.moodInput}
                  placeholder={hasEntryToday ? 'Come back tomorrow' : 'One word…'}
                  placeholderTextColor="rgba(255, 255, 255, 0.45)"
                  value={hasEntryToday ? '' : moodWord}
                  onChangeText={handleMoodChange}
                  onSubmitEditing={submitMoodWord}
                  onBlur={() => moodWord.trim() && submitMoodWord()}
                  maxLength={50}
                  returnKeyType="done"
                  editable={!moodSaved && !hasEntryToday}
                  autoCorrect={false}
                />
                <Pressable
                  style={[dk.notebookBtn, hasEntryToday && { opacity: 0.45 }]}
                  onPress={
                    hasEntryToday
                      ? undefined
                      : () => navigation.navigate('CreateJournal')
                  }
                  disabled={hasEntryToday}
                  accessibilityLabel={
                    hasEntryToday
                      ? 'Already journaled today, come back tomorrow'
                      : 'Open journal'
                  }
                  accessibilityState={{ disabled: hasEntryToday }}
                >
                  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                    <Rect
                      x={3}
                      y={2.5}
                      width={9}
                      height={11}
                      rx={1.2}
                      stroke="#fff"
                      strokeWidth={1.2}
                    />
                    <Line x1={3} y1={5} x2={2} y2={5} stroke="#fff" strokeWidth={1.2} />
                    <Line x1={3} y1={8} x2={2} y2={8} stroke="#fff" strokeWidth={1.2} />
                    <Line x1={3} y1={11} x2={2} y2={11} stroke="#fff" strokeWidth={1.2} />
                    <Line
                      x1={5.5}
                      y1={6}
                      x2={9.5}
                      y2={6}
                      stroke="#fff"
                      strokeWidth={1}
                      strokeLinecap="round"
                    />
                    <Line
                      x1={5.5}
                      y1={8.5}
                      x2={8.5}
                      y2={8.5}
                      stroke="#fff"
                      strokeWidth={1}
                      strokeLinecap="round"
                    />
                  </Svg>
                  <View style={dk.notebookBadge}>
                    <Text style={dk.notebookBadgeText}>+</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* SoulBar block */}
            <LinearGradient
              colors={['rgba(112, 202, 207, 0.10)', 'rgba(126, 91, 217, 0.10)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={dk.soulBarBlock}
            >
              <View style={dk.soulBarHeaderRow}>
                <View style={dk.soulBarTitleGroup}>
                  <Text style={dk.soulBarTitle}>SoulBar</Text>
                  <Pressable
                    onPress={() => setSoulBarInfoOpen((prev) => !prev)}
                    hitSlop={8}
                    style={dk.soulBarInfoBadge}
                    accessibilityLabel={
                      soulBarInfoOpen
                        ? 'Hide SoulBar description'
                        : 'Show SoulBar description'
                    }
                    accessibilityRole="button"
                    accessibilityState={{ expanded: soulBarInfoOpen }}
                  >
                    <Text style={dk.soulBarInfoText}>i</Text>
                  </Pressable>
                </View>
                <Text style={dk.soulBarCounter}>
                  {soulBarFilled}
                  <Text style={dk.soulBarCounterTotal}>/{SOUL_BAR_SEGMENTS}</Text>
                </Text>
              </View>
              <View style={dk.soulBarSegments}>
                {Array.from({ length: SOUL_BAR_SEGMENTS }).map((_, i) =>
                  i < soulBarFilled ? (
                    <LinearGradient
                      key={i}
                      colors={[SOULBAR_TEAL, SOULBAR_PINK]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[dk.soulBarSeg, dk.soulBarSegFilled]}
                    />
                  ) : (
                    <View key={i} style={[dk.soulBarSeg, dk.soulBarSegEmpty]} />
                  )
                )}
              </View>
              {soulBarFilled >= SOUL_BAR_SEGMENTS && (
                <Text style={dk.soulBarAvailableText}>
                  You have a SoulSight available!
                </Text>
              )}
              <View style={dk.soulBarFooter}>
                <Text style={dk.soulBarFooterRight}>
                  {soulBarFilled >= SOUL_BAR_SEGMENTS
                    ? 'cycle complete ✦'
                    : `${soulBarRemaining} more to charge`}
                </Text>
              </View>
              {soulBarInfoOpen && (
                <Text style={dk.soulBarInfoCopy}>
                  Each reflection fills a bar. After six, your SoulSight is ready when you are. Read it now, let entries keep stacking, or wait for a moment that feels meaningful. There's no right time, only yours.
                </Text>
              )}
            </LinearGradient>
          </View>

          {/* Charge Up — 5-card grid */}
          <View style={dk.chargeUpWrap}>
            <ChargeUpGrid
              theme="dark"
              onMirrorPress={handleAffirmationPress}
              onPersonalityPress={() => navigation.navigate('PersonalityHub')}
              onShiftsPress={() => navigation.navigate('SoulShifts')}
              onSignalsPress={() => navigation.navigate('SoulSignals')}
              onSightsPress={() => navigation.navigate('SoulSight')}
            />
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
      </CosmicScreen>
    );
  }

  // ─── LIGHT MODE (original design) ────────────────────────────────────
  return (
    <CosmicScreen tone="night">
      <ScrollView
        style={[lt.scrollView, { paddingTop: insets.top + 10 }]}
        contentContainerStyle={lt.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Hero (so-c0o) — canonical home-v2 design */}
        <View style={lt.welcomeCard}>
          {/* Top row: avatar + welcome + settings cog */}
          <View style={lt.greetingTopRow}>
            {/* TODO(so-c0o): no SoulPal route exists yet — avatar tap is a no-op for now (FYI lead). */}
            <Animated.View style={[lt.avatarBtn, lt.avatarBtnLight, palBobStyle]}>
              <Animated.Image
                source={Soulpal5}
                style={[lt.avatarImg, palBlinkStyle]}
                resizeMode="contain"
              />
            </Animated.View>
            <View style={lt.greetingTextSection}>
              <Text style={lt.welcomeLine}>Welcome back,</Text>
              <Text style={lt.welcomeLine}>{displayName}.</Text>
            </View>
            <Pressable
              style={lt.settingsBtn}
              onPress={() => navigation.navigate('Settings')}
              accessibilityLabel="Settings"
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
                  fill="#4F1786"
                />
                <Path
                  d="M19.4 13.6c.04-.5.06-1 .06-1.6s-.02-1.1-.06-1.6l2-1.5a.5.5 0 00.12-.65l-1.9-3.3a.5.5 0 00-.6-.22l-2.35.95a7 7 0 00-2.7-1.55l-.36-2.5a.5.5 0 00-.5-.43h-3.8a.5.5 0 00-.5.43l-.36 2.5a7 7 0 00-2.7 1.55l-2.35-.95a.5.5 0 00-.6.22l-1.9 3.3a.5.5 0 00.12.65l2 1.5c-.04.5-.06 1-.06 1.6s.02 1.1.06 1.6l-2 1.5a.5.5 0 00-.12.65l1.9 3.3a.5.5 0 00.6.22l2.35-.95a7 7 0 002.7 1.55l.36 2.5c.04.25.25.43.5.43h3.8c.25 0 .46-.18.5-.43l.36-2.5a7 7 0 002.7-1.55l2.35.95c.23.09.5 0 .6-.22l1.9-3.3a.5.5 0 00-.12-.65l-2-1.5z"
                  stroke="#4F1786"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </Pressable>
          </View>

          {/* Daily feeling block */}
          <View style={lt.moodBlock}>
            <Text style={lt.moodLabel}>
              {hasEntryToday ? "You've written today!" : 'Today, I am feeling…'}
            </Text>
            <View style={lt.moodInputRow}>
              <TextInput
                style={lt.moodInput}
                placeholder={hasEntryToday ? 'Come back tomorrow' : 'One word…'}
                placeholderTextColor="rgba(79, 23, 134, 0.45)"
                value={hasEntryToday ? '' : moodWord}
                onChangeText={handleMoodChange}
                onSubmitEditing={submitMoodWord}
                onBlur={() => moodWord.trim() && submitMoodWord()}
                maxLength={50}
                returnKeyType="done"
                editable={!moodSaved && !hasEntryToday}
                autoCorrect={false}
              />
              <Pressable
                style={[lt.notebookBtn, hasEntryToday && { opacity: 0.45 }]}
                onPress={
                  hasEntryToday
                    ? undefined
                    : () => navigation.navigate('CreateJournal')
                }
                disabled={hasEntryToday}
                accessibilityLabel={
                  hasEntryToday
                    ? 'Already journaled today, come back tomorrow'
                    : 'Open journal'
                }
                accessibilityState={{ disabled: hasEntryToday }}
              >
                <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                  <Rect
                    x={3}
                    y={2.5}
                    width={9}
                    height={11}
                    rx={1.2}
                    stroke="#4F1786"
                    strokeWidth={1.2}
                  />
                  <Line x1={3} y1={5} x2={2} y2={5} stroke="#4F1786" strokeWidth={1.2} />
                  <Line x1={3} y1={8} x2={2} y2={8} stroke="#4F1786" strokeWidth={1.2} />
                  <Line x1={3} y1={11} x2={2} y2={11} stroke="#4F1786" strokeWidth={1.2} />
                  <Line
                    x1={5.5}
                    y1={6}
                    x2={9.5}
                    y2={6}
                    stroke="#4F1786"
                    strokeWidth={1}
                    strokeLinecap="round"
                  />
                  <Line
                    x1={5.5}
                    y1={8.5}
                    x2={8.5}
                    y2={8.5}
                    stroke="#4F1786"
                    strokeWidth={1}
                    strokeLinecap="round"
                  />
                </Svg>
                <View style={lt.notebookBadge}>
                  <Text style={lt.notebookBadgeText}>+</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* SoulBar block */}
          <LinearGradient
            colors={['#FBF6FF', '#F5F0FB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={lt.soulBarBlock}
          >
            <View style={lt.soulBarHeaderRow}>
              <View style={lt.soulBarTitleGroup}>
                <Text style={lt.soulBarTitle}>SoulBar</Text>
                <Pressable
                  onPress={() => setSoulBarInfoOpen((prev) => !prev)}
                  hitSlop={8}
                  style={lt.soulBarInfoBadge}
                  accessibilityLabel={
                    soulBarInfoOpen
                      ? 'Hide SoulBar description'
                      : 'Show SoulBar description'
                  }
                  accessibilityRole="button"
                  accessibilityState={{ expanded: soulBarInfoOpen }}
                >
                  <Text style={lt.soulBarInfoText}>i</Text>
                </Pressable>
              </View>
              <Text style={lt.soulBarCounter}>
                {soulBarFilled}
                <Text style={lt.soulBarCounterTotal}>/{SOUL_BAR_SEGMENTS}</Text>
              </Text>
            </View>
            <View style={lt.soulBarSegments}>
              {Array.from({ length: SOUL_BAR_SEGMENTS }).map((_, i) =>
                i < soulBarFilled ? (
                  <LinearGradient
                    key={i}
                    colors={[SOULBAR_TEAL, SOULBAR_PINK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[lt.soulBarSeg, lt.soulBarSegFilled]}
                  />
                ) : (
                  <View key={i} style={[lt.soulBarSeg, lt.soulBarSegEmpty]} />
                )
              )}
            </View>
            {soulBarFilled >= SOUL_BAR_SEGMENTS && (
              <Text style={lt.soulBarAvailableText}>
                You have a SoulSight available!
              </Text>
            )}
            <View style={lt.soulBarFooter}>
              <Text style={lt.soulBarFooterRight}>
                {soulBarFilled >= SOUL_BAR_SEGMENTS
                  ? 'cycle complete ✦'
                  : `${soulBarRemaining} more to charge`}
              </Text>
            </View>
            {soulBarInfoOpen && (
              <Text style={lt.soulBarInfoCopy}>
                Each reflection fills a bar. After six, your SoulSight is ready when you are. Read it now, let entries keep stacking, or wait for a moment that feels meaningful. There's no right time, only yours.
              </Text>
            )}
          </LinearGradient>
        </View>

        {/* Charge Up — 5-card grid */}
        <View style={lt.chargeUpWrap}>
          <ChargeUpGrid
            theme="light"
            onMirrorPress={handleAffirmationPress}
            onPersonalityPress={() => navigation.navigate('PersonalityHub')}
            onShiftsPress={() => navigation.navigate('SoulShifts')}
            onSignalsPress={() => navigation.navigate('SoulSignals')}
            onSightsPress={() => navigation.navigate('SoulSight')}
          />
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
    </CosmicScreen>
  );
};


export default HomeScreen;
