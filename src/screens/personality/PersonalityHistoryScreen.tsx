import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { fonts, useThemeColors } from '../../theme';
import { CosmicScreen } from '../../components/CosmicBackdrop';
import { useTheme } from '../../contexts/ThemeContext';
import PersonalityService, {
  PersonalityTestResult,
} from '../../services/PersonalityService';
import { PERSONALITY_TESTS } from '../../data/personalityTests';

// so-xt9j MI-3: format ISO timestamp as "Aug 19, 2026"
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/**
 * so-xt9j MI-3: history view wiring GET /personality/history via
 * PersonalityService.getHistory(). Surfaces all past results so the user can
 * revisit any attempt, not just the most recent one. Entry point is the
 * "Test history" link on PersonalityHubScreen.
 */
const PersonalityHistoryScreen = ({ navigation }: any) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const isDark = isDarkMode;

  const styles = useMemo(() => buildStyles(colors, isDark), [colors, isDark]);

  const [results, setResults] = useState<PersonalityTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await PersonalityService.getHistory();
      setResults(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load history.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // so-av4sp: mirror PersonalityQuestionScreen active-flag pattern — a fast
  // unmount mid-fetch would setState on an unmounted component without this.
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    PersonalityService.getHistory()
      .then((data) => { if (active) setResults(data); })
      .catch((err: any) => { if (active) setError(err?.message || 'Failed to load history.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: PersonalityTestResult }) => {
      const def = PERSONALITY_TESTS[item.test_type];
      const testName = def?.title ?? item.test_type;
      return (
        <Pressable
          onPress={() =>
            navigation.navigate('PersonalityResult', { resultId: item.id })
          }
          accessibilityRole="button"
          accessibilityLabel={`${testName}: ${item.dominant_type}, ${formatDate(item.completed_at)}`}
          style={[
            styles.row,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(255,255,255,0.95)',
              borderColor: isDark
                ? 'rgba(255,255,255,0.10)'
                : 'rgba(58,14,102,0.07)',
            },
          ]}
        >
          <View style={styles.rowMain}>
            <Text
              style={[
                styles.testName,
                { color: isDark ? '#FFFFFF' : '#3A0E66' },
              ]}
            >
              {testName}
            </Text>
            <Text
              style={[
                styles.dominantType,
                {
                  color: isDark
                    ? 'rgba(255,255,255,0.65)'
                    : 'rgba(58,14,102,0.65)',
                },
              ]}
            >
              {item.dominant_type}
            </Text>
          </View>
          <View style={styles.rowRight}>
            <Text
              style={[
                styles.date,
                {
                  color: isDark
                    ? 'rgba(255,255,255,0.45)'
                    : 'rgba(58,14,102,0.45)',
                },
              ]}
            >
              {formatDate(item.completed_at)}
            </Text>
            <Feather
              name="chevron-right"
              size={16}
              color={
                isDark ? 'rgba(255,255,255,0.35)' : 'rgba(58,14,102,0.35)'
              }
            />
          </View>
        </Pressable>
      );
    },
    [navigation, styles, isDark],
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.messageText}>{error}</Text>
          <Pressable
            onPress={load}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    if (results.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.messageText}>No completed tests yet.</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <CosmicScreen tone="dusk">
      <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
        {/* Header row */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Feather
              name="chevron-left"
              size={28}
              color={isDark ? '#FFFFFF' : '#3A0E66'}
            />
          </Pressable>
          <Text
            style={[
              styles.title,
              { color: isDark ? '#FFFFFF' : '#3A0E66' },
            ]}
          >
            Test History
          </Text>
          {/* Spacer mirrors back button width for visual centering */}
          <View style={styles.titleSpacer} />
        </View>

        {renderContent()}
      </View>
    </CosmicScreen>
  );
};

const buildStyles = (
  colors: ReturnType<typeof useThemeColors>,
  isDark: boolean,
) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.edensor.regular,
      fontSize: 26,
      lineHeight: 28,
      letterSpacing: -0.3,
    },
    titleSpacer: { width: 28 },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    messageText: {
      color: isDark ? 'rgba(255,255,255,0.75)' : '#FFFFFF',
      fontFamily: fonts.outfit.regular,
      fontSize: 15,
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    retryText: {
      color: '#FFFFFF',
      fontFamily: fonts.outfit.semiBold,
      fontSize: 15,
    },

    list: { gap: 10, paddingTop: 4 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    rowMain: { flex: 1, minWidth: 0 },
    testName: {
      fontFamily: fonts.edensor.regular,
      fontSize: 18,
      lineHeight: 20,
      letterSpacing: -0.2,
      marginBottom: 3,
    },
    dominantType: {
      fontFamily: fonts.outfit.regular,
      fontSize: 13,
      lineHeight: 16,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
      marginLeft: 12,
    },
    date: {
      fontFamily: fonts.outfit.regular,
      fontSize: 11,
    },
  });

export default PersonalityHistoryScreen;
