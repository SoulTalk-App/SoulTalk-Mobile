import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const BackIconDark = require('../../../assets/images/settings/BackButtonIcon.png');

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

  return (
    <View style={styles.root}>
      <PageBg theme={theme} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Single-row header (so-rlz): back chevron sits inline at the top
            of the scroll content so it doesn't claim its own band above the
            hero orb. The centered hero+title aesthetic below stays intact. */}
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={styles.backInlineRow}
          >
            <Image
              source={BackIconDark}
              style={[
                styles.backIcon,
                { tintColor: theme === 'dark' ? '#FFFFFF' : '#3A0E66' },
              ]}
              resizeMode="contain"
            />
          </Pressable>
        ) : null}
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
  backInlineRow: {
    paddingLeft: 16,
    paddingBottom: 8,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  backIcon: {
    width: 36,
    height: 36,
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
