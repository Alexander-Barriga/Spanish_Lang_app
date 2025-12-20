import { useState, useEffect } from 'react';
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
import * as Haptics from 'expo-haptics';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../../../src/theme';
import { api } from '../../../../src/services/api';

type GymPhase = 'loading' | 'intro' | 'questions' | 'summary';

interface MCQQuestion {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  isPersonalized?: boolean;
}

interface EpisodeInfo {
  id: string;
  title_es: string;
  title_en: string;
  grammar_focus: string;
  grammar_triggers: string[];
}

interface MCQResult {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export default function GrammarGymScreen() {
  const params = useLocalSearchParams<{ articleId: string }>();
  const articleId = params.articleId;

  const [phase, setPhase] = useState<GymPhase>('loading');
  const [episode, setEpisode] = useState<EpisodeInfo | null>(null);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [results, setResults] = useState<MCQResult[]>([]);
  const [xpEarned, setXpEarned] = useState(0);
  const [episodeId, setEpisodeId] = useState<string | null>(null);

  useEffect(() => {
    loadGymData();
  }, [articleId]);

  const loadGymData = async () => {
    try {
      // First, get the episode ID from the article
      const articleResult = await api.getEpisodeArticle(articleId);
      if (!articleResult.data?.article) {
        Alert.alert('Error', 'Could not load article data');
        router.back();
        return;
      }

      const epId = articleResult.data.article.episode_id;
      setEpisodeId(epId);

      // Fetch grammar gym questions
      const gymResult = await api.getGrammarGymQuestions(epId);
      
      if (gymResult.error) {
        if (gymResult.error.includes('Writing exercise required')) {
          Alert.alert(
            'Writing Required',
            'You must complete the writing exercise before accessing the Grammar Gym.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }
        Alert.alert('Error', gymResult.error);
        router.back();
        return;
      }

      if (gymResult.data) {
        setEpisode(gymResult.data.episode);
        setQuestions(gymResult.data.questions);
        setPhase('intro');
      }
    } catch (error) {
      console.error('Error loading gym data:', error);
      Alert.alert('Error', 'Could not load Grammar Gym');
      router.back();
    }
  };

  const handleStartQuestions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('questions');
  };

  const handleSelectAnswer = (answer: string) => {
    if (showFeedback) return;
    Haptics.selectionAsync();
    setSelectedAnswer(answer);
  };

  const handleCheckAnswer = () => {
    if (!selectedAnswer) return;

    const currentQ = questions[currentQuestion];
    const isCorrect = selectedAnswer === currentQ.correct;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result: MCQResult = {
      question: currentQ.question,
      userAnswer: selectedAnswer,
      correctAnswer: currentQ.correct,
      isCorrect,
      explanation: currentQ.explanation,
    };

    setResults([...results, result]);
    setShowFeedback(true);

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      completeGym();
    }
  };

  const completeGym = async () => {
    if (!episodeId) return;

    try {
      const correctAnswers = results.filter(r => r.isCorrect).length + 
        (selectedAnswer === questions[currentQuestion]?.correct ? 1 : 0);
      const totalQuestions = questions.length;

      const result = await api.completeGrammarGym(episodeId, {
        correctAnswers,
        totalQuestions,
        results: results,
      });

      if (result.data) {
        setXpEarned(result.data.xpEarned);
      }

      setPhase('summary');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error completing gym:', error);
      setPhase('summary');
    }
  };

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (episodeId) {
      router.replace({
        pathname: '/',
        params: { episodeId },
      });
    } else {
      router.replace('/');
    }
  };

  // Calculate stats
  const correctCount = results.filter(r => r.isCorrect).length;
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

  // Loading phase
  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
          <Text style={styles.loadingText}>Loading Grammar Gym...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Intro phase
  if (phase === 'intro' && episode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.introContent}>
          <View style={styles.gymIcon}>
            <Text style={styles.gymEmoji}>🏋️</Text>
          </View>

          <Text style={styles.introTitle}>Grammar Gym</Text>
          <Text style={styles.introSubtitle}>
            {episode.title_es}
          </Text>

          <View style={styles.focusCard}>
            <Text style={styles.focusLabel}>Focus:</Text>
            <Text style={styles.focusText}>
              {episode.grammar_focus.replace(/_/g, ' ')}
            </Text>
          </View>

          <View style={styles.triggersCard}>
            <Text style={styles.triggersTitle}>Key Triggers:</Text>
            {episode.grammar_triggers.slice(0, 4).map((trigger, i) => (
              <View key={i} style={styles.triggerRow}>
                <Text style={styles.triggerBullet}>•</Text>
                <Text style={styles.triggerText}>{trigger}</Text>
              </View>
            ))}
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={colors.primary.gold} />
            <Text style={styles.infoText}>
              {questions.length} questions based on your lesson and writing practice
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.startButton} onPress={handleStartQuestions}>
            <Text style={styles.startButtonText}>Let's Practice!</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.neutral[900]} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Questions phase
  if (phase === 'questions' && questions.length > 0) {
    const currentQ = questions[currentQuestion];

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionPhase}>Grammar Gym</Text>
          <Text style={styles.questionProgress}>
            {currentQuestion + 1} / {questions.length}
          </Text>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentQuestion + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.questionContent}>
          {currentQ.isPersonalized && (
            <View style={styles.personalizedBadge}>
              <Ionicons name="sparkles" size={14} color={colors.primary.gold} />
              <Text style={styles.personalizedText}>Personalized for you</Text>
            </View>
          )}

          <Text style={styles.questionText}>{currentQ.question}</Text>

          <View style={styles.optionsContainer}>
            {currentQ.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = showFeedback && option === currentQ.correct;
              const isWrong = showFeedback && isSelected && option !== currentQ.correct;

              return (
                <Pressable
                  key={index}
                  style={[
                    styles.optionButton,
                    isSelected && !showFeedback && styles.optionSelected,
                    isCorrect && styles.optionCorrect,
                    isWrong && styles.optionWrong,
                  ]}
                  onPress={() => handleSelectAnswer(option)}
                  disabled={showFeedback}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && !showFeedback && styles.optionTextSelected,
                      isCorrect && styles.optionTextCorrect,
                      isWrong && styles.optionTextWrong,
                    ]}
                  >
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

          {showFeedback && (
            <View style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <Ionicons
                  name={selectedAnswer === currentQ.correct ? 'checkmark-circle' : 'information-circle'}
                  size={20}
                  color={selectedAnswer === currentQ.correct ? colors.success : colors.primary.gold}
                />
                <Text
                  style={[
                    styles.feedbackTitle,
                    { color: selectedAnswer === currentQ.correct ? colors.success : colors.primary.gold },
                  ]}
                >
                  {selectedAnswer === currentQ.correct ? '¡Correcto!' : 'Explanation'}
                </Text>
              </View>
              <Text style={styles.feedbackText}>{currentQ.explanation}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {!showFeedback ? (
            <Pressable
              onPress={handleCheckAnswer}
              disabled={!selectedAnswer}
              style={!selectedAnswer && styles.checkButtonDisabled}
            >
              <LinearGradient
                colors={['#B3F5FF', '#00B8DB']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.checkButton}
              >
                <Text style={styles.checkButtonText}>Check Answer</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable onPress={handleNextQuestion}>
              <LinearGradient
                colors={['#B3F5FF', '#00B8DB']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.nextButton}
              >
                <Text style={styles.nextButtonText}>
                  {currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={colors.neutral[900]} />
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Summary phase
  if (phase === 'summary') {
    const finalCorrect = results.filter(r => r.isCorrect).length;
    const finalAccuracy = questions.length > 0 ? Math.round((finalCorrect / questions.length) * 100) : 0;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.summaryContent}>
          <Text style={styles.summaryEmoji}>
            {finalAccuracy >= 80 ? '🎉' : finalAccuracy >= 50 ? '👍' : '💪'}
          </Text>
          <Text style={styles.summaryTitle}>
            {finalAccuracy >= 80 ? '¡Excelente!' : finalAccuracy >= 50 ? '¡Buen trabajo!' : '¡Sigue practicando!'}
          </Text>

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
              <Text style={styles.statLabel}>Correct Answers</Text>
              <Text style={styles.statValue}>{finalCorrect}/{questions.length}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Accuracy</Text>
              <Text style={styles.statValue}>{finalAccuracy}%</Text>
            </View>
          </View>

          <View style={styles.encouragementCard}>
            <Ionicons name="heart" size={24} color={colors.primary.gold} />
            <Text style={styles.encouragementText}>
              {finalAccuracy >= 80
                ? 'You really understand this grammar concept!'
                : finalAccuracy >= 50
                ? 'Keep practicing and you\'ll master this soon!'
                : 'Practice makes perfect. Try the writing exercise again!'}
            </Text>
          </View>

          <Pressable onPress={handleGoHome}>
            <LinearGradient
              colors={['#B3F5FF', '#00B8DB']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.homeButton}
            >
              <Text style={styles.homeButtonText}>Back to Home</Text>
            </LinearGradient>
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
  header: {
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
  gymIcon: {
    marginBottom: spacing[4],
  },
  gymEmoji: {
    fontSize: 64,
  },
  introTitle: {
    ...textStyles.h2,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  introSubtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing[5],
  },
  focusCard: {
    backgroundColor: colors.primary.gold + '15',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    width: '100%',
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.primary.gold + '30',
  },
  focusLabel: {
    ...textStyles.labelSmall,
    color: colors.primary.gold,
    marginBottom: spacing[1],
  },
  focusText: {
    ...textStyles.h4,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  triggersCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    width: '100%',
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  triggersTitle: {
    ...textStyles.body,
    color: colors.text.primary,
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
    color: colors.text.secondary,
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    width: '100%',
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  infoText: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    flex: 1,
  },
  footer: {
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
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  questionPhase: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  questionProgress: {
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
  questionContent: {
    padding: spacing[5],
  },
  personalizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.gold + '15',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing[3],
    gap: spacing[1],
  },
  personalizedText: {
    ...textStyles.caption,
    color: colors.primary.gold,
    fontWeight: '500',
  },
  questionText: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[5],
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
  optionSelected: {
    borderColor: colors.primary.gold,
    backgroundColor: colors.primary.gold + '15',
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.success + '15',
  },
  optionWrong: {
    borderColor: colors.error,
    backgroundColor: colors.error + '15',
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
  optionTextCorrect: {
    color: colors.success,
    fontWeight: '600',
  },
  optionTextWrong: {
    color: colors.error,
    fontWeight: '600',
  },
  feedbackCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginTop: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  feedbackTitle: {
    ...textStyles.body,
    fontWeight: '600',
  },
  feedbackText: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  checkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
  },
  checkButtonDisabled: {
    opacity: 0.5,
  },
  checkButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
  },
  nextButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
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
  encouragementCard: {
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
  encouragementText: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  homeButton: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.xl,
    width: '100%',
    alignItems: 'center',
  },
  homeButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
});

