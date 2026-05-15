import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useJournal } from '../contexts/JournalContext';
import JournalService from '../services/JournalService';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { GenerateState } from '../features/affirmationMirror/GenerateState';
import { ReadyState, AffirmationItem } from '../features/affirmationMirror/ReadyState';
import { AffirmationReveal } from '../features/affirmationMirror/AffirmationReveal';
import { ink } from '../features/soulSignals/tokens';

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'generate' }
  | { kind: 'ready'; today: AffirmationItem; history: AffirmationItem[] }
  | {
      kind: 'revealing';
      affirmation_text: string;
      date_key: string;
      // so-dzfx: true when the user arrived straight from Generate (no list
      // screen in between). Drives auto-reveal (skip the redundant second
      // tap) and the back-button destination on close.
      autoReveal: boolean;
    };

const AffirmationMirrorScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const theme = isDarkMode ? 'dark' : 'light';
  const { hasEntryToday } = useJournal();

  const [state, setState] = useState<ScreenState>({ kind: 'loading' });
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    // so-vjzo: the locked-gate page is gone; GenerateState renders the
    // 'journal to unlock' CTA when hasEntryToday is false. Keep the list
    // fetch running regardless so a returning user with prior entries
    // sees their history when they journal later in the session.
    try {
      const list = await JournalService.listAffirmations(30, 0);
      const todayIso = new Date().toISOString().slice(0, 10);
      // BE includes today's row in history when /today has already generated;
      // detect it by date_key matching today's local date.
      const today = list.items.find((it) => it.date_key === todayIso) ?? null;
      if (today) {
        setState({ kind: 'ready', today, history: list.items });
      } else {
        setState({ kind: 'generate' });
      }
    } catch (err: any) {
      // History endpoint may not exist on older BE deploys; fall back to the
      // generate state so the user can still trigger /today.
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        setState({ kind: 'generate' });
      } else {
        const msg = err?.response?.data?.detail || 'Could not load affirmations.';
        Alert.alert('Affirmation Mirror', msg);
        setState({ kind: 'generate' });
      }
    }
  }, [hasEntryToday]);

  useFocusEffect(
    useCallback(() => {
      setState({ kind: 'loading' });
      fetchData();
    }, [fetchData]),
  );

  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const data = await JournalService.getTodayAffirmation();
      if (data?.affirmation_text) {
        setState({
          kind: 'revealing',
          affirmation_text: data.affirmation_text,
          date_key: data.date_key,
          autoReveal: true,
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Something went wrong. Please try again later.';
      Alert.alert('Affirmation Mirror', msg);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating]);

  const handleReplay = useCallback(() => {
    if (state.kind !== 'ready') return;
    setState({
      kind: 'revealing',
      affirmation_text: state.today.affirmation_text,
      date_key: state.today.date_key,
      autoReveal: false,
    });
  }, [state]);

  const handleRevealClose = useCallback(() => {
    // so-dzfx: from a fresh generate the user came straight from Home with
    // no list screen in between — back should exit the mirror, not drop
    // them onto a list they never opened. The list still refreshes on the
    // next focus via useFocusEffect. The replay path keeps the old
    // behavior: refetch and return to the list the user came from.
    if (state.kind === 'revealing' && state.autoReveal) {
      navigation.goBack();
      return;
    }
    setState({ kind: 'loading' });
    fetchData();
  }, [state, fetchData, navigation]);

  const handleOpenJournal = useCallback(() => {
    // so-jqk1: replace (not navigate/push) so we don't leave AffirmationMirror
    // sitting under Journal in the stack. If we push, a subsequent Home-tab
    // tap from Journal would pop two screens at once across two different
    // transition specs (Journal's fast fade + AffirmationMirror's default
    // slide), which renders Home half-mounted as a side strip.
    navigation.replace('Journal');
  }, [navigation]);

  // Reveal mode owns its own full-bleed chrome (clouds + videos + back button).
  // Render it on its own without the hub wrapping.
  if (state.kind === 'revealing') {
    return (
      <AffirmationReveal
        isDarkMode={isDarkMode}
        affirmation_text={state.affirmation_text}
        date_key={state.date_key}
        autoReveal={state.autoReveal}
        onClose={handleRevealClose}
      />
    );
  }

  return (
    <CosmicScreen tone="dawn">
      <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
          <Feather
            name="chevron-left"
            size={26}
            color={isDarkMode ? '#FFFFFF' : '#3A0E66'}
          />
        </Pressable>
        <Text style={[styles.headerTitle, { color: ink(theme) }]}>
          Affirmation Mirror
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {state.kind === 'loading' ? (
          <View style={styles.loadingShell}>
            <ActivityIndicator
              size="large"
              color={isDarkMode ? colors.text.primary : '#3A0E66'}
            />
          </View>
        ) : state.kind === 'generate' ? (
          <GenerateState
            theme={theme}
            hasEntryToday={hasEntryToday}
            onOpenJournal={handleOpenJournal}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        ) : (
          <ReadyState
            theme={theme}
            today={state.today}
            history={state.history}
            onReplay={handleReplay}
          />
        )}
      </ScrollView>
    </CosmicScreen>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.edensor.regular,
    fontSize: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  loadingShell: {
    paddingTop: 120,
    alignItems: 'center',
  },
});

export default AffirmationMirrorScreen;
