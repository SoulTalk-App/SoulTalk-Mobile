import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Theme } from './tokens';

type Props = {
  theme: Theme;
  count?: number;
  seed?: number;
};

const VB_W = 393;
const VB_H = 860;

export function StarsBg({ theme, count = 70, seed = 19 }: Props) {
  const stars = useMemo(() => {
    if (theme !== 'dark') return [];
    let s = seed * 9301 + 49297;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, (_, i) => {
      const r = rand() < 0.85 ? 0.7 : 1.6;
      const op = 0.25 + rand() * 0.7;
      const cx = rand() * VB_W;
      const cy = rand() * VB_H;
      return { i, r, op, cx, cy };
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
      {stars.map((star) => (
        <Circle
          key={star.i}
          cx={star.cx}
          cy={star.cy}
          r={star.r}
          fill="#fff"
          opacity={star.op}
        />
      ))}
    </Svg>
  );
}
