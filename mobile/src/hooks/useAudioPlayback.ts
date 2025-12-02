import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface UseAudioPlaybackOptions {
  onPlaybackComplete?: () => void;
  onError?: (error: Error) => void;
}

interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  position: number;
  playAudio: (uri: string) => Promise<void>;
  playFromBuffer: (buffer: ArrayBuffer) => Promise<void>;
  pauseAudio: () => Promise<void>;
  resumeAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
}

export function useAudioPlayback(options: UseAudioPlaybackOptions = {}): UseAudioPlaybackReturn {
  const { onPlaybackComplete, onError } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(async () => {
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
      positionIntervalRef.current = null;
    }

    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (e) {
        // Ignore cleanup errors
      }
      soundRef.current = null;
    }

    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      return;
    }

    setIsPlaying(status.isPlaying);
    setDuration(status.durationMillis || 0);
    setPosition(status.positionMillis || 0);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
      onPlaybackComplete?.();
    }
  }, [onPlaybackComplete]);

  const playAudio = useCallback(async (uri: string) => {
    try {
      await cleanup();
      setIsLoading(true);

      // Configure audio mode for playback
      // NOTE: We allow background playback but explicitly stop it via navigation listeners
      // in the conversation screen to prevent multiple tutors speaking simultaneously
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true, // Allow playback, but stop it explicitly on navigation
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1, // Duck others
        interruptionModeAndroid: 1, // Duck others
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setIsLoading(false);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoading(false);
      onError?.(error instanceof Error ? error : new Error('Failed to play audio'));
    }
  }, [cleanup, onPlaybackStatusUpdate, onError]);

  const playFromBuffer = useCallback(async (buffer: ArrayBuffer) => {
    try {
      await cleanup();
      setIsLoading(true);

      // Convert ArrayBuffer to base64 data URI
      const base64 = Buffer.from(buffer).toString('base64');
      const uri = `data:audio/mpeg;base64,${base64}`;

      // Configure audio mode for playback
      // NOTE: We allow background playback but explicitly stop it via navigation listeners
      // in the conversation screen to prevent multiple tutors speaking simultaneously
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true, // Allow playback, but stop it explicitly on navigation
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1, // Duck others
        interruptionModeAndroid: 1, // Duck others
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setIsLoading(false);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio from buffer:', error);
      setIsLoading(false);
      onError?.(error instanceof Error ? error : new Error('Failed to play audio'));
    }
  }, [cleanup, onPlaybackStatusUpdate, onError]);

  const pauseAudio = useCallback(async () => {
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('not loaded')) {
      console.error('Error pausing audio:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to pause audio'));
    }
    }
  }, [onError]);

  const resumeAudio = useCallback(async () => {
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('not loaded')) {
      console.error('Error resuming audio:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to resume audio'));
    }
    }
  }, [onError]);

  const stopAudio = useCallback(async () => {
    // Reset state immediately
    setIsPlaying(false);
    setPosition(0);

    if (!soundRef.current) {
      return;
    }

    try {
      // Check if sound is loaded before trying to stop
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        await soundRef.current.stopAsync();
        await soundRef.current.setPositionAsync(0);
      }
    } catch (error) {
      // Silently handle "not loaded" errors as they're expected during cleanup
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('not loaded') && !errorMessage.includes('Cannot complete operation')) {
        console.error('Error stopping audio:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to stop audio'));
      }
    }
  }, [onError]);

  const seekTo = useCallback(async (newPosition: number) => {
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(newPosition);
        setPosition(newPosition);
      }
    } catch (error) {
      console.error('Error seeking audio:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to seek audio'));
    }
  }, [onError]);

  const setPlaybackRate = useCallback(async (rate: number) => {
    try {
      if (soundRef.current) {
        await soundRef.current.setRateAsync(rate, true);
      }
    } catch (error) {
      console.error('Error setting playback rate:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to set playback rate'));
    }
  }, [onError]);

  return {
    isPlaying,
    isLoading,
    duration,
    position,
    playAudio,
    playFromBuffer,
    pauseAudio,
    resumeAudio,
    stopAudio,
    seekTo,
    setPlaybackRate,
  };
}

