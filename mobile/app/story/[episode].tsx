import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
  Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, Episode } from '../../src/services/api';
import { useAudioPlayback } from '../../src/hooks/useAudioPlayback';
import { useVoiceRecording } from '../../src/hooks/useVoiceRecording';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../src/theme';
import { getGrammarLesson, GrammarLesson } from '../../src/data/grammarLessons';

const { width, height } = Dimensions.get('window');

interface Scene {
  scene_id: string;
  scene_number: number;
  florencia_says: string;
  audio_key: string;
  emotion: string;
  response_type: 'guided' | 'free_speak';
  options?: Array<{
    text: string;
    next_scene: string;
    grammar_correct?: boolean;
    uses_subjunctive?: boolean;
  }>;
  grammar_hint?: string;
  expected_patterns?: string[];
}

type PhaseType = 'intro' | 'scene' | 'response' | 'recording' | 'feedback' | 'correction_practice' | 'summary';

interface GrammarError {
  original: string;
  correction: string;
  category: string;
  explanation: string;
}

interface GrammarAnalysis {
  usedCorrectExpression: boolean;
  usedCorrectConjugation: boolean;
  overallCorrect: boolean;
  expressionUsed: string | null;
  patternsFound?: string[];
  grammarErrors?: GrammarError[];
  hasGrammarErrors?: boolean;
  primaryErrorType?: string | null;
  feedbackMessage: string;
  detailedFeedback: string | null;
  correctedVersion: string | null;
  correctionExplanation: string | null;
}

// Category labels for display
const errorCategoryLabels: Record<string, string> = {
  gender: 'Gender Agreement',
  subjunctive: 'Subjunctive Mood',
  conjugation: 'Verb Conjugation',
  reflexive: 'Reflexive Verb',
  agreement: 'Agreement',
  preposition: 'Preposition',
  ser_estar: 'Ser vs Estar',
  spelling: 'Spelling',
  word_order: 'Word Order',
};

export default function EpisodePlayer() {
  const { episode: episodeId } = useLocalSearchParams<{ episode: string }>();
  
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [storyArc, setStoryArc] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPhase, setCurrentPhase] = useState<PhaseType>('intro');
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [pathTaken, setPathTaken] = useState<string[]>([]);
  const [speakingCount, setSpeakingCount] = useState(0);
  const [grammarScore, setGrammarScore] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [userTranscription, setUserTranscription] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [userRecordingUri, setUserRecordingUri] = useState<string | null>(null);
  const [userPlaybackComplete, setUserPlaybackComplete] = useState(false);
  const [grammarAnalysis, setGrammarAnalysis] = useState<GrammarAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [needsCorrection, setNeedsCorrection] = useState(false);
  const [correctionRecordingUri, setCorrectionRecordingUri] = useState<string | null>(null);
  const [correctionPlaybackComplete, setCorrectionPlaybackComplete] = useState(false);
  const [sceneAudioPlayed, setSceneAudioPlayed] = useState(false); // Tracks if scene audio has completed
  const [grammarPanelVisible, setGrammarPanelVisible] = useState(false);
  const grammarPanelAnim = useRef(new Animated.Value(0)).current;

  // Audio and recording hooks
  // Main hook for Florencia's dialogue - marks scene audio as played when complete
  const { playAudio, stopAudio, isPlaying } = useAudioPlayback({
    onPlaybackComplete: () => {
      setSceneAudioPlayed(true);
    }
  });
  
  // Separate playback hook for user's recorded voice (to avoid conflicts with scene audio)
  // Volume boost of 1.0 (max) helps amplify user recordings to match Florencia's volume
  const { 
    playAudio: playUserRecording, 
    stopAudio: stopUserRecording,
    isPlaying: isPlayingUserRecording 
  } = useAudioPlayback({
    onPlaybackComplete: () => {
      setUserPlaybackComplete(true);
    },
    volumeBoost: 1.0, // Max volume for user recordings
  });
  
  // Playback hook for correction practice recording
  const {
    playAudio: playCorrectionRecording,
    stopAudio: stopCorrectionRecording,
    isPlaying: isPlayingCorrectionRecording
  } = useAudioPlayback({
    onPlaybackComplete: () => {
      setCorrectionPlaybackComplete(true);
    },
    volumeBoost: 1.0, // Max volume for correction recordings
  });
  
  const { 
    startRecording, 
    stopRecording, 
    isRecording, 
    audioUri 
  } = useVoiceRecording();

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (episodeId) {
      loadEpisode();
      setStartTime(Date.now());
    }
    return () => {
      stopAudio();
    };
  }, [episodeId]);

  useEffect(() => {
    // Animate in when phase changes
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentPhase, currentSceneIndex]);

  const loadEpisode = async () => {
    try {
      setIsLoading(true);
      const result = await api.getEpisode(episodeId!);
      
      if (result.error || !result.data?.episode) {
        Alert.alert('Error', 'Failed to load episode');
        router.back();
        return;
      }

      const ep = result.data.episode;
      setEpisode(ep);
      setStoryArc(ep.story_arcs);
      
      // Set first scene
      if (ep.scenes && ep.scenes.length > 0) {
        setCurrentScene(ep.scenes[0]);
      }
    } catch (error) {
      console.error('Error loading episode:', error);
      Alert.alert('Error', 'Failed to load episode');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEpisode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentPhase('scene');
    setSceneAudioPlayed(false); // Reset so response section waits for audio
    // Pass scene directly to avoid stale closure issues
    playSceneAudio(currentScene);
  };

  const playSceneAudio = async (scene: Scene | null) => {
    if (!scene) return;
    
    // Stop any currently playing audio first to prevent overlapping
    await stopAudio();
    
    // Try to play pre-generated audio
    try {
      const audioResult = await api.getPreGeneratedAudio(scene.audio_key);
      if (audioResult.data?.audioUrl) {
        await playAudio(audioResult.data.audioUrl);
      }
    } catch (error) {
      console.log('Pre-generated audio not available, using TTS');
      // Fallback to TTS would go here
    }
  };

  // Wrapper for replay button that uses current scene from state
  const playCurrentSceneAudio = async () => {
    await playSceneAudio(currentScene);
  };

  const handleSelectOption = async (option: { text: string; next_scene: string; grammar_correct?: boolean; uses_subjunctive?: boolean }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Stop any currently playing audio first
    await stopAudio();
    
    // Track path and grammar
    setPathTaken([...pathTaken, option.next_scene]);
    if (option.grammar_correct) {
      setGrammarScore(prev => prev + 20);
    }
    if (option.uses_subjunctive) {
      setGrammarScore(prev => prev + 10);
    }

    // Find next scene
    const nextScene = episode?.scenes.find((s: Scene) => s.scene_id === option.next_scene);
    if (nextScene) {
      setCurrentSceneIndex(prev => prev + 1);
      setCurrentScene(nextScene);
      setCurrentPhase('scene');
      setSceneAudioPlayed(false); // Reset so response section waits for audio
      // Pass nextScene directly to avoid stale closure issues
      setTimeout(() => playSceneAudio(nextScene), 300);
    } else {
      // End of episode
      handleEpisodeComplete();
    }
  };

  const handleStartRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Clear all previous feedback state to prevent stale data
    setUserTranscription('');
    setFeedbackMessage('');
    setGrammarAnalysis(null);
    setNeedsCorrection(false);
    setUserRecordingUri(null);
    setUserPlaybackComplete(false);
    setCorrectionRecordingUri(null);
    setCorrectionPlaybackComplete(false);
    setIsAnalyzing(false);
    
    // Start recording first, then change phase to prevent race condition
    try {
      await startRecording();
      // Only change phase after recording has successfully started
      setCurrentPhase('recording');
    } catch (error) {
      console.error('Failed to start recording:', error);
      // Stay in current phase if recording fails to start
    }
  };

  const handleStopRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    let uri: string | null = null;
    try {
      uri = await stopRecording();
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
    
    // Reset playback state for feedback phase
    setUserPlaybackComplete(false);
    setUserRecordingUri(uri);
    
    // If no recording URI, skip transcription and move to next scene
    if (!uri) {
      console.log('No recording URI, skipping transcription');
      setFeedbackMessage('Recording not captured. Moving on...');
      setUserPlaybackComplete(true); // No recording to play, so mark as complete
      setCurrentPhase('feedback');
      return;
    }

    // Transcribe the recording with timeout
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<{ error: string }>((_, reject) => 
        setTimeout(() => reject({ error: 'Transcription timed out' }), 30000)
      );
      
      // Race between transcription and timeout
      const result = await Promise.race([
        api.transcribeAudio(uri),
        timeoutPromise
      ]);
      
      if (result.data?.transcript) {
        setUserTranscription(result.data.transcript);
        setSpeakingCount(prev => prev + 1);
        
        // AI-powered grammar analysis
        setIsAnalyzing(true);
        try {
          const analysisResult = await api.analyzeGrammarResponse({
            userResponse: result.data.transcript,
            grammarFocus: episode?.grammar_focus,
            expectedPatterns: currentScene?.expected_patterns,
            grammarHint: currentScene?.grammar_hint,
            contextDialogue: currentScene?.florencia_says,
          });
          
          if (analysisResult.data?.analysis) {
            const analysis = analysisResult.data.analysis;
            setGrammarAnalysis(analysis);
            setFeedbackMessage(analysis.feedbackMessage);
            
            // Determine if correction practice is needed
            if (analysis.overallCorrect) {
              setGrammarScore(prev => prev + 15);
              setNeedsCorrection(false);
            } else {
              setNeedsCorrection(true);
            }
          } else {
            // Fallback if analysis fails
            setFeedbackMessage('Good effort! Keep practicing.');
            setNeedsCorrection(false);
          }
        } catch (analysisError) {
          console.error('Grammar analysis error:', analysisError);
          setFeedbackMessage('Good effort! Keep practicing.');
          setNeedsCorrection(false);
        } finally {
          setIsAnalyzing(false);
        }
        
        setCurrentPhase('feedback');
      } else {
        // Any other case (error or unexpected response)
        console.error('Transcription issue:', result.error || 'Unknown error');
        setFeedbackMessage('Could not transcribe. Try speaking more clearly.');
        setCurrentPhase('feedback');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setFeedbackMessage('Transcription failed. Moving on...');
      setCurrentPhase('feedback');
    }
  };
  
  // Auto-play user's recording when entering feedback phase
  useEffect(() => {
    if (currentPhase === 'feedback' && userRecordingUri && !userPlaybackComplete) {
      // Small delay to let the UI render first
      const timer = setTimeout(() => {
        playUserRecording(userRecordingUri);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, userRecordingUri, userPlaybackComplete]);

  const handleStartCorrectionPractice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCorrectionRecordingUri(null);
    setCorrectionPlaybackComplete(false);
    setCurrentPhase('correction_practice');
  };
  
  const handleStartCorrectionRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startRecording();
  };
  
  const handleStopCorrectionRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    let uri: string | null = null;
    try {
      uri = await stopRecording();
    } catch (error) {
      console.error('Error stopping correction recording:', error);
    }
    
    if (uri) {
      setCorrectionRecordingUri(uri);
      setCorrectionPlaybackComplete(false);
      // Auto-play the correction recording
      setTimeout(() => playCorrectionRecording(uri), 500);
    } else {
      // If no recording, still mark as complete
      setCorrectionPlaybackComplete(true);
    }
  };
  
  const handleContinueAfterCorrection = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Stop any playing audio
    await stopCorrectionRecording();
    await stopUserRecording();
    
    // Reset all feedback-related state for next recording
    setCorrectionRecordingUri(null);
    setCorrectionPlaybackComplete(false);
    setNeedsCorrection(false);
    setUserRecordingUri(null);
    setUserPlaybackComplete(false);
    setGrammarAnalysis(null);
    setUserTranscription('');
    setFeedbackMessage('');
    setIsAnalyzing(false);
    
    // Give partial credit for practicing the correction
    setGrammarScore(prev => prev + 5);
    
    // Move to next scene
    const nextSceneIndex = currentSceneIndex + 1;
    if (episode?.scenes && nextSceneIndex < episode.scenes.length) {
      const nextScene = episode.scenes[nextSceneIndex];
      setCurrentSceneIndex(nextSceneIndex);
      setCurrentScene(nextScene);
      setCurrentPhase('scene');
      setSceneAudioPlayed(false); // Reset so response section waits for audio
      setTimeout(() => playSceneAudio(nextScene), 300);
    } else {
      handleEpisodeComplete();
    }
  };

  const handleContinueAfterFeedback = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Stop any currently playing audio first
    await stopAudio();
    await stopUserRecording();
    
    // Reset all feedback-related state for next recording
    setUserRecordingUri(null);
    setUserPlaybackComplete(false);
    setGrammarAnalysis(null);
    setNeedsCorrection(false);
    setCorrectionRecordingUri(null);
    setCorrectionPlaybackComplete(false);
    setIsAnalyzing(false);
    
    // Move to next scene or end
    const nextSceneIndex = currentSceneIndex + 1;
    if (episode?.scenes && nextSceneIndex < episode.scenes.length) {
      const nextScene = episode.scenes[nextSceneIndex];
      setCurrentSceneIndex(nextSceneIndex);
      setCurrentScene(nextScene);
      setCurrentPhase('scene');
      setUserTranscription('');
      setFeedbackMessage('');
      setSceneAudioPlayed(false); // Reset so response section waits for audio
      // Pass nextScene directly to avoid stale closure issues
      setTimeout(() => playSceneAudio(nextScene), 300);
    } else {
      handleEpisodeComplete();
    }
  };

  const handleEpisodeComplete = async () => {
    setCurrentPhase('summary');
    stopAudio();

    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    const starsEarned = calculateStars();

    try {
      await api.recordEpisodeAttempt({
        episodeId: episodeId!,
        grammarScore,
        speakingCount,
        starsEarned,
        pathTaken,
        durationSeconds,
      });
    } catch (error) {
      console.error('Error recording attempt:', error);
    }
  };

  const calculateStars = (): number => {
    // Calculate stars based on performance
    let stars = 1; // Base star for completion
    if (grammarScore >= 50) stars = 2;
    if (grammarScore >= 80 && speakingCount >= 2) stars = 3;
    return stars;
  };

  const handleFinishEpisode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  const handleWriteJournal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/journal',
      params: { 
        episodeId: episodeId,
        promptEs: episode?.journal_prompt_es || '',
        promptEn: episode?.journal_prompt_en || ''
      }
    });
  };

  // Grammar Panel Functions
  const toggleGrammarPanel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (grammarPanelVisible) {
      // Collapse down
      Animated.timing(grammarPanelAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setGrammarPanelVisible(false));
    } else {
      // Slide up
      setGrammarPanelVisible(true);
      Animated.timing(grammarPanelAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const grammarLesson = episode?.grammar_focus ? getGrammarLesson(episode.grammar_focus) : null;

  // Grammar Reference Button Component - shown on all episode phases
  const GrammarReferenceButton = () => (
    <Pressable 
      style={styles.grammarRefButton}
      onPress={toggleGrammarPanel}
    >
      <View style={styles.grammarRefButtonContent}>
        <Ionicons name="school-outline" size={16} color={colors.accent.tango} />
        <Text style={styles.grammarRefButtonText}>Grammar</Text>
        <Ionicons 
          name={grammarPanelVisible ? "chevron-down" : "chevron-up"} 
          size={14} 
          color={colors.accent.tango} 
        />
      </View>
    </Pressable>
  );

  // Grammar Panel Component - slide-up modal
  const GrammarPanel = () => {
    if (!grammarLesson) return null;

    const slideUp = grammarPanelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [height * 0.8, 0],
    });

    return (
      <Modal
        visible={grammarPanelVisible}
        transparent
        animationType="none"
        onRequestClose={toggleGrammarPanel}
      >
        <Pressable style={styles.grammarPanelOverlay} onPress={toggleGrammarPanel}>
          <Animated.View 
            style={[
              styles.grammarPanelContainer,
              { transform: [{ translateY: slideUp }] }
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Handle bar */}
              <View style={styles.grammarPanelHandle}>
                <View style={styles.grammarPanelHandleBar} />
              </View>

              {/* Header */}
              <View style={styles.grammarPanelHeader}>
                <View>
                  <Text style={styles.grammarPanelTitle}>{grammarLesson.title}</Text>
                  <Text style={styles.grammarPanelSubtitle}>{grammarLesson.subtitle}</Text>
                </View>
                <Pressable onPress={toggleGrammarPanel} style={styles.grammarPanelClose}>
                  <Ionicons name="close" size={24} color={colors.text.secondary} />
                </Pressable>
              </View>

              <ScrollView 
                style={styles.grammarPanelScroll}
                showsVerticalScrollIndicator={false}
              >
                {/* Key Phrases */}
                <View style={styles.grammarPanelSection}>
                  <Text style={styles.grammarPanelSectionTitle}>Key Phrases</Text>
                  <View style={styles.grammarPanelTriggers}>
                    {grammarLesson.triggers.map((trigger, index) => (
                      <View key={index} style={styles.grammarPanelTriggerChip}>
                        <Text style={styles.grammarPanelTriggerText}>{trigger}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Quick Explanation */}
                <View style={styles.grammarPanelSection}>
                  <Text style={styles.grammarPanelSectionTitle}>Quick Reference</Text>
                  <Text style={styles.grammarPanelExplanation}>
                    {grammarLesson.explanation.split('\n\n')[0]}
                  </Text>
                </View>

                {/* Conjugation Table (if available) */}
                {grammarLesson.conjugationTable && (
                  <View style={styles.grammarPanelSection}>
                    <Text style={styles.grammarPanelSectionTitle}>
                      {grammarLesson.conjugationTable.verb.toUpperCase()} ({grammarLesson.conjugationTable.verbEnglish})
                    </Text>
                    <View style={styles.grammarPanelTable}>
                      {Object.entries(grammarLesson.conjugationTable.forms).map(([pronoun, form]) => (
                        <View key={pronoun} style={styles.grammarPanelTableRow}>
                          <Text style={styles.grammarPanelTablePronoun}>
                            {pronoun === 'tú' ? 'tú/vos' : pronoun === 'él' ? 'él/ella' : pronoun}
                          </Text>
                          <Text style={styles.grammarPanelTableForm}>{form}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Use Cases */}
                <View style={styles.grammarPanelSection}>
                  <Text style={styles.grammarPanelSectionTitle}>When to Use</Text>
                  {grammarLesson.useCases.slice(0, 2).map((useCase, index) => (
                    <View key={index} style={styles.grammarPanelUseCase}>
                      <Text style={styles.grammarPanelUseCaseTitle}>{index + 1}. {useCase.title}</Text>
                      <Text style={styles.grammarPanelExample}>"{useCase.example.spanish}"</Text>
                      <Text style={styles.grammarPanelExampleEn}>{useCase.example.english}</Text>
                    </View>
                  ))}
                </View>

                {/* Tips */}
                <View style={styles.grammarPanelSection}>
                  <Text style={styles.grammarPanelSectionTitle}>Tips</Text>
                  {grammarLesson.tips.slice(0, 2).map((tip, index) => (
                    <View key={index} style={styles.grammarPanelTip}>
                      <Ionicons name="bulb-outline" size={14} color={colors.primary.gold} />
                      <Text style={styles.grammarPanelTipText}>{tip}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ height: 40 }} />
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
          <Text style={styles.loadingText}>Loading episode...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Intro Phase
  if (currentPhase === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={colors.gradients.hero as any}
          style={styles.introContainer}
        >
          {/* Header */}
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </Pressable>

          <View style={styles.introContent}>
            <Text style={styles.episodeLabel}>
              Episode {episode?.episode_number}
            </Text>
            <Text style={styles.episodeTitleLarge}>
              {episode?.title_es}
            </Text>
            <Text style={styles.episodeSubtitle}>
              {episode?.title_en}
            </Text>

            <View style={styles.scenarioBox}>
              <Ionicons name="location" size={18} color={colors.accent.tango} />
              <Text style={styles.scenarioText}>{episode?.scenario}</Text>
            </View>

            <View style={styles.grammarBox}>
              <Text style={styles.grammarBoxLabel}>Grammar Focus</Text>
              <Text style={styles.grammarBoxText}>
                {episode?.grammar_focus?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </Text>
              <View style={styles.triggersRow}>
                {episode?.grammar_triggers?.slice(0, 3).map((trigger: string, i: number) => (
                  <View key={i} style={styles.triggerChip}>
                    <Text style={styles.triggerChipText}>{trigger}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.durationRow}>
              <Ionicons name="time-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.durationText}>
                ~{episode?.estimated_duration} minutes
              </Text>
            </View>
          </View>

          <Pressable onPress={handleStartEpisode} style={styles.startButton}>
            <LinearGradient
              colors={colors.gradients.gold as any}
              style={styles.startButtonGradient}
            >
              <Ionicons name="play" size={24} color={colors.neutral[950]} />
              <Text style={styles.startButtonText}>Begin Episode</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Scene Phase
  if (currentPhase === 'scene' || currentPhase === 'response') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.sceneContainer}>
          {/* Progress bar */}
          <View style={styles.progressHeader}>
            <Pressable onPress={() => router.back()} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
            <View style={styles.sceneProgressBar}>
              <View 
                style={[
                  styles.sceneProgressFill, 
                  { width: `${((currentSceneIndex + 1) / (episode?.scenes?.length || 1)) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.sceneCounter}>
              {currentSceneIndex + 1}/{episode?.scenes?.length || 0}
            </Text>
          </View>

          <ScrollView style={styles.sceneScroll} contentContainerStyle={styles.sceneScrollContent}>
            <Animated.View 
              style={[
                styles.dialogueContainer,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}
            >
              {/* Character badge */}
              <View style={styles.characterHeader}>
                <View style={styles.characterAvatar}>
                  <Text style={styles.characterEmoji}>🇦🇷</Text>
                </View>
                <View>
                  <Text style={styles.characterNameLabel}>Florencia</Text>
                  {isPlaying && (
                    <View style={styles.speakingIndicator}>
                      <Ionicons name="volume-high" size={12} color={colors.primary.gold} />
                      <Text style={styles.speakingText}>Speaking...</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Dialogue bubble */}
              <View style={styles.dialogueBubble}>
                <Text style={styles.dialogueText}>
                  {currentScene?.florencia_says}
                </Text>
              </View>

              {/* Replay button - disabled while audio is playing */}
              <Pressable 
                onPress={playCurrentSceneAudio} 
                style={[styles.replayButton, isPlaying && styles.replayButtonDisabled]}
                disabled={isPlaying}
              >
                <Ionicons 
                  name={isPlaying ? "volume-high" : "refresh"} 
                  size={16} 
                  color={isPlaying ? colors.primary.gold : colors.text.secondary} 
                />
                <Text style={[styles.replayText, isPlaying && styles.replayTextPlaying]}>
                  {isPlaying ? 'Playing...' : 'Replay'}
                </Text>
              </Pressable>
            </Animated.View>

            {/* Response section - only show after scene audio has played */}
            {currentPhase === 'scene' && !isPlaying && sceneAudioPlayed && (
              <Animated.View 
                style={[
                  styles.responseSection,
                  { opacity: fadeAnim }
                ]}
              >
                {currentScene?.response_type === 'guided' && currentScene.options ? (
                  <View style={styles.optionsContainer}>
                    <Text style={styles.optionsLabel}>Choose your response:</Text>
                    {currentScene.options.map((option, index) => (
                      <Pressable 
                        key={index}
                        onPress={() => handleSelectOption(option)}
                        style={styles.optionButton}
                      >
                        <Text style={styles.optionText}>{option.text}</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={styles.speakSection}>
                    {currentScene?.grammar_hint && (
                      <View style={styles.hintBox}>
                        <View style={styles.hintHeader}>
                          <Ionicons name="bulb-outline" size={16} color={colors.primary.gold} />
                          <Text style={styles.hintText}>{currentScene.grammar_hint}</Text>
                        </View>
                        {currentScene?.expected_patterns && currentScene.expected_patterns.length > 0 && (
                          <View style={styles.starterPhrases}>
                            <Text style={styles.starterLabel}>Try starting with:</Text>
                            <View style={styles.phraseChips}>
                              {currentScene.expected_patterns.slice(0, 2).map((phrase, idx) => (
                                <View key={idx} style={styles.phraseChip}>
                                  <Text style={styles.phraseText}>"{phrase}..."</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                    <Pressable onPress={handleStartRecording} style={styles.recordButtonRaised}>
                      <LinearGradient
                        colors={colors.gradients.tango as any}
                        style={styles.recordButtonGradient}
                      >
                        <Ionicons name="mic" size={28} color={colors.text.primary} />
                        <Text style={styles.recordButtonText}>Tap to Speak</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
              </Animated.View>
            )}
          </ScrollView>
          
          {/* Grammar Reference Button */}
          <GrammarReferenceButton />
        </View>
        
        {/* Grammar Panel Modal */}
        <GrammarPanel />
      </SafeAreaView>
    );
  }

  // Recording Phase
  if (currentPhase === 'recording') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.recordingContainer}>
          <Animated.View style={styles.recordingPulse}>
            <View style={styles.recordingCircle}>
              <Ionicons name="mic" size={48} color={colors.text.primary} />
            </View>
          </Animated.View>
          <Text style={styles.recordingText}>Recording...</Text>
          <Text style={styles.recordingHint}>Speak your response in Spanish</Text>
          
          <Pressable onPress={handleStopRecording} style={styles.stopButtonSunken}>
            <View style={styles.stopButtonInner}>
              <Ionicons name="stop" size={24} color={colors.text.primary} />
              <Text style={styles.stopButtonText}>Stop Recording</Text>
            </View>
          </Pressable>
          
          {/* Grammar Reference Button */}
          <GrammarReferenceButton />
        </View>
        
        {/* Grammar Panel Modal */}
        <GrammarPanel />
      </SafeAreaView>
    );
  }

  // Feedback Phase
  if (currentPhase === 'feedback') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.feedbackScroll} contentContainerStyle={styles.feedbackScrollContent}>
          <View style={styles.feedbackCard}>
            <Ionicons name="chatbubble-ellipses" size={32} color={colors.primary.gold} />
            <Text style={styles.feedbackLabel}>You said:</Text>
            <Text style={styles.userSpeechText}>"{userTranscription}"</Text>
            
            {/* Playback indicator */}
            {isPlayingUserRecording && (
              <View style={styles.playbackIndicator}>
                <ActivityIndicator size="small" color={colors.primary.gold} />
                <Text style={styles.playbackText}>Playing your recording...</Text>
              </View>
            )}
            
            {/* Analyzing indicator */}
            {isAnalyzing && (
              <View style={styles.playbackIndicator}>
                <ActivityIndicator size="small" color={colors.primary.gold} />
                <Text style={styles.playbackText}>Analyzing your grammar...</Text>
              </View>
            )}
            
            {/* Grammar analysis feedback */}
            {grammarAnalysis && !isAnalyzing && (
              <View style={styles.analysisContainer}>
                {/* Status indicators */}
                <View style={styles.analysisStatusRow}>
                  {/* Expression badge - shows what pattern was used */}
                  <View style={[
                    styles.statusBadge,
                    grammarAnalysis.usedCorrectExpression ? styles.statusBadgeSuccess : styles.statusBadgeError
                  ]}>
                    <Ionicons 
                      name={grammarAnalysis.usedCorrectExpression ? "checkmark-circle" : "close-circle"} 
                      size={16} 
                      color={grammarAnalysis.usedCorrectExpression ? colors.success : colors.error} 
                    />
                    <Text style={[
                      styles.statusBadgeText,
                      grammarAnalysis.usedCorrectExpression ? styles.statusTextSuccess : styles.statusTextError
                    ]}>
                      {grammarAnalysis.usedCorrectExpression 
                        ? `Used "${grammarAnalysis.expressionUsed}"` 
                        : 'Expression Needed'}
                    </Text>
                  </View>
                  
                  {/* Grammar badge */}
                  <View style={[
                    styles.statusBadge,
                    !grammarAnalysis.hasGrammarErrors ? styles.statusBadgeSuccess : styles.statusBadgeError
                  ]}>
                    <Ionicons 
                      name={!grammarAnalysis.hasGrammarErrors ? "checkmark-circle" : "close-circle"} 
                      size={16} 
                      color={!grammarAnalysis.hasGrammarErrors ? colors.success : colors.error} 
                    />
                    <Text style={[
                      styles.statusBadgeText,
                      !grammarAnalysis.hasGrammarErrors ? styles.statusTextSuccess : styles.statusTextError
                    ]}>
                      {!grammarAnalysis.hasGrammarErrors 
                        ? 'Good Grammar' 
                        : grammarAnalysis.primaryErrorType 
                          ? errorCategoryLabels[grammarAnalysis.primaryErrorType] || 'Grammar Error'
                          : 'Grammar Error'}
                    </Text>
                  </View>
                </View>
                
                {/* Main feedback message */}
                <View style={[
                  styles.feedbackMessageBox,
                  grammarAnalysis.overallCorrect ? styles.feedbackBoxSuccess : styles.feedbackBoxCorrection
                ]}>
                  <Text style={[
                    styles.feedbackMessageText,
                    grammarAnalysis.overallCorrect ? styles.feedbackTextSuccess : styles.feedbackTextCorrection
                  ]}>
                    {grammarAnalysis.feedbackMessage}
                  </Text>
                </View>
                
                {/* Specific grammar errors list */}
                {grammarAnalysis.grammarErrors && grammarAnalysis.grammarErrors.length > 0 && (
                  <View style={styles.grammarErrorsList}>
                    <Text style={styles.grammarErrorsTitle}>Grammar Fixes:</Text>
                    {grammarAnalysis.grammarErrors.map((error, index) => (
                      <View key={index} style={styles.grammarErrorItem}>
                        <View style={styles.grammarErrorHeader}>
                          <Text style={styles.grammarErrorCategory}>
                            {errorCategoryLabels[error.category] || error.category}
                          </Text>
                        </View>
                        <View style={styles.grammarErrorCorrection}>
                          <Text style={styles.grammarErrorOriginal}>"{error.original}"</Text>
                          <Ionicons name="arrow-forward" size={14} color={colors.primary.gold} />
                          <Text style={styles.grammarErrorFixed}>"{error.correction}"</Text>
                        </View>
                        <Text style={styles.grammarErrorExplanation}>{error.explanation}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Corrected version if needed */}
                {grammarAnalysis.correctedVersion && grammarAnalysis.hasGrammarErrors && (
                  <View style={styles.correctionBox}>
                    <Text style={styles.correctionLabel}>Your corrected sentence:</Text>
                    <Text style={styles.correctionText}>"{grammarAnalysis.correctedVersion}"</Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Fallback feedback if no analysis */}
            {!grammarAnalysis && !isAnalyzing && feedbackMessage && (
              <View style={styles.feedbackMessageBox}>
                <Text style={styles.feedbackMessageText}>{feedbackMessage}</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          {userPlaybackComplete && !isAnalyzing ? (
            <View style={styles.feedbackActions}>
              {needsCorrection && grammarAnalysis?.correctedVersion ? (
                <>
                  <Pressable onPress={handleStartCorrectionPractice} style={styles.correctionButton}>
                    <Ionicons name="mic" size={20} color={colors.text.primary} />
                    <Text style={styles.correctionButtonText}>Practice Correction</Text>
                  </Pressable>
                  <Pressable onPress={handleContinueAfterFeedback} style={styles.skipButton}>
                    <Text style={styles.skipButtonText}>Skip for now</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={handleContinueAfterFeedback} style={styles.continueButton}>
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.neutral[950]} />
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.waitingForPlayback}>
              <Text style={styles.waitingText}>
                {isAnalyzing ? 'Analyzing...' : 'Listen to your response...'}
              </Text>
            </View>
          )}
        </ScrollView>
        
        {/* Grammar Reference Button */}
        <GrammarReferenceButton />
        
        {/* Grammar Panel Modal */}
        <GrammarPanel />
      </SafeAreaView>
    );
  }
  
  // Correction Practice Phase
  if (currentPhase === 'correction_practice') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.correctionPracticeContainer}>
          <Text style={styles.correctionPracticeTitle}>Practice the Correction</Text>
          <Text style={styles.correctionPracticeSubtitle}>
            Record yourself saying the corrected version
          </Text>
          
          <View style={styles.correctionTargetBox}>
            <Ionicons name="chatbubble-outline" size={24} color={colors.primary.gold} />
            <Text style={styles.correctionTargetText}>
              "{grammarAnalysis?.correctedVersion}"
            </Text>
          </View>
          
          {!correctionRecordingUri ? (
            // Recording controls
            <View style={styles.correctionRecordingSection}>
              {!isRecording ? (
                <Pressable onPress={handleStartCorrectionRecording} style={styles.recordButtonRaised}>
                  <LinearGradient
                    colors={colors.gradients.tango as any}
                    style={styles.recordButtonGradient}
                  >
                    <Ionicons name="mic" size={28} color={colors.text.primary} />
                    <Text style={styles.recordButtonText}>Record</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable onPress={handleStopCorrectionRecording} style={styles.stopButtonSunken}>
                  <View style={styles.stopButtonInner}>
                    <Ionicons name="stop" size={24} color={colors.text.primary} />
                    <Text style={styles.stopButtonText}>Stop</Text>
                  </View>
                </Pressable>
              )}
            </View>
          ) : (
            // Playback and continue
            <View style={styles.correctionPlaybackSection}>
              {isPlayingCorrectionRecording && (
                <View style={styles.playbackIndicator}>
                  <ActivityIndicator size="small" color={colors.primary.gold} />
                  <Text style={styles.playbackText}>Playing your recording...</Text>
                </View>
              )}
              
              {correctionPlaybackComplete && (
                <View style={styles.correctionSuccessBox}>
                  <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                  <Text style={styles.correctionSuccessText}>Great practice!</Text>
                </View>
              )}
              
              {correctionPlaybackComplete && (
                <Pressable onPress={handleContinueAfterCorrection} style={styles.continueButton}>
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.neutral[950]} />
                </Pressable>
              )}
            </View>
          )}
          
          {/* Grammar Reference Button */}
          <GrammarReferenceButton />
        </View>
        
        {/* Grammar Panel Modal */}
        <GrammarPanel />
      </SafeAreaView>
    );
  }

  // Summary Phase
  if (currentPhase === 'summary') {
    const stars = calculateStars();
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.summaryScroll} contentContainerStyle={styles.summaryContent}>
          <View style={styles.summaryHeader}>
            <Text style={styles.completeLabel}>Episode Complete!</Text>
            <Text style={styles.summaryTitle}>{episode?.title_es}</Text>
          </View>

          <View style={styles.starsContainer}>
            {[1, 2, 3].map((star) => (
              <Ionicons 
                key={star}
                name={star <= stars ? "star" : "star-outline"} 
                size={48} 
                color={star <= stars ? colors.story.star : colors.story.starEmpty} 
              />
            ))}
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{grammarScore}</Text>
              <Text style={styles.statBoxLabel}>Grammar Score</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{speakingCount}</Text>
              <Text style={styles.statBoxLabel}>Speaking Turns</Text>
            </View>
          </View>

          {episode?.journal_prompt_es && (
            <View style={styles.journalPromptCard}>
              <Text style={styles.journalPromptLabel}>Journal Prompt</Text>
              <Text style={styles.journalPromptText}>{episode.journal_prompt_es}</Text>
              <Pressable onPress={handleWriteJournal} style={styles.journalButton}>
                <Ionicons name="pencil" size={18} color={colors.primary.gold} />
                <Text style={styles.journalButtonText}>Write in Journal (+30 XP)</Text>
              </Pressable>
            </View>
          )}

          <Pressable onPress={handleFinishEpisode} style={styles.finishButton}>
            <Text style={styles.finishButtonText}>Continue</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },

  // Intro styles
  introContainer: {
    flex: 1,
    padding: spacing[6],
    justifyContent: 'space-between',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing[2],
  },
  introContent: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[4],
  },
  episodeLabel: {
    ...textStyles.overline,
    color: colors.primary.gold,
  },
  episodeTitleLarge: {
    ...textStyles.h1,
    color: colors.text.primary,
  },
  episodeSubtitle: {
    ...textStyles.bodyLarge,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  scenarioBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  scenarioText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  grammarBox: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginTop: spacing[4],
  },
  grammarBoxLabel: {
    ...textStyles.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing[2],
  },
  grammarBoxText: {
    ...textStyles.h5,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  triggersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  triggerChip: {
    backgroundColor: colors.neutral[800],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
  },
  triggerChipText: {
    ...textStyles.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  durationText: {
    ...textStyles.bodySmall,
    color: colors.text.tertiary,
  },
  startButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  startButtonText: {
    ...textStyles.buttonLarge,
    color: colors.neutral[950],
  },

  // Scene styles
  sceneContainer: {
    flex: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  closeButton: {
    padding: spacing[1],
  },
  sceneProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.neutral[800],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  sceneProgressFill: {
    height: '100%',
    backgroundColor: colors.primary.gold,
  },
  sceneCounter: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    minWidth: 40,
    textAlign: 'right',
  },
  sceneScroll: {
    flex: 1,
  },
  sceneScrollContent: {
    padding: spacing[5],
    paddingBottom: spacing[10],
  },
  dialogueContainer: {
    marginBottom: spacing[6],
  },
  characterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  characterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterEmoji: {
    fontSize: 24,
  },
  characterNameLabel: {
    ...textStyles.label,
    color: colors.text.primary,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  speakingText: {
    ...textStyles.caption,
    color: colors.primary.gold,
  },
  dialogueBubble: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    borderTopLeftRadius: borderRadius.sm,
    padding: spacing[5],
    marginLeft: spacing[7],
  },
  dialogueText: {
    ...textStyles.sceneText,
    color: colors.text.primary,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginLeft: spacing[7],
    marginTop: spacing[2],
    padding: spacing[2],
    alignSelf: 'flex-start',
  },
  replayButtonDisabled: {
    opacity: 0.7,
  },
  replayText: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  replayTextPlaying: {
    color: colors.primary.gold,
  },
  responseSection: {
    marginTop: spacing[4],
  },
  optionsContainer: {
    gap: spacing[3],
  },
  optionsLabel: {
    ...textStyles.label,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.elevated,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  optionText: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing[2],
  },
  speakSection: {
    gap: spacing[4],
  },
  hintBox: {
    backgroundColor: colors.background.elevated,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.gold,
    gap: spacing[3],
  },
  hintHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  starterPhrases: {
    marginLeft: spacing[6], // Align with text after icon
    gap: spacing[2],
  },
  starterLabel: {
    ...textStyles.caption,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  phraseChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  phraseChip: {
    backgroundColor: colors.neutral[800],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary.gold + '40', // 40 = 25% opacity
  },
  phraseText: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontSize: 14,
  },
  hintText: {
    ...textStyles.hint,
    color: colors.text.secondary,
    flex: 1,
  },
  recordButtonRaised: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    // Raised/elevated effect with shadow
    shadowColor: colors.accent.tango,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
    transform: [{ translateY: -2 }],
  },
  recordButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[5],
    gap: spacing[3],
  },
  recordButtonText: {
    ...textStyles.button,
    color: colors.text.primary,
  },

  // Recording styles
  recordingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    gap: spacing[4],
  },
  recordingPulse: {
    marginBottom: spacing[4],
  },
  recordingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accent.tango,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingText: {
    ...textStyles.h3,
    color: colors.text.primary,
  },
  recordingHint: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  stopButtonSunken: {
    // Sunken/pressed effect - darker background, inset shadow look
    backgroundColor: colors.neutral[900],
    borderRadius: borderRadius.xl,
    marginTop: spacing[6],
    // Inner shadow effect via border
    borderWidth: 3,
    borderTopColor: colors.neutral[900],
    borderLeftColor: colors.neutral[900],
    borderBottomColor: colors.neutral[600],
    borderRightColor: colors.neutral[600],
    // Pressed down transform
    transform: [{ translateY: 2 }, { scale: 0.98 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 1,
  },
  stopButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
  },
  stopButtonText: {
    ...textStyles.button,
    color: colors.text.primary,
  },

  // Feedback styles
  feedbackContainer: {
    flex: 1,
    padding: spacing[6],
    justifyContent: 'center',
    gap: spacing[6],
  },
  feedbackCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[4],
  },
  feedbackLabel: {
    ...textStyles.label,
    color: colors.text.secondary,
  },
  userSpeechText: {
    ...textStyles.dialogue,
    color: colors.text.primary,
    textAlign: 'center',
  },
  feedbackMessageBox: {
    backgroundColor: colors.neutral[800],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginTop: spacing[2],
  },
  feedbackMessageText: {
    ...textStyles.body,
    color: colors.accent.sage,
    textAlign: 'center',
  },
  playbackIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  playbackText: {
    ...textStyles.caption,
    color: colors.primary.gold,
    fontStyle: 'italic',
  },
  waitingForPlayback: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
  },
  waitingText: {
    ...textStyles.body,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  
  // Feedback scroll for longer content
  feedbackScroll: {
    flex: 1,
  },
  feedbackScrollContent: {
    padding: spacing[6],
    gap: spacing[6],
  },
  
  // Analysis styles
  analysisContainer: {
    width: '100%',
    gap: spacing[3],
  },
  analysisStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusBadgeSuccess: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success + '40',
  },
  statusBadgeError: {
    backgroundColor: colors.error + '20',
    borderColor: colors.error + '40',
  },
  statusBadgeText: {
    ...textStyles.caption,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: colors.success,
  },
  statusTextError: {
    color: colors.error,
  },
  feedbackBoxSuccess: {
    backgroundColor: colors.success + '15',
    borderLeftColor: colors.success,
    borderLeftWidth: 3,
  },
  feedbackBoxCorrection: {
    backgroundColor: colors.primary.gold + '15',
    borderLeftColor: colors.primary.gold,
    borderLeftWidth: 3,
  },
  feedbackTextSuccess: {
    color: colors.success,
  },
  feedbackTextCorrection: {
    color: colors.primary.gold,
  },
  detailedFeedbackBox: {
    backgroundColor: colors.neutral[800],
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  detailedFeedbackText: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  // Grammar errors list styles
  grammarErrorsList: {
    backgroundColor: colors.neutral[900],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  grammarErrorsTitle: {
    ...textStyles.label,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  grammarErrorItem: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    gap: spacing[2],
    borderLeftWidth: 3,
    borderLeftColor: colors.error + '80',
  },
  grammarErrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grammarErrorCategory: {
    ...textStyles.caption,
    color: colors.error,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grammarErrorCorrection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  grammarErrorOriginal: {
    ...textStyles.body,
    color: colors.text.muted,
    textDecorationLine: 'line-through',
  },
  grammarErrorFixed: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontWeight: '600',
  },
  grammarErrorExplanation: {
    ...textStyles.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  
  correctionBox: {
    backgroundColor: colors.background.elevated,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.primary.gold + '40',
  },
  correctionLabel: {
    ...textStyles.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  correctionText: {
    ...textStyles.dialogue,
    color: colors.primary.gold,
    fontStyle: 'italic',
  },
  correctionExplanation: {
    ...textStyles.caption,
    color: colors.text.muted,
    marginTop: spacing[1],
  },
  feedbackActions: {
    gap: spacing[3],
    alignItems: 'center',
  },
  correctionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.tango,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
    width: '100%',
  },
  correctionButtonText: {
    ...textStyles.button,
    color: colors.text.primary,
  },
  skipButton: {
    paddingVertical: spacing[2],
  },
  skipButtonText: {
    ...textStyles.body,
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },
  
  // Correction practice styles
  correctionPracticeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    gap: spacing[5],
  },
  correctionPracticeTitle: {
    ...textStyles.h2,
    color: colors.text.primary,
    textAlign: 'center',
  },
  correctionPracticeSubtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  correctionTargetBox: {
    backgroundColor: colors.background.elevated,
    padding: spacing[5],
    borderRadius: borderRadius.xl,
    gap: spacing[3],
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: colors.primary.gold + '40',
  },
  correctionTargetText: {
    ...textStyles.dialogue,
    color: colors.primary.gold,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  correctionRecordingSection: {
    marginTop: spacing[4],
  },
  correctionPlaybackSection: {
    alignItems: 'center',
    gap: spacing[4],
    marginTop: spacing[4],
  },
  correctionSuccessBox: {
    alignItems: 'center',
    gap: spacing[2],
  },
  correctionSuccessText: {
    ...textStyles.body,
    color: colors.success,
    fontWeight: '600',
  },
  
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
  },
  continueButtonText: {
    ...textStyles.button,
    color: colors.neutral[950],
  },

  // Summary styles
  summaryScroll: {
    flex: 1,
  },
  summaryContent: {
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[6],
  },
  summaryHeader: {
    alignItems: 'center',
    gap: spacing[2],
  },
  completeLabel: {
    ...textStyles.overline,
    color: colors.primary.gold,
  },
  summaryTitle: {
    ...textStyles.h2,
    color: colors.text.primary,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing[4],
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    alignItems: 'center',
  },
  statBoxValue: {
    ...textStyles.h2,
    color: colors.text.primary,
  },
  statBoxLabel: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  journalPromptCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    width: '100%',
    gap: spacing[3],
  },
  journalPromptLabel: {
    ...textStyles.labelSmall,
    color: colors.primary.gold,
  },
  journalPromptText: {
    ...textStyles.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  journalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.neutral[800],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    marginTop: spacing[2],
  },
  journalButtonText: {
    ...textStyles.buttonSmall,
    color: colors.primary.gold,
  },
  finishButton: {
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius.xl,
    marginTop: spacing[4],
  },
  finishButtonText: {
    ...textStyles.button,
    color: colors.neutral[950],
  },

  // Grammar Reference Button & Panel Styles
  grammarRefButton: {
    position: 'absolute',
    bottom: spacing[4],
    alignSelf: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.full,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.accent.tango + '60',
    ...shadows.sm,
  },
  grammarRefButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  grammarRefButtonText: {
    ...textStyles.caption,
    color: colors.accent.tango,
    fontWeight: '600',
  },
  grammarPanelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  grammarPanelContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: height * 0.8,
    paddingBottom: spacing[6],
  },
  grammarPanelHandle: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  grammarPanelHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[600],
    borderRadius: 2,
  },
  grammarPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[800],
  },
  grammarPanelTitle: {
    ...textStyles.h3,
    color: colors.primary.gold,
  },
  grammarPanelSubtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  grammarPanelClose: {
    padding: spacing[1],
  },
  grammarPanelScroll: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  grammarPanelSection: {
    marginBottom: spacing[5],
  },
  grammarPanelSectionTitle: {
    ...textStyles.label,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  grammarPanelTriggers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  grammarPanelTriggerChip: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.full,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.primary.gold + '50',
  },
  grammarPanelTriggerText: {
    ...textStyles.caption,
    color: colors.primary.gold,
    fontWeight: '600',
  },
  grammarPanelExplanation: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  grammarPanelTable: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  grammarPanelTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[800],
  },
  grammarPanelTablePronoun: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  grammarPanelTableForm: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontWeight: '600',
  },
  grammarPanelUseCase: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  grammarPanelUseCaseTitle: {
    ...textStyles.caption,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  grammarPanelExample: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontStyle: 'italic',
  },
  grammarPanelExampleEn: {
    ...textStyles.caption,
    color: colors.text.muted,
    marginTop: spacing[1],
  },
  grammarPanelTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  grammarPanelTipText: {
    ...textStyles.caption,
    color: colors.text.secondary,
    flex: 1,
  },
});

