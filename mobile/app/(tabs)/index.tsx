import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { CONVERSATION_MODES } from '../../src/config/constants';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../src/theme';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const displayName = user?.profile?.display_name || 'Learner';
  const streak = user?.progress?.current_streak || 0;

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
            <Text style={styles.greeting}>¡Hola, {displayName}!</Text>
            <Text style={styles.subGreeting}>Ready to practice?</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakNumber}>{streak}</Text>
          </View>
        </View>

        {/* Quick Start Card */}
        <View>
          <Link href="/(tabs)/start" asChild>
            <Pressable>
              <LinearGradient
                colors={[colors.primary.gold, '#e5a83a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickStartCard}
              >
                <View style={styles.quickStartContent}>
                  <Text style={styles.quickStartEmoji}>🐺</Text>
                  <View style={styles.quickStartText}>
                    <Text style={styles.quickStartTitle}>Start Talking</Text>
                    <Text style={styles.quickStartSubtitle}>
                      Practice Spanish with Lobo
                    </Text>
                  </View>
                </View>
                <View style={styles.quickStartButton}>
                  <Ionicons name="mic" size={24} color={colors.primary.gold} />
                </View>
              </LinearGradient>
            </Pressable>
          </Link>
        </View>

        {/* Conversation Modes */}
        <View 
         
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Conversation Modes</Text>
          <Text style={styles.sectionSubtitle}>Choose how you want to practice</Text>
          
          <View style={styles.modesGrid}>
            {CONVERSATION_MODES.map((mode, index) => (
              <View
                key={mode.id}
               
                style={styles.modeCardWrapper}
              >
                <Link 
                  href={{
                    pathname: '/mode-setup',
                    params: { mode: mode.id },
                  }} 
                  asChild
                >
                  <Pressable style={styles.modeCard}>
                    <View 
                      style={[
                        styles.modeIconContainer, 
                        { backgroundColor: mode.color + '20' }
                      ]}
                    >
                      <Ionicons 
                        name={mode.icon as keyof typeof Ionicons.glyphMap} 
                        size={24} 
                        color={mode.color} 
                      />
                    </View>
                    <Text style={styles.modeTitle}>{mode.title}</Text>
                    <Text style={styles.modeSubtitle}>{mode.subtitle}</Text>
                  </Pressable>
                </Link>
              </View>
            ))}
          </View>
        </View>

        {/* Daily Tip */}
        <View 
         
          style={styles.tipCard}
        >
          <View style={styles.tipHeader}>
            <Text style={styles.tipEmoji}>💡</Text>
            <Text style={styles.tipLabel}>Tip of the Day</Text>
          </View>
          <Text style={styles.tipText}>
            Try practicing for just 10 minutes daily. Consistency beats intensity for language learning!
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
  quickStartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[5],
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing[6],
    ...shadows.lg,
  },
  quickStartContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickStartEmoji: {
    fontSize: 40,
    marginRight: spacing[4],
  },
  quickStartText: {},
  quickStartTitle: {
    ...textStyles.h4,
    color: colors.neutral[900],
  },
  quickStartSubtitle: {
    ...textStyles.bodySmall,
    color: colors.neutral[700],
    marginTop: spacing[0.5],
  },
  quickStartButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[900],
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  sectionSubtitle: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing[2],
  },
  modeCardWrapper: {
    width: '50%',
    padding: spacing[2],
  },
  modeCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  modeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  modeTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[0.5],
  },
  modeSubtitle: {
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

