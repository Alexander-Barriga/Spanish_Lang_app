import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { api, UserCurriculumProgress, WorkoutStats, WritingStats } from '../../src/services/api';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../src/theme';

// Mock achievements
const achievements = [
  { id: 'first_workout', name: 'First Workout', icon: '💪', earned: false },
  { id: 'streak_7', name: '7-Day Streak', icon: '🔥', earned: false },
  { id: 'subjunctive_master', name: 'Subjunctive Master', icon: '📚', earned: false },
  { id: 'week_complete', name: 'Week Complete', icon: '🏆', earned: false },
];

export default function ProgressScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [curriculumProgress, setCurriculumProgress] = useState<UserCurriculumProgress | null>(null);
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats | null>(null);
  const [writingStats, setWritingStats] = useState<WritingStats | null>(null);

  const progress = user?.progress;

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadAllStats();
      } else {
        setIsLoading(false);
      }
    }, [user])
  );

  const loadAllStats = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const [curriculumResult, workoutResult, writingResult] = await Promise.all([
        api.getUserCurriculumProgress(),
        api.getWorkoutStats(),
        api.getWritingStats(),
      ]);

      if (curriculumResult.data?.progress) {
        setCurriculumProgress(curriculumResult.data.progress);
      }
      if (workoutResult.data?.stats) {
        setWorkoutStats(workoutResult.data.stats);
      }
      if (writingResult.data?.stats) {
        setWritingStats(writingResult.data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    streak: progress?.current_streak || 0,
    longestStreak: progress?.longest_streak || 0,
    conversations: progress?.total_conversations || 0,
    minutes: progress?.total_minutes || 0,
    vocabulary: progress?.vocabulary_learned?.length || 0,
  };

  // Calculate curriculum progress percentage
  const curriculumPercentage = curriculumProgress
    ? Math.round(((curriculumProgress.current_week - 1) * 7 + curriculumProgress.current_day - 1) / 84 * 100)
    : 0;

  // Update achievements based on actual data
  const updatedAchievements = achievements.map(a => ({
    ...a,
    earned: 
      (a.id === 'first_workout' && (workoutStats?.total_workouts || 0) > 0) ||
      (a.id === 'streak_7' && stats.streak >= 7) ||
      (a.id === 'subjunctive_master' && (workoutStats?.average_accuracy || 0) >= 90) ||
      (a.id === 'week_complete' && (curriculumProgress?.current_week || 0) > 1),
  }));

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Grammar Gym</Text>
          <Text style={styles.subtitle}>Build your Spanish muscles</Text>
        </View>

        {/* Curriculum Progress Card */}
        {curriculumProgress?.placement_completed && (
          <LinearGradient
            colors={[colors.primary.gold, '#e5a83a']}
            style={styles.curriculumCard}
          >
            <View style={styles.curriculumHeader}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{curriculumProgress.level}</Text>
              </View>
              <Text style={styles.xpText}>{curriculumProgress.total_xp} XP</Text>
            </View>

            <View style={styles.curriculumContent}>
              <Text style={styles.curriculumLabel}>Grammar Gym Progress</Text>
              <Text style={styles.curriculumProgress}>
                Week {curriculumProgress.current_week}, Day {curriculumProgress.current_day}
              </Text>
            </View>

            <View style={styles.curriculumProgressBar}>
              <View 
                style={[styles.curriculumProgressFill, { width: `${curriculumPercentage}%` }]} 
              />
            </View>
            <Text style={styles.curriculumPercentText}>{curriculumPercentage}% Complete</Text>
          </LinearGradient>
        )}

        {/* Not enrolled prompt */}
        {!curriculumProgress?.placement_completed && (
          <Link href="/placement-test" asChild>
            <Pressable style={styles.enrollCard}>
              <Ionicons name="school" size={32} color={colors.primary.gold} />
              <View style={styles.enrollContent}>
                <Text style={styles.enrollTitle}>Start Grammar Gym</Text>
                <Text style={styles.enrollSubtitle}>
                  Take the placement test to begin your personalized curriculum
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.neutral[500]} />
            </Pressable>
          </Link>
        )}

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakMain}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View>
              <Text style={styles.streakNumber}>{stats.streak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </View>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakBest}>
            <Text style={styles.bestLabel}>Best</Text>
            <Text style={styles.bestNumber}>{stats.longestStreak} days</Text>
          </View>
        </View>

        {/* Workout Stats */}
        {workoutStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workout Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="barbell" size={24} color={colors.primary.gold} />
                <Text style={styles.statValue}>{workoutStats.total_workouts}</Text>
                <Text style={styles.statLabel}>Workouts</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="time" size={24} color={colors.primary.gold} />
                <Text style={styles.statValue}>{workoutStats.total_duration_minutes}</Text>
                <Text style={styles.statLabel}>Minutes</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary.gold} />
                <Text style={styles.statValue}>{workoutStats.average_accuracy}%</Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="flash" size={24} color={colors.primary.gold} />
                <Text style={styles.statValue}>{workoutStats.quick_missions}</Text>
                <Text style={styles.statLabel}>Missions</Text>
              </View>
            </View>
          </View>
        )}

        {/* Writing Stats */}
        {writingStats && writingStats.total_exercises > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Writing Stats</Text>
            <View style={styles.writingStatsCard}>
              <View style={styles.writingStatRow}>
                <Text style={styles.writingStatLabel}>Exercises Completed</Text>
                <Text style={styles.writingStatValue}>{writingStats.total_exercises}</Text>
              </View>
              <View style={styles.writingStatDivider} />
              <View style={styles.writingStatRow}>
                <Text style={styles.writingStatLabel}>Correct Answers</Text>
                <Text style={styles.writingStatValue}>{writingStats.correct_answers}</Text>
              </View>
              <View style={styles.writingStatDivider} />
              <View style={styles.writingStatRow}>
                <Text style={styles.writingStatLabel}>Average Score</Text>
                <Text style={styles.writingStatValue}>{writingStats.average_score}%</Text>
              </View>
              <View style={styles.writingStatDivider} />
              <View style={styles.writingStatRow}>
                <Text style={styles.writingStatLabel}>XP from Writing</Text>
                <Text style={[styles.writingStatValue, styles.writingStatXP]}>
                  {writingStats.total_xp_from_writing}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Weekly Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalTitle}>Weekly Goal</Text>
            <Text style={styles.goalProgress}>
              {workoutStats?.this_week_workouts || 0}/5 workouts
            </Text>
          </View>
          <View style={styles.goalProgressBar}>
        <View 
              style={[
                styles.goalProgressFill, 
                { width: `${Math.min((workoutStats?.this_week_workouts || 0) / 5 * 100, 100)}%` }
              ]} 
            />
          </View>
          <Text style={styles.goalText}>
            {(workoutStats?.this_week_workouts || 0) >= 5 
              ? '🎉 Goal reached! Keep the momentum going!'
              : `Complete ${5 - (workoutStats?.this_week_workouts || 0)} more workouts this week!`
            }
          </Text>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {updatedAchievements.map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  !achievement.earned && styles.achievementCardLocked,
                ]}
              >
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <Text style={[
                  styles.achievementName,
                  !achievement.earned && styles.achievementNameLocked,
                ]}>
                  {achievement.name}
                </Text>
                {!achievement.earned && (
                  <Ionicons 
                    name="lock-closed" 
                    size={12} 
                    color={colors.neutral[500]} 
                    style={styles.lockIcon}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* View History Link */}
        <Link href="/(tabs)/conversations" asChild>
          <Pressable style={styles.historyLink}>
            <Ionicons name="chatbubbles" size={20} color={colors.text.secondary} />
            <Text style={styles.historyLinkText}>View Conversation History</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[500]} />
          </Pressable>
        </Link>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
  },
  header: {
    paddingVertical: spacing[6],
  },
  title: {
    ...textStyles.h3,
    color: colors.text.primary,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  curriculumCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  curriculumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  levelBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  levelText: {
    ...textStyles.labelSmall,
    color: '#fff',
    fontWeight: '700',
  },
  xpText: {
    ...textStyles.body,
    color: colors.neutral[900],
    fontWeight: '700',
  },
  curriculumContent: {
    marginBottom: spacing[3],
  },
  curriculumLabel: {
    ...textStyles.labelSmall,
    color: 'rgba(0,0,0,0.5)',
    marginBottom: spacing[0.5],
  },
  curriculumProgress: {
    ...textStyles.h4,
    color: colors.neutral[900],
  },
  curriculumProgressBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  curriculumProgressFill: {
    height: '100%',
    backgroundColor: colors.neutral[900],
    borderRadius: borderRadius.full,
  },
  curriculumPercentText: {
    ...textStyles.caption,
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'right',
  },
  enrollCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.primary.gold + '30',
  },
  enrollContent: {
    flex: 1,
    marginLeft: spacing[4],
  },
  enrollTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  enrollSubtitle: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.md,
  },
  streakMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  streakEmoji: {
    fontSize: 48,
    marginRight: spacing[4],
  },
  streakNumber: {
    ...textStyles.h1,
    color: colors.primary.gold,
    lineHeight: 48,
  },
  streakLabel: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  streakDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border.default,
    marginHorizontal: spacing[5],
  },
  streakBest: {
    alignItems: 'center',
  },
  bestLabel: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  bestNumber: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing[1.5],
  },
  statCard: {
    width: '50%',
    padding: spacing[1.5],
  },
  statCardInner: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  statValue: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginTop: spacing[2],
    marginBottom: spacing[0.5],
  },
  statLabel: {
    ...textStyles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  writingStatsCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  writingStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  writingStatDivider: {
    height: 1,
    backgroundColor: colors.border.default,
  },
  writingStatLabel: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  writingStatValue: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  writingStatXP: {
    color: colors.primary.gold,
  },
  goalCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  goalTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  goalProgress: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontWeight: '600',
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: colors.neutral[700],
    borderRadius: borderRadius.full,
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: colors.primary.gold,
    borderRadius: borderRadius.full,
  },
  goalText: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  achievementCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary.gold + '40',
  },
  achievementCardLocked: {
    borderColor: colors.border.default,
    opacity: 0.6,
  },
  achievementIcon: {
    fontSize: 20,
    marginRight: spacing[2],
  },
  achievementName: {
    ...textStyles.bodySmall,
    color: colors.text.primary,
    fontWeight: '500',
  },
  achievementNameLocked: {
    color: colors.text.secondary,
  },
  lockIcon: {
    marginLeft: spacing[2],
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  historyLinkText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
});
