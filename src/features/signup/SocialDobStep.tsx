// so-piu2: presentational age-confirmation step for the social-signup gate.
// Shown only after the BE returns dob_required for a NEW social user on
// LoginScreen. Props-driven by useSocialDobGate; used by RegisterScreen and
// LoginScreen.
//
// so-8nem: replaced DOB date-picker with a simple "I am 18 or older" copy +
// a single Continue button — no date input. Apple 5.1.1(v) rejection fix.
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
import { fonts, useThemeColors } from '../../theme';
import type { SocialDobStepProps } from './useSocialDobGate';

export const SocialDobStep: React.FC<SocialDobStepProps> = ({
  visible,
  submitting,
  onContinue,
  onCancel,
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <Text style={[styles.title, { color: colors.text.primary }]}>Confirm your age</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            You must be 18 or older to use SoulTalk.
          </Text>
          <Pressable
            onPress={onContinue}
            disabled={submitting}
            style={[
              styles.continueBtn,
              { backgroundColor: colors.primary },
              submitting && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="I am 18 or older — continue"
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.continueText, { color: colors.white }]}>I am 18 or older</Text>
            )}
          </Pressable>
          <Pressable
            onPress={onCancel}
            disabled={submitting}
            style={styles.cancelBtn}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={[styles.cancelText, { color: colors.text.secondary }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontFamily: fonts.edensor.bold,
    fontSize: 22,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  continueBtn: {
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  continueText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
  },
  cancelBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 15,
  },
});

export default SocialDobStep;
