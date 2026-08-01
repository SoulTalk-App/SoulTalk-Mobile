import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useSoulPal } from '../contexts/SoulPalContext';
import { useAuth } from '../contexts/AuthContext';
import { CosmicScreen } from '../components/CosmicBackdrop';
import JournalService from '../services/JournalService';

const SoulpalCharacter = require('../../assets/images/onboarding/soulpal_main.png');
const SubmitIcon = require('../../assets/images/common/SubmitIcon.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SoulPalNameScreenProps {
  navigation: any;
}

const SoulPalNameScreen: React.FC<SoulPalNameScreenProps> = ({ navigation }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [soulPalName, setSoulPalName] = useState('');
  // so-wuy8: context's setName persists to AsyncStorage AND updates the
  // live SoulPalContext state, so the chosen name flows through
  // useSoulPalName() consumers immediately — no remount needed.
  const { setName } = useSoulPal();
  const { user } = useAuth();
  const [inputFocused, setInputFocused] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        keyboardView: {
          flex: 1,
        },
        content: {
          flex: 1,
          alignItems: 'center',
        },
        mainWrapper: {
          flex: 1,
          alignItems: 'center',
          width: '100%',
          paddingTop: 120, // Position content from top
        },
        characterContainer: {
          alignItems: 'center',
        },
        characterImage: {
          width: SCREEN_WIDTH * 0.35,
          height: SCREEN_WIDTH * 0.55,
        },
        characterFront: {
          position: 'absolute',
          top: 0,
          left: 0,
        },
        formSection: {
          marginTop: 40, // Gap between character and form
          alignItems: 'center',
          width: '100%',
        },
        // Light path: page-bg ink for AA on the so-u1k lavender wash.
        question: {
          fontFamily: fonts.outfit.light,
          fontSize: 15,
          color: isDarkMode ? colors.white : 'rgba(58, 14, 102, 0.85)',
          textAlign: 'center',
          marginBottom: 20,
          lineHeight: 15 * 1.26,
          paddingHorizontal: 40,
        },
        inputWrapper: {
          width: 268,
          marginBottom: 20,
        },
        inputContainer: {
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: 10,
          height: 44,
          justifyContent: 'center',
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
        },
        inputContainerFocused: {
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.5)',
        },
        input: {
          fontFamily: fonts.outfit.regular,
          fontSize: 18,
          color: isDarkMode ? colors.white : colors.text.primary,
        },
        iconButton: {
          width: 55,
          height: 38,
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
        },
        submitIcon: {
          width: 22,
          height: 22,
        },
      }),
    [colors, isDarkMode]
  );

  // Animation values
  const characterOpacity = useSharedValue(0);
  const characterScale = useSharedValue(0.8);
  const turnProgress = useSharedValue(0);

  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(30);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // Character entrance
    characterOpacity.value = withTiming(1, { duration: 500 });
    characterScale.value = withSpring(1, { damping: 12, stiffness: 100 });

    // Form fades in
    formOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    formTranslateY.value = withDelay(300, withSpring(0, { damping: 15, stiffness: 100 }));

    // so-vqhs: drive degrees directly (0 → 360) — withRepeat restarts cleanly
    // at 0 each cycle with no visible seam. inOut ease makes the front face
    // linger and the back pass zip through.
    turnProgress.value = withDelay(
      600,
      withRepeat(
        withTiming(360, {
          duration: 5500,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        false
      )
    );
  }, []);

  const handleContinue = () => {
    const name = soulPalName.trim();
    if (!name) return;
    setName(name);
    // so-v6pr: navigate immediately so the finishing move stays instant, then
    // sync to the BE in the background. A failed sync is queued for retry on
    // the next app open (see JournalService.syncSoulPalName) rather than
    // silently dropped.
    navigation.navigate('SetupComplete');
    // so-vpqj: per-user key requires user.id; the user is authenticated by the
    // time they name their SoulPal, so this resolves. If somehow absent, the
    // name is still saved locally and syncSoulPalName no-ops safely.
    JournalService.syncSoulPalName(name, user?.id ?? '');
  };

  const handlePressIn = useCallback(() => {
    if (soulPalName.trim()) {
      buttonScale.value = withSpring(0.9, { damping: 10, stiffness: 400 });
    }
  }, [soulPalName]);

  const handlePressOut = useCallback(() => {
    buttonScale.value = withSpring(1, { damping: 8, stiffness: 200 });
  }, []);

  // Animated styles
  const characterContainerStyle = useAnimatedStyle(() => ({
    opacity: characterOpacity.value,
    transform: [{ scale: characterScale.value }],
  }));

  // so-vqhs: card-flip container — single shared rotateY so both faces spin
  // together as one solid object. perspective must precede rotateY in the array.
  // Cast needed: mixing perspective (number) and rotateY (string) widens the
  // discriminated union beyond what DefaultStyle accepts. Runtime values are
  // correct; the cast is purely a tsc appeasement.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spinContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateY: `${turnProgress.value}deg` },
    ] as any,
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: soulPalName.trim() ? 1 : 0.5,
  }));

  return (
    <CosmicScreen tone="night">
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.content, { paddingTop: insets.top }]}>
          {/* Main content wrapper */}
          <View style={styles.mainWrapper}>
            {/* SoulPal Character - Rotating turn */}
            <Animated.View style={[styles.characterContainer, characterContainerStyle]}>
              {/* so-vqhs: card-flip — one Animated.View spins both faces together
                  so the SoulPal reads as a solid object rotating on its Y axis.
                  backfaceVisibility:'hidden' on each face shows only the forward
                  face at any moment; no static-blob hold, no opacity crossfade. */}
              <Animated.View style={[styles.characterImage, spinContainerStyle]}>
                {/* Front face: full character with eyes + arms */}
                <Image
                  source={SoulpalCharacter}
                  style={[styles.characterImage, { backfaceVisibility: 'hidden' }]}
                  resizeMode="contain"
                />
                {/* Back face: teal silhouette, pre-rotated 180° so it faces the
                    camera exactly when the container has turned half-way around */}
                <Image
                  source={SoulpalCharacter}
                  style={[
                    styles.characterImage,
                    styles.characterFront,
                    {
                      tintColor: '#70CACF',
                      backfaceVisibility: 'hidden',
                      transform: [{ rotateY: '180deg' }],
                    },
                  ]}
                  resizeMode="contain"
                />
              </Animated.View>
            </Animated.View>

            {/* Form Section */}
            <Animated.View style={[styles.formSection, formAnimatedStyle]}>
              {/* Question */}
              <Text style={styles.question}>What would you like to name your SoulPal?</Text>

              {/* SoulPal Name Input */}
              <View style={styles.inputWrapper}>
                <View style={[styles.inputContainer, inputFocused && styles.inputContainerFocused]}>
                  <TextInput
                    style={styles.input}
                    placeholder="SoulPal"
                    placeholderTextColor="rgba(255,255,255,0.50)"
                    value={soulPalName}
                    onChangeText={setSoulPalName}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    onSubmitEditing={handleContinue}
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Submit Icon Button */}
              <AnimatedPressable
                style={[styles.iconButton, buttonAnimatedStyle]}
                onPress={handleContinue}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={!soulPalName.trim()}
              >
                <Image
                  source={SubmitIcon}
                  style={styles.submitIcon}
                  resizeMode="contain"
                />
              </AnimatedPressable>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </CosmicScreen>
  );
};

export default SoulPalNameScreen;
