import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../theme';
import { HeroOrb } from './HeroOrb';
import { LockedState } from './LockedState';
import { PageBg } from './PageBg';
import { ProcessingState } from './ProcessingState';
import { ReadingBody } from './ReadingBody';
import { StarsBg } from './StarsBg';
import {
  PINK,
  Theme,
  ink,
  inkSub,
} from './tokens';
import { Eligibility, SightDetail, SightStatus } from './types';

type Props = {
  theme: Theme;
  status: SightStatus;
  sight?: SightDetail;
  eligibility?: Eligibility;
  processingMeta?: { entries: number; signals: number };
  onOpenJournal?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onBack?: () => void;
  isArchived?: boolean;
  isArchiving?: boolean;
};

export function SightsB({
  theme,
  status,
  sight,
  eligibility,
  processingMeta,
  onOpenJournal,
  onSave,
  onShare,
  onBack,
  isArchived,
  isArchiving,
}: Props) {
  const insets = useSafeAreaInsets();

  // so-13y: top atmosphere extends the orb's gradient up under the safe area
  // so the back button floats within the cosmic scene (no seam at the safe-
  // area edge). Color-matched to the orb's outer radial stop per theme.
  const topAtmosphereColors: [string, string] =
    theme === 'dark'
      ? ['#0F0840', 'rgba(15,8,64,0)']
      : ['#C8A6FF', 'rgba(200,166,255,0)'];

  return (
    <View style={styles.root}>
      <PageBg theme={theme} />

      {/* Top atmosphere overlay (so-13y) — sits above PageBg, fades to
          transparent over the safe-area + first slice of the orb so the
          backdrop reads continuous from notch to orb. */}
      <LinearGradient
        colors={topAtmosphereColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[
          styles.topAtmosphere,
          { height: insets.top + 180 },
        ]}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
      >
        {status === 'locked' || status === 'processing' || !sight ? (
          <View style={styles.stateWrap}>
            <StarsBg theme={theme} />
            {status === 'processing' ? (
              <ProcessingState theme={theme} meta={processingMeta} />
            ) : (
              <LockedState
                theme={theme}
                eligibility={eligibility}
                onOpenJournal={onOpenJournal}
              />
            )}
          </View>
        ) : (
          <>
            <HeroOrb theme={theme} sight={sight} />
            <View style={styles.titleBlock}>
              <Text style={[styles.window, { color: inkSub(theme) }]}>
                {sight.window}
              </Text>
              <Text style={[styles.title, { color: ink(theme) }]}>
                {sight.title}
              </Text>
              <View style={styles.chipRow}>
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff',
                      borderColor:
                        theme === 'dark'
                          ? 'rgba(255,255,255,0.14)'
                          : 'rgba(58,14,102,0.08)',
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: inkSub(theme) }]}>
                    {sight.entries} entries · {sight.signals} signals
                  </Text>
                </View>
              </View>
            </View>
            <ReadingBody
              theme={theme}
              sight={sight}
              accent={PINK}
              onSave={onSave}
              onShare={onShare}
              isArchived={isArchived}
              isArchiving={isArchiving}
            />
          </>
        )}
      </ScrollView>

      {/* Floating back button (so-13y) — absolute-positioned over the orb
          atmosphere so it stays clear of the notch and visually belongs to
          the cosmic backdrop rather than a separate header band. */}
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={[styles.backFloat, { top: insets.top + 8 }]}
          accessibilityLabel="Back"
        >
          <Feather
            name="chevron-left"
            size={28}
            color={theme === 'dark' ? '#FFFFFF' : '#3A0E66'}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  topAtmosphere: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  backFloat: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  stateWrap: {
    minHeight: 600,
    position: 'relative',
  },
  titleBlock: {
    paddingTop: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  window: {
    fontFamily: fonts.edensor.lightItalic,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.edensor.regular,
    fontSize: 38,
    lineHeight: 38 * 1.05,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  chipRow: {
    marginTop: 14,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 11,
  },
});
