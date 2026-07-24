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

/**
 * so-cywf: presentational re-acceptance prompt shown when the server reports
 * the user's accepted terms version is behind the current one
 * (TermsStatus.acceptance_required). Purely props-driven — it does NOT call
 * authService itself; the parent owns getTermsStatus()/acceptTerms() and passes
 * currentVersion + onAccept. Re-acceptance is a blocking gate, so there is no
 * dismiss affordance: the user accepts to continue.
 */
type Props = {
  visible: boolean;
  /** Current authoritative terms version (from TermsStatus.current_version). */
  currentVersion: number;
  /** Fires when the user accepts; parent calls acceptTerms(currentVersion). */
  onAccept: () => void;
  /** True while the accept request is in flight. */
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
  // so-ap3b MI-2: self-navigating so the component is self-contained and
  // HomeScreen doesn't need to thread navigation as a prop.
  const navigation = useNavigation<any>();

  // so-bl51: bail before building the modal subtree when not visible so the
  // ModalHostView doesn't sit in memory.
  if (!visible) return null;

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
            Please review and accept our updated Terms of Service and Privacy
            Policy to keep using SoulTalk.
          </Text>

          <Text style={[styles.version, { color: colors.text.secondary }]}>
            Version {currentVersion}
          </Text>

          {/* so-ap3b MI-2: let the user read the Terms before accepting.
              Navigates to the Terms stack screen; the blocking modal remains
              visible on return so the user still must explicitly accept. */}
          <Pressable
            // so-i5o2: open on Terms tab first — re-acceptance is for the
            // updated ToS, so users should read Terms before Privacy.
            onPress={() => navigation.navigate('Terms', { initialTab: 'terms' })}
            accessibilityRole="link"
            accessibilityLabel="View Terms and Privacy Policy"
            style={styles.viewTermsLink}
          >
            <Text style={[styles.viewTermsText, { color: colors.primary }]}>
              View Terms & Privacy
            </Text>
          </Pressable>

          <Pressable
            onPress={onAccept}
            disabled={loading}
            style={[
              styles.acceptButton,
              { backgroundColor: colors.primary },
              loading && styles.acceptButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Accept updated terms"
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.acceptText, { color: colors.white }]}>
                Accept and continue
              </Text>
            )}
          </Pressable>
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
  acceptButton: {
    marginTop: 20,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
  },
  viewTermsLink: {
    alignSelf: 'center',
    paddingVertical: 6,
    marginTop: 10,
  },
  viewTermsText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default TermsReacceptanceModal;
