// so-98dx: "Welcome back, {name}" bridge overlay — shown on explicit sign-in
// (email/password or social OAuth for returning users). Mounts as an
// absolute-fill overlay on top of HomeScreen so Home loads data underneath
// and is populated when the overlay fades out (~1.55s total). Uses the same
// cosmic night backdrop aesthetic as login / WelcomeSplash.
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { CosmicBackdrop } from './CosmicBackdrop';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface WelcomeBackOverlayProps {
  /** Resolved display name: display_first_name || first_name || username.
   *  Null/empty → show "Welcome back" (no comma) with no name. */
  displayName: string | null;
  onDismiss: () => void;
}

// Hold before fade starts. 300ms on reduce-motion (brief acknowledgement);
// 1200ms otherwise — enough for Home to finish its first data fetch under
// the overlay so the reveal lands on a populated screen.
const HOLD_MS_NORMAL = 1200;
const HOLD_MS_REDUCED = 300;
// Fade-out duration in normal mode. Reduce-motion → 0 (instant dismiss).
const FADE_MS = 350;
// so-z8gy M1: unconditional maximum lifetime — belt + suspenders.
// If the reduce-motion query rejects or hangs, this guarantee fires
// onDismiss at 2s so the overlay CANNOT strand the user.
const MAX_LIFETIME_MS = 2000;

const WelcomeBackOverlay: React.FC<WelcomeBackOverlayProps> = ({
  displayName,
  onDismiss,
}) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  // null = not yet resolved; the normal timer waits until resolved.
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  // so-z8gy m2: track mount state so async callbacks don't setState
  // after unmount, and to guard the fallback timer.
  const mountedRef = useRef(true);

  // Unmount cleanup: mark as unmounted and stop any in-flight animation
  // so the start() callback (which calls onDismiss) is cancelled cleanly
  // and won't fire after the parent has already dismissed.
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      opacity.stopAnimation();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // so-z8gy M1 (belt): unconditional fallback — dismisses the overlay at
  // MAX_LIFETIME_MS regardless of reduce-motion resolution. Cleared on
  // unmount so it never fires after a clean normal-path dismiss.
  useEffect(() => {
    const fallback = setTimeout(() => {
      if (mountedRef.current) onDismiss();
    }, MAX_LIFETIME_MS);
    return () => clearTimeout(fallback);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve reduce-motion preference on mount.
  // so-z8gy M1 (suspenders): .catch() so a rejection resolves to false
  // and the normal timer path runs — whichever fires first wins.
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (mountedRef.current) setReduceMotion(v); })
      .catch(() => { if (mountedRef.current) setReduceMotion(false); });
  }, []);

  // Announce greeting to screen readers on mount.
  useEffect(() => {
    const name = displayName?.trim() || '';
    AccessibilityInfo.announceForAccessibility(
      name ? `Welcome back, ${name}` : 'Welcome back',
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Normal-path hold + fade timer, starts once reduce-motion is known.
  // At most one of this timer or the fallback will actually call onDismiss:
  // whichever fires first triggers unmount, which cancels the other via
  // clearTimeout + mountedRef + stopAnimation.
  useEffect(() => {
    if (reduceMotion === null) return; // wait for resolution
    const holdMs = reduceMotion ? HOLD_MS_REDUCED : HOLD_MS_NORMAL;
    const fadeMs = reduceMotion ? 0 : FADE_MS;

    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      if (fadeMs > 0) {
        Animated.timing(opacity, {
          toValue: 0,
          duration: fadeMs,
          useNativeDriver: true,
        }).start(({ finished }) => {
          // finished=false when stopAnimation() was called (unmount cleanup
          // or fallback already dismissed) — skip to avoid a double dismiss.
          if (finished) onDismiss();
        });
      } else {
        onDismiss();
      }
    }, holdMs);

    return () => clearTimeout(timer);
  }, [reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const textColor = isDarkMode ? '#FFFFFF' : colors.text.primary;
  // so-z8gy m1: no trailing comma when there is no name.
  const name = displayName?.trim() || null;

  return (
    <Animated.View
      style={[styles.container, { opacity }]}
      accessibilityLabel={name ? `Welcome back, ${name}` : 'Welcome back'}
      importantForAccessibility="yes"
    >
      {/* Cosmic night backdrop matches login / WelcomeSplash aesthetic. */}
      <CosmicBackdrop tone="night" />
      <View style={styles.content}>
        {name ? (
          <>
            <Text style={[styles.welcomeLine, { color: textColor }]}>
              Welcome back,
            </Text>
            <Text style={[styles.nameLine, { color: textColor }]}>{name}</Text>
          </>
        ) : (
          <Text style={[styles.welcomeLine, { color: textColor }]}>
            Welcome back
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeLine: {
    fontFamily: fonts.outfit.light,
    fontSize: 32,
    textAlign: 'center',
    lineHeight: 32 * 1.25,
  },
  nameLine: {
    fontFamily: fonts.edensor.regular,
    fontSize: 52,
    textAlign: 'center',
    lineHeight: 52 * 1.15,
    marginTop: 6,
  },
});

export default WelcomeBackOverlay;
