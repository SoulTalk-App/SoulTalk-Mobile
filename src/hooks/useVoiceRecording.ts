import { useState, useCallback, useEffect } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
} from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JournalService from '../services/JournalService';

export type VoiceProvider = 'on-device' | 'whisper';

const PROVIDER_STORAGE_KEY = '@soultalk_voice_provider';

export const useVoiceRecording = () => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [provider, setProviderState] = useState<VoiceProvider>('whisper');

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Load saved provider preference
  useEffect(() => {
    AsyncStorage.getItem(PROVIDER_STORAGE_KEY).then((saved) => {
      if (saved === 'on-device' || saved === 'whisper') {
        setProviderState(saved);
      }
    });
  }, []);

  const setProvider = useCallback(async (p: VoiceProvider) => {
    setProviderState(p);
    await AsyncStorage.setItem(PROVIDER_STORAGE_KEY, p);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        throw new Error('Microphone permission not granted');
      }

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, [audioRecorder]);

  const stopRecording = useCallback(async (): Promise<string> => {
    if (!audioRecorder.isRecording) {
      throw new Error('No active recording');
    }

    setIsTranscribing(true);

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) throw new Error('No recording URI');

      // Both providers currently route through Whisper API
      // On-device path will be added when @react-native-voice/voice is integrated
      const result = await JournalService.transcribeAudio(uri);
      return result.text;
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    } finally {
      setIsTranscribing(false);
    }
  }, [audioRecorder]);

  const cancelRecording = useCallback(async () => {
    if (audioRecorder.isRecording) {
      try {
        await audioRecorder.stop();
      } catch {
        // ignore cleanup errors
      }
    }
  }, [audioRecorder]);

  return {
    isRecording: audioRecorder.isRecording,
    isTranscribing,
    provider,
    setProvider,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};
