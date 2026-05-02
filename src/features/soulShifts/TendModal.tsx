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
import { colors, fonts } from '../../theme';
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

// Canonical chip set from shifts-states.jsx ShiftsTendModal. Until BE ships
// shift-specific chips, every shift surfaces this generic vocabulary.
const DEFAULT_CHIPS = [
  'Noticed the impulse',
  'Said something I would have softened',
  'Edited mid-sentence',
  'Stayed quiet but saw why',
  'Tried and it landed',
  "Tried and it didn't",
];

type Props = {
  visible: boolean;
  detail: ShiftDetail | null;
  theme: Theme;
  onClose: () => void;
  onSubmit: (payload: { chips: string[]; note?: string }) => void;
  /** When `true`, the Continue button shows a working/disabled state. */
  submitting?: boolean;
};

export function TendModal({
  visible,
  detail,
  theme,
  onClose,
  onSubmit,
  submitting = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');

  // Reset state when the modal closes so a re-open starts fresh.
  useEffect(() => {
    if (!visible) {
      setSelected(new Set());
      setNote('');
    }
  }, [visible]);

  const toggleChip = (label: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleSubmit = () => {
    if (submitting) return;
    onSubmit({
      chips: Array.from(selected),
      note: note.trim() || undefined,
    });
  };

  const canSubmit = selected.size > 0 || note.trim().length > 0;

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
        {detail && (
          <View
            style={[
              styles.sheetWrap,
              {
                paddingTop: insets.top + 140,
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
                      Tend · {detail.cat}
                    </Text>
                    <Text style={[styles.title, { color: ink(theme) }]} numberOfLines={2}>
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
                  How did the practice show up today?
                </Text>

                <View style={styles.chipsRow}>
                  {DEFAULT_CHIPS.map((c) => {
                    const sel = selected.has(c);
                    return (
                      <Pressable
                        key={c}
                        onPress={() => toggleChip(c)}
                        style={[
                          styles.chip,
                          sel
                            ? {
                                borderColor: detail.mood,
                                borderWidth: 1.5,
                                backgroundColor: detail.mood + '22',
                              }
                            : {
                                borderColor: isDark
                                  ? 'rgba(255,255,255,0.12)'
                                  : 'rgba(58,14,102,0.08)',
                                backgroundColor: isDark
                                  ? 'rgba(255,255,255,0.05)'
                                  : '#FFFFFF',
                              },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: sel }}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: ink(theme),
                              fontFamily: sel
                                ? fonts.outfit.semiBold
                                : fonts.outfit.medium,
                            },
                          ]}
                        >
                          {sel ? '✓ ' : ''}
                          {c}
                        </Text>
                      </Pressable>
                    );
                  })}
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
                    placeholder="Said something in standup without rehearsing it…"
                    placeholderTextColor={inkFaint(theme)}
                    style={[styles.noteInput, { color: ink(theme) }]}
                    multiline
                    maxLength={300}
                  />
                </View>

                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit || submitting}
                  style={[
                    styles.submitWrap,
                    (!canSubmit || submitting) && styles.submitWrapDimmed,
                  ]}
                  accessibilityLabel="Log this tend"
                  accessibilityState={{ disabled: !canSubmit || submitting }}
                >
                  <LinearGradient
                    colors={[detail.mood, PINK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.submit}
                  >
                    <Text style={styles.submitText}>
                      {submitting ? 'Logging…' : 'Log this tend'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        )}
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
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
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
    fontSize: 12,
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
  // Body-length Edensor italic per so-6a7: 16/0.2 letterSpacing/1.45 lh.
  prompt: {
    fontFamily: fonts.edensor.italic,
    fontSize: 16,
    lineHeight: 16 * 1.45,
    letterSpacing: 0.2,
    marginBottom: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
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
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  // Body-length Edensor italic per so-6a7.
  noteInput: {
    fontFamily: fonts.edensor.italic,
    fontSize: 16,
    lineHeight: 16 * 1.45,
    letterSpacing: 0.2,
    minHeight: 48,
    padding: 0,
  },
  submitWrap: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  submitWrapDimmed: {
    opacity: 0.55,
  },
  submit: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: colors.white,
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
