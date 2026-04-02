import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fonts } from '../theme';
import AnimatedButton from '../components/AnimatedButton';
import SoulSightService, {
  EligibilityResponse,
  SoulsightSummary,
} from '../services/SoulSightService';

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');

const formatDateRange = (start: string, end: string): string => {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-US', opts)} \u2013 ${e.toLocaleDateString('en-US', opts)}`;
};

const formatCreatedDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const SoulSightScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [soulsights, setSoulsights] = useState<SoulsightSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [elig, list] = await Promise.all([
        SoulSightService.checkEligibility(),
        SoulSightService.list(),
      ]);
      setEligibility(elig);
      setSoulsights(list.soulsights);
    } catch (err: any) {
      console.log('[SoulSight] Fetch error:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchData();
    }, [fetchData]),
  );

  // Polling for generation status
  useEffect(() => {
    if (!generatingId) return;

    pollingRef.current = setInterval(async () => {
      try {
        const status = await SoulSightService.getStatus(generatingId);
        if (status.status === 'complete') {
          stopPolling();
          setIsGenerating(false);
          setGeneratingId(null);
          navigation.navigate('SoulSightDetail', { soulsightId: generatingId });
        } else if (status.status === 'failed') {
          stopPolling();
          setIsGenerating(false);
          setGeneratingId(null);
          Alert.alert('Generation Failed', status.error_message || 'Something went wrong. Please try again.');
          fetchData();
        } else if (status.status === 'safety_redirect') {
          stopPolling();
          setIsGenerating(false);
          setGeneratingId(null);
          navigation.navigate('SoulSightDetail', { soulsightId: generatingId });
        }
      } catch {
        // ignore polling errors, will retry
      }
    }, 3000);

    return () => stopPolling();
  }, [generatingId]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const result = await SoulSightService.generate();
      setGeneratingId(result.soulsight_id);
    } catch (err: any) {
      setIsGenerating(false);
      const detail = err?.response?.data?.detail;
      Alert.alert('Error', detail || err.message || 'Failed to start generation.');
    }
  };

  const renderSoulsightCard = ({ item }: { item: SoulsightSummary }) => (
    <Pressable
      style={styles.historyCard}
      onPress={() => navigation.navigate('SoulSightDetail', { soulsightId: item.id })}
    >
      <Text style={styles.historyDateRange}>
        {formatDateRange(item.window_start, item.window_end)}
      </Text>
      <Text style={styles.historySubtitle}>
        {item.entry_count} entries {'\u00B7'} {item.active_days} active days
      </Text>
      {item.created_at && (
        <Text style={styles.historyCreated}>{formatCreatedDate(item.created_at)}</Text>
      )}
    </Pressable>
  );

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#59168B', '#653495', '#59168B']}
        locations={[0, 0.5, 1]}
        style={styles.container}
      >
        <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
            <Image source={BackIcon} style={styles.backIcon} resizeMode="contain" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <ActivityIndicator color="#FFFFFF" size="large" style={{ flex: 1, justifyContent: 'center' }} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#59168B']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Back Button */}
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
          <Image source={BackIcon} style={styles.backIcon} resizeMode="contain" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.titleText}>SoulSight</Text>

        {/* Eligibility Card */}
        <View style={styles.eligibilityCard}>
          {isGenerating ? (
            <View style={styles.generatingContainer}>
              <ActivityIndicator color="#59168B" size="large" style={{ marginBottom: 16 }} />
              <Text style={styles.generatingText}>Generating your insight...</Text>
              <Text style={styles.generatingSubtext}>This may take a minute</Text>
            </View>
          ) : eligibility?.eligible ? (
            <>
              <Text style={styles.eligibleTitle}>Your SoulSight is ready</Text>
              {eligibility.window_start && eligibility.window_end && (
                <Text style={styles.eligibleWindow}>
                  {formatDateRange(eligibility.window_start, eligibility.window_end)}
                </Text>
              )}
              <View style={styles.statRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statPillText}>{eligibility.entry_count} entries</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillText}>{eligibility.active_days} active days</Text>
                </View>
              </View>
              <AnimatedButton
                title="Generate SoulSight"
                onPress={handleGenerate}
                variant="secondary"
                style={styles.generateButton}
              />
            </>
          ) : (
            <>
              <Text style={styles.notEligibleText}>
                {eligibility?.reason || 'Fill your SoulBar to unlock a SoulSight report.'}
              </Text>
              {(eligibility?.total_filled ?? 0) > 0 && (
                <Text style={styles.progressText}>
                  {eligibility?.soulsights_used} of {eligibility?.total_filled} SoulSights generated
                </Text>
              )}
            </>
          )}
        </View>

        {/* Past Insights */}
        <Text style={styles.sectionHeader}>Past Insights</Text>

        {soulsights.length === 0 ? (
          <Text style={styles.emptyText}>No insights yet</Text>
        ) : (
          <FlatList
            data={soulsights}
            keyExtractor={(item) => item.id}
            renderItem={renderSoulsightCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }} />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
  },

  // Back Button
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backIcon: {
    width: 36,
    height: 36,
  },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: colors.white,
  },

  titleText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 24,
    color: colors.white,
    marginBottom: 16,
  },

  // Eligibility Card
  eligibilityCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    marginBottom: 24,
  },
  eligibleTitle: {
    fontFamily: fonts.edensor.medium,
    fontSize: 20,
    color: '#59168B',
    marginBottom: 8,
  },
  eligibleWindow: {
    fontFamily: fonts.outfit.light,
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statPill: {
    backgroundColor: '#F3ECFA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statPillText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: '#59168B',
  },
  generateButton: {
    width: '100%',
    height: 48,
  },
  notEligibleText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: '#59168B',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressText: {
    fontFamily: fonts.outfit.light,
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },

  // Generating
  generatingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  generatingText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 16,
    color: '#59168B',
    marginTop: 16,
  },
  generatingSubtext: {
    fontFamily: fonts.outfit.light,
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },

  // Section Header
  sectionHeader: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.white,
    marginBottom: 12,
  },

  // History Cards
  listContent: {
    gap: 10,
    paddingBottom: 20,
  },
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 16,
  },
  historyDateRange: {
    fontFamily: fonts.outfit.medium,
    fontSize: 15,
    color: '#59168B',
    marginBottom: 4,
  },
  historySubtitle: {
    fontFamily: fonts.outfit.light,
    fontSize: 13,
    color: '#666',
  },
  historyCreated: {
    fontFamily: fonts.outfit.light,
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },

  // Empty state
  emptyText: {
    fontFamily: fonts.outfit.light,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SoulSightScreen;
