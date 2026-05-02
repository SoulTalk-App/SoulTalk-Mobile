import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';
import { ShiftDetail } from './types';
import { PURPLE, Theme, ink, inkSub } from './tokens';

type Props = {
  visible: boolean;
  detail: ShiftDetail | null;
  theme: Theme;
  onClose: () => void;
  /** Confirm fires with an optional release_reason — captured from the
   *  modal's text input. Empty string is normalised to undefined. */
  onConfirm: (reason?: string) => void;
  submitting?: boolean;
};

export function ReleaseModal({
  visible,
  detail,
  theme,
  onClose,
  onConfirm,
  submitting = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!visible) setReason('');
  }, [visible]);

  if (!detail) return null;

  const tone = detail.mood;

  const handleConfirm = () => {
    if (submitting) return;
    onConfirm(reason.trim() || undefined);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.fullScreen}>
        {/* Sibling scrim per so-44t. Tap outside to dismiss. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View
          style={[
            styles.sheetWrap,
            {
              paddingTop: insets.top + 180,
              paddingBottom: insets.bottom + 24,
            },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? '#0E0820' : '#FFFFFF',
                borderColor: isDark
                  ? 'rgba(255,255,255,0.10)'
                  : 'rgba(58,14,102,0.08)',
              },
            ]}
          >
            <View
              style={[
                styles.iconBubble,
                {
                  // Radial-ish wash via a flat tone-tinted disc; RN doesn't
                  // ship a radial-gradient primitive without an extra dep.
                  backgroundColor: isDark ? tone + '33' : tone + '22',
                },
              ]}
            >
              <Text style={[styles.iconGlyph, { color: tone }]}>✿</Text>
            </View>

            <Text style={[styles.title, { color: ink(theme) }]}>
              Release this shift?
            </Text>
            <Text style={[styles.subtitle, { color: ink(theme) }]}>
              “{detail.title}” will move to your Released list. SoulPal will
              stop nudging you about it.
            </Text>

            <View
              style={[
                styles.reassureCard,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.04)'
                    : '#FBF6FF',
                },
              ]}
            >
              <Text style={[styles.reassureText, { color: inkSub(theme) }]}>
                You can pick it back up anytime.
              </Text>
            </View>

            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Why? (optional)"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(58,14,102,0.45)'}
              style={[
                styles.reasonInput,
                {
                  color: ink(theme),
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.04)'
                    : '#F5F0FB',
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(58,14,102,0.08)',
                },
              ]}
              multiline
              maxLength={300}
            />

            <View style={styles.btnRow}>
              <Pressable
                onPress={onClose}
                disabled={submitting}
                style={[
                  styles.btn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.06)'
                      : '#FFFFFF',
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(58,14,102,0.10)',
                  },
                ]}
                accessibilityLabel="Keep tending"
              >
                <Text
                  style={[
                    styles.btnText,
                    { color: ink(theme), fontFamily: fonts.outfit.semiBold },
                  ]}
                >
                  Keep tending
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                disabled={submitting}
                style={[
                  styles.btn,
                  styles.btnConfirm,
                  submitting && styles.btnDimmed,
                ]}
                accessibilityLabel="Release"
                accessibilityState={{ disabled: submitting }}
              >
                <Text
                  style={[
                    styles.btnText,
                    { color: colors.white, fontFamily: fonts.outfit.bold },
                  ]}
                >
                  {submitting ? 'Releasing…' : 'Release'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheetWrap: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  sheet: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  iconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconGlyph: {
    fontSize: 26,
    lineHeight: 30,
  },
  title: {
    fontFamily: fonts.edensor.regular,
    fontSize: 24,
    lineHeight: 24 * 1.15,
    textAlign: 'center',
  },
  // Body-length Edensor italic per so-6a7: bump to 16/ink/0.2 letterSpacing
  // so the display serif holds shape on iPhone 16e width.
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.edensor.italic,
    fontSize: 16,
    lineHeight: 16 * 1.45,
    letterSpacing: 0.2,
    textAlign: 'center',
    maxWidth: 280,
  },
  reassureCard: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    width: '100%',
  },
  reassureText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    textAlign: 'center',
  },
  reasonInput: {
    marginTop: 12,
    width: '100%',
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
  },
  btnRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnConfirm: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  btnDimmed: {
    opacity: 0.55,
  },
  btnText: {
    fontSize: 13,
  },
});
