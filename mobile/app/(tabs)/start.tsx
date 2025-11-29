import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CONVERSATION_MODES } from '../../src/config/constants';
import { colors, textStyles, spacing, borderRadius } from '../../src/theme';

export default function StartScreen() {
  const handleQuickStart = () => {
    // Start an open conversation directly
    router.push({
      pathname: '/conversation/[id]',
      params: { id: 'new', mode: 'open' },
    });
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
          <Text style={styles.dividerText}>or choose a mode</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Mode Options */}
        <View style={styles.modesContainer}>
          {CONVERSATION_MODES.map((mode, index) => (
            <View
              key={mode.id}
             
            >
              <Link 
                href={{
                  pathname: '/mode-setup',
                  params: { mode: mode.id },
                }} 
                asChild
              >
                <Pressable style={styles.modeOption}>
                  <View 
                    style={[
                      styles.modeIconBg, 
                      { backgroundColor: mode.color + '20' }
                    ]}
                  >
                    <Ionicons 
                      name={mode.icon as keyof typeof Ionicons.glyphMap} 
                      size={28} 
                      color={mode.color} 
                    />
                  </View>
                  <View style={styles.modeContent}>
                    <Text style={styles.modeTitle}>{mode.title}</Text>
                    <Text style={styles.modeDescription}>{mode.description}</Text>
                  </View>
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={colors.neutral[500]} 
                  />
                </Pressable>
              </Link>
            </View>
          ))}
        </View>

        {/* Voice Tips */}
        <View 
         
          style={styles.tipsCard}
        >
          <Text style={styles.tipsTitle}>🎙️ Voice Tips</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>
              • Speak naturally - don't worry about mistakes
            </Text>
            <Text style={styles.tipItem}>
              • Pause for 1.5 seconds when you're done
            </Text>
            <Text style={styles.tipItem}>
              • Say "corrígeme" to ask for corrections
            </Text>
          </View>
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
  modesContainer: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  modeIconBg: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[0.5],
  },
  modeDescription: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
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

