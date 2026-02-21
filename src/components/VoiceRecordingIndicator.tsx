import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme';

const MicIcon = require('../../assets/images/journal/MicIcon.png');

interface VoiceRecordingIndicatorProps {
  isRecording: boolean;
  isTranscribing: boolean;
  onPress: () => void;
}

const VoiceRecordingIndicator: React.FC<VoiceRecordingIndicatorProps> = ({
  isRecording,
  isTranscribing,
  onPress,
}) => {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withTiming(1.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
      pulseOpacity.value = withRepeat(
        withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {isRecording && (
        <Animated.View style={[styles.pulse, pulseStyle]} />
      )}
      <Pressable
        style={[
          styles.micButton,
          isRecording && styles.micButtonRecording,
        ]}
        onPress={onPress}
        disabled={isTranscribing}
      >
        {isTranscribing ? (
          <ActivityIndicator color="#59168B" size="small" />
        ) : (
          <>
            {isRecording && <View style={styles.redDot} />}
            <Image
              source={MicIcon}
              style={[styles.micIcon, isRecording && styles.micIconRecording]}
              resizeMode="contain"
            />
          </>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF3B30',
  },
  micButton: {
    width: 56,
    height: 56,
    backgroundColor: colors.white,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonRecording: {
    backgroundColor: '#FFE5E5',
  },
  redDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
  },
  micIcon: {
    width: 28,
    height: 28,
    tintColor: '#59168B',
  },
  micIconRecording: {
    tintColor: '#FF3B30',
  },
});

export default VoiceRecordingIndicator;
