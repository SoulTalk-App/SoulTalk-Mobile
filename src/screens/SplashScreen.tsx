import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { colors } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const IntroVideo = require('../../assets/videos/intro.mp4');
const IntroVideoDark = require('../../assets/videos/dark/intro.mp4');

interface SplashScreenProps {
  navigation: any;
}

const SplashScreenInner: React.FC<SplashScreenProps & { isDarkMode: boolean }> = ({ navigation, isDarkMode }) => {
  const hasNavigated = useRef(false);

  const player = useVideoPlayer(isDarkMode ? IntroVideoDark : IntroVideo, (p) => {
    p.loop = false;
    p.muted = false;
    p.play();
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });

  // Listen for playback end
  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        navigation.replace('Onboarding');
      }
    });
    return () => subscription.remove();
  }, [player, navigation]);

  // Fallback timer in case video fails to load or play
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        navigation.replace('Onboarding');
      }
    }, 10000);
    return () => clearTimeout(fallbackTimer);
  }, [navigation]);

  // If video errors out or fails to load, navigate immediately
  useEffect(() => {
    if (status === 'error') {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        navigation.replace('Onboarding');
      }
    }
  }, [status, navigation]);

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

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const { isDarkMode, themeLoaded } = useTheme();

  if (!themeLoaded) {
    return <View style={styles.container} />;
  }

  return <SplashScreenInner navigation={navigation} isDarkMode={isDarkMode} />;
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

export default SplashScreen;
