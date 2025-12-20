import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Pressable,
  SafeAreaView 
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, textStyles, spacing, borderRadius } from '../../src/theme';
import { getGrammarLesson, GrammarLesson } from '../../src/data/grammarLessons';

export default function GrammarLessonScreen() {
  const { topic, episodeId } = useLocalSearchParams<{ topic: string; episodeId?: string }>();
  
  const lesson = topic ? getGrammarLesson(topic) : null;

  if (!lesson) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Lesson not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleStartEpisode = () => {
    if (episodeId) {
      router.push(`/story/${episodeId}`);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButtonHeader}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{lesson.title.toUpperCase()}</Text>
          <Text style={styles.headerSubtitle}>{lesson.subtitle}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Explanation Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="book-outline" size={20} color={colors.primary.gold} />
            <Text style={styles.sectionTitle}>What is it?</Text>
          </View>
          <Text style={styles.explanationText}>{lesson.explanation}</Text>
        </View>

        {/* Use Cases Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={20} color={colors.primary.gold} />
            <Text style={styles.sectionTitle}>When to Use It</Text>
          </View>
          {lesson.useCases.map((useCase, index) => (
            <View key={index} style={styles.useCaseCard}>
              <Text style={styles.useCaseNumber}>{index + 1}</Text>
              <View style={styles.useCaseContent}>
                <Text style={styles.useCaseTitle}>{useCase.title}</Text>
                <Text style={styles.useCaseDescription}>{useCase.description}</Text>
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleSpanish}>"{useCase.example.spanish}"</Text>
                  <Text style={styles.exampleEnglish}>{useCase.example.english}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Conjugation Table Section */}
        {lesson.conjugationTable && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="grid-outline" size={20} color={colors.primary.gold} />
              <Text style={styles.sectionTitle}>Conjugation: {lesson.conjugationTable.verb.toUpperCase()}</Text>
            </View>
            <Text style={styles.conjugationSubtitle}>
              {lesson.conjugationTable.verbEnglish} • {lesson.conjugationTable.tense}
            </Text>
            <View style={styles.conjugationTable}>
              {Object.entries(lesson.conjugationTable.forms).map(([pronoun, form]) => (
                <View key={pronoun} style={styles.conjugationRow}>
                  <Text style={styles.conjugationPronoun}>
                    {pronoun === 'tú' ? 'tú / vos' : pronoun === 'él' ? 'él / ella' : pronoun}
                  </Text>
                  <Text style={styles.conjugationForm}>{form}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Story Examples Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubbles-outline" size={20} color={colors.primary.gold} />
            <Text style={styles.sectionTitle}>In This Episode</Text>
          </View>
          <Text style={styles.storyExamplesIntro}>
            You'll hear and practice these patterns:
          </Text>
          {lesson.storyExamples.map((example, index) => (
            <View key={index} style={styles.storyExampleCard}>
              <Text style={styles.storyExampleSpanish}>"{example.spanish}"</Text>
              <Text style={styles.storyExampleEnglish}>{example.english}</Text>
              <View style={styles.storyExampleContext}>
                <Ionicons name="person-outline" size={14} color={colors.text.muted} />
                <Text style={styles.storyExampleContextText}>{example.context}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={20} color={colors.primary.gold} />
            <Text style={styles.sectionTitle}>Pro Tips</Text>
          </View>
          {lesson.tips.map((tip, index) => (
            <View key={index} style={styles.tipRow}>
              <View style={styles.tipBullet}>
                <Ionicons name="checkmark" size={14} color={colors.primary.gold} />
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Trigger Phrases */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={20} color={colors.primary.gold} />
            <Text style={styles.sectionTitle}>Key Phrases to Use</Text>
          </View>
          <View style={styles.triggersContainer}>
            {lesson.triggers.map((trigger, index) => (
              <View key={index} style={styles.triggerChip}>
                <Text style={styles.triggerText}>{trigger}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Start Episode Button */}
        <View style={styles.buttonContainer}>
          <Pressable 
            onPress={handleStartEpisode} 
            style={({ pressed }) => [
              pressed && styles.startButtonPressed
            ]}
          >
            <LinearGradient
              colors={['#B3F5FF', '#00B8DB']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.startButton}
            >
              <Text style={styles.startButtonText}>Start Episode</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.text.inverse} />
            </LinearGradient>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[800],
  },
  backButtonHeader: {
    padding: spacing[2],
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.primary.gold,
    letterSpacing: 1,
  },
  headerSubtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    ...textStyles.label,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  explanationText: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  useCaseCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  useCaseNumber: {
    ...textStyles.h2,
    color: colors.primary.gold,
    marginRight: spacing[3],
    opacity: 0.5,
  },
  useCaseContent: {
    flex: 1,
  },
  useCaseTitle: {
    ...textStyles.label,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  useCaseDescription: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  exampleBox: {
    backgroundColor: colors.neutral[900],
    borderRadius: borderRadius.md,
    padding: spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.gold,
  },
  exampleSpanish: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontStyle: 'italic',
    marginBottom: spacing[1],
  },
  exampleEnglish: {
    ...textStyles.caption,
    color: colors.text.muted,
  },
  conjugationSubtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[3],
    fontStyle: 'italic',
  },
  conjugationTable: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  conjugationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[800],
  },
  conjugationPronoun: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  conjugationForm: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontWeight: '600',
  },
  storyExamplesIntro: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  storyExampleCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  storyExampleSpanish: {
    ...textStyles.dialogue,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  storyExampleEnglish: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  storyExampleContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  storyExampleContextText: {
    ...textStyles.caption,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  tipBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.gold + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  tipText: {
    ...textStyles.body,
    color: colors.text.secondary,
    flex: 1,
  },
  triggersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  triggerChip: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.full,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.primary.gold + '60',
  },
  triggerText: {
    ...textStyles.body,
    color: colors.primary.gold,
  },
  buttonContainer: {
    marginTop: spacing[4],
  },
  startButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  startButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  startButtonText: {
    ...textStyles.label,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  errorText: {
    ...textStyles.h3,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  backButton: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
  },
  backButtonText: {
    ...textStyles.label,
    color: colors.text.primary,
  },
});

