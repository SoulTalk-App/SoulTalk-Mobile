import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
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
import { colors, fonts } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

// Star field for dark mode
const AFFIRM_STARS = Array.from({ length: 40 }, (_, i) => ({
  left: ((i * 39 + 23) % 100),
  top: ((i * 57 + 13) % 100),
  size: i < 3 ? 2.5 : (i % 3 === 0) ? 2 : 1,
  opacity: i < 3 ? 0.5 : (0.1 + (i % 5) * 0.09),
}));

const REVEALED_DATE_KEY = '@soultalk_affirmation_revealed_date';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BackIconDark = require('../../assets/images/settings/BackButtonIcon.png');
const BackIconLight = require('../../assets/images/common/BackIconPink.png');
const CloudsBg = require('../../assets/images/home/CloudsBg.png');
const CloudsLeft = require('../../assets/images/home/CloudsLeft.png');
const CloudsRight = require('../../assets/images/home/CloudsRight.png');
const IdleVideo = require('../../assets/videos/affirmationIdle.mp4');
const RevealedVideo = require('../../assets/videos/affirmationMirrorLookingUp.mp4');
const IdleVideoDark = require('../../assets/videos/dark/affirmationIdle.mp4');
const RevealedVideoDark = require('../../assets/videos/dark/affirmationMirrorLookingUp.mp4');

const AffirmationMirrorScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const affirmation = route.params?.affirmation_text ?? null;
  const dateKey = route.params?.date_key ?? null;
  const [isRevealed, setIsRevealed] = useState(false);

  // Video players — pick dark or light video based on theme
  const idleSource = isDarkMode ? IdleVideoDark : IdleVideo;
  const revealedSource = isDarkMode ? RevealedVideoDark : RevealedVideo;

  const idlePlayer = useVideoPlayer(idleSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const revealedPlayer = useVideoPlayer(revealedSource, (p) => {
    p.loop = true;
    p.muted = true;
    // Don't auto-play — starts on reveal
  });

  // --- Animation values ---

  const textOpacity = useSharedValue(0);
  const textScale = useSharedValue(0.92);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const cloudsBgOpacity = useSharedValue(1);
  const cloudsLeftX = useSharedValue(0);
  const cloudsLeftOpacity = useSharedValue(1);
  const cloudsRightX = useSharedValue(0);
  const cloudsRightOpacity = useSharedValue(1);
  const backButtonOpacity = useSharedValue(1);
  const idleVideoOpacity = useSharedValue(1);
  const revealedVideoOpacity = useSharedValue(0);
  const videoZoom = useSharedValue(1);

  const isRevealedRef = useRef(false);

  // Dynamic font sizing based on affirmation length
  const { fontSize, lineHeight } = useMemo(() => {
    const len = affirmation?.length ?? 0;
    if (len <= 60) return { fontSize: 42, lineHeight: 56 };
    if (len <= 100) return { fontSize: 36, lineHeight: 48 };
    if (len <= 160) return { fontSize: 30, lineHeight: 42 };
    if (len <= 220) return { fontSize: 26, lineHeight: 37 };
    return { fontSize: 22, lineHeight: 32 };
  }, [affirmation]);

  // --- Entry animation: show button ---
  useEffect(() => {
    buttonOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 400 }),
    );
  }, []);

  // --- Check if already revealed today ---
  useEffect(() => {
    const checkRevealed = async () => {
      try {
        const revealedDate = await AsyncStorage.getItem(REVEALED_DATE_KEY);
        if (revealedDate === dateKey) {
          isRevealedRef.current = true;
          setIsRevealed(true);
          textOpacity.value = 1;
          textScale.value = 1;
          buttonOpacity.value = 0;
          cloudsBgOpacity.value = 0;
          cloudsLeftX.value = -SCREEN_WIDTH;
          cloudsLeftOpacity.value = 0;
          cloudsRightX.value = SCREEN_WIDTH;
          cloudsRightOpacity.value = 0;
          backButtonOpacity.value = 1;
          idleVideoOpacity.value = 0;
          revealedVideoOpacity.value = 1;
          videoZoom.value = 1.08;
          idlePlayer.pause();
          revealedPlayer.play();
        }
      } catch {}
    };
    // TODO: remove this bypass after testing animations — forces initial "Click to Reveal" state every time
    // if (dateKey) checkRevealed();
  }, []);

  // --- Reveal handler ---
  const handleReveal = async () => {
    if (!affirmation) return;
    isRevealedRef.current = true;
    setIsRevealed(true);

    if (dateKey) {
      try {
        await AsyncStorage.setItem(REVEALED_DATE_KEY, dateKey);
      } catch {}
    }

    // 1. Fade out "Click to Reveal"
    buttonOpacity.value = withTiming(0, { duration: 250 });
    buttonScale.value = withTiming(0.9, { duration: 250 });

    // 2. Clouds blow apart like a breeze + video zooms in
    cloudsBgOpacity.value = withTiming(0, {
      duration: 700,
      easing: Easing.out(Easing.ease),
    });
    cloudsLeftX.value = withTiming(-SCREEN_WIDTH, {
      duration: 800,
      easing: Easing.in(Easing.cubic),
    });
    cloudsLeftOpacity.value = withDelay(
      300,
      withTiming(0, { duration: 500 }),
    );
    cloudsRightX.value = withTiming(SCREEN_WIDTH, {
      duration: 800,
      easing: Easing.in(Easing.cubic),
    });
    cloudsRightOpacity.value = withDelay(
      300,
      withTiming(0, { duration: 500 }),
    );
    videoZoom.value = withTiming(1.15, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
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

  const cloudsBgAnimStyle = useAnimatedStyle(() => ({
    opacity: cloudsBgOpacity.value,
  }));

  const cloudsLeftAnimStyle = useAnimatedStyle(() => ({
    opacity: cloudsLeftOpacity.value,
    transform: [{ translateX: cloudsLeftX.value }],
  }));

  const cloudsRightAnimStyle = useAnimatedStyle(() => ({
    opacity: cloudsRightOpacity.value,
    transform: [{ translateX: cloudsRightX.value }],
  }));

  const backButtonAnimStyle = useAnimatedStyle(() => ({
    opacity: backButtonOpacity.value,
  }));

  const videoZoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: videoZoom.value }],
  }));

  const idleVideoAnimStyle = useAnimatedStyle(() => ({
    opacity: idleVideoOpacity.value,
  }));

  const revealedVideoAnimStyle = useAnimatedStyle(() => ({
    opacity: revealedVideoOpacity.value,
  }));

  const containerBg = isDarkMode ? '#3B495D' : colors.accent.pink;
  const backIcon = isDarkMode ? BackIconDark : BackIconLight;

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      {/* ---- Dark mode: gradient background ---- */}
      {isDarkMode && (
        <LinearGradient
          colors={['#333F55', '#3B495D', '#444E6B', '#3B495D']}
          locations={[0, 0.35, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* ---- Video backgrounds ---- */}
      <Animated.View style={[styles.videoWrapper, videoZoomStyle]}>
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

      {/* ---- Dark mode: single heavy purple wash matching homescreen card ---- */}
      {isDarkMode && (
        <View style={styles.videoTintOverlay} pointerEvents="none">
          <View style={styles.videoTint} />
        </View>
      )}

      {/* ---- Stars over everything (dark mode) ---- */}
      {isDarkMode && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {AFFIRM_STARS.map((s, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: `${s.left}%` as any,
                top: `${s.top}%` as any,
                width: s.size,
                height: s.size,
                borderRadius: s.size,
                backgroundColor: '#FFFFFF',
                opacity: s.opacity,
              }}
            />
          ))}
        </View>
      )}

      {/* ---- Clouds overlay (light mode only — blow apart on reveal) ---- */}
      {!isDarkMode && (
        <View style={styles.cloudsContainer} pointerEvents="none">
          <Animated.View style={[styles.cloudsLayer, cloudsBgAnimStyle]}>
            <Image source={CloudsBg} style={styles.cloudsImage} resizeMode="cover" />
          </Animated.View>
          <Animated.View style={[styles.cloudsLayer, cloudsLeftAnimStyle]}>
            <Image source={CloudsLeft} style={styles.cloudsImage} resizeMode="cover" />
          </Animated.View>
          <Animated.View style={[styles.cloudsLayer, cloudsRightAnimStyle]}>
            <Image source={CloudsRight} style={styles.cloudsImage} resizeMode="cover" />
          </Animated.View>
        </View>
      )}

      {/* ---- Back button ---- */}
      <Animated.View
        style={[styles.backButtonContainer, { top: insets.top + 16 }, backButtonAnimStyle]}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <View style={styles.backIconCircle}>
            <Image source={backIcon} style={styles.backIcon} resizeMode="contain" />
          </View>
        </Pressable>
      </Animated.View>

      {/* ---- Affirmation text (shown after reveal) ---- */}
      {isRevealed && (
        <View style={[styles.textArea, { paddingTop: insets.top + 20, height: SCREEN_HEIGHT - SCREEN_WIDTH + 40 }]}>
          <Animated.Text
            style={[styles.affirmationText, { fontSize, lineHeight }, textAnimStyle]}
          >
            {affirmation}
          </Animated.Text>
        </View>
      )}

      {/* ---- "Click to Reveal" button (idle state only) ---- */}
      {!isRevealed && (
        <Animated.View style={[styles.revealButtonContainer, buttonAnimStyle]}>
          <Pressable onPress={handleReveal} style={[styles.revealButton, isDarkMode && styles.revealButtonDark]}>
            <LinearGradient
              colors={isDarkMode
                ? ['rgba(77, 232, 212, 0.15)', 'rgba(77, 232, 212, 0.05)']
                : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.revealButtonGradient}
            />
            <Text style={[styles.revealButtonText, isDarkMode && styles.revealButtonTextDark]}>Click to Reveal</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Video tint overlay (dark mode — heavy purple wash matching homescreen card)
  videoTintOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  videoTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(72, 62, 101, 0.85)',
  },

  // Video backgrounds
  videoWrapper: {
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
    height: SCREEN_WIDTH,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },

  // Clouds overlay (light mode)
  cloudsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    zIndex: 2,
  },
  cloudsLayer: {
    ...StyleSheet.absoluteFillObject,
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
  backIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 32,
    height: 32,
  },

  // Affirmation text area
  textArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 5,
  },
  affirmationText: {
    fontFamily: fonts.outfit.light,
    color: colors.white,
    textAlign: 'center',
  },

  // Reveal button
  revealButtonContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.53,
    alignSelf: 'center',
    zIndex: 10,
  },
  revealButton: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  revealButtonDark: {
    borderColor: 'rgba(77, 232, 212, 0.3)',
    backgroundColor: 'rgba(77, 232, 212, 0.08)',
    shadowColor: '#4DE8D4',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  revealButtonGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  revealButtonText: {
    fontFamily: fonts.edensor.semiBold,
    fontSize: 22,
    color: colors.white,
    textAlign: 'center',
  },
  revealButtonTextDark: {
    color: '#4DE8D4',
  },
});

export default AffirmationMirrorScreen;
