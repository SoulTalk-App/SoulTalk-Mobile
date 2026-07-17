import React, { useEffect, useRef } from 'react';
import { AppState, StyleSheet, View, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { useThemeColors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const IntroVideo = require('../../assets/videos/intro.mp4');
const IntroVideoDark = require('../../assets/videos/dark/intro.mp4');

interface LoadingScreenProps {
  /** When true, the screen will dismiss after the current video loop finishes. */
  readyToDismiss?: boolean;
  /** Called when the video loop completes and readyToDismiss is true. */
  onDismiss?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ readyToDismiss = false, onDismiss }) => {
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const readyRef = useRef(readyToDismiss);
  const dismissedRef = useRef(false);

  useEffect(() => {
    readyRef.current = readyToDismiss;
  }, [readyToDismiss]);

  const player = useVideoPlayer(isDarkMode ? IntroVideoDark : IntroVideo, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
    p.play();
  });

  // so-2zsi: expo-video pauses playback when the app backgrounds and does
  // not auto-resume on return, leaving a frozen/blurred frame. Resume on the
  // 'active' transition so the looping intro keeps animating.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !dismissedRef.current) {
        player.play();
      }
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      if (readyRef.current && !dismissedRef.current) {
        dismissedRef.current = true;
        onDismiss?.();
      }
    });
    return () => subscription.remove();
  }, [player, onDismiss]);

  // so-d4xk: LoadingScreen is now the SOLE intro play (SplashScreen no longer
  // runs first for logged-out stacks). Port the safeguards from SplashScreen so
  // a broken/slow video still advances past the loading gate once data is ready.
  // Both guards honour the readyToDismiss contract: navigation never fires
  // before auth + onboarding flags are resolved.
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  // Error path: video failed — dismiss immediately once data is ready.
  // so-d4xk m1: include readyToDismiss in deps so this effect re-fires when
  // data resolves after a video error — without it, a broken video that errored
  // before dataReady left the user waiting up to 10s for the fallback timer.
  useEffect(() => {
    if (status !== 'error' || !readyToDismiss || dismissedRef.current) return;
    dismissedRef.current = true;
    onDismiss?.();
  }, [status, readyToDismiss, onDismiss]);

  // 10s fallback: if playToEnd never fires (hung video) and data is ready,
  // force-dismiss so the user isn't stranded on the loading screen.
  useEffect(() => {
    if (!readyToDismiss) return;
    const fallbackTimer = setTimeout(() => {
      if (!dismissedRef.current) {
        dismissedRef.current = true;
        onDismiss?.();
      }
    }, 10000);
    return () => clearTimeout(fallbackTimer);
  }, [readyToDismiss, onDismiss]);

  // so-5zrq: bg aligned to CosmicScreen "night" top gradient so any residual
  // seam under the crossfade is invisible.
  // Dark '#02011A' = CosmicBackdrop TONES.night gradient[0]
  // Light '#F2EBFA' = CosmicBackdrop LIGHT_TONES.night gradient[0]
  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#02011A' : '#F2EBFA' }]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
  },
});

export default LoadingScreen;
