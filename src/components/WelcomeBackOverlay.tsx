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
   *  Null/empty → show "Welcome back" with no name (never "Welcome back, undefined"). */
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

const WelcomeBackOverlay: React.FC<WelcomeBackOverlayProps> = ({
  displayName,
  onDismiss,
}) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  // null = not yet resolved; timer waits until resolved to pick the right hold duration.
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  // Resolve reduce-motion preference on mount.
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  // Announce greeting to screen readers on mount.
  useEffect(() => {
    const name = displayName?.trim() || '';
    AccessibilityInfo.announceForAccessibility(
      name ? `Welcome back, ${name}` : 'Welcome back',
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start hold + fade timer once reduce-motion preference is known.
  useEffect(() => {
    if (reduceMotion === null) return; // wait for resolution
    const holdMs = reduceMotion ? HOLD_MS_REDUCED : HOLD_MS_NORMAL;
    const fadeMs = reduceMotion ? 0 : FADE_MS;

    const timer = setTimeout(() => {
      if (fadeMs > 0) {
        Animated.timing(opacity, {
          toValue: 0,
          duration: fadeMs,
          useNativeDriver: true,
        }).start(() => onDismiss());
      } else {
        onDismiss();
      }
    }, holdMs);

    return () => clearTimeout(timer);
  }, [reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  const textColor = isDarkMode ? '#FFFFFF' : colors.text.primary;
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
        <Text style={[styles.welcomeLine, { color: textColor }]}>
          Welcome back,
        </Text>
        {name ? (
          <Text style={[styles.nameLine, { color: textColor }]}>{name}</Text>
        ) : null}
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
