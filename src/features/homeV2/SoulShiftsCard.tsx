import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { CardShell } from './CardShell';
import { PURPLE, TEAL_DEEP, Theme } from './tokens';

type Props = { theme: Theme; onPress?: () => void };

// 160deg gradient direction in normalized coords
const GRAD_START = { x: 0.329, y: 0.030 };
const GRAD_END = { x: 0.671, y: 0.970 };

export function SoulShiftsCard({ theme, onPress }: Props) {
  const isDark = theme === 'dark';
  const moonCircleColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(79,23,134,0.12)';
  const moonFill = isDark ? '#F5E1B5' : PURPLE;
  const orbitColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(79,23,134,0.18)';

  return (
    <CardShell
      theme={theme}
      aspectRatio={1 / 1.25}
      label="Soul Shifts"
      labelColor={TEAL_DEEP}
      onPress={onPress}
      info={{
        title: 'SoulShifts',
        body:
          "SoulShifts are the micro experiments and actionable suggestions pulled from each SoulSight. Where Signals are about seeing, Shifts are about doing. Every Sight adds new Shifts to your list, and they accumulate over time so nothing gets lost. It is up to you to take action on what calls you, snooze what isn't the right moment, or mute what doesn't fit.\n\nEach Shift moves through four stages: Notice, Practice, Embody, Integrate. You move them forward by tending to them every time you catch yourself running the old pattern or trying the new practice in real life. Tending is how a Shift goes from something you read on a screen to something woven into how you actually live. The more you tend, the more it stops feeling like an experiment and starts feeling like you.",
      }}
    >
      <LinearGradient
        colors={isDark ? ['#0F1A4F', '#050B2A'] : ['#E5F5F6', '#BFE6E9']}
        start={GRAD_START}
        end={GRAD_END}
        style={StyleSheet.absoluteFill}
      />

      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 120 140"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* so-0teh: phases group lifted from y=70 → y=55 so the moon arc
            (orbit r=36) clears the bottom label chip on the 1:1.25 tile. */}
        <G transform="translate(60 55)">
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = -Math.PI / 2 + (i / 4) * Math.PI;
            const r = 36;
            const cx = Math.cos(angle) * r;
            const cy = Math.sin(angle) * r;
            const phase = i / 4;
            const rx2 = 8 - phase * 16;
            return (
              <G key={i} transform={`translate(${cx} ${cy})`}>
                <Circle r={8} fill={moonCircleColor} />
                <Path
                  d={`M0 -8 A 8 8 0 0 1 0 8 A ${rx2} 8 0 0 0 0 -8 Z`}
                  fill={moonFill}
                />
              </G>
            );
          })}
          <Circle
            r={14}
            fill="none"
            stroke={orbitColor}
            strokeDasharray="2,3"
          />
        </G>
      </Svg>
    </CardShell>
  );
}

