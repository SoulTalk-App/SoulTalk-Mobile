// so-piu2: presentational DOB step for the social-signup age gate. Shown only
// after the BE returns dob_required for a NEW social user. Props-driven by
// useSocialDobGate; reuses the email-signup DateOfBirthField (so-7yb8 native
// wheel). Used by both RegisterScreen and LoginScreen.
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
import { DateOfBirthField } from './SignupAgeFields';
import type { SocialDobStepProps } from './useSocialDobGate';

export const SocialDobStep: React.FC<SocialDobStepProps> = ({
  visible,
  value,
  error,
  submitting,
  onChange,
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
          <Text style={[styles.title, { color: colors.text.primary }]}>One more step</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Please confirm your date of birth to finish creating your account.
          </Text>
          <DateOfBirthField value={value} onChange={onChange} error={error} />
          <Pressable
            onPress={onContinue}
            disabled={submitting}
            style={[
              styles.continueBtn,
              { backgroundColor: colors.primary },
              submitting && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.continueText, { color: colors.white }]}>Continue</Text>
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
