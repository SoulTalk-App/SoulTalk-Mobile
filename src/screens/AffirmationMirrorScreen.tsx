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
import { LockedState } from '../features/affirmationMirror/LockedState';
import { GenerateState } from '../features/affirmationMirror/GenerateState';
import { ReadyState, AffirmationItem } from '../features/affirmationMirror/ReadyState';
import { AffirmationReveal } from '../features/affirmationMirror/AffirmationReveal';
import { ink } from '../features/soulSignals/tokens';

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'locked' }
  | { kind: 'generate' }
  | { kind: 'ready'; today: AffirmationItem; history: AffirmationItem[] }
  | { kind: 'revealing'; affirmation_text: string; date_key: string };

const AffirmationMirrorScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const theme = isDarkMode ? 'dark' : 'light';
  const { hasEntryToday } = useJournal();

  const [state, setState] = useState<ScreenState>({ kind: 'loading' });
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!hasEntryToday) {
      setState({ kind: 'locked' });
      return;
    }
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
    });
  }, [state]);

  const handleRevealClose = useCallback(() => {
    // Refetch on close to capture the freshly-generated affirmation in
    // history + flip into ready state.
    setState({ kind: 'loading' });
    fetchData();
  }, [fetchData]);

  const handleOpenJournal = useCallback(() => {
    navigation.navigate('Journal');
  }, [navigation]);

  // Reveal mode owns its own full-bleed chrome (clouds + videos + back button).
  // Render it on its own without the hub wrapping.
  if (state.kind === 'revealing') {
    return (
      <AffirmationReveal
        isDarkMode={isDarkMode}
        affirmation_text={state.affirmation_text}
        date_key={state.date_key}
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
        ) : state.kind === 'locked' ? (
          <LockedState theme={theme} onOpenJournal={handleOpenJournal} />
        ) : state.kind === 'generate' ? (
          <GenerateState
            theme={theme}
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
