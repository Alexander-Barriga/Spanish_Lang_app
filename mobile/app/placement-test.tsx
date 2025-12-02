import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { colors, textStyles, spacing, borderRadius, shadows } from '../src/theme';
import { api, PlacementQuestion } from '../src/services/api';

type TestPhase = 'intro' | 'mcq' | 'speaking' | 'processing' | 'results';

interface MCQAnswer {
  question_id: number;
  selected: string;
}

interface TestResults {
  mcq_score: number;
  speaking_score: number;
  combined_score: number;
  assigned_level: 'B1' | 'B2';
  message: string;
}

export default function PlacementTestScreen() {
  const [phase, setPhase] = useState<TestPhase>('intro');
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [speakingPrompt, setSpeakingPrompt] = useState<{ prompt_es: string; prompt_en: string } | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<MCQAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [testId, setTestId] = useState<string | null>(null);
  const [results, setResults] = useState<TestResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadQuestions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanupRecording();
    };
  }, []);

  const loadQuestions = async () => {
    try {
      const result = await api.getPlacementQuestions();
      if (result.data) {
        setQuestions(result.data.questions);
        setSpeakingPrompt(result.data.speaking_prompt);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      Alert.alert('Error', 'Failed to load placement test. Please try again.');
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

  const handleStartTest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('mcq');
  };

  const handleSelectOption = (option: string) => {
    Haptics.selectionAsync();
    setSelectedOption(option);
  };

  const handleNextQuestion = () => {
    if (!selectedOption) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newAnswers = [...answers, {
      question_id: questions[currentQuestion].id,
      selected: selectedOption,
    }];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Submit MCQ answers and move to speaking
      submitMCQAnswers(newAnswers);
    }
  };

  const submitMCQAnswers = async (finalAnswers: MCQAnswer[]) => {
    setIsLoading(true);
    try {
      const result = await api.submitPlacementMCQ(finalAnswers);
      if (result.data) {
        setTestId(result.data.test_id);
        setPhase('speaking');
      } else {
        Alert.alert('Error', 'Failed to submit answers. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting MCQ:', error);
      Alert.alert('Error', 'Failed to submit answers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone access.');
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
      setRecordingDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsRecording(false);
      setPhase('processing');

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        Alert.alert('Error', 'Recording failed. Please try again.');
        setPhase('speaking');
        return;
      }

      // Transcribe the recording
      const transcriptionResult = await api.transcribeAudio(uri);
      
      if (!transcriptionResult.data?.transcript) {
        Alert.alert('Error', 'Could not transcribe your speech. Please try again.');
        setPhase('speaking');
        return;
      }

      // Submit speaking response
      if (testId) {
        const speakingResult = await api.submitPlacementSpeaking(
          testId,
          transcriptionResult.data.transcript
        );

        if (speakingResult.data) {
          setResults({
            mcq_score: speakingResult.data.mcq_score,
            speaking_score: speakingResult.data.speaking_score,
            combined_score: speakingResult.data.combined_score,
            assigned_level: speakingResult.data.assigned_level,
            message: speakingResult.data.message,
          });
          setPhase('results');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert('Error', 'Failed to process your speaking response.');
          setPhase('speaking');
        }
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      Alert.alert('Error', 'Failed to process your recording. Please try again.');
      setPhase('speaking');
    }
  };

  const handleSkipTest = async () => {
    Alert.alert(
      'Skip Placement Test',
      'Choose your level manually. You can always retake the test later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'B1 (Intermediate)',
          onPress: () => skipToLevel('B1'),
        },
        {
          text: 'B2 (Upper Intermediate)',
          onPress: () => skipToLevel('B2'),
        },
      ]
    );
  };

  const skipToLevel = async (level: 'B1' | 'B2') => {
    setIsLoading(true);
    try {
      const result = await api.skipPlacement(level);
      if (result.data) {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error skipping placement:', error);
      Alert.alert('Error', 'Failed to skip placement. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render intro phase
  if (phase === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.introContainer}>
            <Text style={styles.introEmoji}>🎯</Text>
            <Text style={styles.introTitle}>Placement Test</Text>
            <Text style={styles.introSubtitle}>
              Let's find your Spanish level
            </Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="help-circle" size={24} color={colors.primary.gold} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>6 Grammar Questions</Text>
                  <Text style={styles.infoDescription}>Multiple choice, ~3 minutes</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="mic" size={24} color={colors.primary.gold} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>1 Speaking Prompt</Text>
                  <Text style={styles.infoDescription}>30-60 seconds of speaking</Text>
                </View>
              </View>
            </View>

            <Text style={styles.infoNote}>
              This test helps us personalize your learning path. Answer honestly for the best results!
            </Text>

            <Pressable style={styles.primaryButton} onPress={handleStartTest}>
              <Text style={styles.primaryButtonText}>Start Test</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.neutral[900]} />
            </Pressable>

            <Pressable style={styles.skipButton} onPress={handleSkipTest}>
              <Text style={styles.skipButtonText}>Skip & Choose Level</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render MCQ phase
  if (phase === 'mcq') {
    const question = questions[currentQuestion];
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.progressText}>
            Question {currentQuestion + 1} of {questions.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentQuestion + 1) / questions.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.questionContainer}>
          <Text style={styles.questionText}>{question?.text}</Text>

          <View style={styles.optionsContainer}>
            {question?.options.map((option, index) => (
              <Pressable
                key={index}
                style={[
                  styles.optionButton,
                  selectedOption === option && styles.optionButtonSelected,
                ]}
                onPress={() => handleSelectOption(option)}
              >
                <Text style={[
                  styles.optionText,
                  selectedOption === option && styles.optionTextSelected,
                ]}>
                  {option}
                </Text>
                {selectedOption === option && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary.gold} />
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.nextButton, !selectedOption && styles.nextButtonDisabled]}
            onPress={handleNextQuestion}
            disabled={!selectedOption || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.neutral[900]} />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentQuestion < questions.length - 1 ? 'Next' : 'Continue to Speaking'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={colors.neutral[900]} />
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Render speaking phase
  if (phase === 'speaking') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.progressText}>Speaking Assessment</Text>
        </View>

        <ScrollView contentContainerStyle={styles.speakingContainer}>
          <Text style={styles.speakingEmoji}>🎙️</Text>
          <Text style={styles.speakingTitle}>Now, let's hear you speak!</Text>
          
          <View style={styles.promptCard}>
            <Text style={styles.promptLabel}>Your Prompt:</Text>
            <Text style={styles.promptTextEs}>{speakingPrompt?.prompt_es}</Text>
            <Text style={styles.promptTextEn}>{speakingPrompt?.prompt_en}</Text>
          </View>

          <Text style={styles.speakingTip}>
            Speak for 30-60 seconds. Take your time and speak naturally.
          </Text>

          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>
                Recording... {formatTime(recordingDuration)}
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Ionicons 
              name={isRecording ? 'stop' : 'mic'} 
              size={48} 
              color={isRecording ? colors.error : colors.neutral[900]} 
            />
          </Pressable>

          <Text style={styles.recordHint}>
            {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render processing phase
  if (phase === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
          <Text style={styles.processingText}>Analyzing your responses...</Text>
          <Text style={styles.processingSubtext}>This may take a moment</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render results phase
  if (phase === 'results' && results) {
    const levelColor = results.assigned_level === 'B2' ? '#4CAF50' : '#2196F3';
    
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultsContainer}>
          <Text style={styles.resultsEmoji}>🎉</Text>
          <Text style={styles.resultsTitle}>Test Complete!</Text>

          <LinearGradient
            colors={[levelColor, levelColor + 'CC']}
            style={styles.levelBadge}
          >
            <Text style={styles.levelLabel}>Your Level</Text>
            <Text style={styles.levelValue}>{results.assigned_level}</Text>
            <Text style={styles.levelDescription}>
              {results.assigned_level === 'B2' ? 'Upper Intermediate' : 'Intermediate'}
            </Text>
          </LinearGradient>

          <View style={styles.scoresCard}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Grammar Quiz</Text>
              <Text style={styles.scoreValue}>{results.mcq_score}%</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Speaking</Text>
              <Text style={styles.scoreValue}>{results.speaking_score}%</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Overall</Text>
              <Text style={[styles.scoreValue, styles.scoreValueHighlight]}>
                {results.combined_score}%
              </Text>
            </View>
          </View>

          <Text style={styles.resultsMessage}>
            {results.message}
          </Text>

          <View style={styles.nextStepsCard}>
            <Text style={styles.nextStepsTitle}>What's Next?</Text>
            <Text style={styles.nextStepsText}>
              Your personalized 12-week curriculum is ready! You'll focus on{' '}
              {results.assigned_level === 'B2' 
                ? 'advanced subjunctive forms and complex conditionals'
                : 'present subjunctive foundations and everyday usage'
              }.
            </Text>
          </View>

          <Pressable style={styles.primaryButton} onPress={handleFinish}>
            <Text style={styles.primaryButtonText}>Start Learning</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.neutral[900]} />
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing[5],
  },
  introContainer: {
    alignItems: 'center',
  },
  introEmoji: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  introTitle: {
    ...textStyles.h2,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  introSubtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing[6],
  },
  infoCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    width: '100%',
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  infoTextContainer: {
    marginLeft: spacing[4],
    flex: 1,
  },
  infoLabel: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  infoDescription: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  infoNote: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
    width: '100%',
    marginBottom: spacing[3],
  },
  primaryButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
  skipButton: {
    paddingVertical: spacing[3],
  },
  skipButtonText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  progressText: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.neutral[700],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.gold,
    borderRadius: borderRadius.full,
  },
  questionContainer: {
    padding: spacing[5],
    flexGrow: 1,
  },
  questionText: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[6],
    lineHeight: 28,
  },
  optionsContainer: {
    gap: spacing[3],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  optionButtonSelected: {
    borderColor: colors.primary.gold,
    backgroundColor: colors.primary.gold + '15',
  },
  optionText: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primary.gold,
    fontWeight: '600',
  },
  footer: {
    padding: spacing[5],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
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
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
  speakingContainer: {
    flexGrow: 1,
    alignItems: 'center',
    padding: spacing[5],
  },
  speakingEmoji: {
    fontSize: 48,
    marginBottom: spacing[3],
  },
  speakingTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[5],
  },
  promptCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    width: '100%',
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  promptLabel: {
    ...textStyles.labelSmall,
    color: colors.primary.gold,
    marginBottom: spacing[2],
  },
  promptTextEs: {
    ...textStyles.body,
    color: colors.text.primary,
    marginBottom: spacing[2],
    lineHeight: 24,
  },
  promptTextEn: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  speakingTip: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
    marginRight: spacing[2],
  },
  recordingText: {
    ...textStyles.body,
    color: colors.error,
    fontWeight: '600',
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
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[5],
  },
  processingText: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginTop: spacing[5],
  },
  processingSubtext: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginTop: spacing[2],
  },
  resultsContainer: {
    flexGrow: 1,
    alignItems: 'center',
    padding: spacing[5],
  },
  resultsEmoji: {
    fontSize: 64,
    marginBottom: spacing[3],
  },
  resultsTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginBottom: spacing[5],
  },
  levelBadge: {
    alignItems: 'center',
    padding: spacing[5],
    borderRadius: borderRadius['2xl'],
    width: '100%',
    marginBottom: spacing[5],
  },
  levelLabel: {
    ...textStyles.labelSmall,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing[1],
  },
  levelValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    marginBottom: spacing[1],
  },
  levelDescription: {
    ...textStyles.body,
    color: 'rgba(255,255,255,0.9)',
  },
  scoresCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    width: '100%',
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  scoreDivider: {
    height: 1,
    backgroundColor: colors.border.default,
  },
  scoreLabel: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  scoreValue: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  scoreValueHighlight: {
    color: colors.primary.gold,
    fontSize: 18,
  },
  resultsMessage: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  nextStepsCard: {
    backgroundColor: colors.primary.gold + '15',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    width: '100%',
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: colors.primary.gold + '30',
  },
  nextStepsTitle: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  nextStepsText: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

