import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useSharedValue } from 'react-native-reanimated';
import { useMountedRef } from './useMountedRef';

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

interface VoiceRecordingOptions {
  onInterimResult?: (text: string) => void;
}

// so-grcy: native module wrappers — every call into
// ExpoSpeechRecognitionModule.* can raise. Most cases (e.g. abort on an
// already-inactive recognizer) are recoverable, but an unhandled throw on
// the JS thread is a hard app-crash. Wrap each call so we get a single
// diagnostic warn + a sane fallback. NEVER call the native module directly
// from inside this hook.
const safeAbort = () => {
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch (err) {
    console.warn('[useVoiceRecording] abort threw:', err);
  }
};

const safeStop = () => {
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch (err) {
    console.warn('[useVoiceRecording] stop threw:', err);
  }
};

const safeStart = () => {
  try {
    ExpoSpeechRecognitionModule.start(recognitionOptions);
    return true;
  } catch (err) {
    console.warn('[useVoiceRecording] start threw:', err);
    return false;
  }
};

const safeGetState = async (): Promise<string | null> => {
  try {
    return await ExpoSpeechRecognitionModule.getStateAsync();
  } catch (err) {
    console.warn('[useVoiceRecording] getStateAsync threw:', err);
    return null;
  }
};

export const useVoiceRecording = (options?: VoiceRecordingOptions) => {
  const onInterimResultRef = useRef(options?.onInterimResult);
  onInterimResultRef.current = options?.onInterimResult;
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Synchronous ref mirrors isRecording — immune to stale closures
  const isRecordingRef = useRef(false);

  // so-grcy: native speech-recognition events fire asynchronously from
  // ObjC/Swift land. They can land AFTER the consuming screen has
  // unmounted (mid-recognition → user navigates away). Without a mount
  // guard, those callbacks call setIsRecording/setIsTranscribing on a
  // dead component (React warning + occasional Reanimated crash via
  // volume.value writes against a stale shared-value host). useMountedRef
  // (so-pw5d) gives the standard primitive — every setState site in this
  // hook now gates on mountedRef.current.
  const mountedRef = useMountedRef();

  // so-grcy: track "start in flight" to defeat the double-tap race —
  // user taps mic, requestPermissionsAsync returns slowly, user taps again
  // (or navigates away). Before this guard, the second tap saw
  // isRecordingRef === false and started a parallel session; the first
  // start() then either no-op'd or crashed depending on native state.
  const startingRef = useRef(false);

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
    // so-grcy: refs above are safe after unmount, but setState + Reanimated
    // shared-value writes are not. Gate them.
    if (!mountedRef.current) return;
    setIsRecording(false);
    setIsTranscribing(false);
    volume.value = -2;
  };

  const restartRecognition = async () => {
    if (restartingRef.current) return;
    restartingRef.current = true;

    transcriptRef.current = '';

    const state = await safeGetState();
    if (state !== null && state !== 'inactive') {
      safeAbort();
      await new Promise((r) => setTimeout(r, 100));
    }

    // so-grcy: bail if anything happened during the await — unmount,
    // user-initiated stop, or another restart already in flight.
    if (!mountedRef.current || !isRecordingRef.current || stoppingRef.current) {
      restartingRef.current = false;
      return;
    }

    const ok = safeStart();
    restartingRef.current = false;
    if (!ok) {
      // start() threw — surface accumulated transcript and bail cleanly.
      settle(buildFullTranscript());
    }
  };

  // Accumulate interim/final results
  useSpeechRecognitionEvent('result', (event) => {
    // so-grcy: native event can fire post-unmount. Stop early so we
    // don't ripple into setIsRecording / Reanimated / consumer callback.
    if (!mountedRef.current) return;
    const transcript = event.results[0]?.transcript ?? '';
    transcriptRef.current = transcript;

    // Fire live callback for interim display
    if (!event.isFinal && onInterimResultRef.current) {
      const liveText = fullTranscriptRef.current
        ? fullTranscriptRef.current + ' ' + transcript
        : transcript;
      onInterimResultRef.current(liveText);
    }

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
    if (!mountedRef.current) return;

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
      // mountedRef already checked at top, but defend against a
      // unmount-between-then-and-now by re-checking before setState.
      if (!mountedRef.current) return;
      setIsRecording(false);
      setIsTranscribing(false);
      volume.value = -2;
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (!mountedRef.current) {
      // Component is gone — still clear refs so a future remount starts
      // fresh, but don't touch React state.
      isRecordingRef.current = false;
      stoppingRef.current = false;
      restartingRef.current = false;
      clearSafetyTimer();
      resolveRef.current = null;
      rejectRef.current = null;
      return;
    }

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
    if (!mountedRef.current) return;
    volume.value = event.value;
  });

  const startRecording = useCallback(async () => {
    // Double-start guard: if already active OR a start is in flight, bail.
    // so-grcy: startingRef catches the double-tap race the original
    // isRecordingRef-only check missed (the ref is only set true AFTER the
    // awaited permission + getStateAsync round-trip).
    if (isRecordingRef.current || startingRef.current) return;
    startingRef.current = true;

    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Speech recognition permission not granted');
      }

      // so-grcy: bail if we unmounted during the permission modal.
      // Starting the recognizer here would leak a session no one will
      // stop.
      if (!mountedRef.current) {
        return;
      }

      // Abort any lingering session
      const state = await safeGetState();
      if (state !== null && state !== 'inactive') {
        safeAbort();
        await new Promise((r) => setTimeout(r, 100));
      }

      if (!mountedRef.current) return;

      transcriptRef.current = '';
      fullTranscriptRef.current = '';
      lastAppendedRef.current = '';
      stoppingRef.current = false;
      restartingRef.current = false;
      volume.value = -2;

      const ok = safeStart();
      if (!ok) {
        throw new Error('Failed to start speech recognition');
      }

      isRecordingRef.current = true;
      setIsRecording(true);
    } finally {
      startingRef.current = false;
    }
  }, [volume, mountedRef]);

  const stopRecording = useCallback((): Promise<string> => {
    // If recognition already ended (e.g. between restart cycles), return accumulated
    if (!isRecordingRef.current) {
      return Promise.resolve(buildFullTranscript());
    }

    stoppingRef.current = true;
    if (mountedRef.current) {
      setIsTranscribing(true);
    }

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

      safeStop();
    });
  }, [mountedRef]);

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
    safeAbort();
    if (!mountedRef.current) return;
    volume.value = -2;
    setIsRecording(false);
    setIsTranscribing(false);
  }, [volume, mountedRef]);

  // Cleanup on unmount — abort any active session
  useEffect(() => {
    return () => {
      // so-grcy: abort native first, THEN clear refs. If abort fires a
      // synchronous 'end' event in some edge case, the event handlers
      // above already gate on mountedRef (which useMountedRef flips
      // before this effect-cleanup runs? No — mountedRef cleanup runs in
      // the SAME unmount pass; effects clean in reverse-of-mount order,
      // so useMountedRef's cleanup runs after this hook's effects. Hence
      // we re-clear isRecordingRef explicitly here as a belt + braces.)
      if (isRecordingRef.current) {
        safeAbort();
        isRecordingRef.current = false;
      }
      stoppingRef.current = false;
      restartingRef.current = false;
      startingRef.current = false;
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
