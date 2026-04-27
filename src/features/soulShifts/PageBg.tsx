import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { CREAM, Theme } from './tokens';

export function PageBg({ theme }: { theme: Theme }) {
  if (theme === 'dark') {
    return (
      <>
        <LinearGradient
          colors={['#05093C', '#02011A']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Svg
          style={StyleSheet.absoluteFill}
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <Defs>
            <RadialGradient id="shifts-dk-1" cx="30%" cy="10%" r="50%">
              <Stop offset="0%" stopColor="#70CACF" stopOpacity={0.30} />
              <Stop offset="100%" stopColor="#70CACF" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="shifts-dk-2" cx="75%" cy="90%" r="55%">
              <Stop offset="0%" stopColor="#9E90FC" stopOpacity={0.24} />
              <Stop offset="100%" stopColor="#9E90FC" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#shifts-dk-1)" />
          <Rect x="0" y="0" width="100" height="100" fill="url(#shifts-dk-2)" />
        </Svg>
      </>
    );
  }
  return (
    <>
      <LinearGradient
        colors={[CREAM, '#ECE4F5']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg
        style={StyleSheet.absoluteFill}
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <Defs>
          <RadialGradient id="shifts-lt-1" cx="30%" cy="0%" r="60%">
            <Stop offset="0%" stopColor="#F0EAFF" stopOpacity={1} />
            <Stop offset="100%" stopColor="#F0EAFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="shifts-lt-2" cx="80%" cy="80%" r="50%">
            <Stop offset="0%" stopColor="#E93678" stopOpacity={0.10} />
            <Stop offset="100%" stopColor="#E93678" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#shifts-lt-1)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#shifts-lt-2)" />
      </Svg>
    </>
  );
}
