/**
 * so-kgs7: subscription-status card for SettingsScreen.
 *
 * Covers all three subscription states:
 *
 *   PRO (isPro=true)
 *     Branded badge (star + "SoulTalk Pro") so users clearly see they are Pro.
 *     Shows "Active until <date>" when pro_expires_at is present on the user
 *     object (ISO string from /auth/me). Not tappable — already Pro; the
 *     Manage Subscription row below handles changes.
 *
 *   TRIAL ACTIVE (isPro=false AND daysLeft != null AND daysLeft >= 0)
 *     Hero days-left number (urgency-accented) + 7-pip elapsed progress row +
 *     "Go Pro" CTA chevron. Taps presentPaywall(); refreshes on unlock.
 *     Urgency accent: brand (>=4 days) -> amber (2-3 days) -> error (<=1 day).
 *
 *   NEITHER (expired / free / no trial data yet)
 *     Returns null — nothing shown. Avoids a phantom card on cold boot before
 *     /auth/me lands (daysLeft==null path).
 *
 * Theme-aware (dark + light). No em dashes. Accessibility labels on both
 * interactive (trial) and informational (Pro) variants.
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
import { useAuth } from '../contexts/AuthContext';
import { useEntitlement } from '../contexts/EntitlementContext';
import { fonts, useThemeColors } from '../theme';
import { presentPaywall, wasUnlocked } from '../services/paywall';

const TRIAL_DAYS = 7;

/** Urgency accent for the trial card — shifts warmer as days run out. */
function trialAccent(
  daysLeft: number,
  brandColor: string,
  errorColor: string,
): string {
  if (daysLeft <= 1) return errorColor;
  if (daysLeft <= 3) return '#F59E0B';
  return brandColor;
}

/** Format an ISO date string as "MMM D, YYYY" (UTC, no locale dependency). */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// ─── PRO CARD ────────────────────────────────────────────────────────────────

interface ProCardProps {
  proExpiresAt?: string | null;
  isDarkMode: boolean;
  accent: string;
  labelColor: string;
  cardBg: string;
  cardBorder: string;
}

const ProCard: React.FC<ProCardProps> = ({
  proExpiresAt,
  isDarkMode,
  accent,
  labelColor,
  cardBg,
  cardBorder,
}) => {
  const expiryLabel = proExpiresAt ? formatDate(proExpiresAt) : null;
  const iconBg = isDarkMode
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(79, 23, 134, 0.08)';

  return (
    <View
      style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
      accessibilityRole="text"
      accessibilityLabel={
        expiryLabel
          ? `SoulTalk Pro. You're a Pro member. Active until ${expiryLabel}.`
          : "SoulTalk Pro. You're a Pro member."
      }
    >
      {/* Badge row: star icon + "SoulTalk Pro" title */}
      <View style={styles.proTitleRow}>
        <View style={[styles.proBadge, { backgroundColor: iconBg }]}>
          <Feather name="star" size={16} color={accent} />
        </View>
        <Text style={[styles.proTitle, { color: accent }]}>SoulTalk Pro</Text>
      </View>

      {/* Status line */}
      <Text style={[styles.proSubtitle, { color: labelColor }]}>
        {"You're a Pro member."}
      </Text>

      {/* Expiry line (conditional) */}
      {expiryLabel ? (
        <Text style={[styles.proExpiry, { color: labelColor }]}>
          {`Active until ${expiryLabel}`}
        </Text>
      ) : null}
    </View>
  );
};

// ─── TRIAL CARD ──────────────────────────────────────────────────────────────

interface TrialCardProps {
  daysLeft: number;
  accent: string;
  labelColor: string;
  pipEmpty: string;
  cardBg: string;
  cardBorder: string;
  onPress: () => void;
}

const TrialCard: React.FC<TrialCardProps> = ({
  daysLeft,
  accent,
  labelColor,
  pipEmpty,
  cardBg,
  cardBorder,
  onPress,
}) => {
  const phrase =
    daysLeft <= 0
      ? 'Last day of your free trial'
      : daysLeft === 1
        ? '1 day left in your free trial'
        : `${daysLeft} days left in your free trial`;

  // elapsed = days consumed; filled pips signal the clock running out
  const elapsed = Math.max(0, Math.min(TRIAL_DAYS, TRIAL_DAYS - daysLeft));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${phrase}. Tap to see subscription options.`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderColor: cardBorder },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Hero: large day-count + phrase */}
      <View style={styles.heroRow}>
        <Text style={[styles.heroNumber, { color: accent }]}>
          {daysLeft <= 0 ? '0' : daysLeft}
        </Text>
        <Text style={[styles.heroLabel, { color: labelColor }]}>
          {phrase}
        </Text>
      </View>

      {/* Progress: 7-pip countdown row */}
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

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export const SettingsTrialCard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const { user } = useAuth();
  const { isPro, daysLeft, refresh } = useEntitlement();

  const handleTrialPress = useCallback(async () => {
    const outcome = await presentPaywall();
    if (wasUnlocked(outcome)) {
      await refresh();
    }
  }, [refresh]);

  // Shared surface tokens (same shape for both card variants)
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

  if (isPro) {
    // pro_expires_at is not in the typed UserInfo yet; read it loosely.
    const proExpiresAt = (user as any)?.pro_expires_at ?? null;
    return (
      <ProCard
        proExpiresAt={proExpiresAt}
        isDarkMode={isDarkMode}
        accent={colors.primary}
        labelColor={labelColor}
        cardBg={cardBg}
        cardBorder={cardBorder}
      />
    );
  }

  // Active trial: daysLeft present and non-negative
  if (daysLeft != null && daysLeft >= 0) {
    const accent = trialAccent(daysLeft, colors.primary, colors.error);
    return (
      <TrialCard
        daysLeft={daysLeft}
        accent={accent}
        labelColor={labelColor}
        pipEmpty={pipEmpty}
        cardBg={cardBg}
        cardBorder={cardBorder}
        onPress={handleTrialPress}
      />
    );
  }

  // Neither Pro nor active trial (expired / free / data still loading) — show nothing.
  return null;
};

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Shared card shell
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

  // Pro card
  proTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  proBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proTitle: {
    fontFamily: fonts.edensor.bold,
    fontSize: 20,
    lineHeight: 24,
  },
  proSubtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  proExpiry: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    opacity: 0.8,
  },

  // Trial card
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
