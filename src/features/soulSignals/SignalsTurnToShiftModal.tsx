import React, { useEffect, useState } from 'react';
import {
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
import { SoulpalVariant } from './types';
import { PINK, PURPLE, TEAL, Theme, ink, inkFaint, inkSub } from './tokens';

/**
 * Shape passed in by the parent (so-axs). Pre-computed from a
 * SignalPatternAggregate or a single pattern Signal: the parent owns the
 * derivation of a clean shift `title` + `practice` from the noisier signal
 * data, so this component stays presentation-only.
 */
export type TurnToShiftCandidate = {
  tag: string;
  tone: string;
  cat: string;
  soulpal: SoulpalVariant;
  title: string;
  practice: string;
  sourceSignalIds: string[];
};

type Props = {
  visible: boolean;
  candidate: TurnToShiftCandidate | null;
  theme: Theme;
  onClose: () => void;
  /** Confirm fires with possibly-edited title + practice. */
  onConfirm: (override: { title: string; practice: string }) => void;
  submitting?: boolean;
};

export function SignalsTurnToShiftModal({
  visible,
  candidate,
  theme,
  onClose,
  onConfirm,
  submitting = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';

  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [practiceDraft, setPracticeDraft] = useState('');

  // Reset drafts whenever the modal mounts a new candidate / re-opens.
  useEffect(() => {
    if (!visible || !candidate) {
      setEditing(false);
      setTitleDraft('');
      setPracticeDraft('');
      return;
    }
    setTitleDraft(candidate.title);
    setPracticeDraft(candidate.practice);
  }, [visible, candidate]);

  if (!candidate) return null;

  const handleConfirm = () => {
    if (submitting) return;
    onConfirm({
      title: titleDraft.trim() || candidate.title,
      practice: practiceDraft.trim() || candidate.practice,
    });
  };

  const tone = candidate.tone;

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
            { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 24 },
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
              {/* Eyebrow with the canonical Pattern→Shift arrow viz. */}
              <View style={styles.eyebrowRow}>
                <View style={[styles.eyebrowDot, { backgroundColor: tone }]} />
                <Text style={[styles.eyebrowText, { color: tone }]}>
                  Pattern · {candidate.tag}
                </Text>
                <Text style={[styles.eyebrowArrow, { color: inkFaint(theme) }]}>
                  →
                </Text>
                <Text style={[styles.eyebrowText, { color: PINK }]}>
                  Shift
                </Text>
              </View>

              <Text style={[styles.title, { color: ink(theme) }]}>
                Make this a shift you tend?
              </Text>

              {/* Candidate shift card preview */}
              <View
                style={[
                  styles.candidateCard,
                  {
                    backgroundColor: tone + '1F',
                    borderColor: tone + '88',
                  },
                ]}
              >
                {editing ? (
                  <TextInput
                    value={titleDraft}
                    onChangeText={setTitleDraft}
                    placeholder="Shift name"
                    placeholderTextColor={inkFaint(theme)}
                    style={[styles.candidateTitleInput, { color: ink(theme) }]}
                    multiline
                    maxLength={80}
                  />
                ) : (
                  <Text style={[styles.candidateTitle, { color: ink(theme) }]}>
                    {titleDraft}
                  </Text>
                )}

                <Text
                  style={[
                    styles.candidatePracticeLabel,
                    { color: inkFaint(theme) },
                  ]}
                >
                  The practice
                </Text>

                {editing ? (
                  <TextInput
                    value={practiceDraft}
                    onChangeText={setPracticeDraft}
                    placeholder="One or two sentences on how you'll practice this."
                    placeholderTextColor={inkFaint(theme)}
                    style={[
                      styles.candidatePracticeInput,
                      { color: ink(theme) },
                    ]}
                    multiline
                    maxLength={400}
                  />
                ) : (
                  <Text
                    style={[
                      styles.candidatePracticeBody,
                      { color: inkSub(theme) },
                    ]}
                  >
                    {practiceDraft}
                  </Text>
                )}
              </View>

              {/* Benefits checklist */}
              <View style={styles.benefitsCol}>
                {[
                  {
                    label: 'Starts at Notice stage',
                    sub: 'Move forward as you tend it.',
                  },
                  {
                    label: 'Linked to this pattern',
                    sub: 'New noticings strengthen it.',
                  },
                ].map((b) => (
                  <View
                    key={b.label}
                    style={[
                      styles.benefitRow,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.04)'
                          : '#FBF6FF',
                      },
                    ]}
                  >
                    <Text style={[styles.benefitTick, { color: TEAL }]}>✓</Text>
                    <View style={styles.benefitText}>
                      <Text
                        style={[styles.benefitLabel, { color: ink(theme) }]}
                      >
                        {b.label}
                      </Text>
                      <Text
                        style={[styles.benefitSub, { color: inkSub(theme) }]}
                      >
                        {b.sub}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={handleConfirm}
                disabled={submitting}
                style={[styles.cta, submitting && styles.ctaDimmed]}
                accessibilityLabel="Begin tending this shift"
                accessibilityState={{ disabled: submitting }}
              >
                <LinearGradient
                  colors={[PINK, PURPLE]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>
                    {submitting ? 'Beginning…' : 'Begin tending'}
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => setEditing((e) => !e)}
                style={styles.editToggle}
                accessibilityLabel={
                  editing ? 'Done editing' : 'Edit the practice first'
                }
              >
                <Text style={[styles.editToggleText, { color: inkSub(theme) }]}>
                  {editing ? 'Done editing' : 'Edit the practice first →'}
                </Text>
              </Pressable>
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
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eyebrowText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  eyebrowArrow: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
  },
  title: {
    fontFamily: fonts.edensor.regular,
    fontSize: 26,
    lineHeight: 26 * 1.15,
    textAlign: 'center',
    marginBottom: 14,
  },
  candidateCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  candidateTitle: {
    fontFamily: fonts.edensor.regular,
    fontSize: 19,
    lineHeight: 19 * 1.2,
    marginBottom: 8,
  },
  candidateTitleInput: {
    fontFamily: fonts.edensor.regular,
    fontSize: 19,
    lineHeight: 19 * 1.2,
    marginBottom: 8,
    padding: 0,
  },
  candidatePracticeLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  candidatePracticeBody: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.5,
  },
  candidatePracticeInput: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.5,
    minHeight: 60,
    padding: 0,
  },
  benefitsCol: {
    gap: 8,
    marginBottom: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  benefitTick: {
    fontSize: 16,
    marginTop: -2,
  },
  benefitText: {
    flex: 1,
  },
  benefitLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
  },
  benefitSub: {
    marginTop: 2,
    fontFamily: fonts.outfit.medium,
    // typography.caption floor (12pt medium) per so-cn9 / so-8li
    fontSize: 12,
  },
  cta: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  ctaDimmed: {
    opacity: 0.55,
  },
  ctaGradient: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: colors.white,
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  editToggle: {
    marginTop: 10,
    alignItems: 'center',
  },
  editToggleText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
  },
});
