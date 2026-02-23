import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const IntroVideo = require('../../assets/videos/intro.mp4');

const LoadingScreen = () => {
  const player = useVideoPlayer(IntroVideo, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

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

export default LoadingScreen;
