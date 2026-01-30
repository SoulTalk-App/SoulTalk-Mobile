import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Dimensions, Text } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { colors } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Video with purple background baked in
const IntroVideo = require('../../assets/videos/intro.mp4');

interface SplashScreenProps {
  navigation: any;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  const videoRef = useRef<Video>(null);
  const [error, setError] = useState<string | null>(null);
  const hasNavigated = useRef(false);

  // Fallback timer in case video fails to load
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        navigation.replace('Onboarding');
      }
    }, 5000); // 5 second fallback

    return () => clearTimeout(fallbackTimer);
  }, [navigation]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish && !hasNavigated.current) {
      hasNavigated.current = true;
      navigation.replace('Onboarding');
    }
  };

  const handleError = (errorMessage: string) => {
    console.error('Video error:', errorMessage);
    setError(errorMessage);
    // Navigate anyway after error
    if (!hasNavigated.current) {
      hasNavigated.current = true;
      setTimeout(() => navigation.replace('Onboarding'), 1000);
    }
  };

  const handleLoad = () => {
    console.log('Video loaded successfully');
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={IntroVideo}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={true}
        isLooping={false}
        isMuted={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={(e) => handleError(e)}
        onLoad={handleLoad}
        useNativeControls={false}
      />
      {__DEV__ && error && (
        <Text style={styles.errorText}>Error: {error}</Text>
      )}
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
  errorText: {
    color: 'white',
    fontSize: 12,
    position: 'absolute',
    bottom: 50,
  },
});

export default SplashScreen;
