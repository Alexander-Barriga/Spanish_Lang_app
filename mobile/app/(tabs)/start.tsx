import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Video, ResizeMode } from 'expo-av';
import { GRAMMAR_PRACTICE_OPTIONS } from '../../src/config/constants';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { colors, textStyles, spacing, borderRadius } from '../../src/theme';

export default function StartScreen() {
  const { user } = useAuth();
  const [currentEpisode, setCurrentEpisode] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  const loadProgress = async () => {
    try {
      setIsLoading(true);
      const result = await api.getCurrentStory();
      if (result.data?.progress?.current_episode) {
        setCurrentEpisode(result.data.progress.current_episode);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = !!user?.profile?.is_admin;

  const isOptionUnlocked = (unlockAfterEpisode: number) => {
    return isAdmin || currentEpisode > unlockAfterEpisode;
  };

  const getUnlockHint = (unlockAfterEpisode: number): string => {
    return `Complete Episode ${unlockAfterEpisode} to unlock`;
  };

  const handleQuickStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/conversation/[id]',
      params: { id: 'new', mode: 'open' },
    });
  };

  const handleGrammarTap = (option: typeof GRAMMAR_PRACTICE_OPTIONS[number]) => {
    if (!isOptionUnlocked(option.unlockAfterEpisode)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/conversation/[id]',
      params: { id: 'new', mode: 'grammar', grammarFocus: option.grammarFocus },
    });
  };

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: 'https://pub-eaa84f1d0f9b40b8b0fb15b73338527c.r2.dev/other_videos/Speaking_Page_Background.mp4' }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Start a Conversation</Text>
          <Text style={styles.subtitle}>Choose your practice mode</Text>
        </View>

        {/* Quick Start */}
        <View>
          <Pressable style={styles.quickStartButton} onPress={handleQuickStart}>
            <View style={styles.quickStartIcon}>
              <Ionicons name="mic" size={32} color={colors.neutral[900]} />
            </View>
            <View style={styles.quickStartText}>
              <Text style={styles.quickStartTitle}>Quick Start</Text>
              <Text style={styles.quickStartSubtitle}>
                Jump into a free conversation
              </Text>
            </View>
            <Ionicons
              name="arrow-forward"
              size={24}
              color={colors.primary.gold}
            />
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or practice grammar</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Grammar Practice Options */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary.gold} />
          </View>
        ) : (
          <View style={styles.optionsContainer}>
            {GRAMMAR_PRACTICE_OPTIONS.map((option) => {
              const unlocked = isOptionUnlocked(option.unlockAfterEpisode);

              return (
                <Pressable
                  key={option.id}
                  style={({ pressed }) => [
                    styles.optionCard,
                    unlocked ? styles.optionCardUnlocked : styles.optionCardLocked,
                    pressed && unlocked && styles.optionCardPressed,
                  ]}
                  onPress={() => handleGrammarTap(option)}
                  disabled={false}
                >
                  <View style={styles.optionLeft}>
                    <View style={[
                      styles.optionIconContainer,
                      unlocked ? styles.optionIconUnlocked : styles.optionIconLocked,
                    ]}>
                      {unlocked ? (
                        <Ionicons name="mic" size={22} color={colors.primary.gold} />
                      ) : (
                        <Ionicons name="lock-closed" size={20} color="#FF0000" />
                      )}
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[
                        styles.optionTitle,
                        !unlocked && styles.optionTitleLocked,
                      ]}>
                        {option.title}
                      </Text>
                      <Text style={[
                        styles.optionSubtitle,
                        !unlocked && styles.optionSubtitleLocked,
                      ]}>
                        {unlocked ? option.subtitle : getUnlockHint(option.unlockAfterEpisode)}
                      </Text>
                    </View>
                  </View>
                  {unlocked && (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.primary.gold}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Voice Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Voice Tips</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>
              Speak naturally — don't worry about mistakes
            </Text>
            <Text style={styles.tipItem}>
              Pause for 1.5 seconds when you're done
            </Text>
            <Text style={styles.tipItem}>
              Say "corrígeme" to ask for corrections
            </Text>
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  safeArea: {
    flex: 1,
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
    alignItems: 'center',
  },
  title: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  quickStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.gold,
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[6],
  },
  quickStartIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  quickStartText: {
    flex: 1,
  },
  quickStartTitle: {
    ...textStyles.h4,
    color: colors.neutral[900],
  },
  quickStartSubtitle: {
    ...textStyles.bodySmall,
    color: colors.neutral[700],
    marginTop: spacing[0.5],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[6],
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
  loadingContainer: {
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  optionsContainer: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 2,
    backgroundColor: colors.background.elevated,
  },
  optionCardUnlocked: {
    borderColor: colors.primary.gold,
  },
  optionCardLocked: {
    borderColor: '#FF0000',
    backgroundColor: colors.neutral[900],
    opacity: 0.6,
  },
  optionCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[3],
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconUnlocked: {
    backgroundColor: colors.primary.gold + '20',
  },
  optionIconLocked: {
    backgroundColor: 'rgba(255,0,0,0.1)',
  },
  optionContent: {
    flex: 1,
    gap: spacing[1],
  },
  optionTitle: {
    ...textStyles.h5,
    color: colors.text.primary,
    fontWeight: '600',
  },
  optionTitleLocked: {
    color: colors.text.muted,
  },
  optionSubtitle: {
    ...textStyles.caption,
    color: colors.primary.gold,
    fontSize: 12,
  },
  optionSubtitleLocked: {
    color: colors.text.muted,
  },
  tipsCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  tipsTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  tipsList: {
    gap: spacing[2],
  },
  tipItem: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
