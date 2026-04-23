import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors } from '../theme';
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
  const { isDarkMode } = useTheme();
  const readyRef = useRef(readyToDismiss);
  const dismissedRef = useRef(false);

  useEffect(() => {
    readyRef.current = readyToDismiss;
  }, [readyToDismiss]);

  const player = useVideoPlayer(isDarkMode ? IntroVideoDark : IntroVideo, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      if (readyRef.current && !dismissedRef.current) {
        dismissedRef.current = true;
        onDismiss?.();
      }
    });
    return () => subscription.remove();
  }, [player, onDismiss]);

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: '#0A0818' }]}>
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
    backgroundColor: colors.primary,
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
