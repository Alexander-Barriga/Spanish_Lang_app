import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator, Image, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useAuth, supabase } from '../../src/contexts/AuthContext';
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
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);
  const [episodes, setEpisodes] = useState<any[]>([]);
  
  // Use a ref to always have the latest storyData in callbacks (avoids closure issues)
  const storyDataRef = useRef<StoryProgress | null>(null);
  useEffect(() => {
    storyDataRef.current = storyData;
  }, [storyData]);

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
    // Skip API calls if user is not authenticated
    if (!user) {
      console.log('⚠️ No user, skipping API calls');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('📡 Loading home data...');
      
      // Ensure we have the token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authTokenManager.setToken(session.access_token);
        console.log('🔑 Token synced from Supabase session');
      } else {
        console.log('⚠️ No Supabase session, API calls may fail');
      }
      
      // Fetch current story progress
      const storyResult = await api.getCurrentStory();
      console.log('📋 getCurrentStory result:', JSON.stringify(storyResult, null, 2));
      
      if (storyResult.data) {
        setStoryData(storyResult.data);
        console.log('✅ Story data loaded successfully');
      } else if (storyResult.error) {
        console.log('⚠️ getCurrentStory error:', storyResult.error);
        // Fallback: fetch story arcs directly (public endpoint)
        const arcsResult = await api.getStoryArcs();
        console.log('📋 Fallback getStoryArcs result:', JSON.stringify(arcsResult, null, 2));
        
        if (arcsResult.data?.arcs?.[0]) {
          // Create a storyData object from the first arc
          setStoryData({
            hasStarted: false,
            arc: arcsResult.data.arcs[0],
            progress: null,
            currentEpisode: null,
          });
          console.log('✅ Fallback story data set from arcs');
        }
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
      console.error('❌ Error loading home data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartStory = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Use the ref to get the LATEST storyData value (avoids stale closure)
    const currentStoryData = storyDataRef.current;
    
    console.log('🎬 handleStartStory called');
    console.log('🔐 User authenticated:', !!user);
    console.log('📊 storyData from ref:', JSON.stringify(currentStoryData, null, 2));
    
    // Check if user is authenticated
    if (!user) {
      console.log('❌ No user');
      Alert.alert(
        'Sign In Required',
        'Please sign in to start your story.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // User is authenticated - ensure we have the token
    // First try memory, then SecureStore, then Supabase session
    let token = authTokenManager.getToken();
    console.log('🔍 Token in memory:', token ? 'YES' : 'NO');
    
    if (!token) {
      console.log('🔍 Restoring from SecureStore...');
      token = await authTokenManager.restoreToken();
      console.log('🔍 Token from SecureStore:', token ? 'YES' : 'NO');
    }
    
    if (!token) {
      // Try Supabase session
      console.log('🔍 Trying Supabase getSession...');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        token = session.access_token;
        authTokenManager.setToken(token);
        // Also persist to SecureStore
        await SecureStore.setItemAsync('auth_token', token);
        console.log('✅ Token retrieved and stored from Supabase session');
      }
    }
    
    if (!token) {
      // Last resort: try to refresh the session
      console.log('🔍 Trying to refresh session...');
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (session?.access_token && !error) {
        token = session.access_token;
        authTokenManager.setToken(token);
        await SecureStore.setItemAsync('auth_token', token);
        console.log('✅ Token retrieved from refreshed session');
      } else {
        console.log('❌ Session refresh failed:', error?.message);
      }
    }
    
    if (!token) {
      console.log('❌ Could not get auth token from any source');
      Alert.alert(
        'Authentication Error',
        'Unable to verify your session. Please sign out and sign in again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log('✅ Auth token available, length:', token.length);
    
    try {
      // If we don't have story data, try to fetch it first
      if (!currentStoryData?.arc) {
        console.log('⚠️ No storyData, fetching arcs...');
        const arcsResult = await api.getStoryArcs();
        if (arcsResult.data?.arcs?.[0]) {
          const arc = arcsResult.data.arcs[0];
          console.log('🚀 Starting story arc directly:', arc.id);
          const result = await api.startStoryArc(arc.id);
          
          if (result.error) {
            console.error('❌ Error starting story:', result.error);
            Alert.alert('Error', result.error);
            return;
          }
          
          if (result.data?.firstEpisode) {
            console.log('✅ Navigating to episode:', result.data.firstEpisode.id);
            router.push({
              pathname: '/story/[episode]',
              params: { episode: result.data.firstEpisode.id }
            });
          } else {
            Alert.alert('Error', 'Could not load first episode');
          }
          return;
        } else {
          Alert.alert('Error', 'No stories available. Please try again later.');
          return;
        }
      }
      
      if (!currentStoryData.hasStarted && currentStoryData.arc) {
        // Start the story arc
        console.log('🚀 Starting story arc:', currentStoryData.arc.id);
        const result = await api.startStoryArc(currentStoryData.arc.id);
        
        console.log('📋 startStoryArc result:', JSON.stringify(result, null, 2));
        
        if (result.error) {
          console.error('❌ Error starting story:', result.error);
          Alert.alert('Error', result.error);
          return;
        }
        
        if (result.data?.firstEpisode) {
          console.log('✅ Navigating to episode:', result.data.firstEpisode.id);
          router.push({
            pathname: '/story/[episode]',
            params: { episode: result.data.firstEpisode.id }
          });
        } else {
          console.error('❌ No firstEpisode in response');
          Alert.alert('Error', 'Could not load first episode');
        }
      } else if (currentStoryData.currentEpisode) {
        console.log('▶️ Continuing to episode:', currentStoryData.currentEpisode.id);
        router.push({
          pathname: '/story/[episode]',
          params: { episode: currentStoryData.currentEpisode.id }
        });
      } else {
        console.log('⚠️ No valid story state to handle');
        console.log('hasStarted:', currentStoryData.hasStarted);
        console.log('arc:', currentStoryData.arc);
        console.log('currentEpisode:', currentStoryData.currentEpisode);
        Alert.alert('Error', 'Story not available. Please try again.');
      }
    } catch (error) {
      console.error('❌ Exception in handleStartStory:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  }, [storyData, user]);

  const handleOpenEpisodes = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (!storyData?.arc?.id) {
      Alert.alert('No Story', 'Start your story first to see episodes.');
      return;
    }
    
    try {
      const result = await api.getStoryArc(storyData.arc.id);
      if (result.data?.episodes) {
        setEpisodes(result.data.episodes);
      }
    } catch (error) {
      console.error('Error fetching episodes:', error);
    }
    
    setShowEpisodesModal(true);
  };
  
  const handleSelectEpisode = (episode: any, isUnlocked: boolean) => {
    if (!isUnlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Locked', 'Complete previous episodes to unlock this one.');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowEpisodesModal(false);
    router.push(`/story/${episode.id}`);
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

              {/* CTA Buttons Row */}
              <View style={styles.ctaRow}>
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
                
                {storyData?.hasStarted && (
                  <Pressable 
                    onPress={(e) => {
                      e.stopPropagation();
                      handleOpenEpisodes();
                    }} 
                    style={styles.episodesButton}
                  >
                    <Ionicons name="list" size={18} color={colors.text.primary} />
                    <Text style={styles.episodesButtonText}>Episodes</Text>
                  </Pressable>
                )}
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

        {/* Grammar Focus Card - Tappable to open lesson */}
        {storyData?.currentEpisode && (
          <Pressable 
            style={({ pressed }) => [
              styles.grammarCard,
              pressed && styles.grammarCardPressed
            ]}
            onPress={() => {
              const grammarFocus = storyData.currentEpisode?.grammar_focus;
              const episodeId = storyData.currentEpisode?.id;
              if (grammarFocus) {
                router.push({
                  pathname: '/grammar/[topic]',
                  params: { topic: grammarFocus, episodeId: episodeId || '' }
                });
              }
            }}
          >
            <View style={styles.grammarHeader}>
              <Ionicons name="school-outline" size={18} color={colors.accent.tango} />
              <Text style={styles.grammarLabel}>This Episode's Grammar</Text>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={18} color={colors.accent.tango} />
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
            <Text style={styles.grammarHint}>Tap to learn more</Text>
          </Pressable>
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
      
      {/* Episodes Modal */}
      <Modal
        visible={showEpisodesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEpisodesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Episodes</Text>
              <Pressable 
                onPress={() => setShowEpisodesModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.episodesList}>
              {episodes.map((episode, index) => {
                const episodesCompleted = storyData?.progress?.episodes_completed || 0;
                const currentEpisodeNum = storyData?.progress?.current_episode || 1;
                const isCompleted = episode.episode_number < currentEpisodeNum;
                const isCurrentOrCompleted = episode.episode_number <= currentEpisodeNum;
                const isUnlocked = isCurrentOrCompleted;
                
                return (
                  <Pressable
                    key={episode.id}
                    onPress={() => handleSelectEpisode(episode, isUnlocked)}
                    style={[
                      styles.episodeItem,
                      !isUnlocked && styles.episodeItemLocked,
                    ]}
                  >
                    <View style={[
                      styles.episodeInfo,
                      !isUnlocked && styles.episodeInfoBlurred,
                    ]}>
                      <Text style={[
                        styles.episodeNumber,
                        !isUnlocked && styles.textBlurred,
                      ]}>
                        {episode.episode_number}.
                      </Text>
                      <View style={styles.episodeTitleContainer}>
                        <Text style={[
                          styles.episodeTitle,
                          !isUnlocked && styles.textBlurred,
                        ]}>
                          {episode.title_es}
                        </Text>
                        <Text style={[
                          styles.episodeSubtitle,
                          !isUnlocked && styles.textBlurred,
                        ]}>
                          {episode.title_en}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.episodeStatus}>
                      {isCompleted ? (
                        <View style={styles.completedBadge}>
                          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                        </View>
                      ) : isUnlocked ? (
                        <View style={styles.currentBadge}>
                          <Ionicons name="play-circle" size={22} color={colors.primary.gold} />
                        </View>
                      ) : (
                        <View style={styles.lockedBadge}>
                          <Ionicons name="lock-closed" size={20} color={colors.error} />
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    gap: spacing[2],
  },
  ctaText: {
    ...textStyles.button,
    color: colors.neutral[950],
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  episodesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[800],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.neutral[700],
  },
  episodesButtonText: {
    ...textStyles.button,
    color: colors.text.primary,
    fontSize: 14,
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
  grammarCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
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
  grammarHint: {
    ...textStyles.caption,
    color: colors.text.muted,
    marginTop: spacing[2],
    fontStyle: 'italic',
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
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '80%',
    paddingBottom: spacing[8],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[800],
  },
  modalTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
  },
  modalCloseButton: {
    padding: spacing[2],
  },
  episodesList: {
    padding: spacing[4],
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.elevated,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
  },
  episodeItemLocked: {
    backgroundColor: colors.neutral[900],
    opacity: 0.7,
  },
  episodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[3],
  },
  episodeInfoBlurred: {
    opacity: 0.5,
  },
  episodeNumber: {
    ...textStyles.h3,
    color: colors.primary.gold,
    width: 30,
  },
  episodeTitleContainer: {
    flex: 1,
  },
  episodeTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  episodeSubtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  textBlurred: {
    color: colors.text.muted,
  },
  episodeStatus: {
    marginLeft: spacing[3],
  },
  completedBadge: {
    // Completed episode indicator
  },
  currentBadge: {
    // Current episode indicator
  },
  lockedBadge: {
    // Locked episode indicator
  },
});

