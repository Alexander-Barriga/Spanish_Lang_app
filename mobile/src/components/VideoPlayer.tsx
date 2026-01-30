import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, textStyles, spacing, borderRadius } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Playback speed options as specified
const PLAYBACK_SPEEDS = [1.0, 0.9, 0.85, 0.80];

// Video source can be a remote URL string OR a local asset (require() result)
type VideoSource = string | number;

interface VideoPlayerProps {
  videoSource: VideoSource;  // URL string OR require() asset ID
  episodeNumber: number;
  episodeTitle?: string;
  onVideoStart?: () => void;
  onVideoEnd?: () => void;
  onBack?: () => void;
}

export default function VideoPlayer({
  videoSource,
  episodeNumber,
  episodeTitle,
  onVideoStart,
  onVideoEnd,
  onBack,
}: VideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

  // Auto-hide controls after 3 seconds
  const startControlsTimer = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowControls(false));
      }
    }, 3000);
  }, [isPlaying, fadeAnim]);

  // Show controls on tap
  const handleScreenTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!showControls) {
      setShowControls(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    startControlsTimer();
  }, [showControls, fadeAnim, startControlsTimer]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isPlaying) {
      await videoRef.current?.pauseAsync();
    } else {
      // Ensure audio is enabled before playing
      await videoRef.current?.setVolumeAsync(1.0);
      await videoRef.current?.setIsMutedAsync(false);
      await videoRef.current?.playAsync();
    }
    startControlsTimer();
  }, [isPlaying, startControlsTimer]);

  // Change playback speed
  const handleSpeedChange = useCallback(async (speed: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    await videoRef.current?.setRateAsync(speed, true);
    startControlsTimer();
  }, [startControlsTimer]);

  // Seek to position
  const handleSeek = useCallback(async (position: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const seekPosition = (position / 100) * duration;
    await videoRef.current?.setPositionAsync(seekPosition);
    startControlsTimer();
  }, [duration, startControlsTimer]);

  // Skip forward/backward
  const handleSkip = useCallback(async (seconds: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPosition = Math.max(0, Math.min(duration, currentTime + (seconds * 1000)));
    await videoRef.current?.setPositionAsync(newPosition);
    startControlsTimer();
  }, [currentTime, duration, startControlsTimer]);

  // Handle playback status updates
  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('Video playback error:', status.error);
      }
      return;
    }

    setIsLoading(false);
    setIsPlaying(status.isPlaying);
    setCurrentTime(status.positionMillis);
    setDuration(status.durationMillis || 0);

    // Track first play
    if (status.isPlaying && !hasStartedPlaying) {
      setHasStartedPlaying(true);
      onVideoStart?.();
    }

    // Video ended
    if (status.didJustFinish) {
      setShowControls(true);
      fadeAnim.setValue(1);
      onVideoEnd?.();
    }
  }, [hasStartedPlaying, onVideoStart, onVideoEnd, fadeAnim]);

  // Format time display
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Configure audio mode for iOS (allows audio even in silent mode)
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (error) {
        console.error('Error setting audio mode:', error);
      }
    };
    
    setupAudio();
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Video */}
      <Video
        ref={videoRef}
        source={
          typeof videoSource === 'string'
            ? { uri: videoSource }  // Remote URL
            : videoSource           // Local asset (require result)
        }
        rate={playbackSpeed}
        volume={1.0}
        isMuted={false}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={false}
        useNativeControls={false}
        style={styles.video}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />

      {/* Tap area for showing controls */}
      <Pressable style={styles.tapArea} onPress={handleScreenTap}>
        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary.gold} />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        )}

        {/* Controls overlay */}
        {showControls && !isLoading && (
          <Animated.View style={[styles.controlsOverlay, { opacity: fadeAnim }]}>
            {/* Top gradient with back button and episode info */}
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'transparent']}
              style={styles.topGradient}
            >
              <View style={styles.topBar}>
                <Pressable onPress={onBack} style={styles.backButton}>
                  <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
                </Pressable>
                <View style={styles.episodeInfo}>
                  <Text style={styles.episodeLabel}>EPISODE {episodeNumber}</Text>
                  {episodeTitle && (
                    <Text style={styles.episodeTitle} numberOfLines={1}>
                      {episodeTitle}
                    </Text>
                  )}
                </View>
                {/* Speed button */}
                <Pressable 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowSpeedMenu(!showSpeedMenu);
                  }} 
                  style={styles.speedButton}
                >
                  <Text style={styles.speedButtonText}>{playbackSpeed}x</Text>
                </Pressable>
              </View>
            </LinearGradient>

            {/* Speed menu */}
            {showSpeedMenu && (
              <View style={styles.speedMenu}>
                {PLAYBACK_SPEEDS.map((speed) => (
                  <Pressable
                    key={speed}
                    onPress={() => handleSpeedChange(speed)}
                    style={[
                      styles.speedMenuItem,
                      playbackSpeed === speed && styles.speedMenuItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.speedMenuText,
                        playbackSpeed === speed && styles.speedMenuTextActive,
                      ]}
                    >
                      {speed}x
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Center play/pause button */}
            <View style={styles.centerControls}>
              {/* Skip backward */}
              <Pressable onPress={() => handleSkip(-10)} style={styles.skipButton}>
                <Ionicons name="play-back" size={32} color={colors.text.primary} />
                <Text style={styles.skipText}>10</Text>
              </Pressable>

              {/* Play/Pause */}
              <Pressable onPress={togglePlayPause} style={styles.playPauseButton}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={48}
                  color={colors.text.primary}
                />
              </Pressable>

              {/* Skip forward */}
              <Pressable onPress={() => handleSkip(10)} style={styles.skipButton}>
                <Ionicons name="play-forward" size={32} color={colors.text.primary} />
                <Text style={styles.skipText}>10</Text>
              </Pressable>
            </View>

            {/* Bottom gradient with progress bar */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.bottomGradient}
            >
              {/* Time display */}
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>

              {/* Progress bar */}
              <Pressable 
                style={styles.progressBarContainer}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  const percent = (locationX / (SCREEN_WIDTH - spacing[8])) * 100;
                  handleSeek(Math.max(0, Math.min(100, percent)));
                }}
              >
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[styles.progressBarFill, { width: `${progressPercent}%` }]} 
                  />
                </View>
                {/* Progress indicator */}
                <View 
                  style={[
                    styles.progressIndicator,
                    { left: `${progressPercent}%` }
                  ]} 
                />
              </Pressable>
            </LinearGradient>
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[950],
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  tapArea: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingText: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginTop: spacing[3],
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topGradient: {
    paddingTop: spacing[12],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: spacing[2],
  },
  episodeInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  episodeLabel: {
    ...textStyles.overline,
    color: colors.primary.gold,
  },
  episodeTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    marginTop: spacing[1],
  },
  speedButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
  },
  speedButtonText: {
    ...textStyles.label,
    color: colors.text.primary,
    fontWeight: '600',
  },
  speedMenu: {
    position: 'absolute',
    top: spacing[20],
    right: spacing[4],
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing[2],
    ...StyleSheet.absoluteFillObject,
    left: undefined,
    bottom: undefined,
    width: 80,
    height: 'auto',
  },
  speedMenuItem: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
  },
  speedMenuItemActive: {
    backgroundColor: colors.primary.gold + '20',
  },
  speedMenuText: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  speedMenuTextActive: {
    color: colors.primary.gold,
    fontWeight: '600',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[10],
  },
  skipButton: {
    alignItems: 'center',
    opacity: 0.8,
  },
  skipText: {
    ...textStyles.caption,
    color: colors.text.primary,
    marginTop: spacing[1],
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomGradient: {
    paddingBottom: spacing[10],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[8],
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  timeText: {
    ...textStyles.caption,
    color: colors.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  progressBarContainer: {
    height: 20,
    justifyContent: 'center',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary.gold,
    borderRadius: 2,
  },
  progressIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.gold,
    marginLeft: -6,
    top: 4,
  },
});
