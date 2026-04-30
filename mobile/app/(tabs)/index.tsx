import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator, Image, ImageBackground, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useAuth, supabase } from '../../src/contexts/AuthContext';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { api } from '../../src/services/api';
import { authTokenManager } from '../../src/services/authToken';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../src/theme';
import EpisodeRoadmap from '../../src/components/EpisodeRoadmap';
import { getEpisodeStill } from '../../src/data/episodeStills';

const { width } = Dimensions.get('window');

interface StoryProgress {
  hasStarted: boolean;
  arc: any;
  progress: any;
  currentEpisode: any;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const params = useLocalSearchParams<{ episodeId?: string }>();
  const displayName = user?.profile?.display_name || 'Learner';
  const streak = user?.progress?.current_streak || 0;

  const [isLoading, setIsLoading] = useState(true);
  const [storyData, setStoryData] = useState<StoryProgress | null>(null);
  const [journalStats, setJournalStats] = useState<any>(null);
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  
  // Use a ref to always have the latest storyData in callbacks (avoids closure issues)
  const storyDataRef = useRef<StoryProgress | null>(null);
  useEffect(() => {
    storyDataRef.current = storyData;
  }, [storyData]);

  const loadSelectedEpisode = async (episodeId: string) => {
    try {
      const result = await api.getEpisode(episodeId);
      if (result.data?.episode) {
        setSelectedEpisode(result.data.episode);
      }
    } catch (error) {
      console.error('Error loading selected episode:', error);
    }
  };

  // Load selected episode if episodeId param is provided
  useEffect(() => {
    if (params.episodeId && storyData?.arc) {
      loadSelectedEpisode(params.episodeId);
    }
  }, [params.episodeId, storyData?.arc]);

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
        // If user hasn't started but we have arc data, fetch first episode for grammar preview
        if (!storyResult.data.hasStarted && storyResult.data.arc && !storyResult.data.currentEpisode) {
          try {
            const arcResult = await api.getStoryArc(storyResult.data.arc.id);
            if (arcResult.data?.episodes?.[0]) {
              storyResult.data.currentEpisode = arcResult.data.episodes[0];
              console.log('✅ Loaded first episode for grammar preview');
            }
          } catch (e) {
            console.log('⚠️ Could not load first episode preview');
          }
        }
        setStoryData(storyResult.data);
        console.log('✅ Story data loaded successfully');
      } else if (storyResult.error) {
        console.log('⚠️ getCurrentStory error:', storyResult.error);
        // Fallback: fetch story arcs directly (public endpoint)
        const arcsResult = await api.getStoryArcs();
        console.log('📋 Fallback getStoryArcs result:', JSON.stringify(arcsResult, null, 2));
        
        if (arcsResult.data?.arcs?.[0]) {
          const arc = arcsResult.data.arcs[0];
          // Also fetch first episode for grammar preview
          let firstEpisode = null;
          try {
            const arcResult = await api.getStoryArc(arc.id);
            if (arcResult.data?.episodes?.[0]) {
              firstEpisode = arcResult.data.episodes[0];
              console.log('✅ Loaded first episode for grammar preview');
            }
          } catch (e) {
            console.log('⚠️ Could not load first episode preview');
          }
          
          // Create a storyData object from the first arc
          setStoryData({
            hasStarted: false,
            arc: arc,
            progress: null,
            currentEpisode: firstEpisode,
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
      } else {
        // Use selected episode if available, otherwise use current episode
        const episodeToPlay = selectedEpisode || currentStoryData.currentEpisode;
        
        if (episodeToPlay) {
          const isAdmin = user?.profile?.is_admin;
          if (episodeToPlay.episode_number > 1 && !isPremium && !isAdmin) {
            router.push('/paywall');
            return;
          }
          console.log('▶️ Continuing to episode:', episodeToPlay.id);
          router.push({
            pathname: '/story/[episode]',
            params: { episode: episodeToPlay.id }
          });
        } else {
          console.log('⚠️ No valid story state to handle');
          console.log('hasStarted:', currentStoryData.hasStarted);
          console.log('arc:', currentStoryData.arc);
          console.log('currentEpisode:', currentStoryData.currentEpisode);
          console.log('selectedEpisode:', selectedEpisode);
          Alert.alert('Error', 'Story not available. Please try again.');
        }
      }
    } catch (error) {
      console.error('❌ Exception in handleStartStory:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  }, [storyData, user, selectedEpisode]);

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

  const handleSelectEpisode = async (episode: any, isUnlocked: boolean) => {
    if (!isUnlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Locked', 'Complete previous episodes to unlock this one.');
      return;
    }
    
    const isAdmin = user?.profile?.is_admin;
    if (episode.episode_number > 1 && !isPremium && !isAdmin) {
      setShowEpisodesModal(false);
      router.push('/paywall');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowEpisodesModal(false);
    
    // Fetch full episode data (including scenes for background image)
    try {
      const result = await api.getEpisode(episode.id);
      if (result.data?.episode) {
        setSelectedEpisode(result.data.episode);
      } else {
        // Fallback to the episode from the list (without scenes)
    setSelectedEpisode(episode);
      }
    } catch (error) {
      console.error('Error fetching full episode data:', error);
      setSelectedEpisode(episode);
    }
  };


  // Determine which episode to display (selected episode or current episode)
  const displayEpisode = selectedEpisode || storyData?.currentEpisode;

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

  // Get the episode still image for the current episode
  const currentEpisodeNumber = displayEpisode?.episode_number || 1;
  const episodeStillSource = getEpisodeStill(currentEpisodeNumber);

  return (
    <View style={styles.fullContainer}>
      {/* Full-screen unblurred background image */}
      {episodeStillSource && (
        <Image
          source={episodeStillSource}
          style={styles.fullScreenBackground}
          resizeMode="cover"
        />
      )}
      {/* Dark overlay for overall readability */}
      <View style={styles.fullScreenOverlay} />
      
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Minimal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.brandText}>Spanish Lab</Text>
            </View>
          </View>

          {/* Story Hero Card */}
          <Pressable onPress={handleStartStory} style={styles.heroCard}>
            <View style={styles.heroCardInner}>
              {/* Story info */}
            <View style={styles.heroContent}>
              <Text style={styles.overlineText}>
                {selectedEpisode 
                  ? `EPISODE ${selectedEpisode.episode_number}` 
                  : (storyData?.hasStarted ? 'CONTINUE YOUR STORY' : 'BEGIN YOUR JOURNEY')}
              </Text>
              
              <Text style={styles.storyTitle}>
                {storyData?.arc?.title_es || 'Encuentros en Buenos Aires'}
              </Text>

              {displayEpisode && (
                <View style={styles.heroEpisodeInfo}>
                  <Text style={styles.heroEpisodeLabel}>
                    EPISODE {displayEpisode.episode_number} OF {storyData.arc?.total_episodes || 8}
                  </Text>
                  <Text style={styles.heroEpisodeTitle}>
                    {displayEpisode.title_es}
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
                <LinearGradient
                  colors={['#B3F5FF', '#00B8DB']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.ctaButton}
                >
                  <Ionicons 
                    name={displayEpisode ? "play" : (storyData?.hasStarted ? "play" : "sparkles")} 
                    size={20} 
                    color={colors.neutral[950]} 
                  />
                  <Text style={styles.ctaText}>
                    {displayEpisode ? 'Continue' : (storyData?.hasStarted ? 'Continue' : 'Start Story')}
                  </Text>
                </LinearGradient>
                
                {(storyData?.hasStarted || selectedEpisode) && (
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
          </View>
        </Pressable>


        {/* Episode Roadmap */}
        {displayEpisode && storyData?.arc && (
          <EpisodeRoadmap
            episodeId={displayEpisode.id}
            episodeNumber={displayEpisode.episode_number}
            totalEpisodes={storyData.arc.total_episodes || 8}
            grammarFocus={displayEpisode.grammar_focus}
            onRefreshHome={async () => {
              setSelectedEpisode(null);
              await loadHomeData();
            }}
          />
        )}
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
                const isUnlocked = isCurrentOrCompleted || !!user?.profile?.is_admin;
                
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
                          <Ionicons name="lock-closed" size={20} color="#FF0000" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  fullScreenBackground: {
    position: 'absolute',
    top: -50,
    left: -20,
    right: -20,
    bottom: 50,
    width: '110%',
    height: '110%',
    transform: [{ scale: 1.15 }],
  },
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,11,0.5)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    backgroundColor: colors.primary.black,
    borderWidth: 3,
    borderColor: '#00D5FF',
    ...shadows.card,
  },
  heroCardInner: {
    padding: spacing[6],
    minHeight: 280,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  heroEpisodeInfo: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
  },
  heroEpisodeLabel: {
    ...textStyles.labelSmall,
    color: colors.text.tertiary,
    marginBottom: spacing[2],
    letterSpacing: 1,
  },
  heroEpisodeTitle: {
    ...textStyles.h5,
    color: colors.text.primary,
    textAlign: 'left',
    width: '100%',
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

