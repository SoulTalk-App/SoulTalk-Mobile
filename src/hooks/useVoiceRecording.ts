import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useSharedValue } from 'react-native-reanimated';

const STOP_SAFETY_TIMEOUT_MS = 3000;

const recognitionOptions = {
  lang: 'en-US',
  interimResults: true,
  requiresOnDeviceRecognition: true,
  addsPunctuation: true,
  continuous: true,
  iosTaskHint: 'dictation' as const,
  volumeChangeEventOptions: {
    enabled: true,
    intervalMillis: 100,
  },
};

export const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Synchronous ref mirrors isRecording — immune to stale closures
  const isRecordingRef = useRef(false);

  const resolveRef = useRef<((text: string) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);
  const transcriptRef = useRef('');
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-restart refs
  const fullTranscriptRef = useRef('');
  const stoppingRef = useRef(false);
  const lastAppendedRef = useRef('');
  const restartingRef = useRef(false);

  // Reanimated shared value for volume (-2 to 10)
  const volume = useSharedValue(-2);

  const clearSafetyTimer = () => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  };

  const appendChunk = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === lastAppendedRef.current) return;
    lastAppendedRef.current = trimmed;
    if (fullTranscriptRef.current) {
      fullTranscriptRef.current += ' ' + trimmed;
    } else {
      fullTranscriptRef.current = trimmed;
    }
  };

  const buildFullTranscript = (): string => {
    const currentPartial = transcriptRef.current.trim();
    if (!currentPartial) return fullTranscriptRef.current;
    if (currentPartial === lastAppendedRef.current) return fullTranscriptRef.current;
    if (fullTranscriptRef.current) {
      return fullTranscriptRef.current + ' ' + currentPartial;
    }
    return currentPartial;
  };

  const settle = (transcript: string) => {
    clearSafetyTimer();
    if (resolveRef.current) {
      resolveRef.current(transcript);
    }
    resolveRef.current = null;
    rejectRef.current = null;
    isRecordingRef.current = false;
    stoppingRef.current = false;
    restartingRef.current = false;
    setIsRecording(false);
    setIsTranscribing(false);
    volume.value = -2;
  };

  const restartRecognition = async () => {
    if (restartingRef.current) return;
    restartingRef.current = true;

    transcriptRef.current = '';

    try {
      const state = await ExpoSpeechRecognitionModule.getStateAsync();
      if (state !== 'inactive') {
        ExpoSpeechRecognitionModule.abort();
        await new Promise((r) => setTimeout(r, 100));
      }

      if (!isRecordingRef.current || stoppingRef.current) {
        restartingRef.current = false;
        return;
      }

      ExpoSpeechRecognitionModule.start(recognitionOptions);
      restartingRef.current = false;
    } catch (err) {
      console.warn('Auto-restart failed:', err);
      restartingRef.current = false;
      settle(buildFullTranscript());
    }
  };

  // Accumulate interim/final results
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? '';
    transcriptRef.current = transcript;

    if (event.isFinal) {
      if (stoppingRef.current) {
        // User explicitly stopped — settle with everything
        settle(buildFullTranscript());
      } else if (isRecordingRef.current) {
        // iOS auto-finalized — accumulate chunk, let 'end' handler restart
        appendChunk(transcript);
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.warn('Speech recognition error:', event.error, event.message);

    if (stoppingRef.current) {
      // User is stopping — settle with whatever we have
      settle(buildFullTranscript());
      return;
    }

    const recoverable = event.error === 'no-speech';
    if (recoverable && isRecordingRef.current) {
      // Let the 'end' handler restart
      return;
    }

    // Unrecoverable error
    const accumulated = buildFullTranscript();
    if (accumulated) {
      settle(accumulated);
    } else {
      clearSafetyTimer();
      if (rejectRef.current) {
        rejectRef.current(new Error(event.message || event.error));
      }
      resolveRef.current = null;
      rejectRef.current = null;
      isRecordingRef.current = false;
      stoppingRef.current = false;
      restartingRef.current = false;
      setIsRecording(false);
      setIsTranscribing(false);
      volume.value = -2;
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (stoppingRef.current) {
      settle(buildFullTranscript());
      return;
    }

    if (isRecordingRef.current) {
      // iOS auto-stopped — accumulate any remaining partial and restart
      appendChunk(transcriptRef.current);
      restartRecognition();
      return;
    }

    // Fallback: not recording and not stopping — clean settle
    settle(buildFullTranscript());
  });

  // Volume tracking for wave visualization
  useSpeechRecognitionEvent('volumechange', (event) => {
    volume.value = event.value;
  });

  const startRecording = useCallback(async () => {
    // Double-start guard: if already active, bail
    if (isRecordingRef.current) return;

    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      throw new Error('Speech recognition permission not granted');
    }

    // Abort any lingering session
    const state = await ExpoSpeechRecognitionModule.getStateAsync();
    if (state !== 'inactive') {
      ExpoSpeechRecognitionModule.abort();
      // Small delay to let abort complete
      await new Promise((r) => setTimeout(r, 100));
    }

    transcriptRef.current = '';
    fullTranscriptRef.current = '';
    lastAppendedRef.current = '';
    stoppingRef.current = false;
    restartingRef.current = false;
    volume.value = -2;

    ExpoSpeechRecognitionModule.start(recognitionOptions);

    isRecordingRef.current = true;
    setIsRecording(true);
  }, [volume]);

  const stopRecording = useCallback((): Promise<string> => {
    // If recognition already ended (e.g. between restart cycles), return accumulated
    if (!isRecordingRef.current) {
      return Promise.resolve(buildFullTranscript());
    }

    stoppingRef.current = true;
    setIsTranscribing(true);

    return new Promise<string>((resolve) => {
      resolveRef.current = resolve;
      rejectRef.current = null; // We never reject from stop — always resolve

      // Safety timeout: if no result/end event fires, resolve with what we have
      clearSafetyTimer();
      safetyTimerRef.current = setTimeout(() => {
        if (resolveRef.current) {
          settle(buildFullTranscript());
        }
      }, STOP_SAFETY_TIMEOUT_MS);

      ExpoSpeechRecognitionModule.stop();
    });
  }, []);

  const cancelRecording = useCallback(() => {
    clearSafetyTimer();
    resolveRef.current = null;
    rejectRef.current = null;
    transcriptRef.current = '';
    fullTranscriptRef.current = '';
    lastAppendedRef.current = '';
    stoppingRef.current = false;
    restartingRef.current = false;
    isRecordingRef.current = false;
    volume.value = -2;
    ExpoSpeechRecognitionModule.abort();
    setIsRecording(false);
    setIsTranscribing(false);
  }, [volume]);

  // Cleanup on unmount — abort any active session
  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        ExpoSpeechRecognitionModule.abort();
        isRecordingRef.current = false;
      }
      clearSafetyTimer();
      resolveRef.current = null;
      rejectRef.current = null;
    };
  }, []);

  return {
    isRecording,
    isTranscribing,
    volume,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};
