/**
 * so-kgs7: enhanced trial-status card for SettingsScreen.
 *
 * Shown only during an active trial (isPro=false AND daysLeft >= 0).
 * Renders null for Pro users, expired trials, and when daysLeft is null
 * (server hasn't sent trial data yet — avoids a phantom card on cold boot).
 *
 * Layout:
 *   Hero row   — large days-left number (urgency-accented) + phrase label
 *   Pip row    — 7 segments; elapsed = 7 - daysLeft filled, rest empty
 *   CTA row    — "Go Pro" + chevron, right-aligned
 *
 * Urgency accent levels (matching the 7-day trial window):
 *   >= 4 days  — on-brand purple (light) / teal (dark)
 *   2 - 3 days — amber (#F59E0B)
 *   0 - 1 days — attention red (error token, theme-aware)
 *
 * Tap opens presentPaywall(); refreshes entitlement on unlock.
 */
import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useEntitlement } from '../contexts/EntitlementContext';
import { fonts, useThemeColors } from '../theme';
import { presentPaywall, wasUnlocked } from '../services/paywall';

const TRIAL_DAYS = 7;

function trialAccent(daysLeft: number, isDarkMode: boolean, brandColor: string, errorColor: string): string {
  if (daysLeft <= 1) return errorColor;
  if (daysLeft <= 3) return '#F59E0B';
  return brandColor;
}

export const SettingsTrialCard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const { isPro, daysLeft, refresh } = useEntitlement();

  const handlePress = useCallback(async () => {
    const outcome = await presentPaywall();
    if (wasUnlocked(outcome)) {
      await refresh();
    }
  }, [refresh]);

  if (isPro) return null;
  if (daysLeft == null) return null;
  if (daysLeft < 0) return null;

  const phrase =
    daysLeft <= 0
      ? 'Last day of your free trial'
      : daysLeft === 1
        ? '1 day left in your free trial'
        : `${daysLeft} days left in your free trial`;

  const accent = trialAccent(daysLeft, isDarkMode, colors.primary, colors.error);

  // elapsed pips filled, remaining pips empty
  const elapsed = Math.max(0, Math.min(TRIAL_DAYS, TRIAL_DAYS - daysLeft));

  const cardBg = isDarkMode
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(79, 23, 134, 0.04)';
  const cardBorder = isDarkMode
    ? 'rgba(255, 255, 255, 0.10)'
    : 'rgba(79, 23, 134, 0.12)';
  const labelColor = isDarkMode
    ? 'rgba(255, 255, 255, 0.70)'
    : 'rgba(58, 14, 102, 0.70)';
  const pipEmpty = isDarkMode
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(79, 23, 134, 0.10)';

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${phrase}. Tap to see subscription options.`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderColor: cardBorder },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Hero: large number + phrase */}
      <View style={styles.heroRow}>
        <Text style={[styles.heroNumber, { color: accent }]}>
          {daysLeft <= 0 ? '0' : daysLeft}
        </Text>
        <Text style={[styles.heroLabel, { color: labelColor }]}>
          {phrase}
        </Text>
      </View>

      {/* Progress: 7-pip countdown (elapsed filled, remaining empty) */}
      <View style={styles.pipRow}>
        {Array.from({ length: TRIAL_DAYS }, (_, i) => {
          const filled = i < elapsed;
          return (
            <View
              key={i}
              style={[
                styles.pip,
                filled
                  ? { backgroundColor: accent, opacity: 0.65 }
                  : { backgroundColor: pipEmpty },
              ]}
            />
          );
        })}
      </View>

      {/* CTA: Go Pro + chevron */}
      <View style={styles.ctaRow}>
        <Text style={[styles.ctaText, { color: accent }]}>Go Pro</Text>
        <Feather name="chevron-right" size={16} color={accent} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 8,
  },
  cardPressed: {
    opacity: 0.72,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  heroNumber: {
    fontFamily: fonts.edensor.bold,
    fontSize: 48,
    lineHeight: 52,
  },
  heroLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  pipRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 12,
  },
  pip: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  ctaText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
  },
});

export default SettingsTrialCard;
