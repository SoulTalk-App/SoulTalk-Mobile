/**
 * so-fwva: app-shell paywall gate.
 *
 * Rendered when the server says `access_granted` is false (trial over
 * and not Pro). The entire app is hard-locked behind this screen; the
 * native Adapty paywall is presented imperatively via presentPaywall().
 *
 * DO-NOT-TRAP carve-outs (Apple + safety requirements): from this
 * gate the user can ALWAYS reach
 *   - Restore Purchases
 *   - Manage Subscription (Apple-managed deep link)
 *   - Log out
 *   - Delete account (Settings)
 *   - Help / crisis resources
 *   - Terms / Privacy
 * Without these affordances the user has no way to recover from a
 * lapsed trial without re-subscribing, which trips both Apple review
 * and our duty of care.
 *
 * The screen itself is calm + on-brand (cosmic-void in dark, soft
 * lavender wash in light). Copy contains NO em dashes per Overseer
 * style. Errors from the paywall / restore paths surface as friendly
 * themed alerts via normalizeError.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useEntitlement } from '../contexts/EntitlementContext';
import { fonts, useThemeColors } from '../theme';
import { CosmicScreen } from '../components/CosmicBackdrop';
import {
  TOUCH_HITSLOP_MED,
  TOUCH_PRESS_OPACITY,
} from '../components/touchPrimitives';
import {
  openManageSubscription,
  presentPaywall,
  restorePurchases,
  wasUnlocked,
} from '../services/paywall';
import { normalizeError } from '../utils/normalizeError';

interface PaywallGateScreenProps {
  navigation: any;
}

const PaywallGateScreen: React.FC<PaywallGateScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const { logout } = useAuth();
  const { refresh: refreshEntitlement } = useEntitlement();

  const [busy, setBusy] = useState(false);
  // Whenever we land on this screen the user has hit the gate; present
  // the paywall immediately so they don't have to tap through a CTA to
  // start. Subsequent presents are user-initiated (the Subscribe CTA).
  useEffect(() => {
    void handlePresent('auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePresent = useCallback(
    async (source: 'auto' | 'manual') => {
      if (busy && source === 'manual') return;
      setBusy(true);
      try {
        const outcome = await presentPaywall();
        if (wasUnlocked(outcome)) {
          // EntitlementProvider's post-unlock hook on the axios layer
          // also kicks /auth/me; an explicit refresh here covers the
          // path where no API call was in flight when the paywall was
          // presented (auto-mount).
          await refreshEntitlement();
        } else if (outcome.kind === 'error') {
          Alert.alert(
            'Subscription',
            outcome.message || 'Something went wrong. Please try again.',
          );
        } else if (outcome.kind === 'sdk-inactive') {
          Alert.alert(
            'Subscription',
            "We couldn't open the subscription screen right now. Please try again in a moment.",
          );
        }
        // 'dismissed' is silent — the user closed the sheet without
        // purchasing; they remain on the gate.
      } finally {
        setBusy(false);
      }
    },
    [busy, refreshEntitlement],
  );

  const handleRestore = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await restorePurchases();
      if (wasUnlocked(outcome)) {
        await refreshEntitlement();
        return;
      }
      if (outcome.kind === 'restored') {
        // Restored, but no Pro on the account — surface gentle copy.
        Alert.alert(
          'Restore',
          "We checked, but no active subscription was found on this Apple ID.",
        );
        return;
      }
      Alert.alert(
        'Restore',
        outcome.kind === 'error'
          ? outcome.message
          : "We couldn't restore right now. Please try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, refreshEntitlement]);

  const handleManage = useCallback(async () => {
    const ok = await openManageSubscription();
    if (!ok) {
      Alert.alert(
        'Manage subscription',
        "We couldn't open the App Store right now. Please try from your phone's Settings app.",
      );
    }
  }, []);

  const handleHelp = useCallback(() => {
    // Help screen is reachable from the locked state — crisis
    // resources must never be paywalled.
    navigation.navigate('Help');
  }, [navigation]);

  const handleTerms = useCallback(() => {
    navigation.navigate('Terms');
  }, [navigation]);

  const handleSettings = useCallback(() => {
    // Settings shows the Delete Account + Restore + Logout rows. The
    // screen itself isn't blocked by access_granted — only the main
    // app surfaces are.
    navigation.navigate('Settings');
  }, [navigation]);

  const handleLogout = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
    }
  }, [busy, logout]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { flex: 1 },
        scrollContent: {
          paddingHorizontal: 28,
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 32,
          minHeight: '100%',
          justifyContent: 'space-between',
        },
        hero: {
          alignItems: 'center',
          gap: 12,
        },
        eyebrow: {
          fontFamily: fonts.outfit.medium,
          fontSize: 13,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: isDarkMode
            ? 'rgba(255,255,255,0.65)'
            : 'rgba(58,14,102,0.65)',
        },
        title: {
          fontFamily: fonts.edensor.bold,
          fontSize: 30,
          lineHeight: 36,
          color: isDarkMode ? '#FFFFFF' : colors.text.primary,
          textAlign: 'center',
        },
        body: {
          fontFamily: fonts.outfit.regular,
          fontSize: 16,
          lineHeight: 24,
          color: isDarkMode
            ? 'rgba(255,255,255,0.78)'
            : 'rgba(58,14,102,0.78)',
          textAlign: 'center',
          marginTop: 8,
        },
        ctaBlock: {
          gap: 14,
          marginTop: 32,
        },
        primaryCta: {
          backgroundColor: colors.primary,
          borderRadius: 28,
          paddingVertical: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
        primaryCtaText: {
          fontFamily: fonts.outfit.semiBold,
          fontSize: 16,
          color: isDarkMode ? '#0A0A14' : '#FFFFFF',
        },
        secondaryCta: {
          paddingVertical: 12,
          alignItems: 'center',
        },
        secondaryCtaText: {
          fontFamily: fonts.outfit.medium,
          fontSize: 15,
          color: isDarkMode
            ? 'rgba(255,255,255,0.85)'
            : colors.text.primary,
        },
        carveoutBlock: {
          marginTop: 28,
          paddingTop: 18,
          borderTopWidth: 1,
          borderTopColor: isDarkMode
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(58,14,102,0.10)',
          gap: 4,
        },
        carveoutLabel: {
          fontFamily: fonts.outfit.medium,
          fontSize: 12,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: isDarkMode
            ? 'rgba(255,255,255,0.55)'
            : 'rgba(58,14,102,0.55)',
          marginBottom: 8,
          textAlign: 'center',
        },
        carveoutRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
        },
        carveoutIcon: {
          width: 28,
          alignItems: 'center',
        },
        carveoutText: {
          fontFamily: fonts.outfit.regular,
          fontSize: 15,
          color: isDarkMode ? '#FFFFFF' : colors.text.primary,
          marginLeft: 6,
        },
      }),
    [insets, isDarkMode, colors],
  );

  return (
    <CosmicScreen tone="void">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>SoulTalk Pro</Text>
          <Text style={styles.title}>Your free trial is over.</Text>
          <Text style={styles.body}>
            Subscribe to keep journaling, reflecting, and growing with SoulPal.
          </Text>
        </View>

        <View style={styles.ctaBlock}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryCta,
              pressed && { opacity: TOUCH_PRESS_OPACITY },
            ]}
            onPress={() => handlePresent('manual')}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="See subscription options"
          >
            <Text style={styles.primaryCtaText}>See subscription options</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryCta}
            onPress={handleRestore}
            disabled={busy}
            hitSlop={TOUCH_HITSLOP_MED}
            accessibilityRole="button"
            accessibilityLabel="Restore Purchases"
          >
            <Text style={styles.secondaryCtaText}>Restore Purchases</Text>
          </Pressable>
        </View>

        <View style={styles.carveoutBlock}>
          <Text style={styles.carveoutLabel}>You can still</Text>

          <Pressable
            style={styles.carveoutRow}
            onPress={handleHelp}
            hitSlop={TOUCH_HITSLOP_MED}
            accessibilityRole="button"
            accessibilityLabel="Open Help and crisis resources"
          >
            <View style={styles.carveoutIcon}>
              <Feather
                name="life-buoy"
                size={20}
                color={isDarkMode ? colors.primary : colors.text.primary}
              />
            </View>
            <Text style={styles.carveoutText}>
              Get help or crisis resources
            </Text>
          </Pressable>

          <Pressable
            style={styles.carveoutRow}
            onPress={handleManage}
            hitSlop={TOUCH_HITSLOP_MED}
            accessibilityRole="button"
            accessibilityLabel="Manage Subscription on App Store"
          >
            <View style={styles.carveoutIcon}>
              <Feather
                name="external-link"
                size={20}
                color={isDarkMode ? colors.primary : colors.text.primary}
              />
            </View>
            <Text style={styles.carveoutText}>
              Manage subscription on App Store
            </Text>
          </Pressable>

          <Pressable
            style={styles.carveoutRow}
            onPress={handleSettings}
            hitSlop={TOUCH_HITSLOP_MED}
            accessibilityRole="button"
            accessibilityLabel="Open Settings to delete account"
          >
            <View style={styles.carveoutIcon}>
              <Feather
                name="settings"
                size={20}
                color={isDarkMode ? colors.primary : colors.text.primary}
              />
            </View>
            <Text style={styles.carveoutText}>
              Settings (delete account, log out)
            </Text>
          </Pressable>

          <Pressable
            style={styles.carveoutRow}
            onPress={handleTerms}
            hitSlop={TOUCH_HITSLOP_MED}
            accessibilityRole="button"
            accessibilityLabel="Open Terms and Privacy"
          >
            <View style={styles.carveoutIcon}>
              <Feather
                name="file-text"
                size={20}
                color={isDarkMode ? colors.primary : colors.text.primary}
              />
            </View>
            <Text style={styles.carveoutText}>Terms and Privacy</Text>
          </Pressable>

          <Pressable
            style={styles.carveoutRow}
            onPress={handleLogout}
            disabled={busy}
            hitSlop={TOUCH_HITSLOP_MED}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <View style={styles.carveoutIcon}>
              <Feather
                name="log-out"
                size={20}
                color={isDarkMode ? colors.primary : colors.text.primary}
              />
            </View>
            <Text style={styles.carveoutText}>Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </CosmicScreen>
  );
};

export default PaywallGateScreen;
