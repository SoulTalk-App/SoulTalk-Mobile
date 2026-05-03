import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';
import { formatRelativeTime } from '../../utils/time';
import { ShiftDetail, SoulpalVariant, STAGES } from './types';
import {
  PINK,
  Theme,
  ink,
  inkFaint,
  inkSub,
} from './tokens';

const SOULPAL_SRC: Record<SoulpalVariant, any> = {
  1: require('../../../assets/images/home-v2/soulpal-1.png'),
  2: require('../../../assets/images/home-v2/soulpal-2.png'),
  3: require('../../../assets/images/home-v2/soulpal-3.png'),
  4: require('../../../assets/images/home-v2/soulpal-4.png'),
  5: require('../../../assets/images/home-v2/soulpal-5.png'),
};

/** Map a Shift to a 0..3 stepper index. Mirrors ShiftCard's stageIndex but
 *  scoped to the canonical 4-stage stepper (Notice / Practice / Embody / Integrate). */
function stageIdxForShift(s: ShiftDetail): number {
  if (s.status === 'integrated') return 3;
  if (s.status === 'active') {
    // pct 0..1 maps onto Practice(1) / Embody(2). Clamp to 1 minimum so an
    // active shift always shows at least 'Practice' lit up.
    const candidate = Math.round(s.pct * 3);
    return Math.max(1, Math.min(2, candidate));
  }
  if (s.status === 'processing') return 1;
  return 0; // locked / unknown -> Notice
}

function StageStepper({ shift, theme }: { shift: ShiftDetail; theme: Theme }) {
  const idx = stageIdxForShift(shift);
  const tone = shift.mood;
  const inactiveBorder =
    theme === 'dark' ? 'rgba(255,255,255,0.30)' : 'rgba(58,14,102,0.25)';
  const inactiveLine =
    theme === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(58,14,102,0.12)';

  return (
    <View style={stepperStyles.row}>
      {STAGES.map((label, i) => {
        const reachedOrCurrent = i <= idx;
        const current = i === idx;
        return (
          <React.Fragment key={label}>
            <View style={stepperStyles.col}>
              <View
                style={[
                  stepperStyles.dot,
                  {
                    backgroundColor: reachedOrCurrent ? tone : 'transparent',
                    borderColor: reachedOrCurrent ? tone : inactiveBorder,
                  },
                  current && {
                    shadowColor: tone,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 10,
                    elevation: 4,
                  },
                ]}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[
                  stepperStyles.label,
                  {
                    color: current ? ink(theme) : inkFaint(theme),
                    fontFamily: current
                      ? fonts.outfit.bold
                      : fonts.outfit.regular,
                  },
                ]}
              >
                {label}
              </Text>
            </View>
            {i < STAGES.length - 1 && (
              <View
                style={[
                  stepperStyles.connector,
                  { backgroundColor: i < idx ? tone : inactiveLine },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

type Props = {
  visible: boolean;
  detail: ShiftDetail | null;
  theme: Theme;
  onClose: () => void;
  onTend?: (id: string) => void;
  onSnooze?: (id: string) => void;
  onIntegrated?: (id: string) => void;
  onRelease?: (id: string) => void;
};

// Long-title threshold: above this, display-serif Italiana becomes unreadable.
// Above the truncate threshold we ellipsize the header copy; full body always
// lives in The Practice card.
const TITLE_LONG_THRESHOLD = 60;
const TITLE_TRUNCATE_THRESHOLD = 80;

export function ShiftsDetailModal({
  visible,
  detail,
  theme,
  onClose,
  onTend,
  onSnooze,
  onIntegrated,
  onRelease,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';

  // Title typography + practice fallback (so-f6x). When BE doesn't supply a
  // separate `practice` body, the (likely-long) title becomes the practice
  // copy so the user sees the actual instruction. The header itself drops to
  // a sans typeface and truncates to keep the modal scannable.
  const fullTitle = detail?.title ?? '';
  const isLongTitle = fullTitle.length > TITLE_LONG_THRESHOLD;
  const displayTitle =
    fullTitle.length > TITLE_TRUNCATE_THRESHOLD
      ? fullTitle.slice(0, TITLE_TRUNCATE_THRESHOLD - 1).trimEnd() + '…'
      : fullTitle;
  // BE returns standalone practice bodies post-PR-#11 (so-ttk), so no longer
  // prepend the title (so-cuu — was producing a visible duplicate header). The
  // long-title fallback stays for shifts where BE didn't supply a practice body.
  const practiceBody = (() => {
    const practice = detail?.practice ?? null;
    if (practice) return practice;
    return isLongTitle ? fullTitle : null;
  })();

  // The Modal is always mounted while `visible` so React doesn't unmount the
  // animation; render-blank when there's no detail yet (e.g. mid-fetch).
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.fullScreen}>
        {/* Scrim sits behind the sheet as a sibling; tapping it dismisses.
            Avoids the "outer Pressable swallows children" issue from nesting
            the sheet inside the scrim Pressable (so-44t). */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        {detail && (
          <View
            style={[
              styles.sheetWrap,
              { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 },
            ]}
            // box-none: this wrapper doesn't capture taps, but its descendants
            // (the sheet's child Pressables) still do. Empty space within the
            // wrapper falls through to the scrim below.
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: isDark ? '#0E0820' : '#FFFFFF',
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.10)'
                    : 'rgba(58,14,102,0.08)',
                },
              ]}
            >
            <ScrollView
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.headerRow}>
                <Text
                  style={[styles.cat, { color: detail.mood }]}
                  numberOfLines={1}
                >
                  {detail.cat}
                  {detail.since ? ` · since ${detail.since}` : ''}
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.closeBtn}
                  accessibilityLabel="Close"
                >
                  <Text style={[styles.closeX, { color: inkSub(theme) }]}>×</Text>
                </Pressable>
              </View>

              {/* Long instruction sentences in Italiana 28 (display serif) are
                  unreadable. Above 60 chars we switch to Outfit Bold 22 — accessible
                  and consistent with the home Welcome name styling. Above 80 chars
                  we truncate with ellipsis; the full body always lives in The
                  Practice card below where it's set in readable Edensor italic. */}
              <Text
                style={[
                  isLongTitle ? styles.titleLong : styles.title,
                  { color: ink(theme) },
                ]}
              >
                {displayTitle}
              </Text>

              <View style={styles.stepperWrap}>
                <StageStepper shift={detail} theme={theme} />
              </View>

              {practiceBody ? (
                <View
                  style={[
                    styles.practiceCard,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.04)'
                        : '#FBF6FF',
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(58,14,102,0.06)',
                    },
                  ]}
                >
                  <Image
                    source={SOULPAL_SRC[detail.soulpal]}
                    style={styles.practiceAvatar}
                    resizeMode="contain"
                  />
                  <View style={styles.practiceText}>
                    <Text
                      style={[
                        styles.practiceLabel,
                        { color: inkSub(theme) },
                      ]}
                    >
                      The practice
                    </Text>
                    <Text style={[styles.practiceBody, { color: ink(theme) }]}>
                      {practiceBody}
                    </Text>
                    {/* "since {since}" footer removed (so-3m0): the cat
                        eyebrow already conveys this; rendering both was
                        a duplication. */}
                  </View>
                </View>
              ) : null}

              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.04)'
                        : '#FFFFFF',
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(58,14,102,0.06)',
                    },
                  ]}
                >
                  <Text style={[styles.statLabel, { color: inkFaint(theme) }]}>
                    Tended
                  </Text>
                  <Text style={[styles.statValue, { color: ink(theme) }]}>
                    {detail.tendCount} {detail.tendCount === 1 ? 'time' : 'times'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.04)'
                        : '#FFFFFF',
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(58,14,102,0.06)',
                    },
                  ]}
                >
                  <Text style={[styles.statLabel, { color: inkFaint(theme) }]}>
                    Last tend
                  </Text>
                  <Text style={[styles.statValue, { color: ink(theme) }]}>
                    {formatRelativeTime(detail.lastTend) ?? '—'}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onTend ? () => onTend(detail.id) : undefined}
                style={styles.tendCtaWrap}
                accessibilityLabel="Tend this shift"
              >
                <LinearGradient
                  colors={[detail.mood, PINK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tendCta}
                >
                  <Text style={styles.tendCtaText}>＋ Tend this shift</Text>
                </LinearGradient>
              </Pressable>

              <View style={styles.secondaryRow}>
                {[
                  { label: 'Snooze', icon: '☾', cb: onSnooze },
                  { label: 'Integrated', icon: '✓', cb: onIntegrated },
                  { label: 'Release', icon: '✿', cb: onRelease },
                ].map((b) => {
                  // Buttons render visibly inert until the corresponding handler
                  // bead lands (so-7hw / so-idb / so-pjv). Drop opacity + leave
                  // onPress undefined so taps no-op without flashing pressed
                  // state.
                  const inert = !b.cb;
                  return (
                    <Pressable
                      key={b.label}
                      style={[
                        styles.secondaryBtn,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.05)'
                            : '#FFFFFF',
                          borderColor: isDark
                            ? 'rgba(255,255,255,0.10)'
                            : 'rgba(58,14,102,0.08)',
                          opacity: inert ? 0.55 : 1,
                        },
                      ]}
                      onPress={
                        inert ? undefined : () => b.cb && b.cb(detail.id)
                      }
                      disabled={inert}
                      accessibilityLabel={b.label}
                      accessibilityState={{ disabled: inert }}
                    >
                      <Text style={[styles.secondaryIcon, { color: ink(theme) }]}>
                        {b.icon}
                      </Text>
                      <Text style={[styles.secondaryLabel, { color: ink(theme) }]}>
                        {b.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheetWrap: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 16,
  },
  sheet: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cat: {
    flex: 1,
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  closeBtn: {
    padding: 6,
    marginRight: -6,
  },
  closeX: {
    fontSize: 28,
    lineHeight: 28,
    fontFamily: fonts.outfit.regular,
  },
  title: {
    fontFamily: fonts.edensor.regular,
    fontSize: 28,
    lineHeight: 28 * 1.15,
    letterSpacing: -0.2,
  },
  // Long titles render in sans for legibility (so-f6x). Outfit Bold 22 mirrors
  // the home-screen welcome name styling.
  titleLong: {
    fontFamily: fonts.outfit.bold,
    fontSize: 22,
    lineHeight: 22 * 1.25,
    letterSpacing: -0.1,
  },
  stepperWrap: {
    marginTop: 18,
  },
  practiceCard: {
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  practiceAvatar: {
    width: 32,
    height: 32,
    marginTop: 1,
  },
  practiceText: {
    flex: 1,
  },
  practiceLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  practiceBody: {
    // Edensor italic was unreadable for long body copy (so-niz). Convention
    // (theme/typography.ts): Edensor = short emotional/brand moments;
    // Outfit = body / UI. Matches soulSightsB ReadingBody paragraph sizing.
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    lineHeight: 15 * 1.55,
  },
  statsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statValue: {
    marginTop: 4,
    fontFamily: fonts.edensor.regular,
    fontSize: 24,
    lineHeight: 24 * 1.1,
  },
  tendCtaWrap: {
    marginTop: 18,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tendCta: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tendCtaText: {
    color: colors.white,
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  secondaryRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  secondaryIcon: {
    fontSize: 16,
  },
  secondaryLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
  },
});

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  col: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.2,
    // Canonical shifts-states.jsx STAGES array uses proper-case keys
    // ('Notice'/'Practice'/'Embody'/'Integrate'); rendering them uppercase
    // wraps to two lines at iPhone 16e width ("PRACTI/CE", "EMBOD/Y", etc).
    // Drop the transform — proper-case fits on one line at this size.
  },
  connector: {
    flex: 1,
    height: 1,
    marginBottom: 14,
  },
});
