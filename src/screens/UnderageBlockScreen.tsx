import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, useThemeColors } from '../theme';
import { CosmicScreen } from '../components/CosmicBackdrop';
import { UNDER_18_MESSAGE } from '../utils/ageGate';

// so-cbhq: neutral under-18 block. Shown when the age gate (Apple Declared Age
// Range or manual DOB) determines the user is under 18, OR when the backend
// (so-8544) hard-rejects registration. Intentionally NEUTRAL: no waitlist, no
// email capture, no "try again" that implies a workaround — just the message
// and a way back out of the signup flow.
//
// COPY IS PLACEHOLDER — Chey/Randy to finalize the headline + body.
interface UnderageBlockScreenProps {
  navigation: any;
}

const UnderageBlockScreen: React.FC<UnderageBlockScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          paddingHorizontal: 32,
          justifyContent: 'center',
          alignItems: 'center',
        },
        headline: {
          fontFamily: fonts.edensor.regular,
          fontSize: 26,
          lineHeight: 26 * 1.25,
          color: colors.text.primary,
          textAlign: 'center',
          marginBottom: 16,
        },
        body: {
          fontFamily: fonts.outfit.regular,
          fontSize: 15,
          lineHeight: 15 * 1.5,
          color: colors.text.secondary,
          textAlign: 'center',
          marginBottom: 40,
        },
        backBtn: {
          paddingHorizontal: 28,
          paddingVertical: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },
        backBtnText: {
          fontFamily: fonts.outfit.medium,
          fontSize: 16,
          color: colors.text.primary,
        },
      }),
    [colors],
  );

  const handleBack = () => {
    // Pop back to the start of the auth flow. popToTop falls back to a plain
    // navigate when the stack can't pop (e.g. deep-linked entry).
    if (navigation.canGoBack()) {
      if (typeof navigation.popToTop === 'function') {
        navigation.popToTop();
      } else {
        navigation.goBack();
      }
    } else {
      navigation.navigate('Welcome');
    }
  };

  return (
    <CosmicScreen tone="night">
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* PLACEHOLDER copy — Chey/Randy finalize */}
        <Text style={styles.headline} accessibilityRole="header">
          {UNDER_18_MESSAGE}
        </Text>
        <Text style={styles.body}>
          Thanks for your interest in SoulTalk. You'll need to be 18 or older to
          create an account.
        </Text>
        <Pressable
          onPress={handleBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>
    </CosmicScreen>
  );
};

export default UnderageBlockScreen;
