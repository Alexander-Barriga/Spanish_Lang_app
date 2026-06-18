import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { requestMicrophoneAccess } from '../../src/utils/microphone';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../src/theme';
import { api, CurriculumWeek, DailyLesson, MCQQuestion, SpeakingPrompt } from '../../src/services/api';
import { TUTOR_CHARACTERS, DEFAULT_TUTOR_ID } from '../../src/config/constants';

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

type WorkoutPhase = 'loading' | 'intro' | 'recognition' | 'speaking' | 'summary';

interface MCQResult {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export default function WorkoutScreen() {
  const params = useLocalSearchParams<{ week: string; day: string; level: string }>();
  const weekNum = parseInt(params.week || '1');
  const dayNum = parseInt(params.day || '1');
  const level = (params.level || 'B1') as 'B1' | 'B2';

  const [phase, setPhase] = useState<WorkoutPhase>('loading');
  const [curriculum, setCurriculum] = useState<CurriculumWeek | null>(null);
  const [lesson, setLesson] = useState<DailyLesson | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // MCQ state
  const [currentMCQ, setCurrentMCQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [mcqResults, setMcqResults] = useState<MCQResult[]>([]);
  const [showMCQFeedback, setShowMCQFeedback] = useState(false);

  // Speaking state
  const [currentSpeaking, setCurrentSpeaking] = useState(0);
  const [speakingExchanges, setSpeakingExchanges] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isTutorSpeaking, setIsTutorSpeaking] = useState(false);
  const [speakingResponse, setSpeakingResponse] = useState<string | null>(null);

  // Summary state
  const [startTime] = useState(Date.now());
  const [xpEarned, setXpEarned] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadWorkout();
    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {
      // Ignore
    }
  };

  const loadWorkout = async () => {
    try {
      // Load curriculum week
      const result = await api.getCurriculumWeek(level, weekNum);
      
      if (result.data) {
        setCurriculum(result.data.week);
        
        // Find today's lesson
        const todayLesson = result.data.lessons.find(l => l.day_number === dayNum);
        setLesson(todayLesson || null);

        // Start a workout session
        const sessionResult = await api.startWorkout({
          session_type: 'daily_workout',
          curriculum_week: weekNum,
          curriculum_day: dayNum,
          grammar_focus: result.data.week.grammar_focus,
        });

        if (sessionResult.data) {
          setSessionId(sessionResult.data.session.id);
        }

        setPhase('intro');
      } else {
        Alert.alert('Error', 'Could not load workout');
        router.back();
      }
    } catch (error) {
      console.error('Error loading workout:', error);
      Alert.alert('Error', 'Could not load workout');
      router.back();
    }
  };

  const handleStartRecognition = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('recognition');
  };

  const handleSelectAnswer = (answer: string) => {
    if (showMCQFeedback) return;
    Haptics.selectionAsync();
    setSelectedAnswer(answer);
  };

  const handleSubmitMCQ = () => {
    if (!selectedAnswer || !lesson) return;

    const currentQ = lesson.mcq_questions[currentMCQ];
    const isCorrect = selectedAnswer === currentQ.correct;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const result: MCQResult = {
      question: currentQ.question,
      userAnswer: selectedAnswer,
      correctAnswer: currentQ.correct,
      isCorrect,
      explanation: currentQ.explanation,
    };

    setMcqResults([...mcqResults, result]);
    setShowMCQFeedback(true);

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const handleNextMCQ = () => {
    if (!lesson) return;

    if (currentMCQ < lesson.mcq_questions.length - 1) {
      setCurrentMCQ(currentMCQ + 1);
      setSelectedAnswer(null);
      setShowMCQFeedback(false);
    } else {
      // Move to speaking phase
      setPhase('speaking');
      playTutorPrompt();
    }
  };

  const playTutorPrompt = async (promptIndex?: number) => {
    const index = promptIndex ?? currentSpeaking;
    if (!lesson?.speaking_prompts[index]) return;

    try {
      setIsTutorSpeaking(true);
      const prompt = lesson.speaking_prompts[index];

      // Synthesize speech - returns ArrayBuffer
      const audioBuffer = await api.synthesizeSpeech(prompt.prompt);
      
      if (audioBuffer && audioBuffer.byteLength > 0) {
        // Convert ArrayBuffer to base64 data URI
        const base64 = arrayBufferToBase64(audioBuffer);
        const audioUri = `data:audio/mpeg;base64,${base64}`;
        
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true }
        );
        soundRef.current = sound;
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsTutorSpeaking(false);
          }
        });
      } else {
        // No audio - just continue without voice
        setIsTutorSpeaking(false);
      }
    } catch (error) {
      console.error('Error playing tutor prompt:', error);
      setIsTutorSpeaking(false);
    }
  };

  const startRecording = async () => {
    if (isTutorSpeaking) return;

    try {
      const hasMic = await requestMicrophoneAccess();
      if (!hasMic) {
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      
      recordingRef.current = recording;
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) return;

      // Transcribe
      const transcriptionResult = await api.transcribeAudio(uri);
      if (transcriptionResult.data?.transcript) {
        setSpeakingResponse(transcriptionResult.data.transcript);
        setSpeakingExchanges(speakingExchanges + 1);
      } else {
        Alert.alert('Error', 'Could not transcribe your speech. Please try again.');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleNextSpeaking = () => {
    if (!lesson) return;

    setSpeakingResponse(null);

    if (currentSpeaking < lesson.speaking_prompts.length - 1) {
      const nextIndex = currentSpeaking + 1;
      setCurrentSpeaking(nextIndex);
      playTutorPrompt(nextIndex); // Pass the new index directly to avoid stale state
    } else {
      // Complete workout
      completeWorkout();
    }
  };

  const completeWorkout = async () => {
    if (!sessionId) {
      setPhase('summary');
      return;
    }

    try {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const mcqCorrect = mcqResults.filter(r => r.isCorrect).length;
      const mcqTotal = mcqResults.length;
      const accuracy = mcqTotal > 0 ? (mcqCorrect / mcqTotal) * 100 : 0;

      const result = await api.completeWorkout(sessionId, {
        duration_seconds: duration,
        mcq_correct: mcqCorrect,
        mcq_total: mcqTotal,
        speaking_exchanges: speakingExchanges,
        grammar_accuracy: accuracy,
        subjunctive_uses: 0,
      });

      if (result.data) {
        setXpEarned(result.data.xp_earned);
      }

      // Advance curriculum
      await api.advanceCurriculum();

      setPhase('summary');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error completing workout:', error);
      setPhase('summary');
    }
  };

  const handleFinish = () => {
    router.replace('/(tabs)');
  };

  // Calculate stats for summary
  const mcqCorrect = mcqResults.filter(r => r.isCorrect).length;
  const mcqTotal = mcqResults.length;
  const accuracy = mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 100) : 0;

  // Loading state
  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Intro phase
  if (phase === 'intro' && curriculum && lesson) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.introHeader}>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.introContent}>
          <View style={styles.introBadge}>
            <Text style={styles.introBadgeText}>
              Week {weekNum} • Day {dayNum}
            </Text>
          </View>

          <Text style={styles.introTitle}>{curriculum.title_en}</Text>
          <Text style={styles.introTitleEs}>{curriculum.title_es}</Text>

          <View style={styles.introDescription}>
            <Text style={styles.introDescriptionText}>
              {curriculum.description || lesson.intro_text}
            </Text>
          </View>

          <View style={styles.triggersCard}>
            <Text style={styles.triggersTitle}>Key Triggers to Use:</Text>
            {curriculum.triggers.slice(0, 4).map((trigger, i) => (
              <View key={i} style={styles.triggerRow}>
                <Text style={styles.triggerBullet}>•</Text>
                <Text style={styles.triggerText}>{trigger}</Text>
              </View>
            ))}
          </View>

          <View style={styles.examplesCard}>
            <Text style={styles.examplesTitle}>Examples:</Text>
            {curriculum.example_sentences.slice(0, 2).map((ex, i) => (
              <View key={i} style={styles.exampleRow}>
                <Text style={styles.exampleSpanish}>{ex.spanish}</Text>
                <Text style={styles.exampleEnglish}>{ex.english}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.introFooter}>
          <Pressable style={styles.startButton} onPress={handleStartRecognition}>
            <Text style={styles.startButtonText}>Start Practice</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.neutral[900]} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Recognition (MCQ) phase
  if (phase === 'recognition' && lesson) {
    const currentQ = lesson.mcq_questions[currentMCQ];

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.phaseHeader}>
          <Text style={styles.phaseLabel}>Recognition</Text>
          <Text style={styles.phaseProgress}>
            {currentMCQ + 1} / {lesson.mcq_questions.length}
          </Text>
        </View>

        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentMCQ + 1) / lesson.mcq_questions.length) * 100}%` }
            ]} 
          />
        </View>

        <ScrollView contentContainerStyle={styles.mcqContent}>
          <Text style={styles.mcqQuestion}>{currentQ.question}</Text>

          <View style={styles.mcqOptions}>
            {currentQ.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = showMCQFeedback && option === currentQ.correct;
              const isWrong = showMCQFeedback && isSelected && option !== currentQ.correct;

              return (
                <Pressable
                  key={index}
                  style={[
                    styles.mcqOption,
                    isSelected && !showMCQFeedback && styles.mcqOptionSelected,
                    isCorrect && styles.mcqOptionCorrect,
                    isWrong && styles.mcqOptionWrong,
                  ]}
                  onPress={() => handleSelectAnswer(option)}
                  disabled={showMCQFeedback}
                >
                  <Text style={[
                    styles.mcqOptionText,
                    isSelected && !showMCQFeedback && styles.mcqOptionTextSelected,
                    isCorrect && styles.mcqOptionTextCorrect,
                    isWrong && styles.mcqOptionTextWrong,
                  ]}>
                    {option}
                  </Text>
                  {isCorrect && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  )}
                  {isWrong && (
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {showMCQFeedback && (
            <View style={styles.mcqFeedback}>
              <Text style={styles.mcqFeedbackText}>{currentQ.explanation}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.mcqFooter}>
          {!showMCQFeedback ? (
            <Pressable
              style={[styles.submitButton, !selectedAnswer && styles.submitButtonDisabled]}
              onPress={handleSubmitMCQ}
              disabled={!selectedAnswer}
            >
              <Text style={styles.submitButtonText}>Check Answer</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.submitButton} onPress={handleNextMCQ}>
              <Text style={styles.submitButtonText}>
                {currentMCQ < lesson.mcq_questions.length - 1 ? 'Next Question' : 'Start Speaking'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.neutral[900]} />
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Speaking phase
  if (phase === 'speaking' && lesson) {
    const currentPrompt = lesson.speaking_prompts[currentSpeaking];

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.phaseHeader}>
          <Text style={styles.phaseLabel}>Speaking Practice</Text>
          <Text style={styles.phaseProgress}>
            {currentSpeaking + 1} / {lesson.speaking_prompts.length}
          </Text>
        </View>

        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentSpeaking + 1) / lesson.speaking_prompts.length) * 100}%` }
            ]} 
          />
        </View>

        <ScrollView contentContainerStyle={styles.speakingContent}>
          <View style={styles.promptCard}>
            <Text style={styles.promptLabel}>Task:</Text>
            <Text style={styles.promptText}>{currentPrompt?.prompt}</Text>
            <Text style={styles.promptHint}>Hint: {currentPrompt?.hint}</Text>
          </View>

          {isTutorSpeaking && (
            <View style={styles.tutorSpeaking}>
              <ActivityIndicator color={colors.primary.gold} />
              <Text style={styles.tutorSpeakingText}>Tutor is speaking...</Text>
            </View>
          )}

          {speakingResponse && (
            <View style={styles.userResponse}>
              <Text style={styles.userResponseLabel}>You said:</Text>
              <Text style={styles.userResponseText}>{speakingResponse}</Text>
            </View>
          )}

          <View style={styles.speakingControls}>
            <Pressable
              style={[styles.recordButton, isRecording && styles.recordButtonActive]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isTutorSpeaking}
            >
              <Ionicons 
                name={isRecording ? 'stop' : 'mic'} 
                size={48} 
                color={isRecording ? colors.error : colors.neutral[900]} 
              />
            </Pressable>
            <Text style={styles.recordHint}>
              {isTutorSpeaking ? 'Listen to the tutor...' :
               isRecording ? 'Tap to stop' : 'Tap to respond'}
            </Text>
          </View>
        </ScrollView>

        {speakingResponse && (
          <View style={styles.speakingFooter}>
            <Pressable style={styles.submitButton} onPress={handleNextSpeaking}>
              <Text style={styles.submitButtonText}>
                {currentSpeaking < lesson.speaking_prompts.length - 1 ? 'Next Prompt' : 'Finish Workout'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.neutral[900]} />
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Summary phase
  if (phase === 'summary') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.summaryContent}>
          <Text style={styles.summaryEmoji}>🎉</Text>
          <Text style={styles.summaryTitle}>Workout Complete!</Text>

          <LinearGradient
            colors={[colors.primary.gold, '#e5a83a']}
            style={styles.xpCard}
          >
            <Ionicons name="star" size={40} color={colors.neutral[900]} />
            <Text style={styles.xpValue}>+{xpEarned} XP</Text>
            <Text style={styles.xpLabel}>Earned</Text>
          </LinearGradient>

          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Recognition Quiz</Text>
              <Text style={styles.statValue}>{mcqCorrect}/{mcqTotal} correct</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Accuracy</Text>
              <Text style={styles.statValue}>{accuracy}%</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Speaking Exchanges</Text>
              <Text style={styles.statValue}>{speakingExchanges}</Text>
            </View>
          </View>

          <View style={styles.nextWeekCard}>
            <Ionicons name="calendar" size={24} color={colors.primary.gold} />
            <Text style={styles.nextWeekText}>
              {dayNum < 7 
                ? `Come back tomorrow for Day ${dayNum + 1}!`
                : 'Week complete! New content unlocks tomorrow.'}
            </Text>
          </View>

          <Pressable style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>Back to Home</Text>
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
  },
  loadingText: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginTop: spacing[3],
  },
  introHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing[4],
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introContent: {
    padding: spacing[5],
    alignItems: 'center',
  },
  introBadge: {
    backgroundColor: colors.primary.gold + '20',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    marginBottom: spacing[4],
  },
  introBadgeText: {
    ...textStyles.labelSmall,
    color: colors.primary.gold,
  },
  introTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[1],
  },
  introTitleEs: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  introDescription: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  introDescriptionText: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  triggersCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    width: '100%',
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.primary.gold + '30',
  },
  triggersTitle: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  triggerBullet: {
    color: colors.primary.gold,
    marginRight: spacing[2],
    fontSize: 16,
  },
  triggerText: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  examplesCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  examplesTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  exampleRow: {
    marginBottom: spacing[3],
  },
  exampleSpanish: {
    ...textStyles.body,
    color: colors.text.primary,
    marginBottom: spacing[0.5],
  },
  exampleEnglish: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  introFooter: {
    padding: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
  },
  startButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  phaseLabel: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  phaseProgress: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.neutral[700],
    marginHorizontal: spacing[5],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.gold,
    borderRadius: 2,
  },
  mcqContent: {
    padding: spacing[5],
  },
  mcqQuestion: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[5],
    lineHeight: 28,
  },
  mcqOptions: {
    gap: spacing[3],
  },
  mcqOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  mcqOptionSelected: {
    borderColor: colors.primary.gold,
    backgroundColor: colors.primary.gold + '15',
  },
  mcqOptionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.success + '15',
  },
  mcqOptionWrong: {
    borderColor: colors.error,
    backgroundColor: colors.error + '15',
  },
  mcqOptionText: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  mcqOptionTextSelected: {
    color: colors.primary.gold,
    fontWeight: '600',
  },
  mcqOptionTextCorrect: {
    color: colors.success,
    fontWeight: '600',
  },
  mcqOptionTextWrong: {
    color: colors.error,
    fontWeight: '600',
  },
  mcqFeedback: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginTop: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  mcqFeedbackText: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  mcqFooter: {
    padding: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
  speakingContent: {
    padding: spacing[5],
    alignItems: 'center',
  },
  promptCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    width: '100%',
    marginBottom: spacing[5],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  promptLabel: {
    ...textStyles.labelSmall,
    color: colors.primary.gold,
    marginBottom: spacing[2],
  },
  promptText: {
    ...textStyles.body,
    color: colors.text.primary,
    lineHeight: 24,
    marginBottom: spacing[2],
  },
  promptHint: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  tutorSpeaking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  tutorSpeakingText: {
    ...textStyles.body,
    color: colors.primary.gold,
  },
  userResponse: {
    backgroundColor: colors.primary.gold + '15',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    width: '100%',
    marginBottom: spacing[5],
    borderWidth: 1,
    borderColor: colors.primary.gold + '30',
  },
  userResponseLabel: {
    ...textStyles.labelSmall,
    color: colors.primary.gold,
    marginBottom: spacing[1],
  },
  userResponseText: {
    ...textStyles.body,
    color: colors.text.primary,
  },
  speakingControls: {
    alignItems: 'center',
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
    ...shadows.lg,
  },
  recordButtonActive: {
    backgroundColor: colors.background.card,
    borderWidth: 3,
    borderColor: colors.error,
  },
  recordHint: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  speakingFooter: {
    padding: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  summaryContent: {
    padding: spacing[5],
    alignItems: 'center',
  },
  summaryEmoji: {
    fontSize: 64,
    marginVertical: spacing[4],
  },
  summaryTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginBottom: spacing[5],
  },
  xpCard: {
    alignItems: 'center',
    padding: spacing[6],
    borderRadius: borderRadius['2xl'],
    width: '100%',
    marginBottom: spacing[5],
  },
  xpValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.neutral[900],
    marginTop: spacing[2],
  },
  xpLabel: {
    ...textStyles.body,
    color: colors.neutral[700],
  },
  statsCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    width: '100%',
    marginBottom: spacing[5],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  statDivider: {
    height: 1,
    backgroundColor: colors.border.default,
  },
  statLabel: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  statValue: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  nextWeekCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.gold + '15',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    width: '100%',
    marginBottom: spacing[6],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.primary.gold + '30',
  },
  nextWeekText: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  finishButton: {
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.xl,
    width: '100%',
    alignItems: 'center',
  },
  finishButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
});

