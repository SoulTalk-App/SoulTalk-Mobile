import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { fonts, surfaces, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import AnimatedButton from '../components/AnimatedButton';
import GlassCard from '../components/GlassCard';
import SoulSightService, {
  EligibilityResponse,
  SoulsightSummary,
} from '../services/SoulSightService';

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');
const ProfileBackIcon = require('../../assets/images/profile/ProfileBackIcon.png');

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
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const dk = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        content: { flex: 1, paddingHorizontal: 22 },

        backRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        },
        backIcon: { width: 36, height: 36 },
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

        eligibilityCard: {
          padding: 20,
          marginBottom: 24,
        },
        eligibleTitle: {
          fontFamily: fonts.edensor.medium,
          fontSize: 20,
          color: colors.white,
          marginBottom: 8,
        },
        eligibleWindow: {
          fontFamily: fonts.outfit.light,
          fontSize: 14,
          // TODO(theme): map 'rgba(255, 255, 255, 0.5)' to palette key (matches dark text.light)
          color: 'rgba(255, 255, 255, 0.5)',
          marginBottom: 12,
        },
        statRow: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 16,
        },
        statPill: {
          // TODO(theme): map 'rgba(255, 255, 255, 0.12)' to palette key (glass pill bg)
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          paddingHorizontal: 10,
          paddingVertical: 4,
        },
        statPillText: {
          fontFamily: fonts.outfit.medium,
          fontSize: 12,
          color: colors.white,
        },
        generateButton: {
          width: '100%',
          height: 48,
        },
        notEligibleText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 15,
          // TODO(theme): map 'rgba(255, 255, 255, 0.8)' to palette key
          color: 'rgba(255, 255, 255, 0.8)',
          textAlign: 'center',
          lineHeight: 22,
        },
        progressText: {
          fontFamily: fonts.outfit.light,
          fontSize: 13,
          // TODO(theme): map 'rgba(255, 255, 255, 0.5)' to palette key
          color: 'rgba(255, 255, 255, 0.5)',
          textAlign: 'center',
          marginTop: 8,
        },

        generatingContainer: {
          alignItems: 'center',
          paddingVertical: 20,
        },
        generatingText: {
          fontFamily: fonts.outfit.medium,
          fontSize: 16,
          color: colors.white,
          marginTop: 16,
        },
        generatingSubtext: {
          fontFamily: fonts.outfit.light,
          fontSize: 13,
          // TODO(theme): map 'rgba(255, 255, 255, 0.5)' to palette key
          color: 'rgba(255, 255, 255, 0.5)',
          marginTop: 4,
        },

        sectionHeader: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 16,
          color: colors.white,
          marginBottom: 12,
        },

        listContent: {
          gap: 10,
          paddingBottom: 20,
        },
        historyCard: {
          padding: 16,
        },
        historyDateRange: {
          fontFamily: fonts.outfit.medium,
          fontSize: 15,
          color: colors.white,
          marginBottom: 4,
        },
        historySubtitle: {
          fontFamily: fonts.outfit.light,
          fontSize: 13,
          // TODO(theme): map 'rgba(255, 255, 255, 0.6)' to palette key
          color: 'rgba(255, 255, 255, 0.6)',
        },
        historyCreated: {
          fontFamily: fonts.outfit.light,
          fontSize: 12,
          // TODO(theme): map 'rgba(255, 255, 255, 0.4)' to palette key
          color: 'rgba(255, 255, 255, 0.4)',
          marginTop: 6,
        },

        emptyText: {
          fontFamily: fonts.outfit.light,
          fontSize: 14,
          // TODO(theme): map 'rgba(255, 255, 255, 0.5)' to palette key
          color: 'rgba(255, 255, 255, 0.5)',
          textAlign: 'center',
          marginTop: 20,
        },
      }),
    [colors],
  );
  const lt = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        content: { flex: 1, paddingHorizontal: 22 },

        backRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        },
        backIcon: { width: 36, height: 36 },
        backText: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 24,
          color: colors.white,
        },

        titleText: {
          fontFamily: fonts.edensor.bold,
          fontSize: 28,
          color: colors.white,
          marginBottom: 16,
        },

        eligibilityCard: {
          backgroundColor: colors.white,
          borderRadius: 10,
          overflow: 'hidden',
          marginBottom: 24,
        },
        eligibleHeaderBand: {
          // TODO(theme): map 'rgba(89, 22, 139, 0.08)' (light deep purple wash) to palette key
          backgroundColor: 'rgba(89, 22, 139, 0.08)',
          paddingHorizontal: 16,
          paddingVertical: 10,
        },
        eligibleBody: {
          paddingHorizontal: 16,
          paddingVertical: 14,
        },
        notEligibleWrap: {
          paddingHorizontal: 16,
          paddingVertical: 20,
        },
        eligibleTitle: {
          fontFamily: fonts.edensor.bold,
          fontSize: 16,
          // TODO(theme): map '#59168B' (light deep purple) to palette key
          color: '#59168B',
        },
        eligibleWindow: {
          fontFamily: fonts.outfit.regular,
          fontSize: 13,
          // TODO(theme): map 'rgba(89, 22, 139, 0.7)' to palette key
          color: 'rgba(89, 22, 139, 0.7)',
          marginBottom: 12,
        },
        statRow: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 16,
        },
        statPill: {
          // TODO(theme): map 'rgba(89, 22, 139, 0.1)' to palette key
          backgroundColor: 'rgba(89, 22, 139, 0.1)',
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 4,
        },
        statPillText: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 12,
          // TODO(theme): map '#59168B' to palette key
          color: '#59168B',
        },
        generateButton: {
          width: '100%',
          height: 48,
          // TODO(theme): map '#59168B' to palette key
          backgroundColor: '#59168B',
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
        },
        generateButtonText: {
          fontFamily: fonts.outfit.bold,
          fontSize: 15,
          color: colors.white,
        },
        notEligibleText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 14,
          // TODO(theme): map '#59168B' to palette key
          color: '#59168B',
          textAlign: 'center',
          lineHeight: 22,
        },
        progressText: {
          fontFamily: fonts.outfit.light,
          fontSize: 13,
          // TODO(theme): map 'rgba(89, 22, 139, 0.7)' to palette key
          color: 'rgba(89, 22, 139, 0.7)',
          textAlign: 'center',
          marginTop: 8,
        },

        generatingContainer: {
          alignItems: 'center',
          paddingVertical: 30,
        },
        generatingText: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 15,
          // TODO(theme): map '#59168B' to palette key
          color: '#59168B',
          marginTop: 16,
        },
        generatingSubtext: {
          fontFamily: fonts.outfit.light,
          fontSize: 13,
          // TODO(theme): map 'rgba(89, 22, 139, 0.7)' to palette key
          color: 'rgba(89, 22, 139, 0.7)',
          marginTop: 4,
        },

        sectionHeader: {
          fontFamily: fonts.edensor.bold,
          fontSize: 16,
          color: colors.white,
          marginBottom: 12,
        },

        listContent: {
          gap: 10,
          paddingBottom: 20,
        },
        historyCard: {
          backgroundColor: colors.white,
          borderRadius: 10,
          overflow: 'hidden',
        },
        historyHeaderBand: {
          // TODO(theme): map 'rgba(89, 22, 139, 0.08)' to palette key
          backgroundColor: 'rgba(89, 22, 139, 0.08)',
          paddingHorizontal: 14,
          paddingVertical: 8,
        },
        historyBody: {
          paddingHorizontal: 14,
          paddingVertical: 10,
        },
        historyDateRange: {
          fontFamily: fonts.edensor.bold,
          fontSize: 14,
          // TODO(theme): map '#59168B' to palette key
          color: '#59168B',
        },
        historySubtitle: {
          fontFamily: fonts.outfit.regular,
          fontSize: 13,
          // TODO(theme): map '#59168B' to palette key
          color: '#59168B',
        },
        historyCreated: {
          fontFamily: fonts.outfit.light,
          fontSize: 11,
          // TODO(theme): map 'rgba(89, 22, 139, 0.6)' to palette key
          color: 'rgba(89, 22, 139, 0.6)',
          marginTop: 4,
        },

        emptyText: {
          fontFamily: fonts.outfit.light,
          fontSize: 14,
          // TODO(theme): map 'rgba(255, 255, 255, 0.9)' to palette key
          color: 'rgba(255, 255, 255, 0.9)',
          textAlign: 'center',
          marginTop: 20,
        },
      }),
    [colors],
  );
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

  // ==============================
  // DARK MODE
  // ==============================
  if (isDarkMode) {
    const renderDarkCard = ({ item }: { item: SoulsightSummary }) => (
      <GlassCard
        intensity="medium"
        style={dk.historyCard}
        onPress={() => navigation.navigate('SoulSightDetail', { soulsightId: item.id })}
      >
        <Text style={dk.historyDateRange}>
          {formatDateRange(item.window_start, item.window_end)}
        </Text>
        <Text style={dk.historySubtitle}>
          {item.entry_count} entries {'\u00B7'} {item.active_days} active days
        </Text>
        {item.created_at && (
          <Text style={dk.historyCreated}>{formatCreatedDate(item.created_at)}</Text>
        )}
      </GlassCard>
    );

    if (isLoading) {
      return (
        <LinearGradient
          colors={[...surfaces.soulsightGradient]}
          locations={[0, 0.3, 0.65, 1]}
          style={dk.container}
        >
          <View style={[dk.content, { paddingTop: insets.top + 16 }]}>
            <Pressable style={dk.backRow} onPress={() => navigation.goBack()}>
              <Image source={BackIcon} style={dk.backIcon} resizeMode="contain" />
              <Text style={dk.backText}>Back</Text>
            </Pressable>
            <ActivityIndicator color={colors.white} size="large" style={{ flex: 1, justifyContent: 'center' }} />
          </View>
        </LinearGradient>
      );
    }

    return (
      <LinearGradient
        colors={[...surfaces.soulsightGradient]}
        locations={[0, 0.3, 0.65, 1]}
        style={dk.container}
      >
        <View style={[dk.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={dk.backRow} onPress={() => navigation.goBack()}>
            <Image source={BackIcon} style={dk.backIcon} resizeMode="contain" />
            <Text style={dk.backText}>Back</Text>
          </Pressable>

          <Text style={dk.titleText}>SoulSight</Text>

          <GlassCard intensity="heavy" style={dk.eligibilityCard}>
            {isGenerating ? (
              <View style={dk.generatingContainer}>
                <ActivityIndicator color={colors.white} size="large" style={{ marginBottom: 16 }} />
                <Text style={dk.generatingText}>Generating your insight...</Text>
                <Text style={dk.generatingSubtext}>This may take a minute</Text>
              </View>
            ) : eligibility?.eligible ? (
              <>
                <Text style={dk.eligibleTitle}>Your SoulSight is ready</Text>
                {eligibility.window_start && eligibility.window_end && (
                  <Text style={dk.eligibleWindow}>
                    {formatDateRange(eligibility.window_start, eligibility.window_end)}
                  </Text>
                )}
                <View style={dk.statRow}>
                  <View style={dk.statPill}>
                    <Text style={dk.statPillText}>{eligibility.entry_count} entries</Text>
                  </View>
                  <View style={dk.statPill}>
                    <Text style={dk.statPillText}>{eligibility.active_days} active days</Text>
                  </View>
                </View>
                <AnimatedButton
                  title="Generate SoulSight"
                  onPress={handleGenerate}
                  variant="secondary"
                  style={dk.generateButton}
                />
              </>
            ) : (
              <>
                <Text style={dk.notEligibleText}>
                  {eligibility?.reason || 'Fill your SoulBar to unlock a SoulSight report.'}
                </Text>
                {(eligibility?.total_filled ?? 0) > 0 && (
                  <Text style={dk.progressText}>
                    {eligibility?.soulsights_used} of {eligibility?.total_filled} SoulSights generated
                  </Text>
                )}
              </>
            )}
          </GlassCard>

          <Text style={dk.sectionHeader}>Past Insights</Text>

          {soulsights.length === 0 ? (
            <Text style={dk.emptyText}>No insights yet</Text>
          ) : (
            <FlatList
              data={soulsights}
              keyExtractor={(item) => item.id}
              renderItem={renderDarkCard}
              contentContainerStyle={dk.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }} />
        </View>
      </LinearGradient>
    );
  }

  // ==============================
  // LIGHT MODE
  // ==============================
  const renderLightCard = ({ item }: { item: SoulsightSummary }) => (
    <Pressable
      style={lt.historyCard}
      onPress={() => navigation.navigate('SoulSightDetail', { soulsightId: item.id })}
    >
      <View style={lt.historyHeaderBand}>
        <Text style={lt.historyDateRange}>
          {formatDateRange(item.window_start, item.window_end)}
        </Text>
      </View>
      <View style={lt.historyBody}>
        <Text style={lt.historySubtitle}>
          {item.entry_count} entries {'\u00B7'} {item.active_days} active days
        </Text>
        {item.created_at && (
          <Text style={lt.historyCreated}>{formatCreatedDate(item.created_at)}</Text>
        )}
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#59168B', '#653495', '#F5F2F9']}
        locations={[0.1, 0.6, 1]}
        style={lt.container}
      >
        <View style={[lt.content, { paddingTop: insets.top + 16 }]}>
          <Pressable style={lt.backRow} onPress={() => navigation.goBack()}>
            <Image source={ProfileBackIcon} style={lt.backIcon} resizeMode="contain" />
            <Text style={lt.backText}>Back</Text>
          </Pressable>
          <ActivityIndicator color={colors.white} size="large" style={{ flex: 1, justifyContent: 'center' }} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#F5F2F9']}
      locations={[0.1, 0.6, 1]}
      style={lt.container}
    >
      <View style={[lt.content, { paddingTop: insets.top + 16 }]}>
        <Pressable style={lt.backRow} onPress={() => navigation.goBack()}>
          <Image source={ProfileBackIcon} style={lt.backIcon} resizeMode="contain" />
          <Text style={lt.backText}>Back</Text>
        </Pressable>

        <Text style={lt.titleText}>SoulSight</Text>

        <View style={lt.eligibilityCard}>
          {isGenerating ? (
            <View style={lt.generatingContainer}>
              {/* TODO(theme): map '#59168B' (light deep purple) to palette key */}
            <ActivityIndicator color="#59168B" size="large" style={{ marginBottom: 16 }} />
              <Text style={lt.generatingText}>Generating your insight...</Text>
              <Text style={lt.generatingSubtext}>This may take a minute</Text>
            </View>
          ) : eligibility?.eligible ? (
            <>
              <View style={lt.eligibleHeaderBand}>
                <Text style={lt.eligibleTitle}>Your SoulSight is ready</Text>
              </View>
              <View style={lt.eligibleBody}>
                {eligibility.window_start && eligibility.window_end && (
                  <Text style={lt.eligibleWindow}>
                    {formatDateRange(eligibility.window_start, eligibility.window_end)}
                  </Text>
                )}
                <View style={lt.statRow}>
                  <View style={lt.statPill}>
                    <Text style={lt.statPillText}>{eligibility.entry_count} entries</Text>
                  </View>
                  <View style={lt.statPill}>
                    <Text style={lt.statPillText}>{eligibility.active_days} active days</Text>
                  </View>
                </View>
                <Pressable style={lt.generateButton} onPress={handleGenerate}>
                  <Text style={lt.generateButtonText}>Generate SoulSight</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={lt.notEligibleWrap}>
              <Text style={lt.notEligibleText}>
                {eligibility?.reason || 'Fill your SoulBar to unlock a SoulSight report.'}
              </Text>
              {(eligibility?.total_filled ?? 0) > 0 && (
                <Text style={lt.progressText}>
                  {eligibility?.soulsights_used} of {eligibility?.total_filled} SoulSights generated
                </Text>
              )}
            </View>
          )}
        </View>

        <Text style={lt.sectionHeader}>Past Insights</Text>

        {soulsights.length === 0 ? (
          <Text style={lt.emptyText}>No insights yet</Text>
        ) : (
          <FlatList
            data={soulsights}
            keyExtractor={(item) => item.id}
            renderItem={renderLightCard}
            contentContainerStyle={lt.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }} />
      </View>
    </LinearGradient>
  );
};


export default SoulSightScreen;
