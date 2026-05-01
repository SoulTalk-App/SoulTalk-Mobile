// CosmicBackdrop — RN port of the canonical SoulTalk dark-mode atmospheric
// backdrop (Design/incoming/unzipped/ui_kits/soultalk-app/cosmic-backdrop.jsx).
//
// Layers (bottom → top): deep gradient → nebula cloud → star field →
// constellation lines → orbA → orbB → aurora ribbon. (Shooting star omitted
// in v1 — see TODOs below.)
//
// Tone → screen mapping:
//   night → HomeScreen
//   dawn  → JournalScreen
//   dusk  → ProfileScreen
//   void  → SettingsScreen
//
// Each tone has a dark and a light variant. Light mode renders a soft
// dawn-lit cosmos; dark mode is the deep night sky from the canonical.
//
// Translation notes vs. the JSX source:
//  - CSS linear-gradient → expo-linear-gradient with parsed color/location stops.
//  - CSS radial-gradient → react-native-svg RadialGradient (Views ignore CSS radials).
//  - filter: blur(40px) on the nebula → approximated by stacking 2 low-opacity
//    radial ellipses with slight offsets. Avoids pulling in expo-blur for a
//    decorative layer.
//  - <animate> SMIL on stars → DROPPED. react-native-svg has no SMIL.
//    Stars render at their seeded baseline opacity (no twinkle).
//    TODO(future bead): wire reanimated ticks for star twinkle.
//  - Shooting-star line animation → DROPPED in v1.
//    TODO(future bead): port to reanimated SharedValue + AnimatedLine.
//  - Parallax offset → DROPPED in v1. CosmicScreen renders children inside a
//    flex View over the absolute backdrop; no scroll-tracked transform.
//    TODO(future bead): wire onScroll → SharedValue → backdrop translateY.

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

// ───────────────────────── types & constants ─────────────────────────

export type CosmicTone = 'night' | 'dawn' | 'dusk' | 'void';
export type CosmicMode = 'dark' | 'light';
type StarHue = 'cool' | 'warm';
type LightStarHue = 'mauve' | 'rose';
type ConstellationShape = 'arc' | 'wave' | 'circle' | 'none';

interface ParsedGradient {
  colors: string[];
  locations: number[];
}

interface ToneSpec {
  gradient: ParsedGradient;
  nebula: { x: number; y: number; color: string; opacity: number };
  orbA: { x: number; y: number; r: number; color: string; glow: number };
  orbB: { x: number; y: number; r: number; color: string; glow: number };
  aurora: { color: string; opacity: number };
  stars: { hue?: StarHue; lightHue?: LightStarHue };
  constellation: ConstellationShape;
}

const PURPLE = '#4F1786';
// const TEAL = '#70CACF'; // currently unused; kept here as documentation of canonical palette
const PINK = '#E93678';

// Shared SVG canvas — matches the canonical 393×1100 viewBox.
const VB_W = 393;
const VB_H = 1100;

// ───────────────────────── tone presets (dark) ─────────────────────────
// Translated 1:1 from cosmic-backdrop.jsx TONES.
const TONES: Record<CosmicTone, ToneSpec> = {
  night: {
    gradient: {
      colors: ['#02011A', '#0A0533', '#1A0E48', '#2B1259'],
      locations: [0, 0.35, 0.7, 1],
    },
    nebula: { x: 30, y: 70, color: PURPLE, opacity: 0.18 },
    orbA: { x: 78, y: 28, r: 95, color: '#7C3FB8', glow: 0.55 },
    orbB: { x: 12, y: 88, r: 38, color: '#5B2A9A', glow: 0.35 },
    aurora: { color: PURPLE, opacity: 0.3 },
    stars: { hue: 'cool' },
    constellation: 'arc',
  },
  dawn: {
    gradient: {
      colors: ['#050329', '#120848', '#2A1158', '#3D1B6B'],
      locations: [0, 0.4, 0.75, 1],
    },
    nebula: { x: 75, y: 30, color: PINK, opacity: 0.13 },
    orbA: { x: 80, y: 18, r: 70, color: '#8B4FC4', glow: 0.5 },
    orbB: { x: 8, y: 82, r: 55, color: '#6F3AB5', glow: 0.3 },
    aurora: { color: '#7E47C8', opacity: 0.34 },
    stars: { hue: 'warm' },
    constellation: 'wave',
  },
  dusk: {
    gradient: {
      colors: ['#060225', '#0E0738', '#1F0F4F', '#2D1560'],
      locations: [0, 0.35, 0.7, 1],
    },
    nebula: { x: 25, y: 65, color: PURPLE, opacity: 0.16 },
    orbA: { x: 82, y: 22, r: 88, color: '#7A3DB6', glow: 0.55 },
    orbB: { x: 6, y: 78, r: 42, color: '#5A2A98', glow: 0.32 },
    aurora: { color: PURPLE, opacity: 0.28 },
    stars: { hue: 'cool' },
    constellation: 'circle',
  },
  void: {
    gradient: {
      // void uses 3 stops in the canonical
      colors: ['#020014', '#06022B', '#150945'],
      locations: [0, 0.5, 1],
    },
    nebula: { x: 50, y: 50, color: PURPLE, opacity: 0.1 },
    orbA: { x: 78, y: 25, r: 70, color: '#5A2A98', glow: 0.4 },
    orbB: { x: 14, y: 85, r: 30, color: '#3D1A75', glow: 0.25 },
    aurora: { color: PURPLE, opacity: 0.18 },
    stars: { hue: 'cool' },
    constellation: 'none',
  },
};

// ───────────────────────── tone presets (light) ─────────────────────────
// so-u1k: opacities lifted from the canonical to make light feel as
// visually rich as dark. Orbs bumped to 0.65-0.78 glow so they read as
// distinct pastel shapes; aurora 0.30-0.40 so the bottom band is visible;
// nebula 0.16-0.22 for more depth without overpowering text.
const LIGHT_TONES: Record<CosmicTone, ToneSpec> = {
  night: {
    gradient: {
      colors: ['#F2EBFA', '#EBDDF5', '#E9D2EE', '#F0D9DD'],
      locations: [0, 0.35, 0.7, 1],
    },
    nebula: { x: 30, y: 70, color: '#E93678', opacity: 0.18 },
    orbA: { x: 78, y: 28, r: 95, color: '#C8A6FF', glow: 0.78 },
    orbB: { x: 12, y: 88, r: 38, color: '#E0B8E8', glow: 0.65 },
    aurora: { color: '#E93678', opacity: 0.32 },
    stars: { lightHue: 'mauve' },
    constellation: 'arc',
  },
  dawn: {
    gradient: {
      colors: ['#F5EFFA', '#EFE0F0', '#F0DBE2', '#F5DAD3'],
      locations: [0, 0.35, 0.75, 1],
    },
    nebula: { x: 75, y: 30, color: '#E93678', opacity: 0.16 },
    orbA: { x: 80, y: 18, r: 70, color: '#D5B3F0', glow: 0.72 },
    orbB: { x: 8, y: 82, r: 55, color: '#F5C5C0', glow: 0.68 },
    aurora: { color: '#E93678', opacity: 0.36 },
    stars: { lightHue: 'rose' },
    constellation: 'wave',
  },
  dusk: {
    gradient: {
      colors: ['#EFE9F8', '#E5D8F2', '#D8C5EC', '#DCC8E8'],
      locations: [0, 0.35, 0.7, 1],
    },
    nebula: { x: 25, y: 65, color: '#9B7FE0', opacity: 0.22 },
    orbA: { x: 82, y: 22, r: 88, color: '#B898E8', glow: 0.78 },
    orbB: { x: 6, y: 78, r: 42, color: '#C8A6FF', glow: 0.65 },
    aurora: { color: '#9B7FE0', opacity: 0.40 },
    stars: { lightHue: 'mauve' },
    constellation: 'circle',
  },
  void: {
    gradient: {
      colors: ['#F4EDF9', '#ECDFF2', '#DCC9E8'],
      locations: [0, 0.6, 1],
    },
    nebula: { x: 50, y: 50, color: '#9B7FE0', opacity: 0.16 },
    orbA: { x: 78, y: 25, r: 70, color: '#C0A0E5', glow: 0.65 },
    orbB: { x: 14, y: 85, r: 30, color: '#A88BD5', glow: 0.55 },
    aurora: { color: '#9B7FE0', opacity: 0.26 },
    stars: { lightHue: 'mauve' },
    constellation: 'none',
  },
};

// ───────────────────────── deterministic rng ─────────────────────────
// Same lcg constants as the canonical so star positions match.
function makeRng(seed: number): () => number {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ───────────────────────── star field (static) ─────────────────────────
// SMIL <animate> is unsupported in react-native-svg; we drop the per-star
// twinkle and render at the seeded baseline opacity.
interface StarFieldProps {
  count: number;
  seed: number;
  hue?: StarHue;
  lightHue?: LightStarHue;
  isLight: boolean;
}

function StarFieldLayer({ count, seed, hue, lightHue, isLight }: StarFieldProps) {
  const stars = useMemo(() => {
    const rng = makeRng(seed);
    const out: Array<{
      x: number;
      y: number;
      r: number;
      fill: string;
      opacity: number;
      key: number;
    }> = [];
    for (let i = 0; i < count; i++) {
      const x = rng() * VB_W;
      const y = rng() * VB_H;
      const big = rng() < 0.1;
      const mid = !big && rng() < 0.25;
      const radius = big ? 1.4 : mid ? 1.0 : 0.55;
      // so-u1k: bumped light star opacities so the field reads as visible
      // glints rather than near-invisible dust on the bright bg.
      const baseOp = isLight ? 0.25 + rng() * 0.45 : 0.25 + rng() * 0.65;
      let fill: string;
      if (isLight) {
        fill = lightHue === 'rose' ? '#C892C5' : big ? '#9B7FC4' : '#A88BD5';
      } else {
        fill = big && hue === 'warm' ? '#FFE7C4' : big ? '#E6E1FF' : '#FFFFFF';
      }
      // canonical also seeds dur/delay for the SMIL animate; we drop those.
      out.push({ x, y, r: radius, fill, opacity: baseOp, key: i });
    }
    return out;
  }, [count, seed, hue, lightHue, isLight]);

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {stars.map((s) => (
        <Circle key={s.key} cx={s.x} cy={s.y} r={s.r} fill={s.fill} opacity={s.opacity} />
      ))}
    </Svg>
  );
}

// ───────────────────────── orb (radial via SVG) ─────────────────────────
// Source uses CSS radial-gradient + filter: blur(0.5px) drop-shadow(...).
// RN: SVG RadialGradient inside a circle. The drop-shadow is approximated
// by a slightly-larger glow circle behind the body, opacity scaled by `glow`.
interface OrbProps {
  x: number;
  y: number;
  r: number;
  color: string;
  glow: number;
}

function OrbLayer({ x, y, r, color, glow }: OrbProps) {
  // SVG ID must be unique per orb instance; tone change re-mounts.
  const gradId = `orb-${x}-${y}-${r}-${color.replace('#', '')}`;
  // Place the orb in absolute SVG coords scaled to VB_W × VB_H.
  const cx = (x / 100) * VB_W;
  const cy = (y / 100) * VB_H;
  // Glow ring radius — approximates the canonical drop-shadow halo.
  const haloR = r * 1.6;
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient
          id={`${gradId}-halo`}
          cx="50%"
          cy="50%"
          r="50%"
          fx="50%"
          fy="50%"
        >
          <Stop offset="0%" stopColor={color} stopOpacity={glow * 0.55} />
          <Stop offset="60%" stopColor={color} stopOpacity={glow * 0.18} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient
          id={gradId}
          cx="35%"
          cy="30%"
          r="70%"
          fx="35%"
          fy="30%"
        >
          <Stop offset="0%" stopColor={color} stopOpacity={0.88} />
          <Stop offset="40%" stopColor={color} stopOpacity={0.5} />
          <Stop offset="75%" stopColor={color} stopOpacity={0.06} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* Halo */}
      <Circle cx={cx} cy={cy} r={haloR} fill={`url(#${gradId}-halo)`} />
      {/* Body */}
      <Circle cx={cx} cy={cy} r={r} fill={`url(#${gradId})`} />
    </Svg>
  );
}

// ───────────────────────── nebula cloud ─────────────────────────
// Canonical uses radial-gradient + blur(40px). We stack 2 offset radial
// ellipses to approximate the soft cloud without expo-blur.
interface NebulaProps {
  x: number;
  y: number;
  color: string;
  opacity: number;
}

function NebulaLayer({ x, y, color, opacity }: NebulaProps) {
  const gradId = `nebula-${color.replace('#', '')}-${x}-${y}`;
  const cx = (x / 100) * VB_W;
  const cy = (y / 100) * VB_H;
  // Canonical box is 360 wide × 240 tall; viewBox-scale equivalents.
  const rx = 180;
  const ry = 120;
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid slice"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id={gradId} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
          <Stop offset="65%" stopColor={color} stopOpacity={0} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* Two offset ellipses to fake the gaussian blur softness. */}
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${gradId})`} opacity={0.7} />
      <Ellipse
        cx={cx + 24}
        cy={cy - 16}
        rx={rx * 1.05}
        ry={ry * 1.1}
        fill={`url(#${gradId})`}
        opacity={0.55}
      />
    </Svg>
  );
}

// ───────────────────────── aurora ribbon ─────────────────────────
interface AuroraProps {
  color: string;
  opacity: number;
}

function AuroraLayer({ color, opacity }: AuroraProps) {
  const gradId = `aurora-${color.replace('#', '')}`;
  // Aurora occupies bottom 40% of the canvas in canonical.
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}
    >
      <View style={{ height: '40%', width: '100%' }}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 393 440"
          preserveAspectRatio="none"
        >
          <Defs>
            <RadialGradient id={gradId} cx="50%" cy="100%" r="80%" fx="50%" fy="100%">
              <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
              <Stop offset="50%" stopColor={color} stopOpacity={opacity * 0.4} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={393} height={440} fill={`url(#${gradId})`} />
        </Svg>
      </View>
    </View>
  );
}

// ───────────────────────── constellation lines ─────────────────────────
const CONSTELLATION_PATHS: Record<Exclude<ConstellationShape, 'none'>, string> = {
  arc: 'M40 200 L90 170 L160 195 L230 165 L300 200 L350 180',
  wave: 'M30 380 Q90 340 150 370 T280 350 T370 380',
  circle: 'M120 120 L180 90 L240 110 L260 170 L220 220 L150 200 L120 120',
};

const CONSTELLATION_DOTS: Record<
  Exclude<ConstellationShape, 'none'>,
  Array<[number, number]>
> = {
  arc: [
    [40, 200],
    [90, 170],
    [160, 195],
    [230, 165],
    [300, 200],
    [350, 180],
  ],
  wave: [
    [30, 380],
    [150, 370],
    [280, 350],
    [370, 380],
  ],
  circle: [
    [120, 120],
    [180, 90],
    [240, 110],
    [260, 170],
    [220, 220],
    [150, 200],
  ],
};

interface ConstellationProps {
  shape: ConstellationShape;
  isLight: boolean;
}

function ConstellationLayer({ shape, isLight }: ConstellationProps) {
  if (shape === 'none') return null;
  const lineColor = isLight ? '#9B7FC4' : '#FFFFFF';
  // so-u1k: lifted from 0.55 → 0.85 so light-mode constellation lines
  // read at the same modest contrast as dark instead of near-invisible.
  const opMul = isLight ? 0.85 : 1;
  const path = CONSTELLATION_PATHS[shape];
  const dots = CONSTELLATION_DOTS[shape];
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid slice"
      style={[StyleSheet.absoluteFill, { opacity: 0.45 * opMul }]}
      pointerEvents="none"
    >
      <Path
        d={path}
        stroke={lineColor}
        strokeWidth={0.6}
        fill="none"
        opacity={0.45}
        strokeDasharray="2 4"
      />
      {dots.map((d, i) => (
        <Circle key={i} cx={d[0]} cy={d[1]} r={1.6} fill={lineColor} opacity={0.75} />
      ))}
    </Svg>
  );
}

// ───────────────────────── public API ─────────────────────────

export interface CosmicBackdropProps {
  tone: CosmicTone;
  /** Override useTheme().isDarkMode resolution. */
  mode?: CosmicMode;
  /** Reserved for v2 — currently a no-op. */
  shootingStar?: boolean;
}

export function CosmicBackdrop({
  tone,
  mode,
  // shootingStar reserved for v2 — see TODO at top of file.
  shootingStar: _shootingStar = true,
}: CosmicBackdropProps): JSX.Element {
  const { isDarkMode } = useTheme();
  const resolvedMode: CosmicMode = mode ?? (isDarkMode ? 'dark' : 'light');
  const isLight = resolvedMode === 'light';
  const t = isLight ? LIGHT_TONES[tone] : TONES[tone];
  const starCount = isLight ? 110 : 150;

  // Memoize the static SVG layers — they only depend on tone+isLight.
  const stars = useMemo(
    () => (
      <StarFieldLayer
        count={starCount}
        seed={1}
        hue={t.stars.hue}
        lightHue={t.stars.lightHue}
        isLight={isLight}
      />
    ),
    [t.stars.hue, t.stars.lightHue, isLight, starCount],
  );
  const constellation = useMemo(
    () => <ConstellationLayer shape={t.constellation} isLight={isLight} />,
    [t.constellation, isLight],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={t.gradient.colors as unknown as readonly [string, string, ...string[]]}
        locations={t.gradient.locations as unknown as readonly [number, number, ...number[]]}
        style={StyleSheet.absoluteFill}
      />
      <NebulaLayer {...t.nebula} />
      {stars}
      {constellation}
      <OrbLayer {...t.orbA} />
      <OrbLayer {...t.orbB} />
      <AuroraLayer {...t.aurora} />
      {/* Shooting star omitted in v1 — TODO at top of file. */}
    </View>
  );
}

export interface CosmicScreenProps extends CosmicBackdropProps {
  children: React.ReactNode;
}

export function CosmicScreen({
  tone,
  mode,
  shootingStar,
  children,
}: CosmicScreenProps): JSX.Element {
  return (
    <View style={cosmicScreenStyles.root}>
      <CosmicBackdrop tone={tone} mode={mode} shootingStar={shootingStar} />
      <View style={cosmicScreenStyles.content}>{children}</View>
    </View>
  );
}

const cosmicScreenStyles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1 },
});
