import React, { useEffect, useMemo, useState } from 'react';
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
import { buildGroups, SignalsB, SignalsStatus } from '../features/soulSignals';
import { Signal } from '../features/soulSignals/types';
import SoulSignalsService from '../services/SoulSignalsService';
import SoulSightService from '../services/SoulSightService';

// Matches soul_bar_service.compute_progress on the backend (is_full = entries_since >= 6).
// Design spec drafted '5 more' approximately; backend is the source of truth.
const ENTRIES_NEEDED = 6;

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');
const ProfileBackIcon = require('../../assets/images/profile/ProfileBackIcon.png');

const SoulSignalsScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? 'dark' : 'light';
  const statusOverride: SignalsStatus | undefined = route?.params?.displayStatus;

  const [signals, setSignals] = useState<Signal[]>([]);
  const [entriesSinceSight, setEntriesSinceSight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      SoulSignalsService.list(),
      SoulSightService.checkEligibility(),
    ])
      .then(([sigResult, eligResult]) => {
        if (sigResult.status === 'fulfilled') {
          setSignals(sigResult.value);
        } else {
          console.log('[SoulSignals] List fetch error:', sigResult.reason?.message);
        }
        if (eligResult.status === 'fulfilled') {
          setEntriesSinceSight(eligResult.value.points ?? 0);
        } else {
          console.log('[SoulSignals] Eligibility fetch error:', eligResult.reason?.message);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const groups = useMemo(() => buildGroups(signals, 6), [signals]);
  const patternsCount = useMemo(
    () => signals.filter((s) => s.kind === 'pattern').length,
    [signals],
  );

  // Precedence: existing signals win — a user mid-cycle with prior signals never re-locks
  // just because their entries-since-last-sight count reset. Locked is for zero-signal users.
  const status: SignalsStatus =
    statusOverride ??
    (signals.length > 0
      ? 'done'
      : entriesSinceSight < ENTRIES_NEEDED
        ? 'locked'
        : 'listening');

  const handleOpenJournal = () => navigation.navigate('CreateJournal');

  const backIconSource = isDarkMode ? BackIcon : ProfileBackIcon;
  const backTextColor = isDarkMode ? '#fff' : '#3A0E66';

  return (
    <View style={styles.root}>
      {isLoading ? (
        <View style={[styles.loadingShell, { paddingTop: insets.top + 16 }]}>
          <ActivityIndicator color={isDarkMode ? '#fff' : '#3A0E66'} size="large" />
        </View>
      ) : (
        <SignalsB
          theme={theme}
          status={status}
          groups={groups}
          eligibility={{ current: entriesSinceSight, needed: ENTRIES_NEEDED }}
          listeningMeta={{ entries: entriesSinceSight, patterns: patternsCount }}
          onOpenJournal={handleOpenJournal}
        />
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

export default SoulSignalsScreen;
