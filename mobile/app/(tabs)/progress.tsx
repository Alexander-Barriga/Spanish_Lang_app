import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../src/theme';

// Mock achievements
const achievements = [
  { id: 'first_chat', name: 'First Chat', icon: '💬', earned: true },
  { id: 'streak_7', name: '7-Day Streak', icon: '🔥', earned: true },
  { id: 'vocab_100', name: '100 Words', icon: '📚', earned: false },
  { id: 'chats_10', name: '10 Conversations', icon: '🗣️', earned: false },
];

export default function ProgressScreen() {
  const { user } = useAuth();
  const progress = user?.progress;

  const stats = {
    streak: progress?.current_streak || 0,
    longestStreak: progress?.longest_streak || 0,
    conversations: progress?.total_conversations || 0,
    minutes: progress?.total_minutes || 0,
    vocabulary: progress?.vocabulary_learned?.length || 0,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View 
         
          style={styles.header}
        >
          <Text style={styles.title}>Your Progress</Text>
          <Text style={styles.subtitle}>Keep up the great work! 💪</Text>
        </View>

        {/* Streak Card */}
        <View 
         
          style={styles.streakCard}
        >
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

        {/* Stats Grid */}
        <View 
         
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              icon="chatbubbles" 
              value={stats.conversations} 
              label="Conversations" 
              delay={0}
            />
            <StatCard 
              icon="time" 
              value={stats.minutes} 
              label="Minutes" 
              delay={50}
            />
            <StatCard 
              icon="book" 
              value={stats.vocabulary} 
              label="Words Learned" 
              delay={100}
            />
            <StatCard 
              icon="trophy" 
              value={achievements.filter(a => a.earned).length} 
              label="Achievements" 
              delay={150}
            />
          </View>
        </View>

        {/* Achievements */}
        <View 
         
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement, index) => (
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

        {/* Weekly Goal */}
        <View 
         
          style={styles.goalCard}
        >
          <View style={styles.goalHeader}>
            <Text style={styles.goalTitle}>Weekly Goal</Text>
            <Text style={styles.goalProgress}>3/5 days</Text>
          </View>
          <View style={styles.goalProgressBar}>
            <View 
              style={[styles.goalProgressFill, { width: '60%' }]} 
            />
          </View>
          <Text style={styles.goalText}>
            Practice 2 more days to reach your weekly goal!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ 
  icon, 
  value, 
  label, 
  delay 
}: { 
  icon: string; 
  value: number; 
  label: string; 
  delay: number;
}) {
  return (
    <View 
     
      style={styles.statCard}
    >
      <Ionicons 
        name={icon as keyof typeof Ionicons.glyphMap} 
        size={24} 
        color={colors.primary.gold} 
      />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  goalCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
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
});

