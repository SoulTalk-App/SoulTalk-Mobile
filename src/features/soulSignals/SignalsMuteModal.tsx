import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';
import { MuteDuration, SignalDetail } from './types';
import { PURPLE, Theme, ink, inkSub } from './tokens';

const DURATIONS: { key: MuteDuration; label: string }[] = [
  { key: 'week', label: '7 days' },
  { key: 'month', label: '30 days' },
  { key: 'forever', label: 'Forever' },
];

type Props = {
  visible: boolean;
  detail: SignalDetail | null;
  theme: Theme;
  onClose: () => void;
  /** Confirm fires with the chosen duration. */
  onConfirm: (duration: MuteDuration) => void;
  submitting?: boolean;
};

export function SignalsMuteModal({
  visible,
  detail,
  theme,
  onClose,
  onConfirm,
  submitting = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  // Default selection mirrors the canonical design: 30 days highlighted.
  const [selected, setSelected] = useState<MuteDuration>('month');

  useEffect(() => {
    if (visible) setSelected('month');
  }, [visible]);

  if (!detail) return null;

  const handleConfirm = () => {
    if (submitting) return;
    onConfirm(selected);
  };

  const durationCopy = (d: MuteDuration) => {
    if (d === 'forever') return 'indefinitely';
    if (d === 'week') return 'for the next 7 days';
    return 'for the next 30 days';
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
              paddingTop: insets.top + 200,
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
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(79,23,134,0.06)',
                },
              ]}
            >
              <Text style={styles.iconGlyph}>🤫</Text>
            </View>

            <Text style={[styles.title, { color: ink(theme) }]}>
              Mute this thread?
            </Text>
            <Text style={[styles.subtitle, { color: ink(theme) }]}>
              SoulPal will keep listening for it but won’t surface signals
              about “{detail.headline}” {durationCopy(selected)}.
            </Text>

            <View style={styles.chipsRow}>
              {DURATIONS.map((d) => {
                const sel = selected === d.key;
                return (
                  <Pressable
                    key={d.key}
                    onPress={() => setSelected(d.key)}
                    style={[
                      styles.chip,
                      sel
                        ? { backgroundColor: PURPLE, borderColor: PURPLE }
                        : {
                            backgroundColor: isDark
                              ? 'rgba(255,255,255,0.06)'
                              : '#FFFFFF',
                            borderColor: isDark
                              ? 'rgba(255,255,255,0.10)'
                              : 'rgba(58,14,102,0.08)',
                          },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sel }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: sel ? '#FFFFFF' : ink(theme) },
                      ]}
                    >
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
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
                accessibilityLabel="Cancel"
              >
                <Text
                  style={[
                    styles.btnText,
                    { color: ink(theme), fontFamily: fonts.outfit.semiBold },
                  ]}
                >
                  Cancel
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
                accessibilityLabel="Mute thread"
                accessibilityState={{ disabled: submitting }}
              >
                <Text
                  style={[
                    styles.btnText,
                    { color: colors.white, fontFamily: fonts.outfit.bold },
                  ]}
                >
                  {submitting ? 'Muting…' : 'Mute thread'}
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconGlyph: {
    fontSize: 22,
    lineHeight: 28,
  },
  title: {
    fontFamily: fonts.edensor.regular,
    fontSize: 22,
    lineHeight: 22 * 1.15,
    textAlign: 'center',
  },
  // Body-length Edensor italic per so-6a7.
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.edensor.italic,
    fontSize: 16,
    lineHeight: 16 * 1.45,
    letterSpacing: 0.2,
    textAlign: 'center',
    maxWidth: 280,
  },
  chipsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
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
