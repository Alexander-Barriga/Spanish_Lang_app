import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, EpisodeArticle } from '../../../../src/services/api';
import { colors, textStyles, spacing, borderRadius } from '../../../../src/theme';

const VOICE_JOURNAL_TIP_KEY = 'voice_journal_tip_shown';

export default function WritingExerciseScreen() {
  const { articleId } = useLocalSearchParams<{ articleId: string }>();
  const [article, setArticle] = useState<EpisodeArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userText, setUserText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [hasSeenJournalTip, setHasSeenJournalTip] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(() => {
    loadData();
    checkJournalTipShown();
    return () => {
      cleanupRecording();
    };
  }, [articleId]);

  const checkJournalTipShown = async () => {
    try {
      const shown = await AsyncStorage.getItem(VOICE_JOURNAL_TIP_KEY);
      setHasSeenJournalTip(shown === 'true');
    } catch (error) {
      console.error('Error checking journal tip:', error);
    }
  };

  const markJournalTipShown = async () => {
    try {
      await AsyncStorage.setItem(VOICE_JOURNAL_TIP_KEY, 'true');
      setHasSeenJournalTip(true);
    } catch (error) {
      console.error('Error saving journal tip state:', error);
    }
  };

  const loadData = async () => {
    if (!articleId) return;

    try {
      setIsLoading(true);
      
      // Load article
      const articleResult = await api.getEpisodeArticle(articleId);
      if (articleResult.data?.article) {
        setArticle(articleResult.data.article);
        
        // Check for existing submission
        const submissionResult = await api.checkEpisodeArticleSubmission(
          articleResult.data.article.episode_id
        );
        if (submissionResult.data?.hasSubmitted && submissionResult.data.submission) {
          setExistingSubmission(submissionResult.data.submission);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupRecording = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        // Ignore cleanup errors
      }
      recordingRef.current = null;
    }
  };

  const handleVoiceButtonPress = () => {
    if (!hasSeenJournalTip) {
      setShowJournalModal(true);
    } else {
      toggleRecording();
    }
  };

  const handleModalContinue = () => {
    markJournalTipShown();
    setShowJournalModal(false);
    toggleRecording();
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone access to use voice input.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      setIsTranscribing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        Alert.alert('Error', 'Recording failed. Please try again.');
        setIsTranscribing(false);
        return;
      }

      // Transcribe the audio
      const transcriptionResult = await api.transcribeAudio(uri);
      
      if (transcriptionResult.data?.transcript) {
        // Append to existing text or set new text
        const transcript = transcriptionResult.data.transcript;
        setUserText((prev) => prev ? `${prev} ${transcript}` : transcript);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Transcription Failed', 'Could not transcribe your voice. Please try again or type your response.');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmit = async () => {
    if (!userText.trim() || !article) {
      Alert.alert('Empty Response', 'Please write or record your response before submitting.');
      return;
    }

    if (userText.trim().split(/\s+/).length < 10) {
      Alert.alert(
        'Response Too Short',
        'Please write at least a few sentences to get meaningful feedback on your writing.'
      );
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await api.submitEpisodeArticleExercise(
        article.id,
        userText.trim(),
        'text'
      );

      if (result.data?.submission) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigate to feedback page
        router.replace(`/article/episode/${articleId}/feedback/${result.data.submission.id}`);
      } else {
        Alert.alert('Submission Failed', result.error || 'Could not submit your writing. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleViewFeedback = () => {
    if (existingSubmission?.id) {
      router.push(`/article/episode/${articleId}/feedback/${existingSubmission.id}`);
    }
  };

  const wordCount = userText.trim() ? userText.trim().split(/\s+/).length : 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
          <Text style={styles.loadingText}>Loading exercise...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!article) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.text.secondary} />
          <Text style={styles.errorText}>Exercise not found</Text>
          <Pressable onPress={handleBack}>
            <LinearGradient
              colors={['#B3F5FF', '#00B8DB']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.backButtonError}
            >
              <Text style={styles.backButtonTextError}>Go Back</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Format writing prompt with spacing between numbered points and special sections
  const renderFormattedPrompt = (prompt: string) => {
    // Replace "10-14" or "10–14" with "3-10" for sentence count
    let processedPrompt = prompt.replace(/10[-–]14/g, '3-10');
    
    // Swap order: Move "Write X-Y sentences" before "Close with:" 
    // Original order in prompt: "... Close with: 'Ojalá que...' — ... Write X-Y sentences. ..."
    // Desired order: "... Write X-Y sentences. Close with: 'Ojalá que...' — ..."
    const writeMatch = processedPrompt.match(/Write \d+[-–]\d+ sentences\.?/i);
    const closeMatch = processedPrompt.match(/Close with:/i);
    if (writeMatch && closeMatch) {
      const writeIndex = processedPrompt.indexOf(writeMatch[0]);
      const closeIndex = processedPrompt.indexOf(closeMatch[0]);
      // If "Close with:" comes before "Write X-Y sentences", swap them
      if (closeIndex < writeIndex) {
        // Extract the "Write X-Y sentences." part
        const writeSentence = writeMatch[0];
        // Remove it from its current position
        processedPrompt = processedPrompt.replace(writeSentence, '');
        // Insert it before "Close with:"
        processedPrompt = processedPrompt.replace(/Close with:/i, `${writeSentence} Close with:`);
      }
    }
    
    // Split on numbered patterns like "1." or "1)" or "1:"
    // Also split on "Close with" and "Write X-Y sentences"
    const splitPattern = /(\d+[\.\)\:])|(\s*Write \d+[-–]\d+ sentences\.?)|(\s*Close with:)/gi;
    const parts = processedPrompt.split(splitPattern).filter(Boolean);
    
    const renderedParts: React.ReactNode[] = [];
    let currentPoint = '';
    let pointNumber = '';
    let keyIndex = 0;
    
    parts.forEach((part) => {
      if (!part) return;
      
      // Check if this is a number marker like "1." or "2)" or "3:"
      if (/^\d+[\.\)\:]$/.test(part)) {
        // Save previous point if exists
        if (currentPoint && pointNumber) {
          renderedParts.push(
            <View key={`point-${keyIndex++}`} style={renderedParts.length > 0 ? styles.promptPointSpacing : undefined}>
              <Text style={styles.promptText}>
                <Text style={styles.promptPointNumber}>{pointNumber}</Text>
                {currentPoint.trim()}
              </Text>
            </View>
          );
        }
        pointNumber = part;
        currentPoint = '';
      } 
      // Check if this is "Close with:" - needs spacing before it
      else if (/^\s*Close with:/i.test(part)) {
        // Save previous point first
        if (currentPoint && pointNumber) {
          renderedParts.push(
            <View key={`point-${keyIndex++}`} style={renderedParts.length > 0 ? styles.promptPointSpacing : undefined}>
              <Text style={styles.promptText}>
                <Text style={styles.promptPointNumber}>{pointNumber}</Text>
                {currentPoint.trim()}
              </Text>
            </View>
          );
          pointNumber = '';
          currentPoint = '';
        }
        // Add "Close with:" as a new section with spacing
        renderedParts.push(
          <View key={`close-${keyIndex++}`} style={styles.promptPointSpacing}>
            <Text style={styles.promptText}>{part.trim()}</Text>
          </View>
        );
      }
      // Check if this is "Write X-Y sentences" - needs spacing before it
      else if (/^\s*Write \d+[-–]\d+ sentences\.?/i.test(part)) {
        // Save previous point first
        if (currentPoint && pointNumber) {
          renderedParts.push(
            <View key={`point-${keyIndex++}`} style={renderedParts.length > 0 ? styles.promptPointSpacing : undefined}>
              <Text style={styles.promptText}>
                <Text style={styles.promptPointNumber}>{pointNumber}</Text>
                {currentPoint.trim()}
              </Text>
            </View>
          );
          pointNumber = '';
          currentPoint = '';
        }
        // Add sentence count as a new section with spacing
        renderedParts.push(
          <View key={`sentences-${keyIndex++}`} style={styles.promptPointSpacing}>
            <Text style={styles.promptText}>{part.trim()}</Text>
          </View>
        );
      }
      else {
        currentPoint += part;
      }
    });
    
    // Add the last point if any remaining
    if (currentPoint.trim()) {
      if (pointNumber) {
        renderedParts.push(
          <View key={`point-${keyIndex++}`} style={renderedParts.length > 0 ? styles.promptPointSpacing : undefined}>
            <Text style={styles.promptText}>
              <Text style={styles.promptPointNumber}>{pointNumber}</Text>
              {currentPoint.trim()}
            </Text>
          </View>
        );
      } else {
        // Remaining text without a number prefix
        renderedParts.push(
          <View key={`text-${keyIndex++}`} style={renderedParts.length > 0 ? styles.promptPointSpacing : undefined}>
            <Text style={styles.promptText}>{currentPoint.trim()}</Text>
          </View>
        );
      }
    }
    
    // If no parts found, render as plain text
    if (renderedParts.length === 0) {
      return <Text style={styles.promptText}>{processedPrompt}</Text>;
    }
    
    return <>{renderedParts}</>;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Writing Exercise</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Episode Context */}
          {article.episodes && (
            <View style={styles.episodeBadge}>
              <Text style={styles.episodeBadgeText}>
                Episode {article.episodes.episode_number} · {article.episodes.title_es}
              </Text>
            </View>
          )}

          {/* Grammar Focus */}
          <View style={styles.grammarBadge}>
            <Ionicons name="school-outline" size={16} color={colors.accent.tango} />
            <Text style={styles.grammarBadgeText}>
              {article.grammar_focus?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </Text>
          </View>

          {/* Writing Prompt Card */}
          <View style={styles.promptCard}>
            <View style={styles.promptHeader}>
              <Ionicons name="create-outline" size={24} color={colors.primary.gold} />
              <Text style={styles.promptTitle}>Your Writing Prompt</Text>
            </View>
            {renderFormattedPrompt(article.writing_exercise_prompt || '')}
          </View>

          {/* Already Submitted Notice */}
          {existingSubmission && (
            <View style={styles.submittedNotice}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <View style={styles.submittedContent}>
                <Text style={styles.submittedTitle}>Already Submitted</Text>
                <Text style={styles.submittedText}>
                  You've already submitted this exercise. You can view your feedback or submit again.
                </Text>
              </View>
              <Pressable onPress={handleViewFeedback} style={styles.viewFeedbackButton}>
                <Text style={styles.viewFeedbackText}>View Feedback</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary.gold} />
              </Pressable>
            </View>
          )}

          {/* Text Input Area */}
          <View style={styles.inputSection}>
            <View style={styles.inputHeader}>
              <Text style={styles.inputLabel}>Your Response</Text>
              <Text style={styles.wordCount}>{wordCount} words</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Write your response in Spanish..."
              placeholderTextColor={colors.text.muted}
              value={userText}
              onChangeText={setUserText}
              multiline
              textAlignVertical="top"
              editable={!isSubmitting && !isTranscribing}
            />
          </View>

          {/* Voice Recording Section */}
          <View style={styles.voiceSection}>
            {hasSeenJournalTip && (
              <View style={styles.journalTip}>
                <Ionicons name="bulb-outline" size={16} color={colors.accent.sky} />
                <Text style={styles.journalTipText}>
                  Write your response in your Spanish journal first, then type or voice record. Recording will be transcribed into text you can edit.
                </Text>
              </View>
            )}

            <Pressable
              style={[
                styles.voiceButton,
                isRecording && styles.voiceButtonActive,
                isTranscribing && styles.voiceButtonTranscribing,
              ]}
              onPress={handleVoiceButtonPress}
              disabled={isSubmitting || isTranscribing}
            >
              {isTranscribing ? (
                <>
                  <ActivityIndicator size="small" color={colors.primary.gold} />
                  <Text style={styles.voiceButtonText}>Transcribing...</Text>
                </>
              ) : isRecording ? (
                <>
                  <View style={styles.recordingIndicator} />
                  <Text style={styles.voiceButtonTextActive}>Tap to Stop Recording</Text>
                </>
              ) : (
                <>
                  <Ionicons name="mic" size={24} color={colors.primary.gold} />
                  <Text style={styles.voiceButtonText}>Record Voice Response</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={!userText.trim() || isSubmitting || isTranscribing}
            style={(!userText.trim() || isSubmitting || isTranscribing) && styles.submitButtonDisabled}
          >
            <LinearGradient
              colors={['#B3F5FF', '#00B8DB']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.submitButton}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.neutral[900]} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit for Feedback</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.neutral[900]} />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Journal Recommendation Modal */}
      <Modal
        visible={showJournalModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowJournalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="journal-outline" size={48} color={colors.primary.gold} />
            </View>
            <Text style={styles.modalTitle}>Before You Record</Text>
            <Text style={styles.modalDescription}>
              For the best learning experience, we recommend writing your response on paper first in a journal.
              {'\n\n'}
              This helps you:
            </Text>
            <View style={styles.modalBenefits}>
              <View style={styles.modalBenefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.modalBenefitText}>Think through your grammar carefully</Text>
              </View>
              <View style={styles.modalBenefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.modalBenefitText}>Practice handwriting in Spanish</Text>
              </View>
              <View style={styles.modalBenefitRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.modalBenefitText}>Build a physical learning journal</Text>
              </View>
            </View>
            <Text style={styles.modalNote}>
              When ready, record yourself reading your written response.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setShowJournalModal(false)}
              >
                <Text style={styles.modalCancelText}>Maybe Later</Text>
              </Pressable>
              <Pressable onPress={handleModalContinue} style={{ flex: 1 }}>
                <LinearGradient
                  colors={['#B3F5FF', '#00B8DB']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.modalContinueButton}
                >
                  <Ionicons name="mic" size={20} color={colors.neutral[900]} />
                  <Text style={styles.modalContinueText}>Start Recording</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    gap: spacing[3],
  },
  loadingText: {
    ...textStyles.body,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[5],
  },
  errorText: {
    ...textStyles.h4,
    color: colors.text.secondary,
  },
  backButtonError: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.full,
    marginTop: spacing[2],
  },
  backButtonTextError: {
    ...textStyles.label,
    color: colors.neutral[950],
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerButton: {
    padding: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.elevated,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Balance the back button
  },
  headerSpacer: {
    width: 40,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[5],
    paddingBottom: spacing[10],
  },

  // Episode Badge
  episodeBadge: {
    marginBottom: spacing[2],
  },
  episodeBadgeText: {
    ...textStyles.labelSmall,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Grammar Badge
  grammarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accent.tango + '20',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
    gap: spacing[1.5],
    marginBottom: spacing[5],
  },
  grammarBadgeText: {
    ...textStyles.labelSmall,
    color: colors.accent.tango,
  },

  // Prompt Card
  promptCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[5],
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.gold,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  promptTitle: {
    ...textStyles.label,
    color: colors.primary.gold,
  },
  promptText: {
    ...textStyles.body,
    color: colors.text.primary,
    lineHeight: 26,
  },
  promptPointSpacing: {
    marginTop: spacing[3],
  },
  promptPointNumber: {
    fontWeight: '700',
    color: colors.primary.gold,
  },

  // Submitted Notice
  submittedNotice: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    backgroundColor: colors.success + '15',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[5],
    gap: spacing[3],
  },
  submittedContent: {
    flex: 1,
    minWidth: 200,
  },
  submittedTitle: {
    ...textStyles.label,
    color: colors.success,
    marginBottom: spacing[1],
  },
  submittedText: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
  },
  viewFeedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
  },
  viewFeedbackText: {
    ...textStyles.label,
    color: colors.primary.gold,
  },

  // Input Section
  inputSection: {
    marginBottom: spacing[4],
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  inputLabel: {
    ...textStyles.label,
    color: colors.text.primary,
  },
  wordCount: {
    ...textStyles.caption,
    color: colors.text.tertiary,
  },
  textInput: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    minHeight: 200,
    ...textStyles.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },

  // Voice Section
  voiceSection: {
    marginBottom: spacing[5],
  },
  journalTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.accent.sky + '15',
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  journalTipText: {
    ...textStyles.bodySmall,
    color: colors.accent.sky,
    flex: 1,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.elevated,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  voiceButtonActive: {
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  voiceButtonTranscribing: {
    borderColor: colors.primary.gold,
    backgroundColor: colors.primary.gold + '10',
  },
  voiceButtonText: {
    ...textStyles.body,
    color: colors.primary.gold,
  },
  voiceButtonTextActive: {
    ...textStyles.body,
    color: colors.error,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
  },

  // Submit Button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[5],
  },
  modalContent: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    width: '100%',
    maxWidth: 400,
  },
  modalIconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.gold + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  modalTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  modalDescription: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  modalBenefits: {
    marginBottom: spacing[4],
  },
  modalBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  modalBenefitText: {
    ...textStyles.body,
    color: colors.text.primary,
    flex: 1,
  },
  modalNote: {
    ...textStyles.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing[5],
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  modalCancelText: {
    ...textStyles.button,
    color: colors.text.secondary,
  },
  modalContinueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
    overflow: 'hidden',
  },
  modalContinueText: {
    ...textStyles.button,
    color: colors.neutral[900],
  },
});

