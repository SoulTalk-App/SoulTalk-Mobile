import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts, surfaces, useThemeColors } from '../theme';
import { useJournal } from '../contexts/JournalContext';
import { useTheme } from '../contexts/ThemeContext';
import JournalService, { JournalEntry } from '../services/JournalService';
import SoulPalAnimated from '../components/SoulPalAnimated';

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');

// Rich star field
const ENTRY_STARS = Array.from({ length: 45 }, (_, i) => ({
  left: ((i * 43 + 17) % 100),
  top: ((i * 61 + 9) % 100),
  size: i < 3 ? 2.5 : i < 6 ? 1.8 : (i % 4 === 0) ? 1.4 : 0.8,
  opacity: i < 3 ? 0.5 : i < 6 ? 0.3 : (0.07 + (i % 5) * 0.05),
}));

// Shooting star
const ENTRY_METEOR = { startLeft: 25, startTop: 5, length: 38, angle: 35 };

const JournalEntryScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { entries } = useJournal();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const dk = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        content: { flex: 1, paddingHorizontal: 22 },
        nebula: { position: 'absolute', width: 260, height: 260, top: -30, right: -60, borderRadius: 130 },
        nebulaFill: { width: '100%', height: '100%', borderRadius: 130 },
        planet: { position: 'absolute', borderRadius: 999, overflow: 'hidden' },
        // TODO(theme): map 'rgba(77, 67, 104, 0.12)' to palette key (planet1 ring)
        planet1: { width: 110, height: 110, top: 50, right: -28, borderWidth: 1, borderColor: 'rgba(77, 67, 104, 0.12)' },
        // TODO(theme): map 'rgba(112, 202, 207, 0.10)' to palette key (planet2 ring)
        planet2: { width: 45, height: 45, bottom: '20%', left: -12, borderWidth: 1, borderColor: 'rgba(112, 202, 207, 0.10)' },
        planetFill: { ...StyleSheet.absoluteFillObject, borderRadius: 999 },
        // TODO(theme): map 'rgba(255, 255, 255, 0.18)' (planet highlight) to palette key
        planetHighlight: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.18)' },
        // TODO(theme): map 'rgba(112, 202, 207, 0.16)' to palette key
        planetRing: { position: 'absolute', width: '180%', height: 10, top: '44%', left: '-40%', borderRadius: 999, borderWidth: 1.2, borderColor: 'rgba(112, 202, 207, 0.16)', transform: [{ rotate: '-22deg' }] },
        meteor: { position: 'absolute', height: 2, borderRadius: 1 },
        meteorTrail: { width: '100%', height: '100%', borderRadius: 1 },
        // TODO(theme): map 'rgba(160, 155, 180, 0.12)' (asteroid) to palette key
        asteroid: { position: 'absolute', backgroundColor: 'rgba(160, 155, 180, 0.12)', borderRadius: 1.5, transform: [{ rotate: '20deg' }] },
        backRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
        backIcon: { width: 36, height: 36 },
        backText: { fontFamily: fonts.outfit.semiBold, fontSize: 24, color: colors.white },
        titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
        titleText: { fontFamily: fonts.edensor.bold, fontSize: 26, color: colors.white, flex: 1 },
        // TODO(theme): map 'rgba(77, 232, 212, 0.10)' to palette key (edit btn bg)
        editBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(77, 232, 212, 0.10)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(77, 232, 212, 0.25)' },
        editBtnText: { fontFamily: fonts.outfit.medium, fontSize: 13, color: colors.primary },
        editBtnDisabled: { opacity: 0.4 },
        // TODO(theme): map 'rgba(255, 255, 255, 0.08)' (ai card bg) and 'rgba(112, 202, 207, 0.20)' (border) to palette keys
        aiCard: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(112, 202, 207, 0.20)', padding: 18, marginBottom: 16 },
        aiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
        aiLabel: { fontFamily: fonts.edensor.bold, fontSize: 16, color: colors.primary },
        // TODO(theme): map 'rgba(255, 255, 255, 0.88)' (ai text) to palette key
        aiText: { fontFamily: fonts.outfit.light, fontSize: 15, lineHeight: 15 * 1.65, color: 'rgba(255, 255, 255, 0.88)', marginBottom: 14 },
        pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
        // TODO(theme): map 'rgba(255, 255, 255, 0.08)' (topic pill bg) to palette key
        topicPill: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
        // TODO(theme): map 'rgba(255, 255, 255, 0.8)' to palette key
        pillText: { fontFamily: fonts.outfit.medium, fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' },
        // TODO(theme): map 'rgba(77, 232, 212, 0.7)' (coping label) to palette key
        copingLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 12, color: 'rgba(77, 232, 212, 0.7)', marginBottom: 6 },
        // TODO(theme): map 'rgba(77, 232, 212, 0.08)' / '0.20' (coping pill) to palette keys
        copingPill: { backgroundColor: 'rgba(77, 232, 212, 0.08)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(77, 232, 212, 0.20)' },
        aiLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
        // TODO(theme): map 'rgba(255, 255, 255, 0.45)' to palette key
        aiLoadingText: { fontFamily: fonts.outfit.light, fontSize: 14, color: 'rgba(255, 255, 255, 0.45)', fontStyle: 'italic' },
        // TODO(theme): map 'rgba(255, 255, 255, 0.06)' / '0.10' (entry card) to palette keys
        entryCard: { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.10)', padding: 20 },
        // TODO(theme): map 'rgba(255, 255, 255, 0.5)' to palette key
        entryLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 14, color: 'rgba(255, 255, 255, 0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
        // TODO(theme): map 'rgba(255, 255, 255, 0.88)' to palette key
        entryText: { fontFamily: fonts.edensor.medium, fontSize: 17, lineHeight: 17 * 1.65, color: 'rgba(255, 255, 255, 0.88)' },
      }),
    [colors],
  );
  const lt = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        content: { flex: 1, paddingHorizontal: 22 },
        backRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
        backIcon: { width: 36, height: 36 },
        backText: { fontFamily: fonts.outfit.semiBold, fontSize: 24, color: colors.white },
        titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
        titleText: { fontFamily: fonts.outfit.regular, fontSize: 24, color: colors.white, flex: 1 },
        // TODO(theme): map 'rgba(255, 255, 255, 0.15)' to palette key
        actionBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 16 },
        actionBtnText: { fontFamily: fonts.outfit.medium, fontSize: 13, color: colors.white },
        actionBtnDisabled: { opacity: 0.5 },
        contentCard: { flex: 1, backgroundColor: colors.white, borderRadius: 10, padding: 20 },
        scrollContent: { flexGrow: 1 },
        aiSection: { marginBottom: 16 },
        // TODO(theme): map '#E0D4E8' (light divider) to palette key
        aiDivider: { height: 1, backgroundColor: '#E0D4E8', marginBottom: 14 },
        aiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
        // TODO(theme): map '#59168B' to palette key
        aiLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 14, color: '#59168B' },
        // TODO(theme): map '#333333' (light body text) to palette key
        aiText: { fontFamily: fonts.outfit.light, fontSize: 14, lineHeight: 14 * 1.6, color: '#333333', marginBottom: 12 },
        pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
        // TODO(theme): map '#F3ECFA' to palette key
        topicPill: { backgroundColor: '#F3ECFA', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
        // TODO(theme): map '#59168B' to palette key
        pillText: { fontFamily: fonts.outfit.medium, fontSize: 12, color: '#59168B' },
        // TODO(theme): map '#59168B' to palette key
        copingLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 12, color: '#59168B', marginBottom: 4 },
        // TODO(theme): map '#E8F5E9' / '#2E7D32' (coping green) to palette keys
        copingPill: { backgroundColor: '#E8F5E9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
        copingPillText: { fontFamily: fonts.outfit.medium, fontSize: 12, color: '#2E7D32' },
        aiLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        // TODO(theme): map '#888' to palette key (light loading text)
        aiLoadingText: { fontFamily: fonts.outfit.light, fontSize: 13, color: '#888', fontStyle: 'italic' },
        // TODO(theme): map '#59168B' to palette key
        journalLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 14, color: '#59168B', marginTop: 14, marginBottom: 8 },
        // TODO(theme): map '#333333' to palette key
        journalText: { fontFamily: fonts.outfit.thin, fontSize: 14, lineHeight: 14 * 1.6, color: '#333333' },
      }),
    [colors],
  );
  const entryId: string = route.params?.entryId;
  const isLatest: boolean = route.params?.isLatest ?? false;

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [soulPalName, setSoulPalName] = useState('SoulTalk Reflection');

  useEffect(() => {
    AsyncStorage.getItem('@soultalk_soulpal_name').then((name) => {
      if (name) setSoulPalName(`${name}'s Reflection`);
    });
  }, []);

  useEffect(() => {
    JournalService.getEntry(entryId).then(setEntry).catch(() => {
      const found = entries.find((e) => e.id === entryId);
      if (found) setEntry(found);
    });
  }, [entryId]);

  useEffect(() => {
    const found = entries.find((e) => e.id === entryId);
    if (!found) return;
    // List endpoint doesn't include ai_response/tags — fetch detail if needed
    if (found.ai_processing_status === 'complete' && !entry?.ai_response) {
      JournalService.getEntry(entryId).then(setEntry).catch(() => {});
    } else if (found.ai_response) {
      setEntry(found);
    }
  }, [entries]);

  useEffect(() => {
    if (!entry || entry.ai_processing_status === 'complete' || entry.ai_processing_status === 'failed' || entry.is_draft) return;
    const interval = setInterval(async () => {
      try {
        const fresh = await JournalService.getEntry(entryId);
        if (fresh.ai_processing_status === 'complete' || fresh.ai_processing_status === 'failed') {
          setEntry(fresh);
          clearInterval(interval);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [entry?.ai_processing_status, entryId]);

  // Space backdrop animations (dark mode only)
  const planet1Y = useSharedValue(0);
  const planet2Y = useSharedValue(0);
  const nebulaScale = useSharedValue(1);
  const meteorOp = useSharedValue(0);
  const meteorTX = useSharedValue(0);
  const meteorTY = useSharedValue(0);

  useEffect(() => {
    if (!isDarkMode) return;

    planet1Y.value = withRepeat(withSequence(
      withTiming(-14, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
      withTiming(14, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    planet2Y.value = withRepeat(withSequence(
      withTiming(10, { duration: 3800, easing: Easing.inOut(Easing.sin) }),
      withTiming(-10, { duration: 3800, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    nebulaScale.value = withRepeat(withSequence(
      withTiming(1.06, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);

    const rad = (ENTRY_METEOR.angle * Math.PI) / 180;
    const dx = Math.cos(rad) * ENTRY_METEOR.length * 3;
    const dy = Math.sin(rad) * ENTRY_METEOR.length * 3;
    const fire = () => {
      meteorOp.value = 0; meteorTX.value = 0; meteorTY.value = 0;
      meteorOp.value = withDelay(0, withSequence(
        withTiming(1, { duration: 100 }), withTiming(1, { duration: 500 }), withTiming(0, { duration: 300 }),
      ));
      meteorTX.value = withDelay(0, withTiming(dx, { duration: 900, easing: Easing.out(Easing.quad) }));
      meteorTY.value = withDelay(0, withTiming(dy, { duration: 900, easing: Easing.out(Easing.quad) }));
    };
    fire();
    const interval = setInterval(fire, 15000);
    return () => clearInterval(interval);
  }, [isDarkMode]);

  const planet1Style = useAnimatedStyle(() => ({ transform: [{ translateY: planet1Y.value }] }));
  const planet2Style = useAnimatedStyle(() => ({ transform: [{ translateY: planet2Y.value }] }));
  const nebulaAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: nebulaScale.value }] }));
  const meteorStyle = useAnimatedStyle(() => ({
    opacity: meteorOp.value, transform: [{ translateX: meteorTX.value }, { translateY: meteorTY.value }],
  }));

  const editCount = entry?.edit_count ?? 0;
  const canEdit = isLatest && editCount < 3;

  const handleEdit = () => {
    if (!entry || !canEdit) return;
    navigation.navigate('CreateJournal', { entry });
  };

  const renderDarkBackdrop = () => (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[dk.nebula, nebulaAnimStyle]}>
        <LinearGradient
          colors={['rgba(77, 67, 104, 0.18)', 'rgba(61, 51, 85, 0.08)', 'transparent']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0, y: 0 }}
          style={dk.nebulaFill}
        />
      </Animated.View>
      {ENTRY_STARS.map((st, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: `${st.left}%` as any,
            top: `${st.top}%` as any,
            width: st.size,
            height: st.size,
            borderRadius: st.size,
            backgroundColor: '#FFFFFF',
            opacity: st.opacity,
          }}
        />
      ))}
      <Animated.View style={[dk.planet, dk.planet1, planet1Style]}>
        <LinearGradient
          colors={['rgba(77, 67, 104, 0.28)', 'rgba(77, 67, 104, 0.07)', 'rgba(0, 0, 0, 0.18)']}
          start={{ x: 0.2, y: 0.15 }}
          end={{ x: 0.9, y: 0.85 }}
          style={dk.planetFill}
        />
        <View style={[dk.planetHighlight, { top: '16%', left: '20%', width: 12, height: 12 }]} />
      </Animated.View>
      <Animated.View style={[dk.planet, dk.planet2, planet2Style]}>
        <LinearGradient
          colors={['rgba(112, 202, 207, 0.20)', 'rgba(112, 202, 207, 0.04)', 'rgba(0, 0, 0, 0.12)']}
          start={{ x: 0.25, y: 0.1 }}
          end={{ x: 0.85, y: 0.9 }}
          style={dk.planetFill}
        />
        <View style={[dk.planetHighlight, { top: '15%', left: '25%', width: 7, height: 7 }]} />
        <View style={dk.planetRing} />
      </Animated.View>
      <Animated.View
        style={[
          dk.meteor,
          { left: `${ENTRY_METEOR.startLeft}%` as any, top: `${ENTRY_METEOR.startTop}%` as any, width: ENTRY_METEOR.length, transform: [{ rotate: `${ENTRY_METEOR.angle}deg` }] },
          meteorStyle,
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.3)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={dk.meteorTrail}
        />
      </Animated.View>
      <View style={[dk.asteroid, { top: '18%', right: '8%', width: 4, height: 3 }]} />
      <View style={[dk.asteroid, { bottom: '25%', left: '5%', width: 3, height: 2 }]} />
    </View>
  );

  // ── Shared content helpers ──
  const renderAiSection = () => {
    if (entry!.ai_processing_status === 'complete') {
      return (
        <>
          <View style={isDarkMode ? dk.aiLabelRow : lt.aiLabelRow}>
            {isDarkMode && <SoulPalAnimated size={32} animate={false} />}
            <Text style={isDarkMode ? dk.aiLabel : lt.aiLabel}>{soulPalName}</Text>
          </View>
          {entry!.ai_response?.text ? (
            <Text style={isDarkMode ? dk.aiText : lt.aiText}>
              {entry!.ai_response.text.replace(/\*+/g, '')}
            </Text>
          ) : (
            <Text style={isDarkMode ? dk.aiLoadingText : lt.aiLoadingText}>No reflection available.</Text>
          )}
          {!entry!.tags?.crisis_flag && entry!.ai_response?.mode !== 'CRISIS_OVERRIDE' &&
            entry!.tags?.topics && entry!.tags.topics.length > 0 && (
            <View style={isDarkMode ? dk.pillRow : lt.pillRow}>
              {entry!.tags.topics.map((topic, idx) => (
                <View key={idx} style={isDarkMode ? dk.topicPill : lt.topicPill}>
                  <Text style={isDarkMode ? dk.pillText : lt.pillText}>{topic}</Text>
                </View>
              ))}
            </View>
          )}
          {!entry!.tags?.crisis_flag && entry!.ai_response?.mode !== 'CRISIS_OVERRIDE' &&
            entry!.tags?.coping_mechanisms && entry!.tags.coping_mechanisms.length > 0 && (
            <View>
              <Text style={isDarkMode ? dk.copingLabel : lt.copingLabel}>Coping</Text>
              <View style={isDarkMode ? dk.pillRow : lt.pillRow}>
                {entry!.tags.coping_mechanisms.map((mech, idx) => (
                  <View key={idx} style={isDarkMode ? dk.copingPill : lt.copingPill}>
                    <Text style={isDarkMode ? dk.pillText : lt.copingPillText}>{mech}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      );
    }
    if (entry!.ai_processing_status === 'failed') {
      return <Text style={isDarkMode ? dk.aiLoadingText : lt.aiLoadingText}>AI processing failed.</Text>;
    }
    return (
      <View style={isDarkMode ? dk.aiLoadingRow : lt.aiLoadingRow}>
        {/* TODO(theme): map light '#59168B' to palette key */}
        <ActivityIndicator color={isDarkMode ? colors.primary : '#59168B'} size="small" />
        <Text style={isDarkMode ? dk.aiLoadingText : lt.aiLoadingText}>Preparing your reflection...</Text>
      </View>
    );
  };

  // ════════════════════════════════════════
  // LOADING STATE
  // ════════════════════════════════════════
  if (!entry) {
    if (isDarkMode) {
      return (
        <LinearGradient colors={[...surfaces.entryGradient]} locations={[0, 0.3, 0.65, 1]} style={dk.container}>
          {renderDarkBackdrop()}
          <View style={[dk.content, { paddingTop: insets.top + 16 }]}>
            <Pressable style={dk.backRow} onPress={() => navigation.goBack()}>
              <Image source={BackIcon} style={dk.backIcon} resizeMode="contain" />
              <Text style={dk.backText}>Back</Text>
            </Pressable>
            <ActivityIndicator color={colors.primary} size="large" style={{ flex: 1 }} />
          </View>
        </LinearGradient>
      );
    }
    return (
      <LinearGradient colors={['#59168B', '#653495', '#59168B']} locations={[0, 0.5, 1]} style={lt.container}>
        <View style={[lt.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={lt.backRow} onPress={() => navigation.goBack()}>
            <Image source={BackIcon} style={lt.backIcon} resizeMode="contain" />
            <Text style={lt.backText}>Back</Text>
          </Pressable>
          <ActivityIndicator color={colors.white} size="large" style={{ flex: 1, justifyContent: 'center' }} />
        </View>
      </LinearGradient>
    );
  }

  // ════════════════════════════════════════
  // DARK MODE
  // ════════════════════════════════════════
  if (isDarkMode) {
    return (
      <LinearGradient colors={[...surfaces.entryGradient]} locations={[0, 0.3, 0.65, 1]} style={dk.container}>
        {renderDarkBackdrop()}
        <ScrollView
          style={[dk.content, { paddingTop: insets.top + 16 }]}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={dk.backRow} onPress={() => navigation.goBack()}>
            <Image source={BackIcon} style={dk.backIcon} resizeMode="contain" />
            <Text style={dk.backText}>Back</Text>
          </Pressable>
          <View style={dk.titleRow}>
            <Text style={dk.titleText}>Journal Entry</Text>
            {isLatest && (
              <Pressable
                style={[dk.editBtn, !canEdit && dk.editBtnDisabled]}
                onPress={handleEdit}
                disabled={!canEdit}
              >
                <Text style={[dk.editBtnText, !canEdit && { opacity: 0.5 }]}>Edit {editCount}/3</Text>
              </Pressable>
            )}
          </View>
          <View style={dk.aiCard}>{renderAiSection()}</View>
          <View style={dk.entryCard}>
            <Text style={dk.entryLabel}>Your Entry</Text>
            <Text style={dk.entryText}>{entry.raw_text}</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ════════════════════════════════════════
  // LIGHT MODE
  // ════════════════════════════════════════
  return (
    <LinearGradient colors={['#59168B', '#653495', '#59168B']} locations={[0, 0.5, 1]} style={lt.container}>
      <View style={[lt.content, { paddingTop: insets.top + 16 }]}>
        <Pressable style={lt.backRow} onPress={() => navigation.goBack()}>
          <Image source={BackIcon} style={lt.backIcon} resizeMode="contain" />
          <Text style={lt.backText}>Back</Text>
        </Pressable>
        <View style={lt.titleRow}>
          <Text style={lt.titleText}>Journal Entry</Text>
          {isLatest && (
            <Pressable
              style={[lt.actionBtn, !canEdit && lt.actionBtnDisabled]}
              onPress={handleEdit}
              disabled={!canEdit}
            >
              <Text style={[lt.actionBtnText, !canEdit && { opacity: 0.5 }]}>Edit {editCount}/3</Text>
            </Pressable>
          )}
        </View>
        <View style={lt.contentCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={lt.scrollContent}
          >
            <View style={lt.aiSection}>{renderAiSection()}</View>
            <View style={lt.aiDivider} />
            <Text style={lt.journalLabel}>Your Entry</Text>
            <Text style={lt.journalText}>{entry.raw_text}</Text>
          </ScrollView>
        </View>
        <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }} />
      </View>
    </LinearGradient>
  );
};


export default JournalEntryScreen;
