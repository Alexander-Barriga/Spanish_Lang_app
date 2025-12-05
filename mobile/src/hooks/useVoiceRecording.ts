import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio, RecordingOptions } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { VAD_CONFIG } from '../config/constants';

// High-quality lossless recording options for better playback quality
const LOSSLESS_RECORDING_OPTIONS: RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 705600, // 44100 * 16 bits * 1 channel
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.MAX,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 705600,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/wav',
    bitsPerSecond: 705600,
  },
};

interface UseVoiceRecordingOptions {
  onSilenceDetected?: () => void;
  onRecordingComplete?: (uri: string, duration: number) => void;
  onError?: (error: Error) => void;
  silenceThreshold?: number;
  maxDuration?: number;
}

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
}

export function useVoiceRecording(options: UseVoiceRecordingOptions = {}): UseVoiceRecordingReturn {
  const {
    onSilenceDetected,
    onRecordingComplete,
    onError,
    silenceThreshold = VAD_CONFIG.silenceThreshold,
    maxDuration = VAD_CONFIG.maxRecordingLength,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      clearTimers();
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and start recording with lossless WAV format
      const { recording } = await Audio.Recording.createAsync(
        LOSSLESS_RECORDING_OPTIONS,
        (status) => {
          if (status.isRecording && status.metering !== undefined) {
            // Voice Activity Detection based on audio level
            const level = status.metering;
            
            // If audio level is very low (silence), start silence timer
            if (level < -40) {
              if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                  if (isRecording && onSilenceDetected) {
                    onSilenceDetected();
                  }
                }, silenceThreshold);
              }
            } else {
              // Reset silence timer if audio detected
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
            }
          }
        },
        100 // Status update interval in ms
      );

      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      // Start duration tracking
      durationIntervalRef.current = setInterval(() => {
        setDuration(Date.now() - startTimeRef.current);
      }, 100);

      // Auto-stop at max duration
      setTimeout(async () => {
        if (recordingRef.current) {
          await stopRecording();
        }
      }, maxDuration);

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error starting recording:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to start recording'));
    }
  }, [isRecording, onSilenceDetected, silenceThreshold, maxDuration, onError]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!recordingRef.current) {
        return null;
      }

      clearTimers();

      const recording = recordingRef.current;
      recordingRef.current = null;

      await recording.stopAndUnloadAsync();
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      const uri = recording.getURI();
      const finalDuration = Date.now() - startTimeRef.current;

      setIsRecording(false);
      setIsPaused(false);

      if (uri && finalDuration >= VAD_CONFIG.minRecordingLength) {
        onRecordingComplete?.(uri, finalDuration);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return uri;
      }

      return null;
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      setIsPaused(false);
      onError?.(error instanceof Error ? error : new Error('Failed to stop recording'));
      return null;
    }
  }, [onRecordingComplete, onError]);

  const pauseRecording = useCallback(async () => {
    try {
      if (recordingRef.current && isRecording && !isPaused) {
        await recordingRef.current.pauseAsync();
        setIsPaused(true);
        clearTimers();
      }
    } catch (error) {
      console.error('Error pausing recording:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to pause recording'));
    }
  }, [isRecording, isPaused, onError]);

  const resumeRecording = useCallback(async () => {
    try {
      if (recordingRef.current && isRecording && isPaused) {
        await recordingRef.current.startAsync();
        setIsPaused(false);
        
        // Resume duration tracking
        const pausedDuration = duration;
        startTimeRef.current = Date.now() - pausedDuration;
        durationIntervalRef.current = setInterval(() => {
          setDuration(Date.now() - startTimeRef.current);
        }, 100);
      }
    } catch (error) {
      console.error('Error resuming recording:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to resume recording'));
    }
  }, [isRecording, isPaused, duration, onError]);

  const cancelRecording = useCallback(async () => {
    try {
      clearTimers();

      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
    } catch (error) {
      console.error('Error canceling recording:', error);
      setIsRecording(false);
      setIsPaused(false);
    }
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  };
}

