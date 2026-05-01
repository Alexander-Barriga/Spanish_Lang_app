import { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SPANISH_LEVELS, DEFAULT_TOPICS } from '../../src/config/constants';
import { colors, textStyles, spacing, borderRadius } from '../../src/theme';
import { ONBOARDING_PAYWALL_SHOWN_KEY } from '../../src/config/storageKeys';

type Step = 'level' | 'topics' | 'goals';

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>('level');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleLevelSelect = (level: string) => {
    setSelectedLevel(level);
  };

  const handleTopicToggle = (topicId: string) => {
    setSelectedTopics(prev => 
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleNext = () => {
    if (step === 'level') {
      setStep('topics');
    } else if (step === 'topics') {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // TODO: Save onboarding data to backend
      // await api.updateOnboarding({ level: selectedLevel, topics: selectedTopics });

      // Mark that the user has just finished onboarding so the paywall knows
      // to show in "onboarding mode" (Continue Free dismisses to tabs) and so
      // we don't re-show the onboarding paywall after this single time.
      await AsyncStorage.setItem(ONBOARDING_PAYWALL_SHOWN_KEY, '1');
      router.replace({ pathname: '/paywall', params: { source: 'onboarding' } });
    } catch (error) {
      console.error('Onboarding error:', error);
      router.replace('/(tabs)');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = step === 'level' ? !!selectedLevel : true;

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: step === 'level' ? '50%' : '100%' }
            ]} 
          />
        </View>
        <Text style={styles.stepText}>
          Step {step === 'level' ? '1' : '2'} of 2
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 'level' ? (
          <View>
            <Text style={styles.title}>What's your Spanish level?</Text>
            <Text style={styles.subtitle}>
              This helps us personalize your conversations
            </Text>

            <View style={styles.optionsContainer}>
              {SPANISH_LEVELS.map((level, index) => (
                <View
                  key={level.value}
                 
                >
                  <Pressable
                    style={[
                      styles.levelOption,
                      selectedLevel === level.value && styles.levelOptionSelected,
                    ]}
                    onPress={() => handleLevelSelect(level.value)}
                  >
                    <View style={styles.levelHeader}>
                      <Text style={[
                        styles.levelLabel,
                        selectedLevel === level.value && styles.levelLabelSelected,
                      ]}>
                        {level.label}
                      </Text>
                      {selectedLevel === level.value && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[
                      styles.levelDescription,
                      selectedLevel === level.value && styles.levelDescriptionSelected,
                    ]}>
                      {level.description}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.title}>What do you want to talk about?</Text>
            <Text style={styles.subtitle}>
              Select topics you're interested in (optional)
            </Text>

            <View style={styles.topicsGrid}>
              {DEFAULT_TOPICS.map((topic, index) => (
                <View
                  key={topic.id}
                 
                >
                  <Pressable
                    style={[
                      styles.topicChip,
                      selectedTopics.includes(topic.id) && styles.topicChipSelected,
                      { borderColor: topic.color },
                    ]}
                    onPress={() => handleTopicToggle(topic.id)}
                  >
                    <Text style={styles.topicIcon}>{topic.icon}</Text>
                    <Text style={[
                      styles.topicName,
                      selectedTopics.includes(topic.id) && styles.topicNameSelected,
                    ]}>
                      {topic.name}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomContainer}>
        <Pressable
          style={[
            styles.continueButton,
            !canProceed && styles.continueButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!canProceed || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.neutral[900]} />
          ) : (
            <Text style={styles.continueButtonText}>
              {step === 'topics' ? "Let's Start! 🐺" : 'Continue'}
            </Text>
          )}
        </Pressable>

        {step === 'topics' && (
          <Pressable style={styles.skipButton} onPress={handleComplete}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  progressContainer: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.neutral[700],
    borderRadius: borderRadius.full,
    marginBottom: spacing[2],
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.gold,
    borderRadius: borderRadius.full,
  },
  stepText: {
    ...textStyles.caption,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
  },
  title: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing[6],
  },
  optionsContainer: {
    gap: spacing[3],
  },
  levelOption: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  levelOptionSelected: {
    borderColor: colors.primary.gold,
    backgroundColor: colors.background.elevated,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  levelLabel: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  levelLabelSelected: {
    color: colors.primary.gold,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.neutral[900],
    fontWeight: '700',
    fontSize: 14,
  },
  levelDescription: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  levelDescriptionSelected: {
    color: colors.text.primary,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    gap: spacing[2],
  },
  topicChipSelected: {
    backgroundColor: colors.background.elevated,
  },
  topicIcon: {
    fontSize: 18,
  },
  topicName: {
    ...textStyles.body,
    color: colors.text.primary,
  },
  topicNameSelected: {
    fontWeight: '600',
  },
  bottomContainer: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
    paddingTop: spacing[4],
  },
  continueButton: {
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing[3],
    marginTop: spacing[2],
  },
  skipButtonText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
});

