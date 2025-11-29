import { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  CONVERSATION_MODES, 
  DEFAULT_TOPICS, 
  DEFAULT_PERSONAS,
  SPANISH_LEVELS,
  GRAMMAR_RULES,
} from '../src/config/constants';
import { colors, textStyles, spacing, borderRadius } from '../src/theme';

type ModeId = 'open' | 'topic' | 'vocabulary' | 'grammar' | 'roleplay';

export default function ModeSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode: ModeId }>();
  const modeInfo = CONVERSATION_MODES.find(m => m.id === mode) || CONVERSATION_MODES[0];

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedGrammar, setSelectedGrammar] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [customPersona, setCustomPersona] = useState('');

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
          <View>
            <Text style={styles.sectionTitle}>Select Grammar Focus</Text>
            
            <Text style={styles.subSectionTitle}>By Level</Text>
            <View style={styles.levelsContainer}>
              {SPANISH_LEVELS.slice(0, 4).map((level) => (
                <Pressable
                  key={level.value}
                  style={[
                    styles.levelOption,
                    selectedLevel === level.value && styles.levelOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedLevel(level.value);
                    setSelectedGrammar(null);
                  }}
                >
                  <Text style={[
                    styles.levelLabel,
                    selectedLevel === level.value && styles.levelLabelSelected,
                  ]}>
                    {level.value}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.subSectionTitle}>Or Specific Grammar</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.grammarScroll}
            >
              {Object.entries(GRAMMAR_RULES).flatMap(([level, rules]) =>
                rules.map((rule) => (
                  <Pressable
                    key={`${level}-${rule}`}
                    style={[
                      styles.grammarChip,
                      selectedGrammar === rule && styles.grammarChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedGrammar(rule);
                      setSelectedLevel(null);
                    }}
                  >
                    <Text style={[
                      styles.grammarText,
                      selectedGrammar === rule && styles.grammarTextSelected,
                    ]}>
                      {rule}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
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
  grammarScroll: {
    marginBottom: spacing[4],
  },
  grammarChip: {
    backgroundColor: colors.background.card,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  grammarChipSelected: {
    borderColor: colors.primary.gold,
    backgroundColor: colors.primary.gold + '15',
  },
  grammarText: {
    ...textStyles.bodySmall,
    color: colors.text.primary,
  },
  grammarTextSelected: {
    color: colors.primary.gold,
    fontWeight: '600',
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

