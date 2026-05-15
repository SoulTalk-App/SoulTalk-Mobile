import React, { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../../theme';

type RevealedPlayerHandle = { play: () => void };
const RevealedVideoPlayer = forwardRef<RevealedPlayerHandle, {
  source: any;
  style: any;
}>(({ source, style }, ref) => {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
  });
  useImperativeHandle(ref, () => ({ play: () => player.play() }));
  return (
    <VideoView
      player={player}
      style={style}
      contentFit="contain"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
});

const AFFIRM_STARS = Array.from({ length: 40 }, (_, i) => ({
  left: ((i * 39 + 23) % 100),
  top: ((i * 57 + 13) % 100),
  size: i < 3 ? 2.5 : (i % 3 === 0) ? 2 : 1,
  opacity: i < 3 ? 0.5 : (0.1 + (i % 5) * 0.09),
}));

const REVEALED_DATE_KEY = '@soultalk_affirmation_revealed_date';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CloudsBg = require('../../../assets/images/home/CloudsBg.png');
const CloudsLeft = require('../../../assets/images/home/CloudsLeft.png');
const CloudsRight = require('../../../assets/images/home/CloudsRight.png');
const IdleVideo = require('../../../assets/videos/affirmationIdle.mp4');
const RevealedVideo = require('../../../assets/videos/affirmationMirrorLookingUp.mp4');
const IdleVideoDark = require('../../../assets/videos/dark/affirmationIdle.mp4');
const RevealedVideoDark = require('../../../assets/videos/dark/affirmationMirrorLookingUp.mp4');

type Props = {
  isDarkMode: boolean;
  affirmation_text: string;
  date_key: string;
  // so-dzfx: set when the affirmation was just generated. The user already
  // tapped "Generate", so the reveal plays automatically — no redundant
  // second "Click to Reveal" tap.
  autoReveal?: boolean;
  onClose: () => void;
};

export function AffirmationReveal({
  isDarkMode,
  affirmation_text,
  date_key,
  autoReveal = false,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [isRevealed, setIsRevealed] = useState(false);
  const [isRevealedMounted, setIsRevealedMounted] = useState(false);
  const revealedPlayerRef = useRef<RevealedPlayerHandle>(null);
  const playRevealedOnMountRef = useRef(false);

  const idleSource = isDarkMode ? IdleVideoDark : IdleVideo;
  const revealedSource = isDarkMode ? RevealedVideoDark : RevealedVideo;

  const idlePlayer = useVideoPlayer(idleSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    p.play();
    p.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        setIsRevealedMounted(true);
      }
    });
  });

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

  const { fontSize, lineHeight } = useMemo(() => {
    const len = affirmation_text?.length ?? 0;
    if (len <= 60) return { fontSize: 42, lineHeight: 56 };
    if (len <= 100) return { fontSize: 36, lineHeight: 48 };
    if (len <= 160) return { fontSize: 30, lineHeight: 42 };
    if (len <= 220) return { fontSize: 26, lineHeight: 37 };
    return { fontSize: 22, lineHeight: 32 };
  }, [affirmation_text]);

  useEffect(() => {
    buttonOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
  }, []);

  useEffect(() => {
    const checkRevealed = async () => {
      try {
        const revealedDate = await AsyncStorage.getItem(REVEALED_DATE_KEY);
        if (revealedDate === date_key) {
          isRevealedRef.current = true;
          setIsRevealed(true);
          setIsRevealedMounted(true);
          playRevealedOnMountRef.current = true;
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
        }
      } catch {}
    };
    if (date_key) checkRevealed();
  }, []);

  useEffect(() => {
    if (isRevealedMounted && playRevealedOnMountRef.current) {
      revealedPlayerRef.current?.play();
    }
  }, [isRevealedMounted]);

  const handleReveal = async () => {
    if (!affirmation_text) return;
    isRevealedRef.current = true;
    setIsRevealed(true);

    if (date_key) {
      try {
        await AsyncStorage.setItem(REVEALED_DATE_KEY, date_key);
      } catch {}
    }

    buttonOpacity.value = withTiming(0, { duration: 250 });
    buttonScale.value = withTiming(0.9, { duration: 250 });

    cloudsBgOpacity.value = withTiming(0, {
      duration: 700,
      easing: Easing.out(Easing.ease),
    });
    cloudsLeftX.value = withTiming(-SCREEN_WIDTH, {
      duration: 800,
      easing: Easing.in(Easing.cubic),
    });
    cloudsLeftOpacity.value = withDelay(300, withTiming(0, { duration: 500 }));
    cloudsRightX.value = withTiming(SCREEN_WIDTH, {
      duration: 800,
      easing: Easing.in(Easing.cubic),
    });
    cloudsRightOpacity.value = withDelay(300, withTiming(0, { duration: 500 }));
    videoZoom.value = withTiming(1.15, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });

    idleVideoOpacity.value = withDelay(
      200,
      withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }),
    );
    revealedVideoOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
    );

    setIsRevealedMounted(true);
    playRevealedOnMountRef.current = true;
    revealedPlayerRef.current?.play();

    textOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
    );
    textScale.value = withDelay(
      500,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
    );

    backButtonOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));

    setTimeout(() => {
      idlePlayer.pause();
    }, 1200);
  };

  // so-dzfx: a freshly generated affirmation arrives with autoReveal — the
  // user already tapped "Generate", so play the reveal immediately rather
  // than making them tap "Click to Reveal" a second time. The
  // already-revealed-today path (checkRevealed above) handles replays.
  useEffect(() => {
    if (autoReveal && !isRevealedRef.current) {
      handleReveal();
    }
  }, []);

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: textScale.value }],
  }));
  const buttonAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));
  const cloudsBgAnimStyle = useAnimatedStyle(() => ({ opacity: cloudsBgOpacity.value }));
  const cloudsLeftAnimStyle = useAnimatedStyle(() => ({
    opacity: cloudsLeftOpacity.value,
    transform: [{ translateX: cloudsLeftX.value }],
  }));
  const cloudsRightAnimStyle = useAnimatedStyle(() => ({
    opacity: cloudsRightOpacity.value,
    transform: [{ translateX: cloudsRightX.value }],
  }));
  const backButtonAnimStyle = useAnimatedStyle(() => ({ opacity: backButtonOpacity.value }));
  const videoZoomStyle = useAnimatedStyle(() => ({ transform: [{ scale: videoZoom.value }] }));
  const idleVideoAnimStyle = useAnimatedStyle(() => ({ opacity: idleVideoOpacity.value }));
  const revealedVideoAnimStyle = useAnimatedStyle(() => ({ opacity: revealedVideoOpacity.value }));

  const containerBg = isDarkMode ? '#33335B' : colors.accent.pink;

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      {isDarkMode && (
        <LinearGradient
          colors={['#2B2B54', '#33335B', '#33335B']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}

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

        {isRevealedMounted && (
          <Animated.View style={[styles.videoContainer, revealedVideoAnimStyle]}>
            <RevealedVideoPlayer
              ref={revealedPlayerRef}
              source={revealedSource}
              style={styles.video}
            />
          </Animated.View>
        )}

        {isDarkMode && (
          <LinearGradient
            colors={['#33335B', 'rgba(51,51,91,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.seamFade}
            pointerEvents="none"
          />
        )}
      </Animated.View>

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

      <View
        style={[styles.cloudsContainer, isDarkMode && styles.cloudsContainerDark]}
        pointerEvents="none"
      >
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

      <Animated.View
        style={[styles.backButtonContainer, { top: insets.top + 16 }, backButtonAnimStyle]}
      >
        <Pressable onPress={onClose} hitSlop={12}>
          <View style={styles.backIconCircle}>
            <Feather name="chevron-left" size={26} color="#3A0E66" />
          </View>
        </Pressable>
      </Animated.View>

      {isRevealed && (
        <View
          style={[
            styles.textArea,
            { paddingTop: insets.top + 20, height: SCREEN_HEIGHT - SCREEN_WIDTH + 40 },
          ]}
        >
          <Animated.Text style={[styles.affirmationText, { fontSize, lineHeight }, textAnimStyle]}>
            {affirmation_text}
          </Animated.Text>
        </View>
      )}

      {!isRevealed && !autoReveal && (
        <Animated.View style={[styles.revealButtonContainer, buttonAnimStyle]}>
          <Pressable
            onPress={handleReveal}
            style={[styles.revealButton, isDarkMode && styles.revealButtonDark]}
          >
            <LinearGradient
              colors={
                isDarkMode
                  ? ['rgba(77, 232, 212, 0.15)', 'rgba(77, 232, 212, 0.05)']
                  : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']
              }
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.revealButtonGradient}
            />
            <Text style={[styles.revealButtonText, isDarkMode && styles.revealButtonTextDark]}>
              Click to Reveal
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  videoWrapper: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
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
  seamFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SCREEN_WIDTH - 56,
    height: 56,
  },
  cloudsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    zIndex: 2,
  },
  cloudsContainerDark: {
    opacity: 0.35,
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
    shadowColor: colors.primary,
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
    color: colors.primary,
  },
});
