import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

const SwirlIcon = require('../../assets/images/journal/SwirlIcon.png');
const ExpandIcon = require('../../assets/images/journal/ExpandIcon.png');
const SoulPalMeterBar = require('../../assets/images/journal/SoulPalMeterBar.png');
const MoodEyesIcon = require('../../assets/images/journal/MoodEyesIcon.png');
const MicIcon = require('../../assets/images/journal/MicIcon.png');

const JournalEntryScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const entry = route.params?.entry;

  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#59168B']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Back Button */}
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
          <View style={styles.swirlCircle}>
            <Image source={SwirlIcon} style={styles.swirlIcon} resizeMode="contain" />
          </View>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {/* Title Row */}
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>Write your thoughts...</Text>
          <Pressable style={styles.expandBtn}>
            <Image source={ExpandIcon} style={styles.expandIcon} resizeMode="contain" />
          </Pressable>
        </View>

        {/* SoulPal Meter Row */}
        <View style={styles.meterRow}>
          <View style={styles.meterSwirlCircle}>
            <Image source={SwirlIcon} style={styles.meterSwirlIcon} resizeMode="contain" />
          </View>
          <View style={styles.meterBar}>
            <Text style={styles.meterLabel}>SoulPal Meter</Text>
            <Image source={SoulPalMeterBar} style={styles.meterProgress} resizeMode="contain" />
          </View>
          <View style={styles.moodEyesCircle}>
            <Image source={MoodEyesIcon} style={styles.moodEyesIcon} resizeMode="contain" />
          </View>
        </View>

        {/* White Content Card */}
        <View style={styles.contentCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.journalText}>
              {entry?.content || 'Start writing your thoughts here...'}
            </Text>
          </ScrollView>
        </View>

        {/* Mic Button */}
        <View style={[styles.micContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
          <Pressable style={styles.micButton}>
            <Image source={MicIcon} style={styles.micIcon} resizeMode="contain" />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
  },

  // Back Button
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  swirlCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swirlIcon: {
    width: 24,
    height: 22,
    tintColor: colors.white,
  },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: colors.white,
  },

  // Title Row
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 24,
    color: colors.white,
  },
  expandBtn: {
    padding: 4,
  },
  expandIcon: {
    width: 28,
    height: 20,
    tintColor: colors.white,
  },

  // SoulPal Meter
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  meterSwirlCircle: {
    width: 42,
    height: 37,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  meterSwirlIcon: {
    width: 22,
    height: 20,
    tintColor: colors.white,
  },
  meterBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  meterLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: '#59168B',
  },
  meterProgress: {
    flex: 1,
    height: 21,
  },
  moodEyesCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#59168B',
    borderWidth: 2,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodEyesIcon: {
    width: 18,
    height: 18,
    tintColor: colors.white,
  },

  // Content Card
  contentCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  journalText: {
    fontFamily: fonts.outfit.thin,
    fontSize: 14,
    lineHeight: 14 * 1.6,
    color: '#333333',
  },

  // Mic Button
  micContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  micButton: {
    width: 103,
    height: 61,
    backgroundColor: colors.white,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIcon: {
    width: 32,
    height: 32,
    tintColor: '#59168B',
  },
});

export default JournalEntryScreen;
