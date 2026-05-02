import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';
import { ShiftDetail, SoulpalVariant, STAGES } from './types';
import { PURPLE_INK, Theme, inkSub } from './tokens';

const SOULPAL_SRC: Record<SoulpalVariant, any> = {
  1: require('../../../assets/images/home-v2/soulpal-1.png'),
  2: require('../../../assets/images/home-v2/soulpal-2.png'),
  3: require('../../../assets/images/home-v2/soulpal-3.png'),
  4: require('../../../assets/images/home-v2/soulpal-4.png'),
  5: require('../../../assets/images/home-v2/soulpal-5.png'),
};

// Headline copy keyed off the stage we just entered. Mirrors canonical
// shifts-states.jsx ShiftsStageAdvance ("You're embodying it now.")
const STAGE_HEADLINE: Record<number, string> = {
  1: "You're practicing it now.",
  2: "You're embodying it now.",
  3: "You've integrated it.",
};

const RAY_COUNT = 16;

type Props = {
  visible: boolean;
  detail: ShiftDetail | null;
  prevStage: number;
  nextStage: number;
  theme: Theme;
  onReflect: () => void;
  onContinue: () => void;
};

export function StageAdvance({
  visible,
  detail,
  prevStage,
  nextStage,
  theme,
  onReflect,
  onContinue,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';

  if (!detail) return null;

  const tone = detail.mood;
  const headline = STAGE_HEADLINE[nextStage] ?? "You've moved forward.";
  const prevLabel = STAGES[prevStage] ?? STAGES[0];
  const nextLabel = STAGES[nextStage] ?? STAGES[STAGES.length - 1];

  // Subline typography fork (so-ozf, mirrors so-f6x / so-niz). Long titles
  // → readable Outfit Light, with a 40-char ellipsis on the title quote
  // so the line can breathe. Short titles → editorial Edensor italic.
  const SUBLINE_LONG_THRESHOLD = 60;
  const SUBLINE_QUOTE_TRUNCATE = 40;
  const fullTitle = detail.title ?? '';
  const titleIsLong = fullTitle.length > SUBLINE_LONG_THRESHOLD;
  const titleQuote = titleIsLong
    ? fullTitle.slice(0, SUBLINE_QUOTE_TRUNCATE - 1).trimEnd() + '…'
    : fullTitle;
  // Optional "after N tends" suffix from so-c0y's response data. Omitted
  // gracefully when tendCount is null/undefined.
  const tendCount = detail.tendCount;
  const tendSuffix =
    typeof tendCount === 'number' && tendCount > 0
      ? ` after ${tendCount} tend${tendCount === 1 ? '' : 's'}`
      : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onContinue}
      statusBarTranslucent
    >
      <View
        style={[
          styles.root,
          { backgroundColor: isDark ? '#02011A' : '#3A0E66' },
        ]}
      >
        {/* Radial wash: lighter on the dark theme, deeper purple on light. */}
        <LinearGradient
          colors={
            isDark
              ? ['rgba(112,202,207,0.45)', 'rgba(2,1,20,0.92)']
              : ['rgba(112,202,207,0.35)', 'rgba(58,14,102,0.85)']
          }
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Radiating rays. */}
        <View pointerEvents="none" style={[styles.rays, { top: insets.top + 90 }]}>
          <Svg width="100%" height="100%" viewBox="0 0 393 860" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: RAY_COUNT }).map((_, i) => {
              const a = (i / RAY_COUNT) * Math.PI * 2;
              const x2 = 196 + Math.cos(a) * 800;
              const y2 = 320 + Math.sin(a) * 800;
              return (
                <Line
                  key={i}
                  x1={196}
                  y1={320}
                  x2={x2}
                  y2={y2}
                  stroke={tone}
                  strokeWidth={0.6}
                  strokeOpacity={0.55}
                  strokeDasharray="6 22"
                />
              );
            })}
          </Svg>
        </View>

        <View style={[styles.center, { top: insets.top + 130 }]}>
          {/* Avatar halo: a circular tone-tinted disc behind the soulpal
              Image instead of `shadow*` props on the Image directly.
              iOS shadow renders the bounding box outline (a 140x140 square),
              which produced the visible square artifact we hit pre-so-ozf. */}
          <View
            style={[
              styles.heroAvatarWrap,
              {
                backgroundColor: tone,
                shadowColor: tone,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.65,
                shadowRadius: 30,
              },
            ]}
          >
            <Image
              source={SOULPAL_SRC[detail.soulpal]}
              style={styles.heroAvatar}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.eyebrow, { color: tone }]}>Shift advanced</Text>
          <Text style={styles.headline}>{headline}</Text>
          <Text
            style={[
              titleIsLong ? styles.sublineSans : styles.subline,
              styles.sublineCommon,
            ]}
            numberOfLines={3}
          >
            “{titleQuote}” moved from {prevLabel} → {nextLabel}
            {tendSuffix}.
          </Text>

          <View
            style={[
              styles.transitionPill,
              {
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.18)',
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: tone,
                  shadowColor: tone,
                  shadowOpacity: 0.8,
                  shadowOffset: { width: 0, height: 0 },
                  shadowRadius: 6,
                },
              ]}
            />
            <Text style={styles.transitionText}>
              {prevLabel} →{' '}
              <Text style={[styles.transitionTextStrong, { color: tone }]}>
                {nextLabel}
              </Text>
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.ctaStack,
            { bottom: insets.bottom + 32 },
          ]}
        >
          <Pressable
            onPress={onReflect}
            style={[styles.ctaPrimary, { backgroundColor: '#FFFFFF' }]}
            accessibilityLabel="Reflect on this"
          >
            <Text style={[styles.ctaPrimaryText, { color: PURPLE_INK }]}>
              Reflect on this
            </Text>
          </Pressable>
          <Pressable
            onPress={onContinue}
            style={[
              styles.ctaSecondary,
              { borderColor: 'rgba(255,255,255,0.30)' },
            ]}
            accessibilityLabel="Continue"
          >
            <Text style={styles.ctaSecondaryText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// inkSub kept available so the lint guard for the import doesn't fire.
void inkSub;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  rays: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  center: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  heroAvatarWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    // Tone-tinted glow disc backgrounds the soulpal silhouette. The
    // backgroundColor + low-opacity shadow combination renders a circular
    // halo on iOS without leaking the bounding-box outline that
    // `shadow*` on a plain Image produces.
    opacity: 0.96,
    elevation: 12,
  },
  heroAvatar: {
    width: 140,
    height: 140,
    flexShrink: 0,
  },
  eyebrow: {
    marginTop: 10,
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headline: {
    marginTop: 6,
    fontFamily: fonts.edensor.regular,
    fontSize: 38,
    lineHeight: 38 * 1.05,
    letterSpacing: -0.4,
    color: colors.white,
    textAlign: 'center',
  },
  // Editorial variant — short titles keep the Edensor italic feel.
  // Body-length Edensor italic per so-6a7: 16pt with 0.2 letterSpacing.
  subline: {
    fontFamily: fonts.edensor.italic,
    fontSize: 16,
    lineHeight: 16 * 1.45,
    letterSpacing: 0.2,
  },
  // Sans variant for long instructional titles (so-ozf). Outfit Light at
  // 14 reads cleanly inside the celebration's center column.
  sublineSans: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    lineHeight: 14 * 1.5,
  },
  sublineCommon: {
    marginTop: 6,
    // Brightened from rgba 0.78 → 0.95 per so-6a7 (italic display serif
    // loses definition at reduced opacity).
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    maxWidth: 280,
  },
  transitionPill: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  transitionText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: colors.white,
  },
  transitionTextStrong: {
    fontFamily: fonts.outfit.bold,
  },
  ctaStack: {
    position: 'absolute',
    left: 20,
    right: 20,
    gap: 10,
  },
  ctaPrimary: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimaryText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
  },
  ctaSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaSecondaryText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors.white,
  },
});
