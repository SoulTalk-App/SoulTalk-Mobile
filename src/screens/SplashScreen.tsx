import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { colors } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const IntroVideo = require('../../assets/videos/intro.mp4');

interface SplashScreenProps {
  navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const hasNavigated = useRef(false);

  const player = useVideoPlayer(IntroVideo, (p) => {
    p.loop = false;
    p.muted = false;
    p.play();
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    if (status === 'idle' && hasNavigated.current === false) {
      // Player finished or hasn't started — check if it already played
    }
  }, [status]);

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

  // Fallback timer in case video fails
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        navigation.replace('Onboarding');
      }
    }, 5000);
    return () => clearTimeout(fallbackTimer);
  }, [navigation]);

  return (
    <View style={styles.container}>
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

export default SplashScreen;
