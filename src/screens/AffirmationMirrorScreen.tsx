import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { colors, fonts } from '../theme';
import JournalService from '../services/JournalService';

const REVEALED_DATE_KEY = '@soultalk_affirmation_revealed_date';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Back button rendered as inline SVG (pink version from Figma)
const CloudsBg = require('../../assets/images/home/CloudsBg.png');
const CloudsLeft = require('../../assets/images/home/CloudsLeft.png');
const CloudsRight = require('../../assets/images/home/CloudsRight.png');
const IdleVideo = require('../../assets/videos/affirmationIdle.mp4');
const RevealedVideo = require('../../assets/videos/affirmationMirrorLookingUp.mp4');

const AffirmationMirrorScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [affirmation, setAffirmation] = useState<string | null>(null);
  const [source, setSource] = useState<string>('fallback');
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  // Video players
  const idlePlayer = useVideoPlayer(IdleVideo, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const revealedPlayer = useVideoPlayer(RevealedVideo, (p) => {
    p.loop = true;
    p.muted = true;
    // Don't auto-play — starts on reveal
  });

  // --- Animation values ---

  // Entry animation: video slides in from right
  const videoSlideX = useSharedValue(SCREEN_WIDTH);

  const textOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.92);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const badgeOpacity = useSharedValue(0);
  const cloudsOpacity = useSharedValue(1);
  const backButtonOpacity = useSharedValue(0);
  const idleVideoOpacity = useSharedValue(1);
  const revealedVideoOpacity = useSharedValue(0);

  // --- Entry animation: slide video in from right ---
  useEffect(() => {
    videoSlideX.value = withTiming(0, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    // Show button after video slides in
    buttonOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 400 }),
    );
  }, []);

  // --- Data fetch ---
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchAffirmation = async () => {
      try {
        // TODO: Remove this line after testing idle state
        await AsyncStorage.removeItem(REVEALED_DATE_KEY);

        const data = await JournalService.getTodayAffirmation();
        setAffirmation(data.affirmation_text);
        setSource(data.source);
        setDateKey(data.date_key);

        const revealedDate = await AsyncStorage.getItem(REVEALED_DATE_KEY);
        if (revealedDate === data.date_key) {
          // Already revealed today — show revealed state directly
          setIsRevealed(true);
          textOpacity.value = 1;
          textScale.value = 1;
          buttonOpacity.value = 0;
          cloudsOpacity.value = 0;
          backButtonOpacity.value = 1;
          idleVideoOpacity.value = 0;
          revealedVideoOpacity.value = 1;
          idlePlayer.pause();
          revealedPlayer.play();
          if (data.source === 'ai') {
            badgeOpacity.value = 1;
          }
        }
      } catch (_e: any) {
        setError('Unable to load your affirmation right now.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAffirmation();
  }, []);

  // --- Reveal handler ---
  const handleReveal = async () => {
    if (!affirmation) return;
    setIsRevealed(true);

    if (dateKey) {
      try {
        await AsyncStorage.setItem(REVEALED_DATE_KEY, dateKey);
      } catch {}
    }

    // 1. Fade out "Click to Reveal"
    buttonOpacity.value = withTiming(0, { duration: 250 });
    buttonScale.value = withTiming(0.9, { duration: 250 });

    // 2. Clouds fade away
    cloudsOpacity.value = withTiming(0, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });

    // 3. Crossfade videos: idle out, revealed in
    idleVideoOpacity.value = withDelay(
      200,
      withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }),
    );
    revealedVideoOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
    );

    // Start the revealed video
    revealedPlayer.play();

    // 4. Affirmation text fades in
    textOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
    );
    textScale.value = withDelay(
      500,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
    );

    // 5. Back button appears
    backButtonOpacity.value = withDelay(
      700,
      withTiming(1, { duration: 400 }),
    );

    // 6. Personalization badge
    if (source === 'ai') {
      badgeOpacity.value = withDelay(1200, withTiming(1, { duration: 500 }));
    }

    // Stop idle video after crossfade completes
    setTimeout(() => {
      idlePlayer.pause();
    }, 1200);
  };

  // --- Animated styles ---
  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  const badgeAnimStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
  }));

  const cloudsAnimStyle = useAnimatedStyle(() => ({
    opacity: cloudsOpacity.value,
  }));

  const backButtonAnimStyle = useAnimatedStyle(() => ({
    opacity: backButtonOpacity.value,
  }));

  const videoEntryStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: videoSlideX.value }],
  }));

  const idleVideoAnimStyle = useAnimatedStyle(() => ({
    opacity: idleVideoOpacity.value,
  }));

  const revealedVideoAnimStyle = useAnimatedStyle(() => ({
    opacity: revealedVideoOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* ---- Video backgrounds (slide in from right on entry) ---- */}
      <Animated.View style={[styles.videoSlideWrapper, videoEntryStyle]}>
        <Animated.View style={[styles.videoContainer, idleVideoAnimStyle]}>
          <VideoView
            player={idlePlayer}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
            allowsPictureInPicture={false}
          />
        </Animated.View>

        <Animated.View style={[styles.videoContainer, revealedVideoAnimStyle]}>
          <VideoView
            player={revealedPlayer}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
            allowsPictureInPicture={false}
          />
        </Animated.View>
      </Animated.View>

      {/* ---- Clouds overlay (three layers, fades on reveal) ---- */}
      <Animated.View style={[styles.cloudsContainer, cloudsAnimStyle]}>
        <Image
          source={CloudsBg}
          style={styles.cloudsImage}
          resizeMode="cover"
        />
        <Image
          source={CloudsLeft}
          style={styles.cloudsImage}
          resizeMode="cover"
        />
        <Image
          source={CloudsRight}
          style={styles.cloudsImage}
          resizeMode="cover"
        />
      </Animated.View>

      {/* ---- Back button (appears after reveal) ---- */}
      <Animated.View
        style={[
          styles.backButtonContainer,
          { top: insets.top + 12 },
          backButtonAnimStyle,
        ]}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
            <Circle cx={18} cy={18} r={18} fill="white" />
            <G transform="translate(9, 9)">
              <Path
                d="M11.4854 1.2334C17.258 -1.65785 19.6276 0.711733 16.7363 6.48438L15.8623 8.23145C15.6114 8.74338 15.6114 9.33573 15.8623 9.84766L16.7363 11.585C19.6274 17.3574 17.2681 19.7263 11.4854 16.835L2.8916 12.5381C-0.963636 10.6105 -0.963636 7.45789 2.8916 5.53027L11.4854 1.2334Z"
                fill={colors.accent.pink}
              />
              <Path
                d="M10.8368 8.5188L9.89712 9.20406L10.2581 10.2548L9.3175 9.62805L8.37864 10.313L8.73552 9.24058L7.79496 8.6138L8.95656 8.57728L9.31344 7.50483L9.67438 8.55561L10.8368 8.5188Z"
                fill={colors.accent.pink}
                stroke={colors.accent.pink}
                strokeWidth={1.6757}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M12.0385 8.10603L10.2776 9.3902L10.954 11.3593L9.19137 10.1848L7.43196 11.4684L8.10075 9.45864L6.33817 8.28405L8.51498 8.21561L9.18378 6.20587L9.86016 8.17501L12.0385 8.10603Z"
                fill={colors.accent.pink}
                stroke="white"
                strokeWidth={3.14024}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </G>
          </Svg>
        </Pressable>
      </Animated.View>

      {/* ---- Affirmation text (shown after reveal) ---- */}
      {isRevealed && (
        <View style={[styles.textArea, { paddingTop: insets.top + 80 }]}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
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
      )}

      {/* ---- Loading indicator ---- */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.white} size="large" />
        </View>
      )}

      {/* ---- "Click to Reveal" button (idle state only) ---- */}
      {!isRevealed && !isLoading && !error && (
        <Animated.View style={[styles.revealButtonContainer, buttonAnimStyle]}>
          <Pressable onPress={handleReveal} style={styles.revealButton}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.revealButtonGradient}
            />
            <Text style={styles.revealButtonText}>Click to Reveal</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.accent.pink,
  },

  // Video backgrounds
  videoSlideWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    justifyContent: 'flex-end',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH, // square video
    position: 'absolute',
    bottom: 0,
    left: 0,
  },

  // Clouds overlay
  cloudsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    zIndex: 2,
  },
  cloudsImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },

  // Back button
  backButtonContainer: {
    position: 'absolute',
    left: 22,
    zIndex: 10,
  },

  // Affirmation text area
  textArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 5,
  },
  affirmationText: {
    fontFamily: fonts.edensor.medium,
    fontSize: 36,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 36 * 1.4,
  },
  errorText: {
    fontFamily: fonts.outfit.light,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },

  // Badge
  badge: {
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Loading
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },

  // Reveal button
  revealButtonContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.58,
    alignSelf: 'center',
    zIndex: 10,
  },
  revealButton: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  revealButtonGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  revealButtonText: {
    fontFamily: fonts.edensor.regular,
    fontSize: 13,
    color: colors.white,
    textAlign: 'center',
  },
});

export default AffirmationMirrorScreen;
