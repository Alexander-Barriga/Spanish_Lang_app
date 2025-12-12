import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { 
  CONVERSATION_MODES, 
  DEFAULT_TOPICS, 
  DEFAULT_PERSONAS,
  SPANISH_LEVELS,
} from '../src/config/constants';
import { colors, textStyles, spacing, borderRadius } from '../src/theme';
import { api, GrammarTopic } from '../src/services/api';

type ModeId = 'open' | 'topic' | 'vocabulary' | 'grammar' | 'roleplay';

// Level descriptions for when user selects a broad level
const LEVEL_DESCRIPTIONS: Record<string, { description: string; examples: string[] }> = {
  'A1': {
    description: 'Practice foundational Spanish grammar including basic verb conjugations, simple sentences, and common expressions. Perfect for beginners!',
    examples: ['Present tense', 'Ser vs Estar', 'Basic questions'],
  },
  'A2': {
    description: 'Build on your basics with more verb tenses, object pronouns, and comparative structures. Great for elementary learners!',
    examples: ['Past tense basics', 'Reflexive verbs', 'Direct objects'],
  },
  'B1': {
    description: 'Dive into intermediate grammar including the subjunctive mood, complex tenses, and nuanced expressions. Time to level up!',
    examples: ['Present subjunctive', 'Conditional tense', 'Object pronoun combinations'],
  },
  'B2': {
    description: 'Master advanced grammar including past subjunctive, passive voice, and sophisticated discourse structures. You\'re becoming fluent!',
    examples: ['Imperfect subjunctive', 'Passive constructions', 'Advanced connectors'],
  },
};

export default function ModeSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode: ModeId }>();
  const modeInfo = CONVERSATION_MODES.find(m => m.id === mode) || CONVERSATION_MODES[0];

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedGrammar, setSelectedGrammar] = useState<string | null>(null);
  const [expandedGrammar, setExpandedGrammar] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [customPersona, setCustomPersona] = useState('');
  
  // Grammar topics from API
  const [grammarTopics, setGrammarTopics] = useState<GrammarTopic[]>([]);
  const [isLoadingGrammar, setIsLoadingGrammar] = useState(false);
  
  // Fetch grammar topics when grammar mode is selected
  useEffect(() => {
    if (mode === 'grammar') {
      loadGrammarTopics();
    }
  }, [mode]);
  
  const loadGrammarTopics = async () => {
    setIsLoadingGrammar(true);
    try {
      const result = await api.getAllGrammarTopics();
      if (result.data?.grammarTopics) {
        setGrammarTopics(result.data.grammarTopics);
      }
    } catch (error) {
      console.error('Error loading grammar topics:', error);
    } finally {
      setIsLoadingGrammar(false);
    }
  };
  
  // Filter grammar topics by level
  const filteredGrammarTopics = selectedLevel 
    ? grammarTopics.filter(t => t.level === selectedLevel)
    : grammarTopics;

  const handleStartConversation = () => {
    const params: { id: string; mode: string; topic?: string; grammarFocus?: string; persona?: string } = {
      id: 'new',
      mode: mode || 'open',
    };

    if (mode === 'topic') {
      params.topic = customTopic || selectedTopic || '';
    } else if (mode === 'grammar') {
      params.grammarFocus = selectedGrammar || selectedLevel || '';
    } else if (mode === 'roleplay') {
      params.persona = customPersona || selectedPersona || '';
    }

    router.push({
      pathname: '/conversation/[id]',
      params,
    });
  };

  const canStart = () => {
    switch (mode) {
      case 'topic':
        return !!selectedTopic || !!customTopic;
      case 'grammar':
        return !!selectedLevel || !!selectedGrammar;
      case 'roleplay':
        return !!selectedPersona || !!customPersona;
      default:
        return true;
    }
  };

  const renderModeContent = () => {
    switch (mode) {
      case 'topic':
        return (
          <View>
            <Text style={styles.sectionTitle}>Choose a Topic</Text>
            
            <View style={styles.topicsGrid}>
              {DEFAULT_TOPICS.map((topic) => (
                <Pressable
                  key={topic.id}
                  style={[
                    styles.topicChip,
                    selectedTopic === topic.id && styles.topicChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedTopic(topic.id);
                    setCustomTopic('');
                  }}
                >
                  <Text style={styles.topicIcon}>{topic.icon}</Text>
                  <Text style={[
                    styles.topicName,
                    selectedTopic === topic.id && styles.topicNameSelected,
                  ]}>
                    {topic.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.orText}>or describe your own topic</Text>
            
            <TextInput
              style={styles.customInput}
              placeholder="e.g., Planning a trip to Barcelona..."
              placeholderTextColor={colors.neutral[500]}
              value={customTopic}
              onChangeText={(text) => {
                setCustomTopic(text);
                setSelectedTopic(null);
              }}
              multiline
            />
          </View>
        );

      case 'grammar':
        return (
          <View style={styles.grammarContainer}>
            <Text style={styles.sectionTitle}>Select Grammar Focus</Text>
            
            {/* Level Filter Buttons */}
            <Text style={styles.subSectionTitle}>By Level</Text>
            <View style={styles.levelsContainer}>
              {SPANISH_LEVELS.slice(0, 4).map((level) => (
                <Pressable
                  key={level.value}
                  style={[
                    styles.levelOption,
                    selectedLevel === level.value && !selectedGrammar && styles.levelOptionSelected,
                  ]}
                  onPress={() => {
                    if (selectedLevel === level.value && !selectedGrammar) {
                      // Deselect level if already selected
                      setSelectedLevel(null);
                      setExpandedGrammar(null);
                    } else {
                      setSelectedLevel(level.value);
                      setSelectedGrammar(null);
                      setExpandedGrammar(null);
                    }
                  }}
                >
                  <Text style={[
                    styles.levelLabel,
                    selectedLevel === level.value && !selectedGrammar && styles.levelLabelSelected,
                  ]}>
                    {level.value}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Level Description Card (when level selected but no specific grammar) */}
            {selectedLevel && !selectedGrammar && LEVEL_DESCRIPTIONS[selectedLevel] && (
              <Animated.View 
                entering={FadeIn.duration(200)} 
                exiting={FadeOut.duration(150)}
                style={styles.levelDescriptionCard}
              >
                <View style={styles.levelDescriptionHeader}>
                  <View style={styles.levelBadgeLarge}>
                    <Text style={styles.levelBadgeLargeText}>{selectedLevel}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary.gold} />
                </View>
                <Text style={styles.levelDescriptionText}>
                  {LEVEL_DESCRIPTIONS[selectedLevel].description}
                </Text>
                <View style={styles.levelExamples}>
                  {LEVEL_DESCRIPTIONS[selectedLevel].examples.map((ex, i) => (
                    <View key={i} style={styles.levelExampleBadge}>
                      <Text style={styles.levelExampleText}>{ex}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            <Text style={styles.subSectionTitle}>Or Specific Grammar</Text>
            
            {isLoadingGrammar ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary.gold} />
                <Text style={styles.loadingText}>Loading grammar topics...</Text>
              </View>
            ) : (
              <View style={styles.grammarCardsContainer}>
                {filteredGrammarTopics.map((topic) => {
                  const isSelected = selectedGrammar === topic.grammar_focus;
                  const isExpanded = expandedGrammar === topic.grammar_focus;
                  
                  return (
                    <Pressable
                      key={topic.id}
                      style={[
                        styles.grammarCard,
                        isSelected && styles.grammarCardSelected,
                      ]}
                      onPress={() => {
                        if (isExpanded) {
                          // Collapse if already expanded
                          setExpandedGrammar(null);
                        } else {
                          // Expand this card
                          setExpandedGrammar(topic.grammar_focus);
                        }
                        // Always select on tap
                        setSelectedGrammar(topic.grammar_focus);
                        setSelectedLevel(null);
                      }}
                    >
                      {/* Card Header */}
                      <View style={styles.grammarCardHeader}>
                        <View style={styles.grammarCardTitleRow}>
                          <View style={[styles.levelBadge, topic.level === 'B2' && styles.levelBadgeB2]}>
                            <Text style={styles.levelBadgeText}>{topic.level}</Text>
                          </View>
                          <Text style={[styles.grammarCardTitle, isSelected && styles.grammarCardTitleSelected]}>
                            {topic.title_en}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={22} color={colors.primary.gold} />
                        )}
                      </View>
                      
                      {/* Description Preview (always visible) */}
                      <Text 
                        style={styles.grammarCardPreview}
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {topic.description}
                      </Text>
                      
                      {/* Expanded Content */}
                      {isExpanded && (
                        <Animated.View entering={FadeIn.duration(200)}>
                          {/* Triggers */}
                          {topic.triggers && topic.triggers.length > 0 && (
                            <View style={styles.triggersSection}>
                              <Text style={styles.triggersSectionTitle}>Key Phrases:</Text>
                              <View style={styles.triggersContainer}>
                                {topic.triggers.slice(0, 4).map((trigger, index) => (
                                  <View key={index} style={styles.triggerBadge}>
                                    <Text style={styles.triggerText}>{trigger}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}
                          
                          {/* Example Sentences */}
                          {topic.example_sentences && topic.example_sentences.length > 0 && (
                            <View style={styles.examplesSection}>
                              <Text style={styles.examplesSectionTitle}>Examples:</Text>
                              {topic.example_sentences.slice(0, 2).map((example, index) => (
                                <View key={index} style={styles.exampleItem}>
                                  <Text style={styles.exampleSpanish}>{example.spanish}</Text>
                                  <Text style={styles.exampleEnglish}>{example.english}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                          
                          <Text style={styles.tapHint}>Tap "Start Conversation" to practice</Text>
                        </Animated.View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );

      case 'roleplay':
        return (
          <View>
            <Text style={styles.sectionTitle}>Choose a Persona</Text>
            
            <View style={styles.personasContainer}>
              {DEFAULT_PERSONAS.map((persona) => (
                <Pressable
                  key={persona.id}
                  style={[
                    styles.personaCard,
                    selectedPersona === persona.id && styles.personaCardSelected,
                  ]}
                  onPress={() => {
                    setSelectedPersona(persona.id);
                    setCustomPersona('');
                  }}
                >
                  <Text style={styles.personaAvatar}>{persona.avatar}</Text>
                  <View style={styles.personaInfo}>
                    <Text style={[
                      styles.personaName,
                      selectedPersona === persona.id && styles.personaNameSelected,
                    ]}>
                      {persona.name}
                    </Text>
                    <Text style={styles.personaDescription}>
                      {persona.description}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Text style={styles.orText}>or create your own</Text>
            
            <TextInput
              style={styles.customInput}
              placeholder="e.g., Lady Gaga, Vegeta from Dragon Ball Z..."
              placeholderTextColor={colors.neutral[500]}
              value={customPersona}
              onChangeText={(text) => {
                setCustomPersona(text);
                setSelectedPersona(null);
              }}
            />
          </View>
        );

      default:
        return (
          <View 
           
            style={styles.openModeInfo}
          >
            <Text style={styles.openModeEmoji}>💬</Text>
            <Text style={styles.openModeTitle}>Free Conversation</Text>
            <Text style={styles.openModeText}>
              Chat freely about anything! Lobo will adapt to your interests and level.
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Ionicons 
            name={modeInfo.icon as keyof typeof Ionicons.glyphMap} 
            size={20} 
            color={modeInfo.color} 
          />
          <Text style={styles.headerTitle}>{modeInfo.title}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderModeContent()}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomContainer}>
        <Pressable
          style={[
            styles.startButton,
            !canStart() && styles.startButtonDisabled,
          ]}
          onPress={handleStartConversation}
          disabled={!canStart()}
        >
          <Ionicons name="mic" size={20} color={colors.neutral[900]} />
          <Text style={styles.startButtonText}>Start Conversation</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
  },
  sectionTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  subSectionTitle: {
    ...textStyles.label,
    color: colors.text.secondary,
    marginBottom: spacing[3],
    marginTop: spacing[4],
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
    borderColor: colors.border.default,
    gap: spacing[2],
  },
  topicChipSelected: {
    borderColor: colors.primary.gold,
    backgroundColor: colors.primary.gold + '15',
  },
  topicIcon: {
    fontSize: 18,
  },
  topicName: {
    ...textStyles.body,
    color: colors.text.primary,
  },
  topicNameSelected: {
    color: colors.primary.gold,
    fontWeight: '600',
  },
  orText: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
    marginVertical: spacing[4],
  },
  customInput: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[4],
    ...textStyles.body,
    color: colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  levelsContainer: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  levelOption: {
    flex: 1,
    backgroundColor: colors.background.card,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  levelOptionSelected: {
    borderColor: colors.primary.gold,
    backgroundColor: colors.primary.gold + '15',
  },
  levelLabel: {
    ...textStyles.h4,
    color: colors.text.primary,
  },
  levelLabelSelected: {
    color: colors.primary.gold,
  },
  // Grammar UI Styles
  grammarContainer: {
    flex: 1,
  },
  grammarCardsContainer: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  grammarCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  grammarCardSelected: {
    borderColor: colors.primary.gold,
    backgroundColor: colors.primary.gold + '08',
  },
  grammarCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  grammarCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[2],
  },
  grammarCardTitle: {
    ...textStyles.h5,
    color: colors.text.primary,
    flex: 1,
  },
  grammarCardTitleSelected: {
    color: colors.primary.gold,
  },
  grammarCardPreview: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  levelBadge: {
    backgroundColor: colors.accent.tango + '20',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
  },
  levelBadgeB2: {
    backgroundColor: colors.accent.sky + '20',
  },
  levelBadgeText: {
    ...textStyles.labelSmall,
    color: colors.accent.tango,
    fontWeight: '700',
  },
  levelBadgeLarge: {
    backgroundColor: colors.primary.gold + '20',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
  },
  levelBadgeLargeText: {
    ...textStyles.h4,
    color: colors.primary.gold,
    fontWeight: '700',
  },
  levelDescriptionCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginTop: spacing[4],
    borderWidth: 2,
    borderColor: colors.primary.gold,
  },
  levelDescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  levelDescriptionText: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: spacing[3],
  },
  levelExamples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  levelExampleBadge: {
    backgroundColor: colors.primary.gold + '15',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
  },
  levelExampleText: {
    ...textStyles.bodySmall,
    color: colors.primary.gold,
    fontWeight: '500',
  },
  triggersSection: {
    marginTop: spacing[4],
  },
  triggersSectionTitle: {
    ...textStyles.label,
    color: colors.accent.tango,
    marginBottom: spacing[2],
  },
  triggersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  triggerBadge: {
    backgroundColor: colors.accent.tango + '15',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
  },
  triggerText: {
    ...textStyles.bodySmall,
    color: colors.accent.tango,
    fontWeight: '500',
  },
  examplesSection: {
    marginTop: spacing[4],
  },
  examplesSectionTitle: {
    ...textStyles.label,
    color: colors.accent.sage,
    marginBottom: spacing[2],
  },
  exampleItem: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  exampleSpanish: {
    ...textStyles.body,
    color: colors.text.primary,
    fontStyle: 'italic',
    marginBottom: spacing[1],
  },
  exampleEnglish: {
    ...textStyles.bodySmall,
    color: colors.text.tertiary,
  },
  tapHint: {
    ...textStyles.caption,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing[4],
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
    gap: spacing[3],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  personasContainer: {
    gap: spacing[3],
  },
  personaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border.default,
    gap: spacing[3],
  },
  personaCardSelected: {
    borderColor: colors.primary.gold,
    backgroundColor: colors.primary.gold + '15',
  },
  personaAvatar: {
    fontSize: 36,
  },
  personaInfo: {
    flex: 1,
  },
  personaName: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[0.5],
  },
  personaNameSelected: {
    color: colors.primary.gold,
  },
  personaDescription: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  openModeInfo: {
    alignItems: 'center',
    paddingVertical: spacing[10],
  },
  openModeEmoji: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  openModeTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  openModeText: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomContainer: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
});

