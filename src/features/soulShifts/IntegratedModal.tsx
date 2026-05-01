import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme';
import { ShiftDetail, SoulpalVariant } from './types';
import {
  PINK,
  Theme,
  ink,
  inkFaint,
  inkSub,
} from './tokens';

const SOULPAL_SRC: Record<SoulpalVariant, any> = {
  1: require('../../../assets/images/home-v2/soulpal-1.png'),
  2: require('../../../assets/images/home-v2/soulpal-2.png'),
  3: require('../../../assets/images/home-v2/soulpal-3.png'),
  4: require('../../../assets/images/home-v2/soulpal-4.png'),
  5: require('../../../assets/images/home-v2/soulpal-5.png'),
};

type Props = {
  visible: boolean;
  detail: ShiftDetail | null;
  theme: Theme;
  onClose: () => void;
  /** Confirm fires; the optional note is captured for parity but not sent
   *  (markIntegrated takes only id today). Plumb through later if BE adds
   *  an integration_reason field. */
  onConfirm: () => void;
  submitting?: boolean;
};

export function IntegratedModal({
  visible,
  detail,
  theme,
  onClose,
  onConfirm,
  submitting = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) setNote('');
  }, [visible]);

  if (!detail) return null;

  const handleConfirm = () => {
    if (submitting) return;
    onConfirm();
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
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View
          style={[
            styles.sheetWrap,
            {
              paddingTop: insets.top + 160,
              paddingBottom: insets.bottom + 16,
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
            <ScrollView
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.headerRow}>
                <Image
                  source={SOULPAL_SRC[detail.soulpal]}
                  style={styles.headerAvatar}
                  resizeMode="contain"
                />
                <View style={styles.headerText}>
                  <Text style={[styles.eyebrow, { color: detail.mood }]}>
                    Integrate · {detail.cat}
                  </Text>
                  <Text
                    style={[styles.title, { color: ink(theme) }]}
                    numberOfLines={2}
                  >
                    {detail.title}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.closeBtn}
                  accessibilityLabel="Close"
                >
                  <Text style={[styles.closeX, { color: inkSub(theme) }]}>×</Text>
                </Pressable>
              </View>

              <Text style={[styles.prompt, { color: ink(theme) }]}>
                Mark this shift as integrated?
              </Text>

              <View
                style={[
                  styles.reassureCard,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.04)'
                      : '#FBF6FF',
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(58,14,102,0.06)',
                  },
                ]}
              >
                <Text style={[styles.reassureText, { color: inkSub(theme) }]}>
                  You're claiming the practice as part of how you live.
                  SoulPal will move it to your integrated list and stop
                  nudging you about it.
                </Text>
              </View>

              <View
                style={[
                  styles.noteCard,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.04)'
                      : '#FBF6FF',
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(58,14,102,0.06)',
                  },
                ]}
              >
                <Text style={[styles.noteLabel, { color: inkFaint(theme) }]}>
                  Optional note
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="What changed?"
                  placeholderTextColor={inkFaint(theme)}
                  style={[styles.noteInput, { color: ink(theme) }]}
                  multiline
                  maxLength={300}
                />
              </View>

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
                  accessibilityLabel="Not yet"
                >
                  <Text
                    style={[
                      styles.btnText,
                      { color: ink(theme), fontFamily: fonts.outfit.semiBold },
                    ]}
                  >
                    Not yet
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirm}
                  disabled={submitting}
                  style={[
                    styles.submitWrap,
                    submitting && styles.submitWrapDimmed,
                  ]}
                  accessibilityLabel="Mark integrated"
                  accessibilityState={{ disabled: submitting }}
                >
                  <LinearGradient
                    colors={[detail.mood, PINK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.submit}
                  >
                    <Text style={styles.submitText}>
                      {submitting ? 'Integrating…' : 'Integrated'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
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
  },
  sheet: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  headerAvatar: {
    width: 34,
    height: 34,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: fonts.outfit.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 2,
    fontFamily: fonts.edensor.regular,
    fontSize: 20,
    lineHeight: 20 * 1.1,
    letterSpacing: -0.1,
  },
  closeBtn: {
    padding: 6,
    marginRight: -6,
    marginTop: -2,
  },
  closeX: {
    fontSize: 24,
    lineHeight: 24,
    fontFamily: fonts.outfit.regular,
  },
  prompt: {
    fontFamily: fonts.edensor.italic,
    fontSize: 16,
    lineHeight: 16 * 1.45,
    letterSpacing: 0.2,
    marginBottom: 14,
  },
  reassureCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  reassureText: {
    fontFamily: fonts.edensor.italic,
    fontSize: 14,
    lineHeight: 14 * 1.45,
    letterSpacing: 0.2,
  },
  noteCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  noteLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  noteInput: {
    fontFamily: fonts.edensor.italic,
    fontSize: 16,
    lineHeight: 16 * 1.45,
    letterSpacing: 0.2,
    minHeight: 48,
    padding: 0,
  },
  btnRow: {
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
  btnText: {
    fontSize: 13,
  },
  submitWrap: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  submitWrapDimmed: {
    opacity: 0.55,
  },
  submit: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontFamily: fonts.outfit.bold,
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
