import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { fonts } from '../theme';
import { ShiftsA } from '../features/soulShifts';
import { Shift } from '../features/soulShifts/types';
import SoulShiftsService from '../services/SoulShiftsService';

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');
const ProfileBackIcon = require('../../assets/images/profile/ProfileBackIcon.png');

const SoulShiftsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? 'dark' : 'light';

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SoulShiftsService.list()
      .then(setShifts)
      .catch((err) => console.log('[SoulShifts] List fetch error:', err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const handleAddShift = () => {
    // TODO: route to "begin a new shift" creation flow once it exists.
    console.log('[SoulShifts] Begin new shift tapped (stub)');
  };

  const backIconSource = isDarkMode ? BackIcon : ProfileBackIcon;
  const backTextColor = isDarkMode ? '#fff' : '#3A0E66';

  return (
    <View style={styles.root}>
      {isLoading ? (
        <View style={[styles.loadingShell, { paddingTop: insets.top + 16 }]}>
          <ActivityIndicator color={isDarkMode ? '#fff' : '#3A0E66'} size="large" />
        </View>
      ) : (
        <ShiftsA theme={theme} shifts={shifts} onAddShift={handleAddShift} />
      )}

      <View style={[styles.backRow, { top: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Image source={backIconSource} style={styles.backIcon} resizeMode="contain" />
        </Pressable>
        <Text style={[styles.backText, { color: backTextColor }]}>Back</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#02011A',
  },
  loadingShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backRow: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backIcon: {
    width: 36,
    height: 36,
  },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 18,
  },
});

export default SoulShiftsScreen;
