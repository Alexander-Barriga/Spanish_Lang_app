import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../../../../../src/services/api';
import { colors, textStyles, spacing, borderRadius } from '../../../../../src/theme';

interface GrammarError {
  type: string;
  original: string;
  correction: string;
  explanation: string;
}

interface VocabSuggestion {
  original: string;
  alternative: string;
  context: string;
}

interface WritingFeedback {
  overallScore: number;
  grammarAnalysis: {
    correctUsage: string[];
    errors: GrammarError[];
    targetGrammarUsage: {
      used: boolean;
      examples: string[];
      feedback: string;
    };
  };
  topicRelevance?: {
    onTopic: boolean;
    relevanceScore: number;
    feedback: string;
  };
  vocabularyAnalysis: {
    level: string;
    richness: number;
    suggestions: VocabSuggestion[];
  };
  styleFeedback: {
    coherence: number;
    tone: string;
    strengths: string[];
    improvements: string[];
  };
  encouragement: string;
  summary: string;
}

interface SubmissionData {
  id: string;
  episode_id: string;
  submission_text: string;
  grammar_score: number;
  word_count: number;
  completed_at: string;
  episode_articles?: {
    title: string;
    grammar_focus: string;
    writing_exercise_prompt: string;
  };
  episodes?: {
    title_es: string;
    title_en: string;
  };
}

export default function FeedbackScreen() {
  const { articleId, submissionId } = useLocalSearchParams<{
    articleId: string;
    submissionId: string;
  }>();
  const [isLoading, setIsLoading] = useState(true);
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['grammar', 'topic'])
  );

  useEffect(() => {
    loadFeedback();
  }, [submissionId]);

  const loadFeedback = async () => {
    if (!submissionId) return;

    try {
      setIsLoading(true);
      const result = await api.getEpisodeArticleFeedback(submissionId);

      if (result.data) {
        setSubmission(result.data.submission);
        setFeedback(result.data.feedback);
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to home with the episode context so it shows the correct episode
    if (submission?.episode_id) {
      router.replace({
        pathname: '/',
        params: { episodeId: submission.episode_id },
      });
    } else {
      router.replace('/');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.primary.gold;
    if (score >= 40) return colors.warning;
    return colors.error;
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🌟';
    if (score >= 80) return '✨';
    if (score >= 70) return '👏';
    if (score >= 60) return '👍';
    return '💪';
  };

  const formatGrammarFocus = (focus: string) => {
    return focus?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || '';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
          <Text style={styles.loadingText}>Analyzing your writing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!submission || !feedback) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.text.secondary} />
          <Text style={styles.errorText}>Feedback not found</Text>
          <Pressable onPress={handleBack} style={styles.backButtonError}>
            <Text style={styles.backButtonTextError}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const score = feedback.overallScore || submission.grammar_score || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Your Feedback</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreEmoji}>{getScoreEmoji(score)}</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>
              {Math.round(score)}
            </Text>
            <Text style={styles.scoreLabel}>out of 100</Text>
          </View>
          <Text style={styles.summaryText}>{feedback.summary}</Text>
        </View>

        {/* Encouragement from Florencia */}
        <View style={styles.encouragementCard}>
          <View style={styles.florenciaHeader}>
            <View style={styles.florenciaAvatar}>
              <Text style={styles.florenciaInitial}>F</Text>
            </View>
            <View>
              <Text style={styles.florenciaName}>Florencia</Text>
              <Text style={styles.florenciaRole}>Tu profesora</Text>
            </View>
          </View>
          <Text style={styles.encouragementText}>{feedback.encouragement}</Text>
        </View>

        {/* Topic Relevance Section */}
        {feedback.topicRelevance && (
          <View style={styles.section}>
            <Pressable
              style={styles.sectionHeader}
              onPress={() => toggleSection('topic')}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name={feedback.topicRelevance.onTopic ? 'checkmark-circle' : 'alert-circle'}
                  size={22}
                  color={feedback.topicRelevance.onTopic ? colors.success : colors.warning}
                />
                <Text style={styles.sectionTitle}>Topic Relevance</Text>
              </View>
              <Ionicons
                name={expandedSections.has('topic') ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.text.secondary}
              />
            </Pressable>
            {expandedSections.has('topic') && (
              <View style={styles.sectionContent}>
                <View style={styles.topicScoreRow}>
                  <Text style={styles.topicLabel}>Relevance Score:</Text>
                  <Text
                    style={[
                      styles.topicScore,
                      { color: getScoreColor(feedback.topicRelevance.relevanceScore) },
                    ]}
                  >
                    {feedback.topicRelevance.relevanceScore}%
                  </Text>
                </View>
                <Text style={styles.topicFeedback}>{feedback.topicRelevance.feedback}</Text>
              </View>
            )}
          </View>
        )}

        {/* Grammar Analysis Section */}
        <View style={styles.section}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => toggleSection('grammar')}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="school-outline" size={22} color={colors.accent.tango} />
              <Text style={styles.sectionTitle}>Grammar Analysis</Text>
            </View>
            <Ionicons
              name={expandedSections.has('grammar') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.text.secondary}
            />
          </Pressable>
          {expandedSections.has('grammar') && (
            <View style={styles.sectionContent}>
              {/* Target Grammar Usage */}
              <View style={styles.targetGrammarCard}>
                <View style={styles.targetGrammarHeader}>
                  <Text style={styles.targetGrammarLabel}>
                    {formatGrammarFocus(submission.episode_articles?.grammar_focus || '')}
                  </Text>
                  <View
                    style={[
                      styles.usedBadge,
                      feedback.grammarAnalysis.targetGrammarUsage.used
                        ? styles.usedBadgeSuccess
                        : styles.usedBadgeWarning,
                    ]}
                  >
                    <Text
                      style={[
                        styles.usedBadgeText,
                        feedback.grammarAnalysis.targetGrammarUsage.used
                          ? styles.usedBadgeTextSuccess
                          : styles.usedBadgeTextWarning,
                      ]}
                    >
                      {feedback.grammarAnalysis.targetGrammarUsage.used ? 'Used ✓' : 'Not Used'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.targetGrammarFeedback}>
                  {feedback.grammarAnalysis.targetGrammarUsage.feedback}
                </Text>
                {feedback.grammarAnalysis.targetGrammarUsage.examples.length > 0 && (
                  <View style={styles.examplesContainer}>
                    <Text style={styles.examplesLabel}>Examples found:</Text>
                    {feedback.grammarAnalysis.targetGrammarUsage.examples.map((ex, i) => (
                      <Text key={i} style={styles.exampleText}>
                        "{ex}"
                      </Text>
                    ))}
                  </View>
                )}
              </View>

              {/* Correct Usage */}
              {feedback.grammarAnalysis.correctUsage.length > 0 && (
                <View style={styles.correctUsageSection}>
                  <Text style={styles.subsectionTitle}>What You Did Well</Text>
                  {feedback.grammarAnalysis.correctUsage.map((usage, i) => (
                    <View key={i} style={styles.correctUsageItem}>
                      <Ionicons name="checkmark" size={16} color={colors.success} />
                      <Text style={styles.correctUsageText}>{usage}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Errors */}
              {feedback.grammarAnalysis.errors.length > 0 && (
                <View style={styles.errorsSection}>
                  <Text style={styles.subsectionTitle}>Areas to Improve</Text>
                  {feedback.grammarAnalysis.errors.map((error, i) => (
                    <View key={i} style={styles.errorCard}>
                      <View style={styles.errorTypeRow}>
                        <Text style={styles.errorType}>{error.type}</Text>
                      </View>
                      <View style={styles.errorComparison}>
                        <View style={styles.errorOriginal}>
                          <Text style={styles.errorLabel}>Your text:</Text>
                          <Text style={styles.errorOriginalText}>{error.original}</Text>
                        </View>
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color={colors.text.muted}
                          style={styles.errorArrow}
                        />
                        <View style={styles.errorCorrection}>
                          <Text style={styles.errorLabel}>Correction:</Text>
                          <Text style={styles.errorCorrectionText}>{error.correction}</Text>
                        </View>
                      </View>
                      <Text style={styles.errorExplanation}>{error.explanation}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Vocabulary Section */}
        <View style={styles.section}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => toggleSection('vocabulary')}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="book-outline" size={22} color={colors.accent.sky} />
              <Text style={styles.sectionTitle}>Vocabulary</Text>
            </View>
            <Ionicons
              name={expandedSections.has('vocabulary') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.text.secondary}
            />
          </Pressable>
          {expandedSections.has('vocabulary') && (
            <View style={styles.sectionContent}>
              <View style={styles.vocabStats}>
                <View style={styles.vocabStatItem}>
                  <Text style={styles.vocabStatValue}>
                    {feedback.vocabularyAnalysis.level}
                  </Text>
                  <Text style={styles.vocabStatLabel}>Level</Text>
                </View>
                <View style={styles.vocabStatItem}>
                  <Text style={styles.vocabStatValue}>
                    {feedback.vocabularyAnalysis.richness}%
                  </Text>
                  <Text style={styles.vocabStatLabel}>Richness</Text>
                </View>
                <View style={styles.vocabStatItem}>
                  <Text style={styles.vocabStatValue}>{submission.word_count}</Text>
                  <Text style={styles.vocabStatLabel}>Words</Text>
                </View>
              </View>

              {feedback.vocabularyAnalysis.suggestions.length > 0 && (
                <View style={styles.suggestionsSection}>
                  <Text style={styles.subsectionTitle}>Vocabulary Suggestions</Text>
                  {feedback.vocabularyAnalysis.suggestions.map((sug, i) => (
                    <View key={i} style={styles.suggestionCard}>
                      <View style={styles.suggestionWords}>
                        <Text style={styles.suggestionOriginal}>{sug.original}</Text>
                        <Ionicons name="arrow-forward" size={14} color={colors.text.muted} />
                        <Text style={styles.suggestionAlternative}>{sug.alternative}</Text>
                      </View>
                      <Text style={styles.suggestionContext}>{sug.context}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Style Section */}
        <View style={styles.section}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => toggleSection('style')}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="color-palette-outline" size={22} color={colors.accent.lavender} />
              <Text style={styles.sectionTitle}>Writing Style</Text>
            </View>
            <Ionicons
              name={expandedSections.has('style') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.text.secondary}
            />
          </Pressable>
          {expandedSections.has('style') && (
            <View style={styles.sectionContent}>
              <View style={styles.styleStats}>
                <View style={styles.styleStatItem}>
                  <Text style={styles.styleStatValue}>
                    {feedback.styleFeedback.coherence}%
                  </Text>
                  <Text style={styles.styleStatLabel}>Coherence</Text>
                </View>
                <View style={styles.styleStatItem}>
                  <Text style={styles.styleStatValue}>{feedback.styleFeedback.tone}</Text>
                  <Text style={styles.styleStatLabel}>Tone</Text>
                </View>
              </View>

              {feedback.styleFeedback.strengths.length > 0 && (
                <View style={styles.strengthsSection}>
                  <Text style={styles.subsectionTitle}>Strengths</Text>
                  {feedback.styleFeedback.strengths.map((strength, i) => (
                    <View key={i} style={styles.strengthItem}>
                      <Ionicons name="star" size={14} color={colors.primary.gold} />
                      <Text style={styles.strengthText}>{strength}</Text>
                    </View>
                  ))}
                </View>
              )}

              {feedback.styleFeedback.improvements.length > 0 && (
                <View style={styles.improvementsSection}>
                  <Text style={styles.subsectionTitle}>Areas for Growth</Text>
                  {feedback.styleFeedback.improvements.map((improvement, i) => (
                    <View key={i} style={styles.improvementItem}>
                      <Ionicons name="trending-up" size={14} color={colors.accent.sky} />
                      <Text style={styles.improvementText}>{improvement}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Your Submission */}
        <View style={styles.section}>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => toggleSection('submission')}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="document-text-outline" size={22} color={colors.text.secondary} />
              <Text style={styles.sectionTitle}>Your Submission</Text>
            </View>
            <Ionicons
              name={expandedSections.has('submission') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.text.secondary}
            />
          </Pressable>
          {expandedSections.has('submission') && (
            <View style={styles.sectionContent}>
              <Text style={styles.submissionText}>{submission.submission_text}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Pressable style={styles.homeButton} onPress={handleGoHome}>
            <Ionicons name="home-outline" size={20} color={colors.neutral[900]} />
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
    gap: spacing[3],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[5],
  },
  errorText: {
    ...textStyles.h4,
    color: colors.text.secondary,
  },
  backButtonError: {
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.full,
    marginTop: spacing[2],
  },
  backButtonTextError: {
    ...textStyles.label,
    color: colors.neutral[950],
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerButton: {
    padding: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.elevated,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  headerSpacer: {
    width: 40,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[5],
    paddingBottom: spacing[10],
  },

  // Score Card
  scoreCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  scoreCircle: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  scoreEmoji: {
    fontSize: 40,
    marginBottom: spacing[2],
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 60,
  },
  scoreLabel: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  summaryText: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Encouragement Card
  encouragementCard: {
    backgroundColor: colors.primary.gold + '15',
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[5],
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.gold,
  },
  florenciaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  florenciaAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  florenciaInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[950],
  },
  florenciaName: {
    ...textStyles.label,
    color: colors.text.primary,
  },
  florenciaRole: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  encouragementText: {
    ...textStyles.body,
    color: colors.text.primary,
    fontStyle: 'italic',
    lineHeight: 26,
  },

  // Sections
  section: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sectionTitle: {
    ...textStyles.label,
    color: colors.text.primary,
    fontSize: 16,
  },
  sectionContent: {
    padding: spacing[4],
    paddingTop: 0,
  },

  // Topic Relevance
  topicScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  topicLabel: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  topicScore: {
    ...textStyles.h4,
    fontWeight: '700',
  },
  topicFeedback: {
    ...textStyles.body,
    color: colors.text.primary,
    lineHeight: 24,
  },

  // Target Grammar
  targetGrammarCard: {
    backgroundColor: colors.accent.tango + '15',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  targetGrammarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  targetGrammarLabel: {
    ...textStyles.label,
    color: colors.accent.tango,
  },
  usedBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  usedBadgeSuccess: {
    backgroundColor: colors.success + '20',
  },
  usedBadgeWarning: {
    backgroundColor: colors.warning + '20',
  },
  usedBadgeText: {
    ...textStyles.labelSmall,
  },
  usedBadgeTextSuccess: {
    color: colors.success,
  },
  usedBadgeTextWarning: {
    color: colors.warning,
  },
  targetGrammarFeedback: {
    ...textStyles.body,
    color: colors.text.primary,
    lineHeight: 24,
  },
  examplesContainer: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.accent.tango + '30',
  },
  examplesLabel: {
    ...textStyles.labelSmall,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  exampleText: {
    ...textStyles.body,
    color: colors.accent.tango,
    fontStyle: 'italic',
    marginBottom: spacing[1],
  },

  // Correct Usage
  correctUsageSection: {
    marginBottom: spacing[4],
  },
  subsectionTitle: {
    ...textStyles.label,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  correctUsageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  correctUsageText: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },

  // Errors
  errorsSection: {
    marginTop: spacing[2],
  },
  errorCard: {
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  errorTypeRow: {
    marginBottom: spacing[2],
  },
  errorType: {
    ...textStyles.labelSmall,
    color: colors.error,
    textTransform: 'uppercase',
  },
  errorComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  errorOriginal: {
    flex: 1,
    minWidth: 100,
  },
  errorCorrection: {
    flex: 1,
    minWidth: 100,
  },
  errorArrow: {
    marginHorizontal: spacing[1],
  },
  errorLabel: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    marginBottom: spacing[1],
  },
  errorOriginalText: {
    ...textStyles.body,
    color: colors.error,
    textDecorationLine: 'line-through',
  },
  errorCorrectionText: {
    ...textStyles.body,
    color: colors.success,
    fontWeight: '600',
  },
  errorExplanation: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },

  // Vocabulary
  vocabStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing[4],
  },
  vocabStatItem: {
    alignItems: 'center',
  },
  vocabStatValue: {
    ...textStyles.h4,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  vocabStatLabel: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  suggestionsSection: {
    marginTop: spacing[2],
  },
  suggestionCard: {
    backgroundColor: colors.accent.sky + '10',
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  suggestionWords: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  suggestionOriginal: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  suggestionAlternative: {
    ...textStyles.body,
    color: colors.accent.sky,
    fontWeight: '600',
  },
  suggestionContext: {
    ...textStyles.bodySmall,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },

  // Style
  styleStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing[4],
  },
  styleStatItem: {
    alignItems: 'center',
  },
  styleStatValue: {
    ...textStyles.h4,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  styleStatLabel: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  strengthsSection: {
    marginBottom: spacing[4],
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  strengthText: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  improvementsSection: {
    marginTop: spacing[2],
  },
  improvementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  improvementText: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },

  // Submission
  submissionText: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 26,
    fontStyle: 'italic',
  },

  // Actions
  actionsContainer: {
    marginTop: spacing[4],
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
  },
  homeButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
});

