import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { setReacceptCallback } from '../utils/reacceptBridge';

/**
 * so-cywf: presentational re-acceptance prompt shown when the server reports
 * the user's accepted terms version is behind the current one
 * (TermsStatus.acceptance_required). Purely props-driven — it does NOT call
 * authService itself; the parent owns getTermsStatus()/acceptTerms() and passes
 * currentVersion + onAccept. Re-acceptance is a blocking gate; there is no
 * dismiss affordance.
 *
 * so-chyd: the modal is now a LAUNCHER only — it no longer has a one-tap
 * "Accept and continue" that bypasses the scroll gate. Instead it routes the
 * user through TermsScreen mode='reaccept' where both ToS and Privacy must be
 * scrolled to the bottom before Accept is enabled. The one-tap path is removed
 * to close the bypass.
 *
 * so-ln3u: replaced the native <Modal> with an absolutely-positioned
 * full-screen View overlay (zIndex 9999). Root cause of the P0 lockout: on real
 * iOS devices React Native's <Modal> creates a separate UIViewController
 * presented ABOVE the app's main UIViewController. Calling
 * navigation.navigate() from inside it pushed TermsScreen into the MAIN stack —
 * behind the Modal's native window, invisible to the user. callReaccept() was
 * never reached, acceptTerms() was never called, and zero requests hit the
 * server, stranding users in the blocking gate permanently.
 *
 * The overlay View is part of the SAME React (and native) view hierarchy as the
 * navigator. navigation.navigate() correctly brings TermsScreen to the foreground
 * (above HomeScreen + the overlay) with no native-window occlusion. Android
 * hardware back is blocked via BackHandler while the overlay is visible; the
 * overlay itself blocks all touch fall-through on the dim area.
 *
 * Flow:
 *   1. Overlay shows "Review and accept" CTA.
 *   2. Tap -> setReacceptCallback(onAccept) + navigate Terms mode='reaccept'.
 *   3. User scrolls both docs to bottom, taps Accept in TermsScreen.
 *   4. TermsScreen calls callReaccept() (fires onAccept) + goBack().
 *   5. Parent's acceptTerms() runs; on success sets visible=false -> overlay gone.
 *   6. While acceptTerms is in flight, overlay shows a loading spinner (loading=true).
 */
type Props = {
  visible: boolean;
  /** Current authoritative terms version (from TermsStatus.current_version). */
  currentVersion: number;
  /** Fires when the user completes the gated review; parent calls acceptTerms(currentVersion). */
  onAccept: () => void;
  /** True while the acceptTerms request is in flight (after TermsScreen goBack). */
  loading?: boolean;
};

export function TermsReacceptanceModal({
  visible,
  currentVersion,
  onAccept,
  loading = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  // so-ap3b MI-2: self-navigating so HomeScreen doesn't need to thread navigation.
  const navigation = useNavigation<any>();

  // so-ln3u: block Android hardware back while the gate is visible.
  // The native <Modal>'s onRequestClose={() => {}} handled this before;
  // BackHandler is the equivalent for a View overlay.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible]);

  // so-bl51: bail before building the overlay subtree when not visible.
  if (!visible) return null;

  // so-chyd: set the bridge callback then navigate to the gated screen.
  // The callback is consumed on first call (cleared in callReaccept) so it
  // can never fire twice even if navigation is used unexpectedly.
  const handleReviewAndAccept = () => {
    setReacceptCallback(onAccept);
    navigation.navigate('Terms', { mode: 'reaccept', currentVersion });
  };

  return (
    // so-ln3u: absoluteFillObject + high zIndex renders this View above all of
    // HomeScreen's content (including the custom BottomTabBar). React Navigation
    // native-stack screens pushed above HomeScreen sit at the NATIVE level —
    // above this overlay — so TermsScreen correctly renders in the foreground
    // when navigated to.
    <View style={styles.overlay}>
      {/* Dim background — Pressable absorbs all touches on the non-card area so
          nothing beneath the overlay is interactive while the gate is active.
          accessible={false} hides it from screen readers. */}
      <Pressable
        style={styles.dimBackground}
        onPress={() => {}}
        accessible={false}
      />
      <View
        style={[
          styles.card,
          {
            marginBottom: insets.bottom + 16,
            backgroundColor: isDarkMode ? '#0E0820' : '#FFFFFF',
            borderColor: isDarkMode
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(58,14,102,0.08)',
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text.primary }]}>
          We've updated our Terms
        </Text>

        <Text style={[styles.body, { color: colors.text.secondary }]}>
          Please read and accept our updated Terms of Service and Privacy
          Policy to keep using SoulTalk.
        </Text>

        <Text style={[styles.version, { color: colors.text.secondary }]}>
          Version {currentVersion}
        </Text>

        {/* so-chyd: single CTA — routes to gated TermsScreen.
            While acceptTerms is in flight (loading=true) show a spinner so
            the user knows the request is being processed on return from
            TermsScreen. The blocking gate (no dismiss) remains in both states. */}
        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            style={styles.loadingSpinner}
          />
        ) : (
          <Pressable
            onPress={handleReviewAndAccept}
            style={[styles.reviewButton, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Review and accept Terms of Service and Privacy Policy"
          >
            <Text style={[styles.reviewButtonText, { color: colors.white }]}>
              Review and accept
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // so-ln3u: replaced flex:1 (Modal-relative) with absoluteFillObject so the
  // overlay covers the full screen within the same native view hierarchy.
  // zIndex 9999 ensures it sits above all HomeScreen content; elevation is the
  // Android equivalent. The dimBackground Pressable carries the background color
  // (previously on the overlay itself) so it can intercept stray touches.
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 99,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  dimBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
  },
  title: {
    fontFamily: fonts.edensor.bold,
    fontSize: 22,
    lineHeight: 26,
    marginBottom: 12,
  },
  body: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  version: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    letterSpacing: 0.4,
    marginTop: 14,
    opacity: 0.7,
  },
  reviewButton: {
    marginTop: 20,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewButtonText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
  },
  loadingSpinner: {
    marginTop: 28,
    marginBottom: 6,
  },
});

export default TermsReacceptanceModal;
