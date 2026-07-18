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
import { cosmicTextShadow } from '../../components/CosmicText';
import {
  PINK,
  PURPLE,
  Theme,
  ink,
  inkSub,
  surfaceBg,
  surfaceBorder,
} from './tokens';
import { Eligibility, SightDetail, SightStatus } from './types';
import { ScreenEnter } from '../../components/ScreenEnter';
import type { EntranceTrigger } from '../../animations/useScreenEntrance';

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
  onRetry?: () => void;
  isArchived?: boolean;
  isArchiving?: boolean;
  // so-nmqq: lazy-load state for deferred signal/shift extraction.
  signalsLoading?: boolean;
  signalsFailed?: boolean;
  // so-9t3d MI-4: suppresses Share + enables crisis-link tappability for
  // safety_redirect content.
  isSafetyRedirect?: boolean;
  // so-c7oq: pluggable trigger for the screen-entrance animation on the done
  // state. Defaults to 'mount-after-settle'. SoulSightDetailScreen passes
  // { revealed: status === 'done' } so the entrance fires only when data
  // arrives (not while ProcessingState is showing).
  entranceTrigger?: EntranceTrigger;
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
  onRetry,
  isArchived,
  isArchiving,
  signalsLoading,
  signalsFailed,
  isSafetyRedirect,
  entranceTrigger,
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

      {/* Top atmosphere overlay (so-13y / so-0ig) — sits above PageBg, fades
          to transparent. Height extends past the orb (HERO_HEIGHT 320 + ~80px
          buffer) so the lavender / cosmic atmosphere bleeds smoothly into the
          text area below — no visible seam between sections. */}
      <LinearGradient
        colors={topAtmosphereColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[
          styles.topAtmosphere,
          { height: insets.top + 14 + 320 + 80 },
        ]}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
      >
        {status === 'locked' || status === 'processing' || status === 'error' || !sight ? (
          <View style={styles.stateWrap}>
            <StarsBg theme={theme} />
            {status === 'processing' ? (
              <ProcessingState theme={theme} meta={processingMeta} />
            ) : status === 'error' ? (
              // so-9t3d M-3: offline / fetch-failure state — error + retry instead
              // of the eternal spinner that deriveStatus(null) used to produce.
              <View style={[styles.errorCard, { backgroundColor: surfaceBg(theme), borderColor: surfaceBorder(theme) }]}>
                <Text style={[styles.errorTitle, { color: ink(theme) }]}>
                  Couldn't load this SoulSight
                </Text>
                <Text style={[styles.errorCopy, { color: inkSub(theme) }]}>
                  Check your connection and try again.
                </Text>
                {onRetry ? (
                  <Pressable
                    style={styles.errorBtn}
                    onPress={onRetry}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading SoulSight"
                  >
                    <Text style={styles.errorBtnText}>Retry</Text>
                  </Pressable>
                ) : null}
              </View>
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
            {/* so-c7oq Group 0: hero orb */}
            <ScreenEnter index={0} trigger={entranceTrigger}>
              <HeroOrb theme={theme} sight={sight} />
            </ScreenEnter>
            {/* so-c7oq Group 1: title + meta */}
            <ScreenEnter index={1} trigger={entranceTrigger}>
              <View style={styles.titleBlock}>
                <Text style={[styles.window, { color: inkSub(theme) }]}>
                  {sight.window}
                </Text>
                <Text
                  style={[
                    styles.title,
                    { color: ink(theme) },
                    // so-jkgo: title sits over StarsBg in dark theme; shadow
                    // halo separates glyphs from any star pixels behind them.
                    theme === 'dark' && cosmicTextShadow,
                  ]}
                >
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
            </ScreenEnter>
            {/* so-c7oq Group 2: reading body + actions */}
            <ScreenEnter index={2} trigger={entranceTrigger}>
              <ReadingBody
                theme={theme}
                sight={sight}
                accent={PINK}
                onSave={onSave}
                onShare={onShare}
                isArchived={isArchived}
                isArchiving={isArchiving}
                signalsLoading={signalsLoading}
                signalsFailed={signalsFailed}
                isSafetyRedirect={isSafetyRedirect}
              />
            </ScreenEnter>
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
  // so-9t3d M-3: error card mirrors ProcessingState / LockedState layout.
  errorCard: {
    marginTop: 60,
    marginHorizontal: 20,
    padding: 28,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
  },
  errorTitle: {
    fontFamily: fonts.edensor.regular,
    fontSize: 24,
    lineHeight: 24 * 1.1,
    textAlign: 'center',
  },
  errorCopy: {
    fontFamily: fonts.edensor.lightItalic,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    textAlign: 'center',
    maxWidth: 280,
    marginTop: 10,
  },
  errorBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: PURPLE,
  },
  errorBtnText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 13,
    color: '#fff',
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
