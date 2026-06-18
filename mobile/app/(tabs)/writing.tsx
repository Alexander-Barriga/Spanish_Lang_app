import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { requestMicrophoneAccess } from '../../src/utils/microphone';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../src/theme';
import { api, WritingExercise, UserCurriculumProgress } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

type ExerciseState = 'loading' | 'ready' | 'answering' | 'feedback' | 'complete';

interface ExerciseWithState extends WritingExercise {
  userAnswer?: string;
  isCorrect?: boolean;
  feedback?: Record<string, unknown>;
  completed?: boolean;
}

export default function WritingScreen() {
  const { user } = useAuth();
  const [state, setState] = useState<ExerciseState>('loading');
  const [progress, setProgress] = useState<UserCurriculumProgress | null>(null);
  const [exercises, setExercises] = useState<ExerciseWithState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [totalXpEarned, setTotalXpEarned] = useState(0);

  const recordingRef = React.useRef<Audio.Recording | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadExercises();
      } else {
        setState('ready');
      }
      return () => {
        cleanupRecording();
      };
    }, [user])
  );

  const loadExercises = async () => {
    if (!user) {
      setState('ready');
      return;
    }

    try {
      setState('loading');
      
      // Get user's curriculum progress
      const progressResult = await api.getUserCurriculumProgress();
      if (!progressResult.data?.progress || !progressResult.data.progress.placement_completed) {
        setState('ready');
        return;
      }

      const userProgress = progressResult.data.progress;
      setProgress(userProgress);

      // Get exercises for current week
      if (userProgress.level) {
        const exercisesResult = await api.getWritingExercises(
          userProgress.level,
          userProgress.current_week
        );

        if (exercisesResult.data?.exercises) {
          setExercises(exercisesResult.data.exercises.map(ex => ({
            ...ex,
            completed: false,
          })));
        }
      }

      setState('ready');
    } catch (error) {
      console.error('Error loading exercises:', error);
      setState('ready');
    }
  };

  const cleanupRecording = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        // Ignore
      }
      recordingRef.current = null;
    }
  };

  const startRecording = async () => {
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
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        Alert.alert('Error', 'Recording failed.');
        return;
      }

      // Transcribe
      const transcriptionResult = await api.transcribeAudio(uri);
      if (transcriptionResult.data?.text) {
        setUserInput(transcriptionResult.data.text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to process recording.');
    }
  };

  const handleSubmit = async () => {
    if (!userInput.trim() || !progress) return;

    const currentExercise = exercises[currentIndex];
    if (!currentExercise) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await api.submitWriting({
        exercise_type: currentExercise.type,
        curriculum_week: progress.current_week,
        prompt: currentExercise.prompt,
        correct_answer: currentExercise.answer,
        user_response: userInput.trim(),
        grammar_target: currentExercise.grammar_target,
      });

      if (result.data) {
        // Update exercise with feedback
        const updatedExercises = [...exercises];
        updatedExercises[currentIndex] = {
          ...currentExercise,
          userAnswer: userInput.trim(),
          isCorrect: result.data.is_correct,
          feedback: result.data.feedback,
          completed: true,
        };
        setExercises(updatedExercises);
        setTotalXpEarned(prev => prev + result.data.xp_earned);
        setState('feedback');
        
        if (result.data.is_correct) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } catch (error) {
      console.error('Error submitting:', error);
      Alert.alert('Error', 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserInput('');
      setState('ready');
    } else {
      setState('complete');
    }
  };

  const currentExercise = exercises[currentIndex];

  // No curriculum progress
  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
        </View>
      </SafeAreaView>
    );
  }

  // No exercises or not enrolled
  if (!progress?.placement_completed || exercises.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>✏️</Text>
          <Text style={styles.emptyTitle}>Writing Practice</Text>
          <Text style={styles.emptyText}>
            Complete the placement test to unlock personalized writing exercises.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // All exercises complete
  if (state === 'complete') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.completeContainer}>
          <Text style={styles.completeEmoji}>🎉</Text>
          <Text style={styles.completeTitle}>All Done!</Text>
          <Text style={styles.completeText}>
            You've completed today's writing exercises.
          </Text>
          <View style={styles.xpEarnedCard}>
            <Ionicons name="star" size={32} color={colors.primary.gold} />
            <Text style={styles.xpEarnedValue}>+{totalXpEarned} XP</Text>
            <Text style={styles.xpEarnedLabel}>Earned from Writing</Text>
          </View>
          <Pressable style={styles.resetButton} onPress={() => {
            setCurrentIndex(0);
            setUserInput('');
            setState('ready');
            setTotalXpEarned(0);
          }}>
            <Text style={styles.resetButtonText}>Practice Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Writing Practice</Text>
          <Text style={styles.progressText}>
            {currentIndex + 1} of {exercises.length}
          </Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Exercise Type Badge */}
          <View style={styles.typeBadge}>
            <Ionicons 
              name={
                currentExercise?.type === 'free_response' ? 'create' :
                currentExercise?.type === 'gap_fill' ? 'help-circle' : 'swap-horizontal'
              } 
              size={16} 
              color={colors.primary.gold} 
            />
            <Text style={styles.typeBadgeText}>
              {currentExercise?.type === 'free_response' ? 'Free Response' :
               currentExercise?.type === 'gap_fill' ? 'Gap Fill' : 'Transform'}
            </Text>
          </View>

          {/* Prompt */}
          <View style={styles.promptCard}>
            <Text style={styles.promptText}>{currentExercise?.prompt}</Text>
          </View>

          {/* Answer Input or Feedback */}
          {state === 'feedback' ? (
            <View style={styles.feedbackContainer}>
              <View style={[
                styles.feedbackHeader,
                currentExercise?.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect
              ]}>
                <Ionicons 
                  name={currentExercise?.isCorrect ? 'checkmark-circle' : 'close-circle'} 
                  size={24} 
                  color={currentExercise?.isCorrect ? colors.success : colors.error} 
                />
                <Text style={[
                  styles.feedbackTitle,
                  currentExercise?.isCorrect ? styles.feedbackTitleCorrect : styles.feedbackTitleIncorrect
                ]}>
                  {currentExercise?.isCorrect ? '¡Correcto!' : 'Not Quite'}
                </Text>
              </View>

              <View style={styles.feedbackBody}>
                <Text style={styles.feedbackLabel}>Your answer:</Text>
                <Text style={styles.feedbackAnswer}>{currentExercise?.userAnswer}</Text>

                {!currentExercise?.isCorrect && currentExercise?.answer && (
                  <>
                    <Text style={styles.feedbackLabel}>Correct answer:</Text>
                    <Text style={styles.feedbackCorrectAnswer}>{currentExercise?.answer}</Text>
                  </>
                )}

                {currentExercise?.feedback?.overall_feedback && (
                  <Text style={styles.feedbackMessage}>
                    {currentExercise.feedback.overall_feedback as string}
                  </Text>
                )}

                {currentExercise?.feedback?.explanation && (
                  <Text style={styles.feedbackExplanation}>
                    {currentExercise.feedback.explanation as string}
                  </Text>
                )}
              </View>

              <Pressable style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>
                  {currentIndex < exercises.length - 1 ? 'Next Exercise' : 'Finish'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={colors.neutral[900]} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder={
                  currentExercise?.type === 'free_response' 
                    ? 'Write your response here or use voice...' 
                    : 'Type your answer...'
                }
                placeholderTextColor={colors.neutral[500]}
                value={userInput}
                onChangeText={setUserInput}
                multiline
                textAlignVertical="top"
              />

              {/* Voice Input for free response */}
              {currentExercise?.type === 'free_response' && (
                <Pressable 
                  style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <Ionicons 
                    name={isRecording ? 'stop' : 'mic'} 
                    size={24} 
                    color={isRecording ? colors.error : colors.primary.gold} 
                  />
                  <Text style={[styles.voiceButtonText, isRecording && styles.voiceButtonTextActive]}>
                    {isRecording ? 'Stop Recording' : 'Use Voice'}
                  </Text>
                </Pressable>
              )}

              <Pressable 
                style={[styles.submitButton, !userInput.trim() && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!userInput.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.neutral[900]} />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Submit</Text>
                    <Ionicons name="checkmark" size={20} color={colors.neutral[900]} />
                  </>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[5],
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  emptyTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  emptyText: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[5],
  },
  completeEmoji: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  completeTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  completeText: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  xpEarnedCard: {
    alignItems: 'center',
    backgroundColor: colors.primary.gold + '15',
    padding: spacing[5],
    borderRadius: borderRadius.xl,
    marginBottom: spacing[5],
  },
  xpEarnedValue: {
    ...textStyles.h2,
    color: colors.primary.gold,
    marginTop: spacing[2],
  },
  xpEarnedLabel: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  resetButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
  },
  resetButtonText: {
    ...textStyles.body,
    color: colors.primary.gold,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
  },
  progressText: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[5],
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary.gold + '20',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
    gap: spacing[1.5],
    marginBottom: spacing[4],
  },
  typeBadgeText: {
    ...textStyles.labelSmall,
    color: colors.primary.gold,
  },
  promptCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  promptText: {
    ...textStyles.body,
    color: colors.text.primary,
    lineHeight: 24,
  },
  inputContainer: {
    gap: spacing[3],
  },
  textInput: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    minHeight: 120,
    ...textStyles.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  voiceButtonActive: {
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  voiceButtonText: {
    ...textStyles.body,
    color: colors.primary.gold,
  },
  voiceButtonTextActive: {
    color: colors.error,
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
  feedbackContainer: {
    gap: spacing[4],
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  feedbackCorrect: {
    backgroundColor: colors.success + '15',
  },
  feedbackIncorrect: {
    backgroundColor: colors.error + '15',
  },
  feedbackTitle: {
    ...textStyles.h4,
  },
  feedbackTitleCorrect: {
    color: colors.success,
  },
  feedbackTitleIncorrect: {
    color: colors.error,
  },
  feedbackBody: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  feedbackLabel: {
    ...textStyles.labelSmall,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  feedbackAnswer: {
    ...textStyles.body,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  feedbackCorrectAnswer: {
    ...textStyles.body,
    color: colors.success,
    marginBottom: spacing[3],
    fontWeight: '600',
  },
  feedbackMessage: {
    ...textStyles.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: spacing[2],
  },
  feedbackExplanation: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing[2],
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
  },
  nextButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
});

