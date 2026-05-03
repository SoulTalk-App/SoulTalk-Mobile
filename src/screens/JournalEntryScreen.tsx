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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts, useThemeColors } from '../theme';
import { useJournal } from '../contexts/JournalContext';
import { useTheme } from '../contexts/ThemeContext';
import JournalService, { JournalEntry } from '../services/JournalService';
import SoulPalAnimated from '../components/SoulPalAnimated';
import { CosmicScreen } from '../components/CosmicBackdrop';

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');

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
        backRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
        // so-3zw: tint the monochrome BackIcon white in dark mode for AA contrast on cosmic bg.
        backIcon: { width: 36, height: 36, tintColor: '#FFFFFF' },
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
        // outfit.light at 15pt body was P1 illegible per audit — bumped to regular.
        aiText: { fontFamily: fonts.outfit.regular, fontSize: 15, lineHeight: 15 * 1.65, color: 'rgba(255, 255, 255, 0.88)', marginBottom: 14 },
        pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
        // TODO(theme): map 'rgba(255, 255, 255, 0.08)' (topic pill bg) to palette key
        topicPill: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
        // 0.8 → text.secondary (dark = 0.7) — slight drop, tokenized
        pillText: { fontFamily: fonts.outfit.medium, fontSize: 12, color: colors.text.secondary },
        // teal at alpha — uses dark accent.teal (#4DE8D4) at 0.7
        copingLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 12, color: 'rgba(77, 232, 212, 0.7)', marginBottom: 6 },
        // TODO(theme): map 'rgba(77, 232, 212, 0.08)' / '0.20' (coping pill) to palette keys
        copingPill: { backgroundColor: 'rgba(77, 232, 212, 0.08)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(77, 232, 212, 0.20)' },
        aiLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
        // outfit.light at 14pt body was P1 — bumped to regular.
        aiLoadingText: { fontFamily: fonts.outfit.regular, fontSize: 14, color: 'rgba(255, 255, 255, 0.45)', fontStyle: 'italic' },
        // TODO(theme): map 'rgba(255, 255, 255, 0.06)' / '0.10' (entry card) to palette keys
        entryCard: { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.10)', padding: 20 },
        // 0.5 matches dark text.light (inkFaint) exactly
        entryLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 14, color: colors.text.light, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
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
        // so-3zw: tint the monochrome BackIcon deep purple in light mode for AA contrast on lavender bg.
        backIcon: { width: 36, height: 36, tintColor: '#3A0E66' },
        // Light path: page-bg ink for AA on the so-u1k lavender wash.
        backText: { fontFamily: fonts.outfit.semiBold, fontSize: 24, color: colors.text.primary },
        titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
        titleText: { fontFamily: fonts.outfit.regular, fontSize: 24, color: colors.text.primary, flex: 1 },
        // TODO(theme): map 'rgba(255, 255, 255, 0.15)' to palette key
        actionBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(89, 22, 139, 0.10)', borderRadius: 16 },
        actionBtnText: { fontFamily: fonts.outfit.medium, fontSize: 13, color: colors.text.primary },
        actionBtnDisabled: { opacity: 0.5 },
        contentCard: { flex: 1, backgroundColor: colors.white, borderRadius: 10, padding: 20 },
        scrollContent: { flexGrow: 1 },
        aiSection: { marginBottom: 16 },
        // TODO(theme): map '#E0D4E8' (light divider) to palette key
        aiDivider: { height: 1, backgroundColor: '#E0D4E8', marginBottom: 14 },
        aiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
        aiLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 14, color: colors.primary },
        // outfit.light at 14pt body + '#333333' hex → outfit.regular + colors.text.dark
        // (light = #000, dark = #fff). High contrast on white card bg.
        aiText: { fontFamily: fonts.outfit.regular, fontSize: 14, lineHeight: 14 * 1.6, color: colors.text.dark, marginBottom: 12 },
        pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
        // TODO(theme): map '#F3ECFA' to palette key (lavender pill bg)
        topicPill: { backgroundColor: '#F3ECFA', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
        pillText: { fontFamily: fonts.outfit.medium, fontSize: 12, color: colors.primary },
        copingLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 12, color: colors.primary, marginBottom: 4 },
        // TODO(theme): map '#E8F5E9' (coping pill bg) to palette key
        copingPill: { backgroundColor: '#E8F5E9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
        // '#2E7D32' (dark green) → colors.success (#4CAF50). Slight pixel
        // drift but tokenized; both pass AA on the pale-green pill bg.
        copingPillText: { fontFamily: fonts.outfit.medium, fontSize: 12, color: colors.success },
        aiLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        // P1 fix: '#888' on white = ~3.5:1 (fails AA). outfit.light at 13pt
        // body was also P1. → outfit.regular + colors.text.light (#666666 =
        // ~5.7:1 on white, passes AA).
        aiLoadingText: { fontFamily: fonts.outfit.regular, fontSize: 13, color: colors.text.light, fontStyle: 'italic' },
        journalLabel: { fontFamily: fonts.outfit.semiBold, fontSize: 14, color: colors.primary, marginTop: 14, marginBottom: 8 },
        // '#333333' → colors.text.dark (#000 light)
        journalText: { fontFamily: fonts.outfit.regular, fontSize: 14, lineHeight: 14 * 1.6, color: colors.text.dark },
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

  const editCount = entry?.edit_count ?? 0;
  const canEdit = isLatest && editCount < 3;

  const handleEdit = () => {
    if (!entry || !canEdit) return;
    navigation.navigate('CreateJournal', { entry });
  };

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
    return (
      <CosmicScreen tone="dawn">
        <View style={[isDarkMode ? dk.content : lt.content, { paddingTop: insets.top + 16 }]}>
          <Pressable
            style={isDarkMode ? dk.backRow : lt.backRow}
            onPress={() => navigation.goBack()}
          >
            <Image
              source={BackIcon}
              style={isDarkMode ? dk.backIcon : lt.backIcon}
              resizeMode="contain"
            />
            <Text style={isDarkMode ? dk.backText : lt.backText}>Back</Text>
          </Pressable>
          <ActivityIndicator
            color={isDarkMode ? colors.primary : colors.white}
            size="large"
            style={{ flex: 1 }}
          />
        </View>
      </CosmicScreen>
    );
  }

  // ════════════════════════════════════════
  // DARK MODE
  // ════════════════════════════════════════
  if (isDarkMode) {
    return (
      <CosmicScreen tone="dawn">
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
      </CosmicScreen>
    );
  }

  // ════════════════════════════════════════
  // LIGHT MODE
  // ════════════════════════════════════════
  return (
    <CosmicScreen tone="dawn">
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
    </CosmicScreen>
  );
};


export default JournalEntryScreen;
