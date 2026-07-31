import React from 'react';
import {
  ActivityIndicator,
  Modal,
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
 * Flow:
 *   1. Modal shows "Review and accept" CTA.
 *   2. Tap -> setReacceptCallback(onAccept) + navigate Terms mode='reaccept'.
 *   3. User scrolls both docs to bottom, taps Accept in TermsScreen.
 *   4. TermsScreen calls callReaccept() (fires onAccept) + goBack().
 *   5. Parent's acceptTerms() runs; on success sets visible=false -> modal gone.
 *   6. While acceptTerms is in flight, modal shows a loading spinner (loading=true).
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

  // so-bl51: bail before building the modal subtree when not visible so the
  // ModalHostView doesn't sit in memory.
  if (!visible) return null;

  // so-chyd: set the bridge callback then navigate to the gated screen.
  // The callback is consumed on first call (cleared in callReaccept) so it
  // can never fire twice even if navigation is used unexpectedly.
  const handleReviewAndAccept = () => {
    setReacceptCallback(onAccept);
    navigation.navigate('Terms', { mode: 'reaccept', currentVersion });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // Blocking gate: Android back must not dismiss without accepting.
      onRequestClose={() => {}}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
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
