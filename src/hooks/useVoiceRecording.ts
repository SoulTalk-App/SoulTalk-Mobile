import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // We use a promise-based approach: startRecording begins recognition,
  // stopRecording stops it and waits for the final transcript via a stored resolver.
  const resolveRef = useRef<((text: string) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);
  const transcriptRef = useRef('');

  // Accumulate interim/final results
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    transcriptRef.current = transcript;

    if (event.isFinal && resolveRef.current) {
      resolveRef.current(transcript);
      resolveRef.current = null;
      rejectRef.current = null;
      setIsTranscribing(false);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.warn('Speech recognition error:', event.error, event.message);
    if (rejectRef.current) {
      rejectRef.current(new Error(event.message || event.error));
      resolveRef.current = null;
      rejectRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(false);
  });

  useSpeechRecognitionEvent('end', () => {
    // If recognition ended without a final result (e.g. no-speech timeout),
    // resolve with whatever we have so far.
    if (resolveRef.current) {
      resolveRef.current(transcriptRef.current || '');
      resolveRef.current = null;
      rejectRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(false);
  });

  const startRecording = useCallback(async () => {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      throw new Error('Speech recognition permission not granted');
    }

    transcriptRef.current = '';

    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      requiresOnDeviceRecognition: true,
      addsPunctuation: true,
      continuous: true,
    });

    setIsRecording(true);
  }, []);

  const stopRecording = useCallback((): Promise<string> => {
    if (!isRecording) {
      return Promise.reject(new Error('No active recording'));
    }

    setIsTranscribing(true);

    return new Promise<string>((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;

      ExpoSpeechRecognitionModule.stop();
      setIsRecording(false);
    });
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    resolveRef.current = null;
    rejectRef.current = null;
    transcriptRef.current = '';
    ExpoSpeechRecognitionModule.abort();
    setIsRecording(false);
    setIsTranscribing(false);
  }, []);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};
