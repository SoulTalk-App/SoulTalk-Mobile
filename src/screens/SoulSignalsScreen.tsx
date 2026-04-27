import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { fonts } from '../theme';
import {
  buildGroups,
  MOCK_SIGNALS,
  SignalsB,
  SignalsStatus,
} from '../features/soulSignals';

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');
const ProfileBackIcon = require('../../assets/images/profile/ProfileBackIcon.png');

const SoulSignalsScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? 'dark' : 'light';
  const statusOverride: SignalsStatus | undefined = route?.params?.displayStatus;

  // TODO: replace with SoulSignalsService.list() once backend supports the
  // structured shape (kind/strength/tag/tone/soulpal/fedSight). Pending [ASK].
  const signals = MOCK_SIGNALS;
  const groups = buildGroups(signals, 6);
  const status: SignalsStatus = statusOverride ?? 'done';

  const handleOpenJournal = () => navigation.navigate('CreateJournal');

  const backIconSource = isDarkMode ? BackIcon : ProfileBackIcon;
  const backTextColor = isDarkMode ? '#fff' : '#3A0E66';

  return (
    <View style={styles.root}>
      <SignalsB
        theme={theme}
        status={status}
        groups={groups}
        eligibility={{ current: 4, needed: 5 }}
        listeningMeta={{ entries: 9, patterns: 3 }}
        onOpenJournal={handleOpenJournal}
      />

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

export default SoulSignalsScreen;
