import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme';
import { Shift, SoulpalVariant, STAGES, STATUS_LABEL } from './types';
import { PURPLE_INK, Theme, ink, inkSub, surfaceBg, surfaceBorder } from './tokens';

const SOULPAL_SRC: Record<SoulpalVariant, any> = {
  1: require('../../../assets/images/home-v2/soulpal-1.png'),
  2: require('../../../assets/images/home-v2/soulpal-2.png'),
  3: require('../../../assets/images/home-v2/soulpal-3.png'),
  4: require('../../../assets/images/home-v2/soulpal-4.png'),
  5: require('../../../assets/images/home-v2/soulpal-5.png'),
};

function stageIndex(s: Shift): number {
  if (s.status === 'integrated') return 4;
  if (s.status === 'active') return Math.max(1, Math.round(s.pct * 4));
  if (s.status === 'processing') return 1;
  return 0;
}

type Props = {
  shift: Shift;
  theme: Theme;
  /** When `true`, draws a tone-colored 2px border + outer glow. */
  focused?: boolean;
  /** When `true`, drops opacity to ~0.45 (used while another shift is focused). */
  dim?: boolean;
  /** Tap handler. When omitted, the card is non-interactive. */
  onPress?: () => void;
};

export function ShiftCard({ shift, theme, focused = false, dim = false, onPress }: Props) {
  const isDark = theme === 'dark';
  const locked = shift.status === 'locked';
  const processing = shift.status === 'processing';
  const idx = stageIndex(shift);

  const moodSoft = shift.mood + '33'; // ~20% alpha (hex rrggbb + aa)
  const moodMed = shift.mood + '66';
  const moodPill = shift.mood + '22';
  const moodPillBorder = shift.mood + '55';

  const mutedTrack = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(58,14,102,0.10)';
  const mutedDot = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(58,14,102,0.15)';

  const cardStyle = [
    styles.card,
    {
      backgroundColor: surfaceBg(theme),
      borderColor: focused ? shift.mood : surfaceBorder(theme),
      borderWidth: focused ? 2 : 1,
      opacity: dim ? 0.45 : locked ? 0.65 : 1,
    },
    focused && {
      shadowColor: shift.mood,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 12,
      elevation: 6,
    },
  ];

  const Content = (
    <>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: moodSoft, borderColor: moodMed },
          ]}
        >
          <Image
            source={SOULPAL_SRC[shift.soulpal]}
            style={styles.avatarImg}
            resizeMode="contain"
          />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: ink(theme) }]} numberOfLines={1}>
            {shift.title}
          </Text>
          <Text style={[styles.sub, { color: inkSub(theme) }]} numberOfLines={1}>
            {shift.cat}
            {shift.since ? ` · ${shift.since}` : ''}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            locked
              ? {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(58,14,102,0.08)',
                }
              : {
                  backgroundColor: moodPill,
                  borderWidth: 1,
                  borderColor: moodPillBorder,
                },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: locked ? inkSub(theme) : isDark ? '#fff' : PURPLE_INK },
            ]}
          >
            {locked
              ? '🔒 Locked'
              : processing
                ? 'Processing…'
                : STATUS_LABEL[shift.status]}
          </Text>
        </View>
      </View>

      {/* stepper */}
      <View style={styles.stepperWrap}>
        <View style={styles.stepperRow}>
          {STAGES.map((_, i) => {
            const reached = i < idx;
            const current = i === idx - 1;
            const dotSize = current ? 14 : 10;
            return (
              <React.Fragment key={i}>
                <View
                  style={[
                    styles.dot,
                    {
                      width: dotSize,
                      height: dotSize,
                      borderRadius: dotSize / 2,
                      backgroundColor:
                        reached || current ? shift.mood : mutedDot,
                      borderWidth: current ? 2 : 0,
                      borderColor: current ? moodPillBorder : 'transparent',
                      shadowColor: current ? shift.mood : undefined,
                      shadowOpacity: current ? 0.6 : 0,
                      shadowRadius: current ? 10 : 0,
                      shadowOffset: { width: 0, height: 0 },
                    },
                  ]}
                />
                {i < STAGES.length - 1 ? (
                  <View
                    style={[
                      styles.connector,
                      { backgroundColor: reached ? shift.mood : mutedTrack },
                    ]}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>
        <View style={styles.labelsRow}>
          {STAGES.map((stage, i) => {
            const reached = i < idx;
            const current = i === idx - 1;
            return (
              <Text
                key={stage}
                style={[
                  styles.stageLabel,
                  {
                    color: reached || current ? ink(theme) : inkSub(theme),
                    fontFamily:
                      reached || current
                        ? fonts.outfit.semiBold
                        : fonts.outfit.regular,
                  },
                ]}
              >
                {stage}
              </Text>
            );
          })}
        </View>
      </View>

      {processing ? (
        <Text style={[styles.processingNote, { color: inkSub(theme) }]}>
          SoulPal is sensing this pattern in your recent entries…
        </Text>
      ) : null}
    </>
  );

  if (onPress && !locked) {
    return (
      <Pressable style={cardStyle} onPress={onPress}>
        {Content}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{Content}</View>;
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 28,
    height: 28,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    lineHeight: 14 * 1.2,
  },
  sub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
  },
  stepperWrap: {
    marginTop: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  dot: {
    flexShrink: 0,
  },
  connector: {
    flex: 1,
    height: 2,
    marginHorizontal: 2,
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  stageLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
  },
  processingNote: {
    marginTop: 10,
    fontFamily: fonts.edensor.lightItalic,
    fontSize: 12,
  },
});
