import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../theme';
import { useSoulPalName } from '../../contexts/SoulPalContext';
import {
  Signal,
  SignalPatternAggregate,
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

// Mirrors so-xia. Pattern modal headline is server-formatted, but if the
// BE rule produces something long ("Pattern across the past 12 months")
// the typography fork still applies.
const HEADLINE_LONG_THRESHOLD = 60;

type Props = {
  visible: boolean;
  aggregate: SignalPatternAggregate | null;
  loading: boolean;
  theme: Theme;
  onClose: () => void;
  /** Tap on an individual noticing card → open SignalsDetailModal in
   *  the parent. Forwards the signal id. */
  onNoticingPress?: (id: string) => void;
  /** Inert per so-7e0 pattern until so-axs (TurnToShift) lands. */
  onTurnToShift?: (aggregate: SignalPatternAggregate) => void;
  /**
   * Open the existing Soul Shift that one of this pattern's noticings already
   * feeds (so-8uf). When set + at least one noticing has linkedShiftId, the
   * Turn CTA disables and a "↗ View existing shift" link appears in its place.
   */
  onViewExistingShift?: (shiftId: string) => void;
};

export function SignalsPatternModal({
  visible,
  aggregate,
  loading,
  theme,
  onClose,
  onNoticingPress,
  onTurnToShift,
  onViewExistingShift,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const soulPalName = useSoulPalName();

  const tone = aggregate?.tone ?? '#B89CE0';
  const hasNoticings = (aggregate?.noticings?.length ?? 0) > 0;
  const headlineIsLong =
    (aggregate?.headline?.length ?? 0) > HEADLINE_LONG_THRESHOLD;
  // Existing-shift gate (so-8uf): if any noticing already feeds a non-released
  // shift, the pattern is already turned; surface that shift instead of
  // creating a duplicate. BE dedupe (so-c9f) blocks duplicates anyway, but
  // gating here gives the user clearer UX.
  const linkedShiftId =
    aggregate?.noticings.find((n) => n.linkedShiftId)?.linkedShiftId ?? null;
  const turnInert = !onTurnToShift || linkedShiftId != null;
  const [shiftInfoOpen, setShiftInfoOpen] = useState(false);

  // so-bl51: bail before mounting the Modal portal subtree when not visible
  // — see soulShifts/TendModal for the architectural rationale.
  if (!visible) return null;

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
                  Pattern · {aggregate?.tag ?? '…'}
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

              {aggregate ? (
                <>
                  <View style={styles.headlineRow}>
                    <Image
                      source={SOULPAL_SRC[aggregate.soulpal]}
                      style={[
                        styles.headlineAvatar,
                        isDark
                          ? {
                              shadowColor: tone,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.6,
                              shadowRadius: 8,
                            }
                          : null,
                      ]}
                      resizeMode="contain"
                    />
                    <View style={styles.headlineText}>
                      <Text
                        style={[styles.headlineLabel, { color: inkSub(theme) }]}
                      >
                        I keep noticing —
                      </Text>
                      <Text
                        style={[
                          headlineIsLong
                            ? styles.headlineLong
                            : styles.headline,
                          { color: ink(theme) },
                        ]}
                      >
                        {aggregate.headline}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.summary, { color: inkSub(theme) }]}>
                    {aggregate.summary}
                  </Text>

                  <View style={styles.noticingsBlock}>
                    <Text
                      style={[
                        styles.noticingsLabel,
                        { color: inkFaint(theme) },
                      ]}
                    >
                      {aggregate.noticings.length} reflection
                      {aggregate.noticings.length === 1 ? '' : 's'}
                    </Text>
                    {hasNoticings ? (
                      aggregate.noticings.map((n) => (
                        <NoticingMiniCard
                          key={n.id}
                          signal={n}
                          tone={tone}
                          theme={theme}
                          onPress={onNoticingPress}
                        />
                      ))
                    ) : (
                      <Text
                        style={[styles.emptyCopy, { color: ink(theme) }]}
                      >
                        No reflections tagged here yet. Keep journaling and
                        {' '}{soulPalName} will surface threads as they form.
                      </Text>
                    )}
                  </View>

                  {/*
                    so-1qyt: once the pattern has already been turned into
                    a Shift (linkedShiftId != null), hide the Turn CTA
                    entirely instead of showing it disabled. Chey reported
                    the still-visible-but-inert affordance reads as broken.
                    The "View existing shift" link below replaces it.
                    The disabled-but-visible state remains for the pre-handler
                    case (!onTurnToShift) so users still see the future
                    capability before the feature is wired up.
                  */}
                  {linkedShiftId == null && (
                    <View>
                      {/*
                        so-8gd4: the CTA and (i) info icon share a single
                        dashed-border row. Using a wrapper View avoids nesting
                        a Pressable inside a disabled Pressable (touch
                        propagation edge case on Android).
                      */}
                      <View
                        style={[
                          styles.turnCtaWrap,
                          {
                            borderColor: isDark
                              ? 'rgba(255,255,255,0.25)'
                              : 'rgba(58,14,102,0.20)',
                            opacity: turnInert ? 0.55 : 1,
                          },
                        ]}
                      >
                        <Pressable
                          onPress={
                            turnInert ? undefined : () => onTurnToShift!(aggregate)
                          }
                          disabled={turnInert}
                          style={styles.turnCta}
                          accessibilityLabel="Turn pattern into a shift"
                          accessibilityState={{ disabled: turnInert }}
                        >
                          <Text style={[styles.turnCtaText, { color: inkSub(theme) }]}>
                            Turn pattern into a Shift →
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setShiftInfoOpen((o) => !o)}
                          style={styles.shiftInfoBtn}
                          accessibilityLabel="What is a Shift?"
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name="information-circle-outline"
                            size={16}
                            color={inkSub(theme)}
                          />
                        </Pressable>
                      </View>
                      {shiftInfoOpen && (
                        <View
                          style={[
                            styles.shiftInfoPanel,
                            {
                              borderColor: isDark
                                ? 'rgba(255,255,255,0.10)'
                                : 'rgba(58,14,102,0.10)',
                              backgroundColor: isDark
                                ? 'rgba(255,255,255,0.04)'
                                : 'rgba(58,14,102,0.03)',
                            },
                          ]}
                        >
                          <Text style={[styles.shiftInfoText, { color: inkSub(theme) }]}>
                            Signals show you the recurring patterns in your reflections. Turning a pattern into a Shift starts a small, tendable practice to work with it: a gentle experiment you move forward each time you catch the old pattern or try a new response. Shifts move through Notice, Practice, Embody, and Integrate as you tend them.
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {linkedShiftId != null && onViewExistingShift && (
                    <Pressable
                      onPress={() => onViewExistingShift(linkedShiftId)}
                      style={styles.viewExistingLink}
                      accessibilityLabel="View existing shift"
                    >
                      <Text style={[styles.viewExistingText, { color: tone }]}>
                        ↗ View existing shift
                      </Text>
                    </Pressable>
                  )}
                </>
              ) : (
                <View style={styles.loadingShell}>
                  {loading ? (
                    <ActivityIndicator color={isDark ? '#fff' : '#3A0E66'} />
                  ) : (
                    <Text style={[styles.emptyCopy, { color: ink(theme) }]}>
                      Couldn’t load this pattern.
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NoticingMiniCard({
  signal,
  tone,
  theme,
  onPress,
}: {
  signal: Signal;
  tone: string;
  theme: Theme;
  onPress?: (id: string) => void;
}) {
  const isDark = theme === 'dark';
  const interactive = !!onPress;
  const inner = (
    <View
      style={[
        miniStyles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FBF6FF',
          borderLeftColor: tone,
        },
      ]}
    >
      <Text style={[miniStyles.when, { color: tone }]}>{signal.when}</Text>
      <Text style={[miniStyles.headline, { color: ink(theme) }]}>
        {signal.headline}
      </Text>
      {signal.quotes[0] ? (
        <Text style={[miniStyles.quote, { color: ink(theme) }]}>
          {signal.quotes[0]}
        </Text>
      ) : null}
    </View>
  );

  if (!interactive) return inner;
  return (
    <Pressable onPress={() => onPress!(signal.id)} accessibilityRole="button">
      {inner}
    </Pressable>
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
  // "I keep noticing —" eyebrow per so-6a7: 13 → 14 + letterSpacing.
  // Color brightens at the call site (inkFaint → inkSub).
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
  headlineLong: {
    fontFamily: fonts.outfit.bold,
    fontSize: 22,
    lineHeight: 22 * 1.25,
    letterSpacing: -0.1,
  },
  summary: {
    marginTop: 12,
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  noticingsBlock: {
    marginTop: 18,
  },
  noticingsLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  // Body-length empty-state copy (so-6a7).
  emptyCopy: {
    fontFamily: fonts.edensor.italic,
    fontSize: 16,
    lineHeight: 16 * 1.45,
    letterSpacing: 0.2,
  },
  // so-8gd4: wrapper View owns the border + layout; inner Pressable is
  // touch-only so the (i) icon sits outside the disabled Pressable.
  turnCtaWrap: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  turnCta: {
    flex: 1,
    paddingVertical: 11,
    paddingLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnCtaText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  // so-8gd4: (i) icon tap target, right edge of the row.
  shiftInfoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // so-8gd4: inline explainer panel — appears below the CTA when (i) tapped.
  // Not a second Modal (iOS stacking constraint); local state resets on close.
  shiftInfoPanel: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  shiftInfoText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    lineHeight: 13 * 1.55,
  },
  viewExistingLink: {
    marginTop: 10,
    alignItems: 'center',
  },
  viewExistingText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  loadingShell: {
    paddingVertical: 32,
    alignItems: 'center',
  },
});

const miniStyles = StyleSheet.create({
  card: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderLeftWidth: 2,
    marginBottom: 8,
  },
  when: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  headline: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    lineHeight: 13 * 1.35,
  },
  // Mini-card quote — constrained vertically; bumped 12 → 14 + letterSpacing
  // per so-6a7's "drop one font level if layout can't fit" guidance. Color
  // brightens at the call site (inkSub → ink).
  quote: {
    marginTop: 4,
    fontFamily: fonts.edensor.italic,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    letterSpacing: 0.2,
  },
});
