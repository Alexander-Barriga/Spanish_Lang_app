import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/contexts/AuthContext';
import { api, UserCurriculumProgress, CurriculumWeek, DailyLesson } from '../../src/services/api';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../src/theme';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const displayName = user?.profile?.display_name || 'Learner';
  const streak = user?.progress?.current_streak || 0;

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [curriculumProgress, setCurriculumProgress] = useState<UserCurriculumProgress | null>(null);
  const [todaysCurriculum, setTodaysCurriculum] = useState<CurriculumWeek | null>(null);
  const [todaysLesson, setTodaysLesson] = useState<DailyLesson | null>(null);
  const [needsPlacement, setNeedsPlacement] = useState(true); // Default to true for new users

  useFocusEffect(
    useCallback(() => {
      loadTodayData();
    }, [])
  );

  const loadTodayData = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const result = await api.getTodayLesson();
      
      if (result.error) {
        console.error('API Error loading today data:', result.error);
        // If authentication fails, assume new user needs placement
        setNeedsPlacement(true);
        return;
      }
      
      if (result.data) {
        setNeedsPlacement(result.data.needsPlacement);
        setCurriculumProgress(result.data.progress);
        setTodaysCurriculum(result.data.curriculum || null);
        setTodaysLesson(result.data.lesson || null);
      }
    } catch (error) {
      console.error('Error loading today data:', error);
      setHasError(true);
      setNeedsPlacement(true); // Assume new user needs placement
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWorkout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (needsPlacement) {
      router.push('/placement-test');
    } else if (todaysCurriculum && curriculumProgress) {
      router.push({
        pathname: '/workout/[week]',
        params: {
          week: curriculumProgress.current_week,
          day: curriculumProgress.current_day,
          level: curriculumProgress.level,
        },
      });
    }
  };

  const handleQuickMission = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/quick-mission');
  };

  const handleTakePlacement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/placement-test');
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 18) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  // Calculate week progress percentage
  const weekProgress = curriculumProgress 
    ? ((curriculumProgress.current_day - 1) / 7) * 100 
    : 0;

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
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {displayName}!</Text>
            <Text style={styles.subGreeting}>
              {needsPlacement ? 'Let\'s find your level' : 'Ready to practice?'}
            </Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakNumber}>{streak}</Text>
          </View>
        </View>

        {/* Placement Test Needed */}
        {needsPlacement && (
          <Pressable onPress={handleTakePlacement}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.placementCard}
            >
              <View style={styles.placementContent}>
                <Text style={styles.placementEmoji}>🎯</Text>
                <View style={styles.placementText}>
                  <Text style={styles.placementTitle}>Take Placement Test</Text>
                  <Text style={styles.placementSubtitle}>
                    5 minutes to find your personalized path
                  </Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            </LinearGradient>
          </Pressable>
        )}

        {/* Grammar Gym Card - Main Learning Path */}
        {!needsPlacement && curriculumProgress && (
          <Pressable onPress={handleStartWorkout}>
            <LinearGradient
              colors={[colors.primary.gold, '#e5a83a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.learningPathCard}
            >
              <View style={styles.cardHeader}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>{curriculumProgress.level}</Text>
                </View>
                <Text style={styles.xpText}>
                  {curriculumProgress.total_xp} XP
                </Text>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.weekLabel}>Week {curriculumProgress.current_week} of 12</Text>
                <Text style={styles.grammarTitle}>
                  {todaysCurriculum?.title_en || 'Loading...'}
                </Text>
                <Text style={styles.dayLabel}>
                  Day {curriculumProgress.current_day} • {todaysLesson?.title || 'Today\'s Workout'}
                </Text>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.weekProgressBar}>
                  <View style={[styles.weekProgressFill, { width: `${weekProgress}%` }]} />
                </View>
                <View style={styles.startWorkoutButton}>
                  <Ionicons name="play" size={20} color={colors.primary.gold} />
                  <Text style={styles.startWorkoutText}>Start Workout</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        )}

        {/* Divider */}
        {!needsPlacement && (
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or practice freely</Text>
            <View style={styles.dividerLine} />
          </View>
        )}

        {/* Quick Mission Card */}
        <Pressable onPress={handleQuickMission} style={styles.quickMissionCard}>
          <View style={styles.quickMissionIcon}>
            <Ionicons name="flash" size={28} color={colors.primary.gold} />
          </View>
          <View style={styles.quickMissionContent}>
            <Text style={styles.quickMissionTitle}>Quick Mission</Text>
            <Text style={styles.quickMissionSubtitle}>
              Pick a topic, practice 3-5 minutes
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.neutral[500]} />
        </Pressable>

        {/* Today's Writing Rep (if curriculum active) */}
        {!needsPlacement && curriculumProgress && (
          <Link href="/(tabs)/writing" asChild>
            <Pressable style={styles.writingPromptCard}>
              <View style={styles.writingIcon}>
                <Ionicons name="pencil" size={20} color={colors.primary.gold} />
              </View>
              <View style={styles.writingContent}>
                <Text style={styles.writingTitle}>Today's Writing Rep</Text>
                <Text style={styles.writingSubtitle}>
                  Complete for +50 XP bonus
                </Text>
              </View>
              <View style={styles.writingBadge}>
                <Text style={styles.writingBadgeText}>+50</Text>
              </View>
            </Pressable>
          </Link>
        )}

        {/* Stats Summary */}
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>This Week</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="flame" size={24} color={colors.warning} />
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color={colors.primary.gold} />
              <Text style={styles.statValue}>{curriculumProgress?.total_xp || 0}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
          </View>
        </View>

        {/* Tip of the Day */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Text style={styles.tipEmoji}>💡</Text>
            <Text style={styles.tipLabel}>Tip of the Day</Text>
          </View>
          <Text style={styles.tipText}>
            {curriculumProgress?.level === 'B2'
              ? 'Practice using "como si" + imperfect subjunctive to describe how things appear!'
              : 'Remember: after "es importante que", always use the subjunctive!'
            }
          </Text>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  greeting: {
    ...textStyles.h3,
    color: colors.text.primary,
  },
  subGreeting: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  streakEmoji: {
    fontSize: 18,
    marginRight: spacing[1],
  },
  streakNumber: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  placementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[5],
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing[4],
    ...shadows.lg,
  },
  placementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  placementEmoji: {
    fontSize: 40,
    marginRight: spacing[4],
  },
  placementText: {
    flex: 1,
  },
  placementTitle: {
    ...textStyles.h4,
    color: '#fff',
  },
  placementSubtitle: {
    ...textStyles.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing[0.5],
  },
  learningPathCard: {
    padding: spacing[5],
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing[4],
    ...shadows.lg,
  },
  cardHeader: {
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
    ...textStyles.bodySmall,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '600',
  },
  cardContent: {
    marginBottom: spacing[4],
  },
  weekLabel: {
    ...textStyles.labelSmall,
    color: 'rgba(0,0,0,0.5)',
    marginBottom: spacing[1],
  },
  grammarTitle: {
    ...textStyles.h4,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  dayLabel: {
    ...textStyles.body,
    color: 'rgba(0,0,0,0.6)',
  },
  progressSection: {
    gap: spacing[3],
  },
  weekProgressBar: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  weekProgressFill: {
    height: '100%',
    backgroundColor: colors.neutral[900],
    borderRadius: borderRadius.full,
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[900],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  startWorkoutText: {
    ...textStyles.button,
    color: colors.primary.gold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[4],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.default,
  },
  dividerText: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    paddingHorizontal: spacing[4],
  },
  quickMissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing[3],
  },
  quickMissionIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.gold + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  quickMissionContent: {
    flex: 1,
  },
  quickMissionTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  quickMissionSubtitle: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing[0.5],
  },
  writingPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary.gold + '30',
    marginBottom: spacing[6],
  },
  writingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.gold + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  writingContent: {
    flex: 1,
  },
  writingTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  writingSubtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  writingBadge: {
    backgroundColor: colors.primary.gold,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  writingBadgeText: {
    ...textStyles.labelSmall,
    color: colors.neutral[900],
    fontWeight: '700',
  },
  statsSection: {
    marginBottom: spacing[4],
  },
  statsSectionTitle: {
    ...textStyles.labelSmall,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  statCard: {
    flex: 1,
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
  },
  statLabel: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  tipCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  tipEmoji: {
    fontSize: 20,
    marginRight: spacing[2],
  },
  tipLabel: {
    ...textStyles.labelSmall,
    color: colors.primary.gold,
  },
  tipText: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 24,
  },
});
