/**
 * so-fwva: subtle trial-status banner.
 *
 * Shown to authenticated users during the 7-day free trial — surfaces
 * the days-left count from /auth/me so the user knows the clock is
 * running and how to lock in Pro before it stops. Renders nothing
 * when:
 *   - user is already Pro (paid sub active),
 *   - no trial data has reached the client yet (avoid flashing a
 *     "trial ending" pill on cold-boot before /auth/me lands),
 *   - daysLeft is null (server isn't carrying trial fields yet — paired
 *     BE so-be).
 *
 * Calm copy. Tappable so the user can open the paywall before the
 * trial expires. Theme-aware. No em dashes.
 */
import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useEntitlement } from '../contexts/EntitlementContext';
import { useThemeColors, fonts } from '../theme';
import { presentPaywall, wasUnlocked } from '../services/paywall';
import {
  TOUCH_HITSLOP_MED,
  TOUCH_PRESS_OPACITY,
} from './touchPrimitives';

interface TrialBannerProps {
  /** Optional style override (e.g. margin from the parent layout). */
  style?: ViewStyle;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ style }) => {
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

  const bg = isDarkMode
    ? 'rgba(77, 232, 212, 0.10)'
    : 'rgba(89, 22, 139, 0.06)';
  const border = isDarkMode
    ? 'rgba(77, 232, 212, 0.30)'
    : 'rgba(89, 22, 139, 0.18)';
  const textColor = isDarkMode ? '#FFFFFF' : colors.text.primary;
  const accent = isDarkMode ? colors.primary : '#59168B';

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={TOUCH_HITSLOP_MED}
      accessibilityRole="button"
      accessibilityLabel={`${phrase}. Tap to see subscription options.`}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: bg, borderColor: border },
        pressed && { opacity: TOUCH_PRESS_OPACITY },
        style,
      ]}
    >
      <Feather
        name="clock"
        size={14}
        color={accent}
        style={styles.icon}
      />
      <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
        {phrase}
      </Text>
      <Feather
        name="chevron-right"
        size={16}
        color={accent}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    gap: 8,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 2,
  },
  text: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    flexShrink: 1,
  },
});

export default TrialBanner;
