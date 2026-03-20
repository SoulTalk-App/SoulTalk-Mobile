import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../theme';
import JournalService from '../services/JournalService';

const REVEALED_DATE_KEY = '@soultalk_affirmation_revealed_date';

const BackIcon = require('../../assets/images/settings/BackButtonIcon.png');
const AffirmationMirrorFull = require('../../assets/images/home/AffirmationMirrorFull.png');
const MirrorCharLeft = require('../../assets/images/home/MirrorCharLeft.png');
const MirrorCharRight = require('../../assets/images/home/MirrorCharRight.png');

const AffirmationMirrorScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [affirmation, setAffirmation] = useState<string | null>(null);
  const [source, setSource] = useState<string>('fallback');
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Reveal animation values
  const textOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.92);
  const buttonOpacity = useSharedValue(1);
  const badgeOpacity = useSharedValue(0);

  // Pre-fetch affirmation on page load (Option A from spec)
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchAffirmation = async () => {
      try {
        const data = await JournalService.getTodayAffirmation();
        setAffirmation(data.affirmation_text);
        setSource(data.source);
        setDateKey(data.date_key);

        // Check if user already revealed today
        const revealedDate = await AsyncStorage.getItem(REVEALED_DATE_KEY);
        if (revealedDate === data.date_key) {
          // Already revealed today — show directly
          setIsRevealed(true);
          textOpacity.value = 1;
          textScale.value = 1;
          if (data.source === 'ai') {
            badgeOpacity.value = 1;
          }
        }
      } catch (e: any) {
        setError('Unable to load your affirmation right now.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAffirmation();
  }, []);

  const handleReveal = async () => {
    if (!affirmation) return;
    setIsRevealed(true);

    // Persist revealed date so same-day returns skip the button
    if (dateKey) {
      try {
        await AsyncStorage.setItem(REVEALED_DATE_KEY, dateKey);
      } catch {}
    }


    // Fade out reveal button
    buttonOpacity.value = withTiming(0, { duration: 300 });

    // Reveal affirmation text
    textOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) })
    );
    textScale.value = withDelay(
      200,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) })
    );

    // Show personalization badge
    if (source === 'ai') {
      badgeOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
    }
  };

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const badgeAnimStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
  }));

  return (
    <LinearGradient
      colors={['#59168B', '#653495', '#59168B']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Back Button */}
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
          <Image source={BackIcon} style={styles.backIcon} resizeMode="contain" />
          <Text style={styles.backText}>Affirmation Mirror</Text>
        </Pressable>

        {/* Mirror Visual */}
        <View style={styles.mirrorContainer}>
          <View style={styles.mirrorImageWrapper}>
            <Image
              source={MirrorCharLeft}
              style={styles.charLeft}
              resizeMode="contain"
            />
            <Image
              source={AffirmationMirrorFull}
              style={styles.mirrorImage}
              resizeMode="contain"
            />
            <Image
              source={MirrorCharRight}
              style={styles.charRight}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Affirmation / Reveal Area */}
        <View style={styles.affirmationContainer}>
          {isLoading ? (
            <ActivityIndicator color={colors.white} size="large" />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : !isRevealed ? (
            <Animated.View style={buttonAnimStyle}>
              <Pressable style={styles.revealButton} onPress={handleReveal}>
                <Text style={styles.revealButtonText}>Click to Reveal</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <>
              <Animated.Text style={[styles.affirmationText, textAnimStyle]}>
                {affirmation}
              </Animated.Text>
              {source === 'ai' && (
                <Animated.View style={[styles.badge, badgeAnimStyle]}>
                  <Text style={styles.badgeText}>Personalized for you</Text>
                </Animated.View>
              )}
            </>
          )}
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

  // Back
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  backIcon: {
    width: 36,
    height: 36,
  },
  backText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: colors.white,
  },

  // Mirror
  mirrorContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  mirrorImageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mirrorImage: {
    width: 220,
    height: 220,
  },
  charLeft: {
    position: 'absolute',
    left: -30,
    bottom: 60,
    width: 70,
    height: 80,
    opacity: 0.6,
  },
  charRight: {
    position: 'absolute',
    right: -30,
    bottom: 60,
    width: 70,
    height: 80,
    opacity: 0.6,
  },

  // Affirmation
  affirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: -20,
  },
  affirmationText: {
    fontFamily: fonts.edensor.lightItalic,
    fontSize: 26,
    lineHeight: 26 * 1.5,
    color: colors.white,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: fonts.outfit.light,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },

  // Reveal Button
  revealButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 30,
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  revealButtonText: {
    fontFamily: fonts.edensor.medium,
    fontSize: 20,
    color: colors.white,
    textAlign: 'center',
  },

  // Badge
  badge: {
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default AffirmationMirrorScreen;
