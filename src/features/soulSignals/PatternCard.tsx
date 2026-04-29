import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { fonts } from '../../theme';
import { Group, SoulpalVariant } from './types';
import {
  Theme,
  ink,
  inkFaint,
  inkSub,
  surfaceBg,
  surfaceBorder,
} from './tokens';

const SOULPAL_SRC: Record<SoulpalVariant, any> = {
  1: require('../../../assets/images/home-v2/soulpal-1.png'),
  2: require('../../../assets/images/home-v2/soulpal-2.png'),
  3: require('../../../assets/images/home-v2/soulpal-3.png'),
  4: require('../../../assets/images/home-v2/soulpal-4.png'),
  5: require('../../../assets/images/home-v2/soulpal-5.png'),
};

type Props = {
  group: Group;
  theme: Theme;
};

export function PatternCard({ group, theme }: Props) {
  const isDark = theme === 'dark';
  const { pattern, related } = group;
  const tone = pattern.tone;
  const heroAlphaTop = isDark ? `${tone}26` : `${tone}22`;
  const heroAlphaBottom = `${tone}08`;
  const heroBorderBottom = isDark
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(58,14,102,0.06)';
  const tagTextColor = isDark ? '#0A0218' : '#fff';
  const strength = Math.round((pattern.strength ?? 0) * 5);
  const mutedBar = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(79,23,134,0.18)';
  const relatedRowBg = isDark
    ? 'rgba(255,255,255,0.04)'
    : 'rgba(79,23,134,0.04)';
  const fedDivider = isDark
    ? 'rgba(255,255,255,0.12)'
    : 'rgba(79,23,134,0.10)';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: surfaceBg(theme),
          borderColor: surfaceBorder(theme),
        },
      ]}
    >
      <LinearGradient
        colors={[heroAlphaTop, heroAlphaBottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderBottomColor: heroBorderBottom }]}
      >
        <View style={styles.heroTopRow}>
          {pattern.tag ? (
            <View style={[styles.tag, { backgroundColor: tone }]}>
              <Text style={[styles.tagText, { color: tagTextColor }]}>
                {pattern.tag}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.metaCaption, { color: inkSub(theme) }]}>
            Pattern · {pattern.when}
          </Text>
          <View style={styles.strengthBars}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.strengthBar,
                  { backgroundColor: i < strength ? tone : mutedBar },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.heroBodyRow}>
          <View
            style={[
              styles.soulpalWrap,
              isDark
                ? {
                    shadowColor: tone,
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 0 },
                  }
                : null,
            ]}
          >
            <Image
              source={SOULPAL_SRC[pattern.soulpal]}
              style={styles.soulpal}
              resizeMode="contain"
            />
          </View>
          <View style={styles.heroBodyText}>
            <Text style={[styles.headline, { color: ink(theme) }]}>
              {pattern.headline}
            </Text>
            <Text style={[styles.detail, { color: inkSub(theme) }]}>
              {pattern.detail}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {related.length > 0 ? (
        <View style={styles.relatedBlock}>
          <Text style={[styles.relatedLabel, { color: inkFaint(theme) }]}>
            {related.length} noticing{related.length === 1 ? '' : 's'} fed this pattern
          </Text>
          <View style={styles.relatedList}>
            {related.map((r) => (
              <View
                key={r.id}
                style={[styles.relatedRow, { backgroundColor: relatedRowBg }]}
              >
                <View
                  style={[
                    styles.relatedDot,
                    {
                      backgroundColor: tone,
                      shadowColor: tone,
                    },
                  ]}
                />
                <View style={styles.relatedTextWrap}>
                  <Text style={[styles.relatedHeadline, { color: ink(theme) }]}>
                    {r.headline}
                  </Text>
                  {r.quotes[0] ? (
                    <Text style={[styles.relatedQuote, { color: inkSub(theme) }]}>
                      {r.quotes[0]}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.relatedWhen, { color: inkFaint(theme) }]}>
                  {r.when}
                </Text>
              </View>
            ))}
          </View>

          {pattern.fedSight ? (
            <View
              style={[
                styles.fedFooter,
                { borderTopColor: fedDivider },
              ]}
            >
              <Svg width={11} height={11} viewBox="0 0 12 12">
                <Path
                  d="M6 1l1.5 3.5 3.5.5-2.5 2.5.5 3.5L6 9l-3 2 .5-3.5L1 5l3.5-.5z"
                  fill={tone}
                  opacity={0.85}
                />
              </Svg>
              <Text style={[styles.fedText, { color: inkSub(theme) }]}>
                fed into{' '}
                <Text style={[styles.fedSightName, { color: ink(theme) }]}>
                  {pattern.fedSight}
                </Text>
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  hero: {
    padding: 16,
    borderBottomWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaCaption: {
    fontFamily: fonts.outfit.medium,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  strengthBars: {
    marginLeft: 'auto',
    flexDirection: 'row',
    gap: 2,
  },
  strengthBar: {
    width: 4,
    height: 10,
    borderRadius: 1,
  },
  heroBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  soulpalWrap: {
    marginTop: 2,
  },
  soulpal: {
    width: 42,
    height: 42,
  },
  heroBodyText: {
    flex: 1,
  },
  headline: {
    fontFamily: fonts.edensor.regular,
    fontSize: 22,
    lineHeight: 22 * 1.15,
    letterSpacing: -0.2,
  },
  detail: {
    fontFamily: fonts.outfit.light,
    fontSize: 13,
    lineHeight: 13 * 1.45,
    marginTop: 6,
  },
  relatedBlock: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  relatedLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  relatedList: {
    gap: 8,
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  relatedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  relatedTextWrap: {
    flex: 1,
  },
  relatedHeadline: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    lineHeight: 12 * 1.35,
  },
  relatedQuote: {
    fontFamily: fonts.edensor.italic,
    fontSize: 11,
    marginTop: 3,
  },
  relatedWhen: {
    fontFamily: fonts.outfit.medium,
    fontSize: 9,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  fedFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fedText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
  },
  fedSightName: {
    fontFamily: fonts.outfit.semiBold,
  },
});
