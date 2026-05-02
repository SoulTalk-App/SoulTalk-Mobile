import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme';
import {
  ResonanceVote,
  Signal,
  SignalDetail,
  SoulpalVariant,
} from './types';
import { Theme, ink, inkFaint, inkSub } from './tokens';

const SOULPAL_SRC: Record<SoulpalVariant, any> = {
  1: require('../../../assets/images/home-v2/soulpal-1.png'),
  2: require('../../../assets/images/home-v2/soulpal-2.png'),
  3: require('../../../assets/images/home-v2/soulpal-3.png'),
  4: require('../../../assets/images/home-v2/soulpal-4.png'),
  5: require('../../../assets/images/home-v2/soulpal-5.png'),
};

// Mirrors so-kv3 + so-f6x: long instructional headlines fall back to a
// sans typeface so the modal body stays readable. Editorial Edensor stays
// for short, design-canonical headlines. Modal has more vertical room than
// the hub card so the truncate threshold is wider.
const HEADLINE_LONG_THRESHOLD = 60;
const HEADLINE_TRUNCATE_THRESHOLD = 120;

// Mirrors so-1ej / so-kv3: BE legacy rows stash SoulSight provenance into
// `detail`; treat that as null so the modal doesn't render
// "From SoulSight YYYY-MM-DD..." as body content.
function isMetadataDetail(detail: string | null | undefined): boolean {
  if (!detail) return true;
  return /^From\s+SoulSight\s+\d{4}-\d{2}-\d{2}/i.test(detail.trim());
}

type Props = {
  visible: boolean;
  detail: SignalDetail | null;
  /** When provided, the bound `Signal` from the list is used as a fallback
   *  while the detail fetch is in flight (lets the eyebrow + headline render
   *  immediately on tap). */
  fallbackSignal?: Signal | null;
  theme: Theme;
  onClose: () => void;
  onResonance?: (id: string, value: ResonanceVote) => void;
  onToggleSaved?: (id: string, nextSaved: boolean) => void;
  onMute?: (id: string) => void;
  /** Tap on "View pattern" — visible only for kind='pattern' signals with
   *  a tag. Forwards the tag for /soul-signals/patterns/{tag} fetch. */
  onViewPattern?: (tag: string) => void;
  /** Per-action submitting flags so the button being pressed can dim
   *  without freezing the others. */
  resonanceSubmitting?: ResonanceVote | null;
  saveSubmitting?: boolean;
};

export function SignalsDetailModal({
  visible,
  detail,
  fallbackSignal,
  theme,
  onClose,
  onResonance,
  onToggleSaved,
  onMute,
  onViewPattern,
  resonanceSubmitting = null,
  saveSubmitting = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';

  // While the detail fetch is in flight, project from the fallback list
  // signal so the modal's chrome paints immediately rather than blank.
  const display: SignalDetail | null =
    detail ??
    (fallbackSignal
      ? {
          ...fallbackSignal,
          sources: [],
          isSaved: fallbackSignal.isSaved ?? false,
          muteUntil: fallbackSignal.muteUntil ?? null,
          mutedForever: fallbackSignal.mutedForever ?? false,
        }
      : null);

  if (!display) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={styles.fullScreen}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </View>
      </Modal>
    );
  }

  const tone = display.tone;
  const eyebrowText =
    display.kind === 'pattern'
      ? `Pattern · ${display.tag ?? ''} · ${display.when}`.replace(' ·  · ', ' · ')
      : `Noticing · ${display.when}`;

  // Headline typography fork (so-xia): see HEADLINE_LONG_THRESHOLD comment.
  const fullHeadline = display.headline ?? '';
  const headlineIsLong = fullHeadline.length > HEADLINE_LONG_THRESHOLD;
  const displayHeadline =
    fullHeadline.length > HEADLINE_TRUNCATE_THRESHOLD
      ? fullHeadline.slice(0, HEADLINE_TRUNCATE_THRESHOLD - 1).trimEnd() + '…'
      : fullHeadline;
  // Drop "From SoulSight..." legacy provenance from the body slot.
  const visibleDetail = isMetadataDetail(display.detail) ? null : display.detail;

  const isMuteInert = !onMute;
  // Pattern signals expose an aggregation; observation signals don't.
  const showViewPattern =
    !!onViewPattern && display.kind === 'pattern' && !!display.tag;

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
            { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 },
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
            >
              <View style={styles.headerRow}>
                <Text
                  style={[styles.eyebrow, { color: tone }]}
                  numberOfLines={1}
                >
                  {eyebrowText}
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.closeBtn}
                  accessibilityLabel="Close"
                >
                  <Text style={[styles.closeX, { color: inkSub(theme) }]}>×</Text>
                </Pressable>
              </View>

              <View style={styles.headlineRow}>
                <Image
                  source={SOULPAL_SRC[display.soulpal]}
                  style={styles.headlineAvatar}
                  resizeMode="contain"
                />
                <View style={styles.headlineText}>
                  <Text
                    style={[
                      styles.headlineLabel,
                      { color: inkSub(theme) },
                    ]}
                  >
                    {display.kind === 'pattern' ? 'I keep noticing —' : 'I noticed —'}
                  </Text>
                  <Text
                    style={[
                      headlineIsLong ? styles.headlineLong : styles.headline,
                      { color: ink(theme) },
                    ]}
                  >
                    {displayHeadline}
                  </Text>
                </View>
              </View>

              {visibleDetail ? (
                <Text style={[styles.detail, { color: inkSub(theme) }]}>
                  {visibleDetail}
                </Text>
              ) : null}

              {display.sources.length > 0 ? (
                <View style={styles.sourcesBlock}>
                  <Text
                    style={[
                      styles.sourcesLabel,
                      { color: inkFaint(theme) },
                    ]}
                  >
                    From your entries
                  </Text>
                  {display.sources.map((src, i) => (
                    <View
                      key={`${src.date}-${i}`}
                      style={[
                        styles.sourceCard,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.04)'
                            : '#FBF6FF',
                          borderLeftColor: tone,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sourceDate,
                          { color: inkFaint(theme) },
                        ]}
                      >
                        {src.date}
                      </Text>
                      <Text
                        style={[styles.sourceExcerpt, { color: ink(theme) }]}
                      >
                        {src.excerpt}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Resonance card */}
              <View
                style={[
                  styles.resonanceCard,
                  {
                    backgroundColor: isDark
                      ? 'rgba(112,202,207,0.08)'
                      : '#FBF6FF',
                    borderColor: isDark
                      ? 'rgba(112,202,207,0.20)'
                      : 'rgba(58,14,102,0.06)',
                  },
                ]}
              >
                <Text
                  style={[styles.resonanceTitle, { color: ink(theme) }]}
                >
                  Does this resonate?
                </Text>
                <View style={styles.resonanceRow}>
                  <Pressable
                    onPress={() => onResonance?.(display.id, 'yes')}
                    disabled={!onResonance || resonanceSubmitting != null}
                    style={[
                      styles.resonanceBtn,
                      {
                        backgroundColor: isDark
                          ? 'rgba(112,202,207,0.20)'
                          : '#FFFFFF',
                        borderColor: tone,
                        borderWidth: 1.5,
                      },
                      resonanceSubmitting === 'yes' && styles.btnDimmed,
                    ]}
                    accessibilityLabel="Yes, this resonates"
                  >
                    <Text
                      style={[
                        styles.resonanceBtnText,
                        { color: ink(theme) },
                      ]}
                    >
                      ✓ Yes
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onResonance?.(display.id, 'not_quite')}
                    disabled={!onResonance || resonanceSubmitting != null}
                    style={[
                      styles.resonanceBtn,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.04)'
                          : '#FFFFFF',
                        borderColor: isDark
                          ? 'rgba(255,255,255,0.10)'
                          : 'rgba(58,14,102,0.08)',
                        borderWidth: 1,
                      },
                      resonanceSubmitting === 'not_quite' && styles.btnDimmed,
                    ]}
                    accessibilityLabel="Not quite"
                  >
                    <Text
                      style={[
                        styles.resonanceBtnText,
                        { color: inkSub(theme), fontFamily: fonts.outfit.medium },
                      ]}
                    >
                      Not quite
                    </Text>
                  </Pressable>
                </View>
              </View>

              {showViewPattern ? (
                <Pressable
                  onPress={() => onViewPattern!(display.tag!)}
                  style={[
                    styles.viewPatternRow,
                    {
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.10)'
                        : 'rgba(58,14,102,0.08)',
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.04)'
                        : '#FBF6FF',
                    },
                  ]}
                  accessibilityLabel={`View ${display.tag} pattern`}
                >
                  <Text style={[styles.viewPatternText, { color: tone }]}>
                    View {display.tag} pattern →
                  </Text>
                </Pressable>
              ) : null}

              {/* Save / Mute thread row */}
              <View style={styles.actionGrid}>
                <Pressable
                  onPress={() =>
                    onToggleSaved?.(display.id, !display.isSaved)
                  }
                  disabled={!onToggleSaved || saveSubmitting}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: display.isSaved
                        ? tone + '22'
                        : isDark
                          ? 'rgba(255,255,255,0.06)'
                          : '#FFFFFF',
                      borderColor: display.isSaved
                        ? tone
                        : isDark
                          ? 'rgba(255,255,255,0.10)'
                          : 'rgba(58,14,102,0.08)',
                    },
                    saveSubmitting && styles.btnDimmed,
                  ]}
                  accessibilityLabel={display.isSaved ? 'Unsave signal' : 'Save signal'}
                >
                  <Text style={[styles.actionText, { color: ink(theme) }]}>
                    📌 {display.isSaved ? 'Saved' : 'Save'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onMute?.(display.id)}
                  disabled={isMuteInert}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.06)'
                        : '#FFFFFF',
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.10)'
                        : 'rgba(58,14,102,0.08)',
                      opacity: isMuteInert ? 0.55 : 1,
                    },
                  ]}
                  accessibilityLabel="Mute thread"
                  accessibilityState={{ disabled: isMuteInert }}
                >
                  <Text style={[styles.actionText, { color: ink(theme) }]}>
                    🤫 Mute thread
                  </Text>
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
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  eyebrow: {
    flex: 1,
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  closeBtn: {
    padding: 6,
    marginRight: -6,
  },
  closeX: {
    fontSize: 24,
    lineHeight: 24,
    fontFamily: fonts.outfit.regular,
  },
  headlineRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  headlineAvatar: {
    width: 42,
    height: 42,
    marginTop: 2,
  },
  headlineText: {
    flex: 1,
  },
  // "I noticed —" / "I keep noticing —" eyebrow. Short emotional label —
  // bumped 13 → 14 + letterSpacing per so-6a7. Color brightens at the
  // call site (inkFaint → inkSub).
  headlineLabel: {
    fontFamily: fonts.edensor.italic,
    fontSize: 14,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  headline: {
    fontFamily: fonts.edensor.regular,
    fontSize: 24,
    lineHeight: 24 * 1.15,
    letterSpacing: -0.1,
  },
  // Long-headline variant (so-xia): Outfit Bold for legibility at modal
  // size; mirrors PatternCard.headlineLong (so-kv3) and ShiftsDetailModal
  // titleLong (so-f6x) for cross-feature consistency.
  headlineLong: {
    fontFamily: fonts.outfit.bold,
    fontSize: 22,
    lineHeight: 22 * 1.25,
    letterSpacing: -0.1,
  },
  detail: {
    marginTop: 12,
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.45,
  },
  sourcesBlock: {
    marginTop: 18,
  },
  sourcesLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sourceCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderLeftWidth: 2,
    marginBottom: 8,
  },
  sourceDate: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  // Body-length quoted source (so-6a7): bump to 16/0.2 letterSpacing.
  // Color stays at ink at the call site.
  sourceExcerpt: {
    fontFamily: fonts.edensor.italic,
    fontSize: 16,
    lineHeight: 16 * 1.45,
    letterSpacing: 0.2,
  },
  resonanceCard: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  resonanceTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    marginBottom: 8,
  },
  resonanceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  resonanceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resonanceBtnText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
  },
  viewPatternRow: {
    marginTop: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPatternText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  actionGrid: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
  },
  btnDimmed: {
    opacity: 0.55,
  },
});
