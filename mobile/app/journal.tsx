import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, JournalEntry } from '../src/services/api';
import { useVoiceRecording } from '../src/hooks/useVoiceRecording';
import { colors, textStyles, spacing, borderRadius } from '../src/theme';

export default function JournalScreen() {
  const params = useLocalSearchParams<{ 
    episodeId?: string; 
    promptEs?: string; 
    promptEn?: string;
  }>();

  const [mode, setMode] = useState<'write' | 'list'>('list');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);
  
  // Writing state
  const [entryText, setEntryText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [feedback, setFeedback] = useState<any>(null);
  const [currentPromptEs, setCurrentPromptEs] = useState(params.promptEs || '');
  const [currentPromptEn, setCurrentPromptEn] = useState(params.promptEn || '');
  const [currentEpisodeId, setCurrentEpisodeId] = useState(params.episodeId || '');

  // Voice recording
  const { startRecording, stopRecording, isRecording } = useVoiceRecording();
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (params.episodeId) {
      // Coming from episode - go directly to write mode
      setMode('write');
      setCurrentPromptEs(params.promptEs || '');
      setCurrentPromptEn(params.promptEn || '');
      setCurrentEpisodeId(params.episodeId);
    } else {
      loadEntries();
    }
  }, [params.episodeId]);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const result = await api.getJournalEntries(20, 0);
      if (result.data?.entries) {
        setEntries(result.data.entries);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    setEntryText(text);
    setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length);
  };

  const handleStartVoiceInput = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startRecording();
  };

  const handleStopVoiceInput = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const uri = await stopRecording();
    
    if (uri) {
      try {
        const formData = new FormData();
        formData.append('audio', {
          uri,
          type: 'audio/m4a',
          name: 'recording.m4a',
        } as any);

        const result = await api.transcribeAudio(formData);
        if (result.data?.transcript) {
          // Append transcribed text to existing text
          const newText = entryText 
            ? `${entryText} ${result.data.transcript}`
            : result.data.transcript;
          handleTextChange(newText);
        }
      } catch (error) {
        console.error('Transcription error:', error);
        Alert.alert('Error', 'Failed to transcribe audio');
      }
    }
  };

  const handleGetFeedback = async () => {
    if (!entryText.trim()) {
      Alert.alert('Error', 'Please write something first');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGettingFeedback(true);

    try {
      const result = await api.getJournalFeedback({
        entryText,
        grammarFocus: currentPromptEs ? 'subjunctive' : undefined,
      });
      
      if (result.data?.feedback) {
        setFeedback(result.data.feedback);
      }
    } catch (error) {
      console.error('Error getting feedback:', error);
      Alert.alert('Error', 'Failed to get feedback');
    } finally {
      setIsGettingFeedback(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!entryText.trim()) {
      Alert.alert('Error', 'Please write something first');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      const result = await api.createJournalEntry({
        episodeId: currentEpisodeId || undefined,
        promptEs: currentPromptEs,
        promptEn: currentPromptEn,
        entryText: entryText.trim(),
      });

      if (result.data?.entry) {
        Alert.alert(
          'Entry Saved!', 
          `You earned ${result.data.xpEarned} XP`,
          [{ text: 'OK', onPress: () => {
            setEntryText('');
            setFeedback(null);
            setWordCount(0);
            if (params.episodeId) {
              router.back();
            } else {
              setMode('list');
              loadEntries();
            }
          }}]
        );
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save entry');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewEntry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode('write');
    setCurrentPromptEs('Escribe sobre tu día en español. ¿Qué hiciste? ¿Cómo te sientes?');
    setCurrentPromptEn('Write about your day in Spanish. What did you do? How do you feel?');
    setCurrentEpisodeId('');
    setEntryText('');
    setFeedback(null);
    setWordCount(0);
  };

  // List Mode
  if (mode === 'list') {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Spanish Journal</Text>
          <Pressable onPress={handleNewEntry} style={styles.newButton}>
            <Ionicons name="add" size={24} color={colors.primary.gold} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.gold} />
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="journal-outline" size={64} color={colors.neutral[600]} />
            <Text style={styles.emptyTitle}>Start Your Journal</Text>
            <Text style={styles.emptyText}>
              Writing in Spanish helps solidify grammar patterns and vocabulary.
            </Text>
            <Pressable onPress={handleNewEntry} style={styles.startWritingButton}>
              <Text style={styles.startWritingText}>Write First Entry</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView style={styles.entriesList} contentContainerStyle={styles.entriesContent}>
            {entries.map((entry) => (
              <Pressable key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>
                    {new Date(entry.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                  <Text style={styles.entryWords}>{entry.word_count} words</Text>
                </View>
                <Text style={styles.entryPreview} numberOfLines={3}>
                  {entry.entry_text}
                </Text>
                {entry.xp_earned > 0 && (
                  <View style={styles.xpBadge}>
                    <Text style={styles.xpText}>+{entry.xp_earned} XP</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // Write Mode
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            onPress={() => {
              if (params.episodeId) {
                router.back();
              } else {
                setMode('list');
                setEntryText('');
                setFeedback(null);
              }
            }} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>New Entry</Text>
          <View style={styles.wordCountBadge}>
            <Text style={styles.wordCountText}>{wordCount} words</Text>
          </View>
        </View>

        <ScrollView style={styles.writeScroll} contentContainerStyle={styles.writeContent}>
          {/* Prompt */}
          {currentPromptEs && (
            <View style={styles.promptCard}>
              <Text style={styles.promptLabel}>Today's Prompt</Text>
              <Text style={styles.promptTextEs}>{currentPromptEs}</Text>
              {currentPromptEn && (
                <Text style={styles.promptTextEn}>{currentPromptEn}</Text>
              )}
            </View>
          )}

          {/* Text Input */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              multiline
              placeholder="Escribe aquí en español..."
              placeholderTextColor={colors.text.tertiary}
              value={entryText}
              onChangeText={handleTextChange}
              textAlignVertical="top"
            />
          </View>

          {/* Voice Input Button */}
          <Pressable 
            onPress={isRecording ? handleStopVoiceInput : handleStartVoiceInput}
            style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
          >
            <Ionicons 
              name={isRecording ? "stop" : "mic"} 
              size={24} 
              color={isRecording ? colors.text.primary : colors.primary.gold} 
            />
            <Text style={[styles.voiceButtonText, isRecording && styles.voiceButtonTextRecording]}>
              {isRecording ? 'Stop Recording' : 'Speak in Spanish'}
            </Text>
          </Pressable>

          {/* Feedback Section */}
          {feedback && (
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackTitle}>Feedback</Text>
              
              {feedback.overallImpression && (
                <Text style={styles.feedbackImpression}>{feedback.overallImpression}</Text>
              )}

              {feedback.grammarHighlights?.length > 0 && (
                <View style={styles.feedbackSection}>
                  <Text style={styles.feedbackSectionTitle}>Grammar Used Well:</Text>
                  <View style={styles.highlightTags}>
                    {feedback.grammarHighlights.map((item: string, i: number) => (
                      <View key={i} style={styles.highlightTag}>
                        <Text style={styles.highlightTagText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {feedback.areasToImprove?.length > 0 && (
                <View style={styles.feedbackSection}>
                  <Text style={styles.feedbackSectionTitle}>Suggestions:</Text>
                  {feedback.areasToImprove.map((item: any, i: number) => (
                    <View key={i} style={styles.suggestionItem}>
                      <Text style={styles.suggestionOriginal}>"{item.original}"</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.text.tertiary} />
                      <Text style={styles.suggestionCorrected}>"{item.suggestion}"</Text>
                      <Text style={styles.suggestionExplanation}>{item.explanation}</Text>
                    </View>
                  ))}
                </View>
              )}

              {feedback.encouragement && (
                <Text style={styles.feedbackEncouragement}>{feedback.encouragement}</Text>
              )}

              {feedback.grammarScore && (
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreLabel}>Grammar Score</Text>
                  <Text style={styles.scoreValue}>{feedback.grammarScore}/100</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionBar}>
          <Pressable 
            onPress={handleGetFeedback} 
            style={styles.feedbackButton}
            disabled={isGettingFeedback || !entryText.trim()}
          >
            {isGettingFeedback ? (
              <ActivityIndicator size="small" color={colors.primary.gold} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary.gold} />
                <Text style={styles.feedbackButtonText}>Get Feedback</Text>
              </>
            )}
          </Pressable>

          <Pressable 
            onPress={handleSaveEntry} 
            style={[styles.saveButton, (!entryText.trim() || isSaving) && styles.saveButtonDisabled]}
            disabled={isSaving || !entryText.trim()}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.neutral[950]} />
            ) : (
              <>
                <Ionicons name="save" size={20} color={colors.neutral[950]} />
                <Text style={styles.saveButtonText}>Save Entry</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backButton: {
    padding: spacing[2],
  },
  headerTitle: {
    ...textStyles.h5,
    color: colors.text.primary,
  },
  newButton: {
    padding: spacing[2],
  },
  wordCountBadge: {
    backgroundColor: colors.background.elevated,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
  },
  wordCountText: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
    gap: spacing[4],
  },
  emptyTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
  },
  emptyText: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  startWritingButton: {
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.lg,
    marginTop: spacing[4],
  },
  startWritingText: {
    ...textStyles.button,
    color: colors.neutral[950],
  },

  // Entries list
  entriesList: {
    flex: 1,
  },
  entriesContent: {
    padding: spacing[4],
    gap: spacing[3],
  },
  entryCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    gap: spacing[2],
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDate: {
    ...textStyles.labelSmall,
    color: colors.text.tertiary,
  },
  entryWords: {
    ...textStyles.caption,
    color: colors.text.secondary,
  },
  entryPreview: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  xpBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary.gold + '20',
    paddingVertical: spacing[0.5],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.sm,
    marginTop: spacing[1],
  },
  xpText: {
    ...textStyles.caption,
    color: colors.primary.gold,
    fontWeight: '600',
  },

  // Write mode
  writeScroll: {
    flex: 1,
  },
  writeContent: {
    padding: spacing[4],
    gap: spacing[4],
  },
  promptCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.gold,
    gap: spacing[2],
  },
  promptLabel: {
    ...textStyles.labelSmall,
    color: colors.primary.gold,
  },
  promptTextEs: {
    ...textStyles.body,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  promptTextEn: {
    ...textStyles.bodySmall,
    color: colors.text.tertiary,
  },
  inputContainer: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    minHeight: 200,
  },
  textInput: {
    ...textStyles.body,
    color: colors.text.primary,
    padding: spacing[4],
    minHeight: 200,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.primary.gold,
    borderStyle: 'dashed',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
  },
  voiceButtonRecording: {
    backgroundColor: colors.accent.tango,
    borderColor: colors.accent.tango,
    borderStyle: 'solid',
  },
  voiceButtonText: {
    ...textStyles.button,
    color: colors.primary.gold,
  },
  voiceButtonTextRecording: {
    color: colors.text.primary,
  },

  // Feedback
  feedbackCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    gap: spacing[4],
  },
  feedbackTitle: {
    ...textStyles.h5,
    color: colors.text.primary,
  },
  feedbackImpression: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  feedbackSection: {
    gap: spacing[2],
  },
  feedbackSectionTitle: {
    ...textStyles.label,
    color: colors.text.secondary,
  },
  highlightTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  highlightTag: {
    backgroundColor: colors.accent.sage + '30',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
  },
  highlightTagText: {
    ...textStyles.caption,
    color: colors.accent.sage,
  },
  suggestionItem: {
    backgroundColor: colors.neutral[800],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[1],
  },
  suggestionOriginal: {
    ...textStyles.bodySmall,
    color: colors.error,
    textDecorationLine: 'line-through',
  },
  suggestionCorrected: {
    ...textStyles.bodySmall,
    color: colors.accent.sage,
  },
  suggestionExplanation: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    marginTop: spacing[1],
  },
  feedbackEncouragement: {
    ...textStyles.body,
    color: colors.primary.gold,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.neutral[800],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
  },
  scoreLabel: {
    ...textStyles.label,
    color: colors.text.secondary,
  },
  scoreValue: {
    ...textStyles.h4,
    color: colors.accent.sage,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  feedbackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.background.elevated,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary.gold,
  },
  feedbackButtonText: {
    ...textStyles.button,
    color: colors.primary.gold,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...textStyles.button,
    color: colors.neutral[950],
  },
});

