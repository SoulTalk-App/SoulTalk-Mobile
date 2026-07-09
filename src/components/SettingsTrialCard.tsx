/**
 * so-kgs7 / so-1uki: subscription-status rows for SettingsScreen.
 *
 * Styled to sit naturally in the Settings list — no floating card border or
 * filled background. Matches the sibling row treatment (toggleRow height,
 * outfit fonts, ink/inkSub tokens, no heavy chrome).
 *
 * Three states:
 *
 *   PRO (isPro=true, covers Adapty paid + server comped/lifetime — so-1uki)
 *     [star] "SoulTalk Pro" row + "You're a Pro member." sub-row.
 *     "Active until <date>" when pro_expires_at is present (not comped).
 *     Non-interactive — Manage Subscription row below handles changes.
 *
 *   TRIAL ACTIVE (isPro=false AND daysLeft != null AND daysLeft >= 0)
 *     [clock] "N days left in your free trial"  "Go Pro >" — single tappable
 *     row. Urgency accent on icon + right CTA shifts brand -> amber -> error.
 *     Taps presentPaywall(); refreshes entitlement on unlock.
 *
 *   NEITHER (expired / free / /auth/me not yet landed)
 *     Returns null — nothing shown.
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

/** Urgency accent for the trial row — shifts warmer as days run out. */
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

// ─── PRO ROWS ────────────────────────────────────────────────────────────────

interface ProRowsProps {
  proExpiresAt?: string | null;
  accent: string;
  ink: string;
  inkSub: string;
}

const ProRows: React.FC<ProRowsProps> = ({ proExpiresAt, accent, ink, inkSub }) => {
  const expiryLabel = proExpiresAt ? formatDate(proExpiresAt) : null;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={
        expiryLabel
          ? `SoulTalk Pro. You're a Pro member. Active until ${expiryLabel}.`
          : "SoulTalk Pro. You're a Pro member."
      }
    >
      {/* Title row — matches toggleRow height */}
      <View style={styles.proTitleRow}>
        <Feather name="star" size={15} color={accent} style={styles.rowIcon} />
        <Text style={[styles.proTitle, { color: accent }]}>SoulTalk Pro</Text>
      </View>

      {/* Status + optional expiry — compact sub-rows below the title */}
      <Text style={[styles.proSubtitle, { color: inkSub }]}>
        {"You're a Pro member."}
      </Text>
      {expiryLabel ? (
        <Text style={[styles.proExpiry, { color: inkSub }]}>
          {`Active until ${expiryLabel}`}
        </Text>
      ) : null}
    </View>
  );
};

// ─── TRIAL ROW ───────────────────────────────────────────────────────────────

interface TrialRowProps {
  daysLeft: number;
  accent: string;
  ink: string;
  onPress: () => void;
}

const TrialRow: React.FC<TrialRowProps> = ({ daysLeft, accent, ink, onPress }) => {
  const phrase =
    daysLeft <= 0
      ? 'Last day of your free trial'
      : daysLeft === 1
        ? '1 day left in your free trial'
        : `${daysLeft} days left in your free trial`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${phrase}. Tap to see subscription options.`}
      style={({ pressed }) => [styles.trialRow, pressed && styles.rowPressed]}
    >
      {/* Left: clock icon (urgency-accented) + phrase */}
      <Feather name="clock" size={15} color={accent} style={styles.rowIcon} />
      <Text style={[styles.trialPhrase, { color: ink }]} numberOfLines={1}>
        {phrase}
      </Text>

      {/* Right: Go Pro + chevron (urgency-accented) */}
      <View style={styles.ctaGroup}>
        <Text style={[styles.ctaText, { color: accent }]}>Go Pro</Text>
        <Feather name="chevron-right" size={15} color={accent} />
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

  // Mirror the ink/inkSub tokens from SettingsScreen's buildStyles so these
  // rows read as part of the same list surface in both themes.
  const ink = isDarkMode ? colors.white : colors.text.primary;
  const inkSub = isDarkMode
    ? 'rgba(255, 255, 255, 0.50)'
    : 'rgba(58, 14, 102, 0.50)';

  if (isPro) {
    // pro_expires_at is now typed on UserInfo (so-1uki); null for comped users.
    return (
      <ProRows
        proExpiresAt={user?.pro_expires_at ?? null}
        accent={colors.primary}
        ink={ink}
        inkSub={inkSub}
      />
    );
  }

  if (daysLeft != null && daysLeft >= 0) {
    const accent = trialAccent(daysLeft, colors.primary, colors.error);
    return (
      <TrialRow
        daysLeft={daysLeft}
        accent={accent}
        ink={ink}
        onPress={handleTrialPress}
      />
    );
  }

  return null;
};

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Shared row icon — consistent left-edge spacing with the label
  rowIcon: {
    marginRight: 8,
  },

  // Pro rows
  proTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,           // matches SettingsScreen toggleRow height
  },
  proTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    lineHeight: 46,          // matches resetButtonText lineHeight
  },
  proSubtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  proExpiry: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },

  // Trial row — single-line Pressable matching resetButton height
  trialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    marginTop: 6,
    marginBottom: 6,
  },
  rowPressed: {
    opacity: 0.55,
  },
  trialPhrase: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 46,
    flex: 1,
  },
  ctaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ctaText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
  },
});

export default SettingsTrialCard;
