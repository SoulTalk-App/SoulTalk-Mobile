import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MirrorCard } from './MirrorCard';
import { PersonalityCard } from './PersonalityCard';
import { SoulShiftsCard } from './SoulShiftsCard';
import { SoulSignalsCard } from './SoulSignalsCard';
import { SoulSightsCard } from './SoulSightsCard';
import { Theme } from './tokens';

type Props = {
  theme: Theme;
  onMirrorPress?: () => void;
  onPersonalityPress?: () => void;
  onShiftsPress?: () => void;
  onSignalsPress?: () => void;
  onSightsPress?: () => void;
};

export function ChargeUpGrid({
  theme,
  onMirrorPress,
  onPersonalityPress,
  onShiftsPress,
  onSignalsPress,
  onSightsPress,
}: Props) {
  return (
    <View>
      <View style={styles.row1}>
        <View style={styles.row1Cell}>
          <MirrorCard theme={theme} onPress={onMirrorPress} />
        </View>
        <View style={styles.row1Cell}>
          <PersonalityCard theme={theme} onPress={onPersonalityPress} />
        </View>
      </View>
      <View style={styles.row2}>
        <View style={styles.row2Cell}>
          <SoulSightsCard theme={theme} onPress={onSightsPress} />
        </View>
        <View style={styles.row2Cell}>
          <SoulSignalsCard theme={theme} onPress={onSignalsPress} />
        </View>
        <View style={styles.row2Cell}>
          <SoulShiftsCard theme={theme} onPress={onShiftsPress} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row1: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  row1Cell: {
    flex: 1,
    aspectRatio: 1,
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  row2Cell: {
    flex: 1,
    aspectRatio: 1 / 1.25,
  },
});
