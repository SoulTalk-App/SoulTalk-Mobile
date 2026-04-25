import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Line,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { fonts } from '../../theme';
import { CardShell } from './CardShell';
import { PURPLE, Theme } from './tokens';

const SOULPAL_SRC: Record<number, any> = {
  1: require('../../../assets/images/home-v2/soulpal-1.png'),
  2: require('../../../assets/images/home-v2/soulpal-2.png'),
  3: require('../../../assets/images/home-v2/soulpal-3.png'),
  4: require('../../../assets/images/home-v2/soulpal-4.png'),
  5: require('../../../assets/images/home-v2/soulpal-5.png'),
};

const ARCHETYPES = [
  { variant: 1, angle: -90 },
  { variant: 2, angle: -18 },
  { variant: 4, angle: 54 },
  { variant: 3, angle: 126 },
  { variant: 5, angle: 198 },
];

const VB_W = 160;
const VB_H = 180;
const CX = 80;
const CY = 84;
const R = 50;

type Props = { theme: Theme; onPress?: () => void };

export function PersonalityCard({ theme, onPress }: Props) {
  const isDark = theme === 'dark';

  const orbitColor = isDark ? 'rgba(255,200,92,0.45)' : 'rgba(126,91,217,0.4)';
  const orbitColor2 = isDark ? 'rgba(112,202,207,0.55)' : 'rgba(126,91,217,0.55)';
  const haloColor = isDark ? '#FFC85C' : '#7E5BD9';

  return (
    <CardShell
      theme={theme}
      aspectRatio={1 / 1.15}
      label="Personality Test"
      labelColor={PURPLE}
      onPress={onPress}
    >
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        <Defs>
          {isDark ? (
            <RadialGradient id="pers-bg" cx="50%" cy="30%" r="80%">
              <Stop offset="0%" stopColor="#5C3FB5" />
              <Stop offset="55%" stopColor="#2A0F66" />
              <Stop offset="100%" stopColor="#110428" />
            </RadialGradient>
          ) : (
            <SvgLinearGradient id="pers-bg" x1="0.329" y1="0.030" x2="0.671" y2="0.970">
              <Stop offset="0%" stopColor="#F1E7FF" />
              <Stop offset="55%" stopColor="#E0CDFF" />
              <Stop offset="100%" stopColor="#C8A6FF" />
            </SvgLinearGradient>
          )}
          <RadialGradient id="pers-halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={haloColor} stopOpacity={0.8} />
            <Stop offset="100%" stopColor={haloColor} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#pers-bg)" />

        {/* dotted orbits */}
        <Circle
          cx={CX}
          cy={CY}
          r={R + 14}
          fill="none"
          stroke={orbitColor}
          strokeWidth={0.7}
          strokeDasharray="1.5,3"
        />
        <Circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={orbitColor2}
          strokeWidth={0.8}
          strokeDasharray="2,3"
        />
        <Circle
          cx={CX}
          cy={CY}
          r={R - 16}
          fill="none"
          stroke={orbitColor}
          strokeWidth={0.6}
          strokeDasharray="1,3"
        />

        {/* connectors */}
        {ARCHETYPES.map((a, i) => {
          const rad = (a.angle * Math.PI) / 180;
          return (
            <Line
              key={`l-${i}`}
              x1={CX}
              y1={CY}
              x2={CX + Math.cos(rad) * R}
              y2={CY + Math.sin(rad) * R}
              stroke={orbitColor}
              strokeWidth={0.5}
              strokeDasharray="1.5,2.5"
              opacity={0.55}
            />
          );
        })}

        {/* halo */}
        <Circle cx={CX} cy={CY} r={22} fill="url(#pers-halo)" />
      </Svg>

      {/* orbiting soulpals */}
      {ARCHETYPES.map((a, i) => {
        const rad = (a.angle * Math.PI) / 180;
        const xPct = ((CX + Math.cos(rad) * R) / VB_W) * 100;
        const yPct = ((CY + Math.sin(rad) * R) / VB_H) * 100;
        return (
          <View
            key={`pal-${i}`}
            pointerEvents="none"
            style={[
              styles.orbital,
              {
                left: `${xPct}%`,
                top: `${yPct}%`,
                shadowColor: isDark ? '#70CACF' : '#3A0E66',
                shadowOpacity: isDark ? 0.6 : 0.18,
                shadowRadius: isDark ? 6 : 6,
                shadowOffset: { width: 0, height: isDark ? 0 : 2 },
              },
            ]}
          >
            <Image
              source={SOULPAL_SRC[a.variant]}
              style={styles.orbitalImage}
              resizeMode="contain"
            />
          </View>
        );
      })}

      {/* center: active archetype on pedestal */}
      <View pointerEvents="none" style={styles.centerWrap}>
        <View
          style={{
            shadowColor: isDark ? '#70CACF' : '#3A0E66',
            shadowOpacity: isDark ? 0.7 : 0.22,
            shadowRadius: isDark ? 12 : 10,
            shadowOffset: { width: 0, height: isDark ? 0 : 4 },
          }}
        >
          <Image
            source={SOULPAL_SRC[5]}
            style={styles.centerImage}
            resizeMode="contain"
          />
        </View>
        {/* aztec pedestal: white-with-black-border bar over black bar */}
        <View style={styles.pedestalWrap}>
          <View style={styles.pedestalTop} />
          <View style={styles.pedestalBottom} />
        </View>
      </View>

      <Text style={[styles.subLabel, { color: isDark ? 'rgba(255,255,255,0.78)' : 'rgba(58,14,102,0.7)' }]}>
        Which one are you?
      </Text>
    </CardShell>
  );
}

const styles = StyleSheet.create({
  orbital: {
    position: 'absolute',
    width: 26,
    height: 26,
    marginLeft: -13,
    marginTop: -13,
    opacity: 0.78,
  },
  orbitalImage: {
    width: 26,
    height: 26,
  },
  centerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '46%',
    alignItems: 'center',
    transform: [{ translateY: -23 }],
  },
  centerImage: {
    width: 46,
    height: 46,
  },
  pedestalWrap: {
    alignItems: 'center',
    marginTop: 2,
  },
  pedestalTop: {
    width: 30,
    height: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000',
  },
  pedestalBottom: {
    width: 22,
    height: 4,
    backgroundColor: '#000',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#000',
  },
  subLabel: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.edensor.lightItalic,
    fontSize: 11,
  },
});
