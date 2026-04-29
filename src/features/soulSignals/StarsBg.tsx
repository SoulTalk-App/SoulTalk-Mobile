import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Theme } from './tokens';

const VB_W = 393;
const VB_H = 1200;

type Props = {
  theme: Theme;
  count?: number;
  seed?: number;
};

export function StarsBg({ theme, count = 60, seed = 13 }: Props) {
  const stars = useMemo(() => {
    if (theme !== 'dark') return [];
    let s = seed * 9301 + 49297;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, (_, i) => {
      const r = rand() < 0.85 ? 0.7 : 1.4;
      const op = 0.25 + rand() * 0.7;
      return { i, cx: rand() * VB_W, cy: rand() * VB_H, r, op };
    });
  }, [theme, count, seed]);
  if (theme !== 'dark') return null;
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid slice"
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
    >
      {stars.map((s) => (
        <Circle key={s.i} cx={s.cx} cy={s.cy} r={s.r} fill="#fff" opacity={s.op} />
      ))}
    </Svg>
  );
}
