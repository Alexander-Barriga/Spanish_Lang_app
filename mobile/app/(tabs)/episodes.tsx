import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/contexts/AuthContext';
import { api, Episode } from '../../src/services/api';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../src/theme';
import { getEpisodeStill } from '../../src/data/episodeStills';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing[6] * 3) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface EpisodeView {
  episodeId: string;
  episodeNumber: number;
  titleEs: string;
  titleEn: string;
  firstViewedAt: string;
  viewCount: number;
  lastViewedAt: string;
}

interface EpisodeWithStatus extends Episode {
  isUnlocked: boolean;
  viewCount?: number;
  lastViewedAt?: string;
}

export default function EpisodesScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [episodes, setEpisodes] = useState<EpisodeWithStatus[]>([]);
  const [views, setViews] = useState<EpisodeView[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadEpisodes();
      } else {
        setIsLoading(false);
      }
    }, [user])
  );

  const loadEpisodes = async () => {
    try {
      setIsLoading(true);

      // Get all episodes and user views in parallel
      const [storyResult, viewsResult] = await Promise.all([
        api.getCurrentStory(),
        api.getEpisodeViews(),
      ]);

      // Get episode views
      const episodeViews = viewsResult.data?.views || [];
      setViews(episodeViews);

      // Create a map of viewed episodes for quick lookup
      const viewedMap = new Map(
        episodeViews.map((v) => [v.episodeId, v])
      );

      // Get all episodes for the current arc
      if (storyResult.data?.arc?.id) {
        const arcResult = await api.getStoryArc(storyResult.data.arc.id);
        const allEpisodes = arcResult.data?.episodes || [];

        // Mark episodes as unlocked/locked based on views
        const episodesWithStatus: EpisodeWithStatus[] = allEpisodes.map((ep: Episode) => {
          const view = viewedMap.get(ep.id);
          return {
            ...ep,
            isUnlocked: !!view,
            viewCount: view?.viewCount || 0,
            lastViewedAt: view?.lastViewedAt,
          };
        });

        setEpisodes(episodesWithStatus);
      }
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEpisodePress = (episode: EpisodeWithStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!episode.isUnlocked) {
      // Show message that episode is locked
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Navigate to the episode player
    router.push(`/story/${episode.id}`);
  };

  const formatLastViewed = (dateString: string | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Watched today';
    if (diffDays === 1) return 'Watched yesterday';
    if (diffDays < 7) return `Watched ${diffDays} days ago`;
    return `Watched ${date.toLocaleDateString()}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
          <Text style={styles.loadingText}>Loading episodes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={64} color={colors.text.muted} />
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptyText}>
            Sign in to view your watched episodes
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const unlockedCount = episodes.filter((e) => e.isUnlocked).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Episodes</Text>
          <Text style={styles.subtitle}>
            {unlockedCount} of {episodes.length} unlocked
          </Text>
        </View>

        {/* Episodes Grid */}
        <View style={styles.grid}>
          {episodes.map((episode) => {
            const episodeStill = getEpisodeStill(episode.episode_number);
            
            return (
              <Pressable
                key={episode.id}
                style={styles.cardContainer}
                onPress={() => handleEpisodePress(episode)}
              >
                <View style={styles.card}>
                  {/* Episode Thumbnail/Background */}
                  <View style={styles.cardBackground}>
                    {/* Episode Still Image */}
                    {episodeStill && (
                      <Image
                        source={episodeStill}
                        style={styles.cardThumbnail}
                        resizeMode="cover"
                        blurRadius={episode.isUnlocked ? 0 : 25}
                      />
                    )}
                    {/* Fallback gradient if no image */}
                    {!episodeStill && (
                      <LinearGradient
                        colors={
                          episode.isUnlocked
                            ? [colors.background.elevated, colors.background.card]
                            : ['#1a1a1a', '#0d0d0d']
                        }
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    {/* Dark overlay for locked episodes */}
                    {!episode.isUnlocked && (
                      <View style={styles.lockedDarkOverlay} />
                    )}

                    {/* Episode Number Badge */}
                    <View style={[
                      styles.episodeBadge,
                      !episode.isUnlocked && styles.episodeBadgeLocked
                    ]}>
                      <Text style={styles.episodeBadgeText}>
                        {episode.episode_number}
                      </Text>
                    </View>

                    {/* Lock overlay for locked episodes */}
                    {!episode.isUnlocked && (
                      <View style={styles.lockOverlay}>
                        <Ionicons
                          name="lock-closed"
                          size={32}
                          color={colors.text.muted}
                        />
                        <Text style={styles.lockText}>Not yet watched</Text>
                      </View>
                    )}

                    {/* Play button for unlocked episodes */}
                    {episode.isUnlocked && (
                      <View style={styles.playButtonContainer}>
                        <View style={styles.playButton}>
                          <Ionicons
                            name="play"
                            size={24}
                            color={colors.text.primary}
                          />
                        </View>
                      </View>
                    )}

                    {/* View count badge */}
                    {episode.isUnlocked && episode.viewCount && episode.viewCount > 0 && (
                      <View style={styles.viewCountBadge}>
                        <Ionicons name="eye" size={12} color={colors.text.secondary} />
                        <Text style={styles.viewCountText}>{episode.viewCount}</Text>
                      </View>
                    )}
                  </View>

                  {/* Episode Info */}
                  <View style={styles.cardInfo}>
                    <Text 
                      style={[
                        styles.cardTitle,
                        !episode.isUnlocked && styles.cardTitleLocked
                      ]}
                      numberOfLines={2}
                    >
                      {episode.title_es}
                    </Text>

                    {/* Last viewed info */}
                    {episode.isUnlocked && episode.lastViewedAt && (
                      <Text style={styles.lastViewed}>
                        {formatLastViewed(episode.lastViewedAt)}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Empty state */}
        {episodes.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-outline" size={64} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>No Episodes Yet</Text>
            <Text style={styles.emptyText}>
              Start watching episodes from the Home tab to unlock them here
            </Text>
          </View>
        )}

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={colors.primary.gold} />
          <Text style={styles.infoText}>
            Episodes become available for unlimited rewatching after you watch them for the first time.
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[20],
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
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  title: {
    ...textStyles.h1,
    color: colors.text.primary,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  cardContainer: {
    width: CARD_WIDTH,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardBackground: {
    width: '100%',
    height: CARD_HEIGHT * 0.65,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.background.elevated,
  },
  cardThumbnail: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  lockedDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  episodeBadge: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    backgroundColor: colors.primary.gold,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  episodeBadgeLocked: {
    backgroundColor: colors.neutral[700],
  },
  episodeBadgeText: {
    ...textStyles.label,
    color: colors.neutral[950],
    fontWeight: '700',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockText: {
    ...textStyles.caption,
    color: colors.text.muted,
    marginTop: spacing[2],
  },
  playButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewCountBadge: {
    position: 'absolute',
    bottom: spacing[2],
    right: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  viewCountText: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  cardInfo: {
    padding: spacing[3],
  },
  cardTitle: {
    ...textStyles.bodySmall,
    color: colors.text.primary,
    fontWeight: '600',
  },
  cardTitleLocked: {
    color: colors.text.muted,
  },
  cardSubtitle: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  cardSubtitleLocked: {
    color: colors.text.muted,
  },
  lastViewed: {
    ...textStyles.caption,
    color: colors.primary.gold,
    marginTop: spacing[2],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  emptyTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginTop: spacing[4],
  },
  emptyText: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[2],
    paddingHorizontal: spacing[8],
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.elevated,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginTop: spacing[6],
    gap: spacing[3],
  },
  infoText: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    flex: 1,
  },
});
