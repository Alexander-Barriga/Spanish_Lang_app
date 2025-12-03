import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { authTokenManager } from '../../src/services/authToken';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../src/theme';

const { width } = Dimensions.get('window');

interface StoryProgress {
  hasStarted: boolean;
  arc: any;
  progress: any;
  currentEpisode: any;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const displayName = user?.profile?.display_name || 'Learner';
  const streak = user?.progress?.current_streak || 0;

  const [isLoading, setIsLoading] = useState(true);
  const [storyData, setStoryData] = useState<StoryProgress | null>(null);
  const [journalStats, setJournalStats] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      // Only load data if user is authenticated
      if (user) {
        loadHomeData();
      } else {
        setIsLoading(false);
      }
    }, [user])
  );

  const loadHomeData = async () => {
    // Skip API calls if user is not authenticated or no auth token yet
    if (!user || !authTokenManager.hasToken()) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch current story progress
      const storyResult = await api.getCurrentStory();
      if (storyResult.data) {
        setStoryData(storyResult.data);
      }

      // Fetch journal stats (silently ignore errors for now)
      try {
        const journalResult = await api.getJournalStats();
        if (journalResult.data) {
          setJournalStats(journalResult.data);
        }
      } catch {
        // Journal stats endpoint might not exist yet
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartStory = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!storyData?.hasStarted && storyData?.arc) {
      // Start the story arc
      const result = await api.startStoryArc(storyData.arc.id);
      if (result.data?.firstEpisode) {
        router.push({
          pathname: '/story/[episode]',
          params: { episode: result.data.firstEpisode.id }
        });
      }
    } else if (storyData?.currentEpisode) {
      router.push({
        pathname: '/story/[episode]',
        params: { episode: storyData.currentEpisode.id }
      });
    }
  };

  const handleOpenJournal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/journal');
  };

  const handleQuickPractice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/quick-mission');
  };

  // Calculate episode progress
  const episodeProgress = storyData?.progress 
    ? (storyData.progress.episodes_completed / (storyData.arc?.total_episodes || 8)) * 100 
    : 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
          <Text style={styles.loadingText}>Loading your story...</Text>
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
        {/* Minimal Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandText}>LoboLingo</Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={16} color={colors.warning} />
            <Text style={styles.streakNumber}>{streak}</Text>
          </View>
        </View>

        {/* Story Hero Card */}
        <Pressable onPress={handleStartStory} style={styles.heroCard}>
          <LinearGradient
            colors={colors.gradients.tangoSubtle as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Decorative accent line */}
            <View style={styles.accentLine} />
            
            {/* Story info */}
            <View style={styles.heroContent}>
              <Text style={styles.overlineText}>
                {storyData?.hasStarted ? 'CONTINUE YOUR STORY' : 'BEGIN YOUR JOURNEY'}
              </Text>
              
              <Text style={styles.storyTitle}>
                {storyData?.arc?.title_es || 'Encuentros en Buenos Aires'}
              </Text>
              
              <Text style={styles.storySubtitle}>
                {storyData?.arc?.title_en || 'Encounters in Buenos Aires'}
              </Text>

              {storyData?.currentEpisode && (
                <View style={styles.episodeInfo}>
                  <Text style={styles.episodeLabel}>
                    Episode {storyData.currentEpisode.episode_number} of {storyData.arc?.total_episodes || 8}
                  </Text>
                  <Text style={styles.episodeTitle}>
                    {storyData.currentEpisode.title_es}
                  </Text>
                </View>
              )}

              {/* Progress bar */}
              {storyData?.hasStarted && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${episodeProgress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {storyData.progress?.episodes_completed || 0} / {storyData.arc?.total_episodes || 8} episodes
                  </Text>
                </View>
              )}

              {/* CTA Button */}
              <View style={styles.ctaButton}>
                <Ionicons 
                  name={storyData?.hasStarted ? "play" : "sparkles"} 
                  size={20} 
                  color={colors.neutral[950]} 
                />
                <Text style={styles.ctaText}>
                  {storyData?.hasStarted ? 'Continue' : 'Start Story'}
                </Text>
              </View>
            </View>

            {/* Character indicator */}
            <View style={styles.characterBadge}>
              <Text style={styles.characterFlag}>🇦🇷</Text>
              <Text style={styles.characterName}>Florencia</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="star" size={18} color={colors.story.star} />
            </View>
            <Text style={styles.statValue}>{storyData?.progress?.total_stars || 0}</Text>
            <Text style={styles.statLabel}>Stars</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="trophy" size={18} color={colors.primary.gold} />
            </View>
            <Text style={styles.statValue}>{storyData?.progress?.total_xp || 0}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="book" size={18} color={colors.accent.sage} />
            </View>
            <Text style={styles.statValue}>{journalStats?.totalEntries || 0}</Text>
            <Text style={styles.statLabel}>Journal</Text>
          </View>
        </View>

        {/* Action Cards */}
        <View style={styles.actionCards}>
          {/* Journal Card */}
          <Pressable onPress={handleOpenJournal} style={styles.actionCard}>
            <LinearGradient
              colors={['rgba(107,128,104,0.15)', 'rgba(107,128,104,0.05)']}
              style={styles.actionCardGradient}
            >
              <View style={styles.actionCardIcon}>
                <Ionicons name="journal" size={24} color={colors.accent.sage} />
              </View>
              <Text style={styles.actionCardTitle}>Spanish Journal</Text>
              <Text style={styles.actionCardSubtitle}>
                {journalStats?.currentStreak || 0} day streak
              </Text>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={colors.neutral[500]} 
                style={styles.actionCardArrow}
              />
            </LinearGradient>
          </Pressable>

          {/* Quick Practice Card */}
          <Pressable onPress={handleQuickPractice} style={styles.actionCard}>
            <LinearGradient
              colors={['rgba(74,107,138,0.15)', 'rgba(74,107,138,0.05)']}
              style={styles.actionCardGradient}
            >
              <View style={styles.actionCardIcon}>
                <Ionicons name="flash" size={24} color={colors.accent.sky} />
              </View>
              <Text style={styles.actionCardTitle}>Quick Practice</Text>
              <Text style={styles.actionCardSubtitle}>
                3-5 min conversation
              </Text>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={colors.neutral[500]} 
                style={styles.actionCardArrow}
              />
            </LinearGradient>
          </Pressable>
        </View>

        {/* Grammar Focus Card */}
        {storyData?.currentEpisode && (
          <View style={styles.grammarCard}>
            <View style={styles.grammarHeader}>
              <Ionicons name="school-outline" size={18} color={colors.accent.tango} />
              <Text style={styles.grammarLabel}>This Episode's Grammar</Text>
            </View>
            <Text style={styles.grammarFocus}>
              {storyData.currentEpisode.grammar_focus?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Present Subjunctive'}
            </Text>
            {storyData.currentEpisode.grammar_triggers?.length > 0 && (
              <View style={styles.triggersContainer}>
                {storyData.currentEpisode.grammar_triggers.slice(0, 3).map((trigger: string, index: number) => (
                  <View key={index} style={styles.triggerBadge}>
                    <Text style={styles.triggerText}>{trigger}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Motivational Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "El que habla dos idiomas vale por dos."
          </Text>
          <Text style={styles.quoteTranslation}>
            One who speaks two languages is worth two people.
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
    gap: spacing[4],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    ...textStyles.h4,
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  streakNumber: {
    ...textStyles.label,
    color: colors.text.primary,
    fontWeight: '700',
  },

  // Hero Card
  heroCard: {
    marginBottom: spacing[5],
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    ...shadows.card,
  },
  heroGradient: {
    padding: spacing[6],
    minHeight: 280,
    justifyContent: 'flex-end',
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary.gold,
  },
  heroContent: {
    gap: spacing[2],
  },
  overlineText: {
    ...textStyles.overline,
    color: colors.primary.gold,
    marginBottom: spacing[1],
  },
  storyTitle: {
    ...textStyles.h2,
    color: colors.text.primary,
    lineHeight: 38,
  },
  storySubtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  episodeInfo: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  episodeLabel: {
    ...textStyles.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing[1],
  },
  episodeTitle: {
    ...textStyles.h5,
    color: colors.text.primary,
  },
  progressContainer: {
    marginTop: spacing[4],
    gap: spacing[2],
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.neutral[800],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.gold,
    borderRadius: borderRadius.full,
  },
  progressText: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.lg,
    marginTop: spacing[4],
    gap: spacing[2],
    alignSelf: 'flex-start',
  },
  ctaText: {
    ...textStyles.button,
    color: colors.neutral[950],
  },
  characterBadge: {
    position: 'absolute',
    top: spacing[5],
    right: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  characterFlag: {
    fontSize: 14,
  },
  characterName: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[5],
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    marginBottom: spacing[1],
  },
  statValue: {
    ...textStyles.h4,
    color: colors.text.primary,
  },
  statLabel: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.subtle,
  },

  // Action Cards
  actionCards: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  actionCard: {
    flex: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  actionCardGradient: {
    padding: spacing[4],
    minHeight: 120,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  actionCardIcon: {
    position: 'absolute',
    top: spacing[4],
    left: spacing[4],
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCardTitle: {
    ...textStyles.label,
    color: colors.text.primary,
    marginTop: spacing[6],
  },
  actionCardSubtitle: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  actionCardArrow: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
  },

  // Grammar Card
  grammarCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[5],
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.tango,
  },
  grammarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  grammarLabel: {
    ...textStyles.labelSmall,
    color: colors.accent.tango,
  },
  grammarFocus: {
    ...textStyles.h5,
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  triggersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  triggerBadge: {
    backgroundColor: colors.neutral[800],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
  },
  triggerText: {
    ...textStyles.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },

  // Quote Card
  quoteCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    alignItems: 'center',
  },
  quoteText: {
    ...textStyles.dialogue,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  quoteTranslation: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

