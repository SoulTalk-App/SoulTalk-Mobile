import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  SharedValue,
} from 'react-native-reanimated';

const MicIcon = require('../../assets/images/journal/MicIcon.png');

const BAR_WIDTH = 3;
const BAR_GAP = 3;
const BAR_MIN_HEIGHT = 4;
const BAR_MAX_HEIGHT = 28;
const BAR_COLOR = '#FF3B30';

// Stagger offsets so bars don't all move in unison
const BAR_OFFSETS = [-1.5, 1.0, -0.5, 1.5, -1.0];

interface VoiceRecordingIndicatorProps {
  isRecording: boolean;
  isTranscribing: boolean;
  volume: SharedValue<number>;
  onPress: () => void;
}

const WaveBar: React.FC<{ volume: SharedValue<number>; offset: number }> = ({
  volume,
  offset,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    // volume range: -2 to 10. Normalize to 0–1.
    const normalized = Math.max(0, Math.min(1, (volume.value + offset + 2) / 12));
    const height = BAR_MIN_HEIGHT + normalized * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT);

    return {
      height: withSpring(height, {
        damping: 12,
        stiffness: 180,
        mass: 0.4,
      }),
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: BAR_WIDTH,
          borderRadius: BAR_WIDTH / 2,
          backgroundColor: BAR_COLOR,
        },
        animatedStyle,
      ]}
    />
  );
};

const VoiceRecordingIndicator: React.FC<VoiceRecordingIndicatorProps> = ({
  isRecording,
  isTranscribing,
  volume,
  onPress,
}) => {
  return (
    <View style={styles.container}>
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
        ) : isRecording ? (
          <>
            <View style={styles.redDot} />
            <View style={styles.waveBars}>
              {BAR_OFFSETS.map((offset, i) => (
                <WaveBar key={i} volume={volume} offset={offset} />
              ))}
            </View>
          </>
        ) : (
          <Image
            source={MicIcon}
            style={styles.micIcon}
            resizeMode="contain"
          />
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
  micButton: {
    width: 56,
    height: 56,
    backgroundColor: '#FFFFFF',
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
  waveBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BAR_GAP,
  },
  micIcon: {
    width: 28,
    height: 28,
    tintColor: '#59168B',
  },
});

export default VoiceRecordingIndicator;
