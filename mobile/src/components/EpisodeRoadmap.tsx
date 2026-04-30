import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { colors, textStyles, spacing, borderRadius } from '../theme';

const { width } = Dimensions.get('window');

interface RoadmapProgress {
  episodeCompleted: boolean;
  articleRead: boolean;
  writingSubmitted: boolean;
  conversationCompleted: boolean;
  nextEpisodeUnlocked: boolean;
  nextEpisodeId?: string;
}

interface EpisodeRoadmapProps {
  episodeId: string;
  episodeNumber: number;
  totalEpisodes: number;
  grammarFocus: string;
  onRefreshHome?: () => void;
}

type StepStatus = 'completed' | 'in_progress' | 'locked';

interface Step {
  id: number;
  name: string;
  shortName: string;
  status: StepStatus;
  onPress?: () => void;
}

export default function EpisodeRoadmap({
  episodeId,
  episodeNumber,
  totalEpisodes,
  grammarFocus,
  onRefreshHome,
}: EpisodeRoadmapProps) {
  const { isPremium } = useSubscription();
  const { user } = useAuth();
  const [progress, setProgress] = useState<RoadmapProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRoadmapProgress();
  }, [episodeId]);

  const loadRoadmapProgress = async () => {
    try {
      setIsLoading(true);
      const result = await api.getEpisodeRoadmap(episodeId);
      if (result.data) {
        setProgress(result.data);
      }
    } catch (error) {
      console.error('Error loading roadmap progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepPress = (step: Step) => {
    if (step.status === 'locked' || !step.onPress) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const isAdmin = user?.profile?.is_admin;
    if (episodeNumber > 1 && !isPremium && !isAdmin) {
      router.push('/paywall');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    step.onPress();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary.gold} />
        </View>
      </View>
    );
  }

  if (!progress) {
    return null;
  }

  // Determine step statuses
  const steps: Step[] = [
    {
      id: 1,
      name: 'Watch Episode',
      shortName: 'Episode',
      status: progress.episodeCompleted ? 'completed' : 'in_progress',
      onPress: () => router.push(`/story/${episodeId}`),
    },
    {
      id: 2,
      name: 'Read Article',
      shortName: 'Article',
      status: progress.articleRead
        ? 'completed'
        : progress.episodeCompleted
        ? 'in_progress'
        : 'locked',
      onPress: async () => {
        // Get article ID from episode
        try {
          const articleResult = await api.getEpisodeArticle(episodeId);
          if (articleResult.data?.article) {
            router.push(`/article/episode/${articleResult.data.article.id}`);
          }
        } catch (error) {
          console.error('Error navigating to article:', error);
        }
      },
    },
    {
      id: 3,
      name: 'Complete Writing',
      shortName: 'Writing',
      status: progress.writingSubmitted
        ? 'completed'
        : progress.articleRead
        ? 'in_progress'
        : 'locked',
      onPress: async () => {
        try {
          const articleResult = await api.getEpisodeArticle(episodeId);
          if (articleResult.data?.article) {
            const articleId = articleResult.data.article.id;
            
            // If already submitted, navigate to feedback page
            if (progress.writingSubmitted) {
              const submissionResult = await api.checkEpisodeArticleSubmission(episodeId);
              if (submissionResult.data?.submission?.id) {
                router.push(`/article/episode/${articleId}/feedback/${submissionResult.data.submission.id}`);
                return;
              }
            }
            
            // Otherwise navigate to writing page
            router.push(`/article/episode/${articleId}/writing`);
          }
        } catch (error) {
          console.error('Error navigating to writing:', error);
        }
      },
    },
    {
      id: 4,
      name: 'Complete Conversation',
      shortName: 'Conversation',
      status: progress.conversationCompleted
        ? 'completed'
        : progress.writingSubmitted
        ? 'in_progress'
        : 'locked',
      onPress: async () => {
        // Check if writing exercise is completed first
        if (!progress.writingSubmitted) {
          Alert.alert(
            'Writing Required',
            'You must complete the writing exercise before starting the conversation.'
          );
          return;
        }
        
        try {
          const articleResult = await api.getEpisodeArticle(episodeId);
          if (articleResult.data?.article) {
            router.push(`/article/episode/${articleResult.data.article.id}/conversation`);
          }
        } catch (error) {
          console.error('Error navigating to conversation:', error);
        }
      },
    },
  ];

  // Only show "Unlock Next Episode" if not the final episode
  if (episodeNumber < totalEpisodes) {
    const allStepsComplete = progress.episodeCompleted && progress.articleRead && progress.writingSubmitted && progress.conversationCompleted;
    const unlockStatus: StepStatus = progress.nextEpisodeUnlocked
      ? 'completed'
      : allStepsComplete
      ? 'in_progress'
      : 'locked';

    steps.push({
      id: 5,
      name: 'Unlock Next Episode',
      shortName: 'Next',
      status: unlockStatus,
      onPress: unlockStatus !== 'locked'
        ? async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loadRoadmapProgress();
            if (onRefreshHome) {
              await onRefreshHome();
            }
          }
        : undefined,
    });
  }

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={24} color="#00FF00" />;
      case 'in_progress':
        return <Ionicons name="time-outline" size={24} color={colors.primary.gold} />;
      case 'locked':
        return <Ionicons name="lock-closed" size={20} color="#FF0000" />;
    }
  };

  const getStepStyle = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return [styles.stepCard, styles.stepCardCompleted];
      case 'in_progress':
        return [styles.stepCard, styles.stepCardInProgress];
      case 'locked':
        return [styles.stepCard, styles.stepCardLocked];
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Episode Progress</Text>
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View key={step.id} style={styles.stepWrapper}>
            <Pressable
              style={({ pressed }) => [
                ...getStepStyle(step.status),
                pressed && styles.stepCardPressed,
              ]}
              onPress={() => handleStepPress(step)}
              disabled={step.status === 'locked'}
            >
              <View style={styles.stepHeader}>
                <View style={styles.stepLeft}>
                  <View style={styles.stepIconContainer}>
                    {getStepIcon(step.status)}
                  </View>
                  <View style={styles.stepContent}>
                    <View style={styles.stepNumberRow}>
                      <Text style={styles.stepNumber}>{step.id}.</Text>
                      <Text
                        style={[
                          styles.stepName,
                          step.status === 'locked' && styles.stepNameLocked,
                        ]}
                      >
                        {step.name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.stepStatus,
                        step.status === 'locked' && styles.stepStatusLocked,
                      ]}
                    >
                      {step.status === 'completed'
                        ? 'Completed'
                        : step.status === 'in_progress'
                        ? 'Tap to continue'
                        : 'Locked'}
                    </Text>
                  </View>
                </View>
                {step.status !== 'locked' && (
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={step.status === 'completed' ? colors.primary.gold : colors.text.secondary} 
                  />
                )}
              </View>
            </Pressable>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.connector,
                  step.status === 'completed' && styles.connectorCompleted,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[5],
    paddingBottom: spacing[10], // Extra padding to prevent cards from being hidden behind bottom nav
  },
  title: {
    ...textStyles.label,
    color: colors.text.secondary,
    marginBottom: spacing[4],
    paddingHorizontal: spacing[5],
  },
  loadingContainer: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  stepsContainer: {
    paddingHorizontal: spacing[5],
    gap: spacing[3],
  },
  stepWrapper: {
    alignItems: 'center',
  },
  stepCard: {
    width: '100%',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    backgroundColor: colors.background.elevated,
  },
  stepCardCompleted: {
    borderColor: colors.primary.gold,
    backgroundColor: colors.primary.gold + '10',
  },
  stepCardInProgress: {
    borderColor: colors.primary.gold,
    backgroundColor: colors.background.elevated,
  },
  stepCardLocked: {
    borderColor: '#FF0000',
    backgroundColor: colors.neutral[900],
    opacity: 0.6,
  },
  stepCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[3],
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    flex: 1,
    gap: spacing[1],
  },
  stepNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  stepNumber: {
    ...textStyles.label,
    color: colors.text.tertiary,
    fontSize: 14,
    fontWeight: '600',
  },
  stepName: {
    ...textStyles.h5,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  stepNameLocked: {
    color: colors.text.muted,
  },
  stepStatus: {
    ...textStyles.caption,
    color: colors.primary.gold,
    fontSize: 12,
    marginLeft: spacing[6], // Align with step name (accounting for number + gap)
  },
  stepStatusLocked: {
    color: colors.text.muted,
  },
  connector: {
    width: 2,
    height: spacing[3],
    backgroundColor: colors.neutral[700],
    marginVertical: spacing[1],
    alignSelf: 'flex-start',
    marginLeft: spacing[4] + 20, // Align with icon center (card padding + icon width/2)
  },
  connectorCompleted: {
    backgroundColor: colors.primary.gold,
  },
});

