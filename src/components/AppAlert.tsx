/**
 * so-1zn0: themed in-app alert.
 *
 * Replaces React Native's native `Alert.alert` (OS-styled gray modal that
 * ignores the SoulTalk light/dark theme). Renders a centered card with
 * title (optional), message, and 1-2 buttons over a dimmed scrim. Theming
 * is driven by `useThemeColors()` + `ThemeContext` so the surface matches
 * the rest of the app (cosmic dark / lavender light), and typography
 * uses the same Outfit + Edensor stack as the rest of the screens.
 *
 * Reference styling cues come from MoodToast (so-q4r): same dark card
 * `#1A1235` over white scrim → cohesive themed-overlay family. CTAs
 * mirror the primary CTA pattern used in WelcomeScreen / TermsScreen so
 * the alert reads as "part of the app" instead of an OS pop.
 *
 * Public API (callers should NEVER touch this component directly — go
 * through `useAppAlert()` from `./AppAlertProvider`):
 *   <AppAlert visible title? message buttons? onRequestClose />
 *
 * Buttons array mirrors the native `Alert.alert` shape for cheap
 * call-site migrations:
 *   [{ text: 'OK' }]
 *   [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress }]
 *
 * Backdrop tap closes the alert when `dismissOnBackdrop` is true (the
 * default for non-destructive single-OK alerts) — matches native iOS
 * UIAlertController dismissal behavior. Pressing a button always closes.
 */
import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors, fonts } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

export type AppAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AppAlertButton {
  text: string;
  style?: AppAlertButtonStyle;
  onPress?: () => void;
}

export interface AppAlertProps {
  visible: boolean;
  title?: string;
  message: string;
  buttons?: AppAlertButton[];
  dismissOnBackdrop?: boolean;
  onRequestClose: () => void;
}

const DEFAULT_BUTTONS: AppAlertButton[] = [{ text: 'OK', style: 'default' }];

const ERROR_RED = '#E5484D';

export const AppAlert: React.FC<AppAlertProps> = ({
  visible,
  title,
  message,
  buttons,
  dismissOnBackdrop = true,
  onRequestClose,
}) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();

  const cardScale = useSharedValue(visible ? 1 : 0.96);
  const scrimOpacity = useSharedValue(visible ? 1 : 0);

  // Drive a tiny spring/fade when visibility flips. Reanimated value reads
  // are cheap and don't trigger React reconciles.
  React.useEffect(() => {
    if (visible) {
      cardScale.value = withTiming(1, { duration: 180 });
      scrimOpacity.value = withTiming(1, { duration: 180 });
    } else {
      cardScale.value = withTiming(0.96, { duration: 120 });
      scrimOpacity.value = withTiming(0, { duration: 120 });
    }
  }, [visible, cardScale, scrimOpacity]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: scrimOpacity.value,
  }));

  const scrimAnimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  const effectiveButtons = buttons && buttons.length > 0 ? buttons : DEFAULT_BUTTONS;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scrim: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        },
        card: {
          width: '100%',
          maxWidth: 340,
          borderRadius: 20,
          paddingTop: 22,
          paddingHorizontal: 22,
          paddingBottom: 8,
          backgroundColor: isDarkMode ? '#1A1235' : '#FFFFFF',
          borderWidth: 1,
          borderColor: isDarkMode
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(58,14,102,0.10)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 18,
          elevation: 10,
        },
        title: {
          fontFamily: fonts.outfit.bold,
          fontSize: 17,
          lineHeight: 22,
          color: isDarkMode ? '#F5F2F9' : colors.text.primary,
          textAlign: 'center',
          marginBottom: 8,
        },
        message: {
          fontFamily: fonts.outfit.regular,
          fontSize: 15,
          lineHeight: 21,
          color: isDarkMode ? 'rgba(245,242,249,0.85)' : colors.text.primary,
          textAlign: 'center',
          marginBottom: 18,
        },
        buttonRow: {
          // Single-button alerts get a full-width pill; two-button alerts
          // sit side-by-side. Anything beyond 2 we wrap to a column for
          // legibility on small screens.
          flexDirection: 'row',
          gap: 8,
          flexWrap: 'wrap',
        },
        buttonRowColumn: {
          flexDirection: 'column',
        },
        button: {
          flex: 1,
          minHeight: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          marginBottom: 10,
        },
        buttonDefault: {
          backgroundColor: isDarkMode ? colors.primary : colors.primary,
        },
        buttonDefaultText: {
          color: isDarkMode ? '#0A0A14' : colors.white,
          fontFamily: fonts.outfit.semiBold,
          fontSize: 15,
        },
        buttonCancel: {
          backgroundColor: isDarkMode
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(58,14,102,0.06)',
          borderWidth: 1,
          borderColor: isDarkMode
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(58,14,102,0.12)',
        },
        buttonCancelText: {
          color: isDarkMode ? '#F5F2F9' : colors.text.primary,
          fontFamily: fonts.outfit.medium,
          fontSize: 15,
        },
        buttonDestructive: {
          backgroundColor: ERROR_RED,
        },
        buttonDestructiveText: {
          color: '#FFFFFF',
          fontFamily: fonts.outfit.semiBold,
          fontSize: 15,
        },
        buttonPressed: {
          opacity: 0.85,
        },
      }),
    [isDarkMode, colors],
  );

  const handleButtonPress = (btn: AppAlertButton) => {
    // Close FIRST, then fire the caller's onPress. This matches native
    // Alert.alert semantics and prevents the case where an onPress that
    // navigates / opens another modal races the alert's own dismissal.
    onRequestClose();
    if (btn.onPress) {
      // Defer the caller hook to the next tick so the close animation
      // can start without being blocked by user-supplied work.
      setTimeout(() => {
        try {
          btn.onPress?.();
        } catch (err) {
          // A bad onPress callback should never crash the alert tree.
          if (__DEV__) {
            console.warn('[AppAlert] button onPress threw', err);
          }
        }
      }, 0);
    }
  };

  const handleBackdrop = () => {
    if (!dismissOnBackdrop) return;
    // Backdrop tap fires the 'cancel'-style button if present (matches
    // iOS UIAlertController behaviour), else simply closes.
    const cancelBtn = effectiveButtons.find((b) => b.style === 'cancel');
    if (cancelBtn) {
      handleButtonPress(cancelBtn);
    } else {
      onRequestClose();
    }
  };

  // Wrap >2 buttons (rare) as a column to avoid cramped Pressables.
  const buttonRowStyle: ViewStyle =
    effectiveButtons.length > 2 ? { ...styles.buttonRow, ...styles.buttonRowColumn } : styles.buttonRow;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
      hardwareAccelerated
    >
      {/* Outer scrim is itself pressable for backdrop dismiss; the inner
          card stops propagation so taps on the card don't dismiss. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleBackdrop}
        accessible={false}
      >
        <Animated.View style={[styles.scrim, scrimAnimStyle]} pointerEvents="box-none">
          <Animated.View style={[styles.card, cardAnimStyle]}>
            {/* Stops the backdrop dismiss handler on the parent Pressable */}
            <Pressable onPress={() => {}} accessible={false}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              <Text style={styles.message}>{message}</Text>
              <View style={buttonRowStyle}>
                {effectiveButtons.map((btn, i) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  const buttonBase = isDestructive
                    ? styles.buttonDestructive
                    : isCancel
                      ? styles.buttonCancel
                      : styles.buttonDefault;
                  const buttonText = isDestructive
                    ? styles.buttonDestructiveText
                    : isCancel
                      ? styles.buttonCancelText
                      : styles.buttonDefaultText;
                  return (
                    <Pressable
                      key={`${btn.text}-${i}`}
                      onPress={() => handleButtonPress(btn)}
                      style={({ pressed }) => [
                        styles.button,
                        buttonBase,
                        pressed && styles.buttonPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={btn.text}
                    >
                      <Text style={buttonText}>{btn.text}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default AppAlert;
