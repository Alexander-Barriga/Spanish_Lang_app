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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, textStyles, spacing, borderRadius, shadows } from '../src/theme';
import { api, QuickMissionTopic } from '../src/services/api';

export default function QuickMissionScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [topics, setTopics] = useState<QuickMissionTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<QuickMissionTopic | null>(null);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      const result = await api.getQuickMissionTopics();
      if (result.data?.topics) {
        setTopics(result.data.topics);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTopic = (topic: QuickMissionTopic) => {
    Haptics.selectionAsync();
    setSelectedTopic(topic);
  };

  const handleStartMission = async () => {
    if (!selectedTopic) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Start a workout session for tracking
    try {
      await api.startWorkout({
        session_type: 'quick_mission',
        grammar_focus: selectedTopic.topic_key,
      });
    } catch (error) {
      console.error('Error starting mission:', error);
    }

    // Navigate to conversation with topic context
    router.push({
      pathname: '/conversation/[id]',
      params: {
        id: 'new',
        mode: 'topic',
        topic: selectedTopic.title_es,
        missionType: 'quick_mission',
        grammarTargets: selectedTopic.grammar_targets.join(','),
      },
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return colors.success;
      case 'intermediate':
        return colors.primary.gold;
      case 'advanced':
        return colors.error;
      default:
        return colors.primary.gold;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Quick Mission</Text>
          <Text style={styles.headerSubtitle}>3-5 minute conversation</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Choose a Topic</Text>
        <Text style={styles.sectionSubtitle}>
          Pick what you want to practice today
        </Text>

        <View style={styles.topicsGrid}>
          {topics.map((topic) => {
            const isSelected = selectedTopic?.id === topic.id;
            
            return (
              <Pressable
                key={topic.id}
                style={[styles.topicCard, isSelected && styles.topicCardSelected]}
                onPress={() => handleSelectTopic(topic)}
              >
                <View style={styles.topicHeader}>
                  <Text style={styles.topicIcon}>{topic.icon}</Text>
                  <View 
                    style={[
                      styles.difficultyBadge, 
                      { backgroundColor: getDifficultyColor(topic.difficulty) + '20' }
                    ]}
                  >
                    <Text 
                      style={[
                        styles.difficultyText, 
                        { color: getDifficultyColor(topic.difficulty) }
                      ]}
                    >
                      {topic.difficulty}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.topicTitle, isSelected && styles.topicTitleSelected]}>
                  {topic.title_en}
                </Text>
                <Text style={styles.topicTitleEs}>{topic.title_es}</Text>
                <Text style={styles.topicDescription}>{topic.description}</Text>

                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary.gold} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Free Topic Option */}
        <Pressable
          style={[
            styles.freeTopicCard,
            !topics.find(t => t.id === selectedTopic?.id) && selectedTopic === null 
              ? {} 
              : styles.freeTopicCardDimmed
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({
              pathname: '/conversation/[id]',
              params: {
                id: 'new',
                mode: 'open',
                missionType: 'quick_mission',
              },
            });
          }}
        >
          <Ionicons name="chatbubbles" size={32} color={colors.primary.gold} />
          <View style={styles.freeTopicContent}>
            <Text style={styles.freeTopicTitle}>Open Conversation</Text>
            <Text style={styles.freeTopicSubtitle}>Talk about anything you want</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.neutral[500]} />
        </Pressable>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Mission Tips</Text>
          <View style={styles.tipRow}>
            <Ionicons name="time" size={20} color={colors.primary.gold} />
            <Text style={styles.tipText}>Keep it short: 3-5 minute conversations</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="bulb" size={20} color={colors.primary.gold} />
            <Text style={styles.tipText}>Focus on the topic's grammar targets</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="star" size={20} color={colors.primary.gold} />
            <Text style={styles.tipText}>Earn XP for every speaking exchange</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      {selectedTopic && (
        <View style={styles.bottomContainer}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedLabel}>Selected:</Text>
            <Text style={styles.selectedTopic}>{selectedTopic.title_en}</Text>
          </View>
          <Pressable style={styles.startButton} onPress={handleStartMission}>
            <Ionicons name="mic" size={20} color={colors.neutral[900]} />
            <Text style={styles.startButtonText}>Start Mission</Text>
          </Pressable>
        </View>
      )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  headerSubtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[5],
    paddingBottom: spacing[20],
  },
  sectionTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  sectionSubtitle: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing[5],
  },
  topicsGrid: {
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  topicCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 2,
    borderColor: colors.border.default,
    position: 'relative',
  },
  topicCardSelected: {
    borderColor: colors.primary.gold,
    backgroundColor: colors.primary.gold + '10',
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  topicIcon: {
    fontSize: 32,
  },
  difficultyBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.md,
  },
  difficultyText: {
    ...textStyles.labelSmall,
    textTransform: 'capitalize',
  },
  topicTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[0.5],
  },
  topicTitleSelected: {
    color: colors.primary.gold,
  },
  topicTitleEs: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  topicDescription: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
  },
  freeTopicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[5],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  freeTopicCardDimmed: {
    opacity: 0.7,
  },
  freeTopicContent: {
    flex: 1,
    marginLeft: spacing[4],
  },
  freeTopicTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  freeTopicSubtitle: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  tipsCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  tipsTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  tipText: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    flex: 1,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    paddingBottom: spacing[8],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    ...shadows.lg,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  selectedLabel: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  selectedTopic: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontWeight: '600',
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
});

