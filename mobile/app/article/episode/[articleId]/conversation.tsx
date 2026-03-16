import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import {
  api,
  EpisodeConversationMessage,
  HighlightedVerb,
  ConversationSummary,
} from '../../../../src/services/api';
import { colors, textStyles, spacing, borderRadius } from '../../../../src/theme';

// Subjunctive verb highlight color
const VERB_HIGHLIGHT_COLOR = '#FF0D00';

interface Message extends EpisodeConversationMessage {
  isPlaying?: boolean;
}

export default function EpisodeConversationScreen() {
  const { articleId } = useLocalSearchParams<{ articleId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userReplyCount, setUserReplyCount] = useState(0);
  const [maxReplies, setMaxReplies] = useState(3);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [episodeId, setEpisodeId] = useState<string | null>(null);
  const [episodeInfo, setEpisodeInfo] = useState<{ titleEs: string; grammarFocus: string } | null>(null);
  
  // Verb explanation modal state
  const [selectedVerb, setSelectedVerb] = useState<HighlightedVerb | null>(null);
  const [verbModalVisible, setVerbModalVisible] = useState(false);
  
  // Audio playback
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [speedMenuVisible, setSpeedMenuVisible] = useState<string | null>(null); // messageId or null
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initConversation();
    setupAudio();
    
    return () => {
      // Cleanup audio on unmount
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, [articleId]);

  const setupAudio = async () => {
    try {
      // Set initial audio mode for playback through speaker (not earpiece)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  };

  // Set audio mode for playback (speaker)
  const setPlaybackMode = async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  };

  // Set audio mode for recording
  const setRecordingMode = async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  };

  const initConversation = async () => {
    if (!articleId) return;

    try {
      setIsLoading(true);

      // Get episode ID from article
      const articleResult = await api.getEpisodeArticle(articleId);
      if (!articleResult.data?.article) {
        Alert.alert('Error', 'Article not found');
        router.back();
        return;
      }

      const epId = articleResult.data.article.episode_id;
      setEpisodeId(epId);
      setEpisodeInfo({
        titleEs: articleResult.data.article.episodes?.title_es || '',
        grammarFocus: articleResult.data.article.grammar_focus || '',
      });

      // Check for existing conversation
      const existingResult = await api.getEpisodeConversation(epId);
      
      if (existingResult.data?.conversation) {
        // Resume existing conversation
        setConversationId(existingResult.data.conversation.id);
        setUserReplyCount(existingResult.data.userReplyCount);
        setMaxReplies(existingResult.data.maxReplies);
        setIsComplete(existingResult.data.isComplete);
        
        // Messages already formatted by backend with camelCase
        const formattedMessages: Message[] = existingResult.data.messages.map(m => ({
          ...m,
          // Backend now returns highlightedVerbs directly
          highlightedVerbs: m.highlightedVerbs || (m as any).content_with_highlights as HighlightedVerb[] | undefined,
        }));
        setMessages(formattedMessages);
        
        if (existingResult.data.isComplete) {
          // Generate summary for completed conversation
          setSummary({
            summary: 'Conversation completed.',
            grammarExamplesUsed: formattedMessages.filter(m => m.role === 'assistant').length,
            userExchanges: formattedMessages.filter(m => m.role === 'user').length,
          });
        } else {
          // Play the most recent assistant message's audio when resuming
          const lastAssistantMessage = formattedMessages
            .filter(m => m.role === 'assistant')
            .pop();
          if (lastAssistantMessage?.audioUrl) {
            // Small delay to let the UI render first
            setTimeout(() => {
              playAudio(lastAssistantMessage.audioUrl!, lastAssistantMessage.id);
            }, 500);
          }
        }
      } else {
        // Start new conversation
        const startResult = await api.startEpisodeConversation(epId);
        
        if (startResult.error) {
          Alert.alert('Error', startResult.error);
          router.back();
          return;
        }

        if (startResult.data) {
          setConversationId(startResult.data.conversationId);
          setUserReplyCount(startResult.data.userReplyCount || 0);
          setMaxReplies(startResult.data.maxReplies || 3);
          
          if (startResult.data.resumed && startResult.data.messages) {
            // Messages already formatted by backend with camelCase
            const formattedMessages: Message[] = startResult.data.messages.map(m => ({
              ...m,
              // Backend now returns highlightedVerbs directly
              highlightedVerbs: m.highlightedVerbs || (m as any).content_with_highlights as HighlightedVerb[] | undefined,
            }));
            setMessages(formattedMessages);
            
            // Play the most recent assistant message's audio when resuming
            const lastAssistantMessage = formattedMessages
              .filter(m => m.role === 'assistant')
              .pop();
            if (lastAssistantMessage?.audioUrl) {
              setTimeout(() => {
                playAudio(lastAssistantMessage.audioUrl!, lastAssistantMessage.id);
              }, 500);
            }
          } else if (startResult.data.message) {
            setMessages([startResult.data.message]);
            
            // Play Florencia's greeting audio
            if (startResult.data.message.audioUrl) {
              playAudio(startResult.data.message.audioUrl, startResult.data.message.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
      Alert.alert('Error', 'Failed to start conversation');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (audioUrl: string, messageId: string, onFinish?: () => void) => {
    try {
      // If this message is already playing, stop it (toggle behavior)
      if (playingMessageId === messageId && currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setPlayingMessageId(null);
        return;
      }

      // Stop any currently playing audio
      if (currentSound) {
        await currentSound.unloadAsync();
      }

      // Switch to playback mode (speaker, not earpiece)
      await setPlaybackMode();

      setPlayingMessageId(messageId);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false } // Don't autoplay, set rate first
      );
      setCurrentSound(sound);

      // Apply the current playback speed
      await sound.setRateAsync(playbackSpeed, true);
      
      // Now start playing
      await sound.playAsync();

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingMessageId(null);
          if (onFinish) {
            onFinish();
          }
        }
      });
    } catch (error: any) {
      console.error('Error playing audio:', error);
      setPlayingMessageId(null);
      // Call onFinish even on error so the flow continues
      if (onFinish) {
        onFinish();
      }
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant microphone permission to record.');
        return;
      }

      // Switch to recording mode
      await setRecordingMode();

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      // Switch back to playback mode (speaker) after recording
      await setPlaybackMode();

      if (uri && conversationId) {
        await sendAudioMessage(uri);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const sendAudioMessage = async (audioUri: string) => {
    if (!conversationId) return;

    try {
      setIsSending(true);

      // Detect the actual file format from the URI
      // iOS uses .m4a (AAC), Android uses .3gp or .m4a depending on preset
      const extension = audioUri.split('.').pop()?.toLowerCase() || 'm4a';
      const mimeTypeMap: Record<string, string> = {
        'm4a': 'audio/m4a',
        'mp4': 'audio/mp4',
        'caf': 'audio/x-caf',
        'wav': 'audio/wav',
        '3gp': 'audio/3gpp',
        'aac': 'audio/aac',
        'webm': 'audio/webm',
      };
      const mimeType = mimeTypeMap[extension] || 'audio/m4a';
      const fileName = `recording.${extension}`;

      // Create blob-like object for FormData
      const audioBlob = {
        uri: audioUri,
        mimeType: mimeType,
        name: fileName,
      } as any;

      const result = await api.sendEpisodeConversationMessage(conversationId, audioBlob);

      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      if (result.data) {
        // First, add and show only the user's message
        const userMessages: Message[] = [...messages, result.data.userMessage];
        setMessages(userMessages);
        setUserReplyCount(result.data.userReplyCount);

        // Scroll to show user's message
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Function to show Florencia's response after user audio finishes
        const showFlorenciaResponse = () => {
          // Show Florencia's message (regular response OR farewell)
          if (result.data!.florenciaMessage) {
            // Add Florencia's message to the UI
            setMessages(prev => [...prev, result.data!.florenciaMessage!]);
            
            // Scroll to show Florencia's message
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
            
            // Function to handle completion after Florencia's audio finishes
            const handleAfterFlorenciaAudio = () => {
              if (result.data!.conversationComplete) {
                // Wait a moment before showing summary
                setTimeout(() => {
                  setIsComplete(true);
                  setSummary(result.data!.summary || null);
                }, 1000);
              }
            };
            
            // Play Florencia's audio (with callback for farewell messages)
            if (result.data!.florenciaMessage.audioUrl) {
              playAudio(
                result.data!.florenciaMessage.audioUrl, 
                result.data!.florenciaMessage.id,
                result.data!.conversationComplete ? handleAfterFlorenciaAudio : undefined
              );
            } else if (result.data!.conversationComplete) {
              // No audio, show summary after a delay
              handleAfterFlorenciaAudio();
            }
          } else if (result.data!.conversationComplete) {
            // No Florencia message but conversation is complete (shouldn't happen with new flow)
            setIsComplete(true);
            setSummary(result.data!.summary || null);
          }
        };

        // Play back user's audio if available, then show Florencia's response
        if (result.data.userMessage.audioUrl) {
          playAudio(result.data.userMessage.audioUrl, result.data.userMessage.id, showFlorenciaResponse);
        } else {
          // No user audio, show Florencia's response immediately
          showFlorenciaResponse();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerbPress = (verb: HighlightedVerb) => {
    setSelectedVerb(verb);
    setVerbModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleBack = () => {
    router.back();
  };

  const handleEpisodeComplete = () => {
    router.replace('/(tabs)');
  };

  // Render explanation text with spacing between numbered points and white formula highlighting
  const renderExplanationText = (explanation: string) => {
    // Split explanation on numbered patterns like "1)" and "2)"
    const parts = explanation.split(/(\d+\))/);
    
    const renderedParts: React.ReactNode[] = [];
    let currentPoint = '';
    let pointNumber = '';
    
    parts.forEach((part, index) => {
      // Check if this is a number marker like "1)" or "2)"
      if (/^\d+\)$/.test(part)) {
        // Save previous point if exists
        if (currentPoint && pointNumber) {
          renderedParts.push(
            <View key={`point-${pointNumber}`} style={renderedParts.length > 0 ? { marginTop: 12 } : undefined}>
              <Text style={styles.verbModalExplanation}>
                {renderFormulaHighlighting(pointNumber + currentPoint)}
              </Text>
            </View>
          );
        }
        pointNumber = part;
        currentPoint = '';
      } else {
        currentPoint += part;
      }
    });
    
    // Add the last point
    if (currentPoint && pointNumber) {
      renderedParts.push(
        <View key={`point-${pointNumber}`} style={renderedParts.length > 0 ? { marginTop: 12 } : undefined}>
          <Text style={styles.verbModalExplanation}>
            {renderFormulaHighlighting(pointNumber + currentPoint)}
          </Text>
        </View>
      );
    }
    
    // If no numbered points found, render with formula highlighting only
    if (renderedParts.length === 0) {
      return (
        <Text style={styles.verbModalExplanation}>
          {renderFormulaHighlighting(explanation)}
        </Text>
      );
    }
    
    return <>{renderedParts}</>;
  };

  // Highlight syntactical formulas (text in single quotes) in white
  const renderFormulaHighlighting = (text: string): React.ReactNode[] => {
    // Match text within single quotes
    const formulaRegex = /'([^']+)'/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyIndex = 0;
    
    while ((match = formulaRegex.exec(text)) !== null) {
      // Add text before the formula
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`text-${keyIndex++}`}>
            {text.substring(lastIndex, match.index)}
          </Text>
        );
      }
      
      // Add the formula in white (including the quotes)
      parts.push(
        <Text key={`formula-${keyIndex++}`} style={styles.formulaHighlight}>
          '{match[1]}'
        </Text>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <Text key={`text-${keyIndex++}`}>
          {text.substring(lastIndex)}
        </Text>
      );
    }
    
    // If no formulas found, return original text
    if (parts.length === 0) {
      return [<Text key="original">{text}</Text>];
    }
    
    return parts;
  };

  // Render message content with highlighted verbs
  const renderMessageContent = useCallback((message: Message) => {
    if (message.role !== 'assistant' || !message.highlightedVerbs?.length) {
      return <Text style={styles.messageText}>{message.content}</Text>;
    }

    // Sort highlights by startIndex to process in order
    const sortedHighlights = [...message.highlightedVerbs].sort(
      (a, b) => a.startIndex - b.startIndex
    );

    // Filter out overlapping/duplicate highlights
    const uniqueHighlights = sortedHighlights.filter((verb, index) => {
      if (index === 0) return true;
      const prevVerb = sortedHighlights[index - 1];
      // Skip if this verb starts before the previous one ends (overlapping)
      return verb.startIndex >= prevVerb.endIndex;
    });

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    uniqueHighlights.forEach((verb, index) => {
      // Skip if verb starts before our current position (shouldn't happen after filtering, but safety check)
      if (verb.startIndex < lastIndex) {
        return;
      }

      // Add text before the verb
      if (verb.startIndex > lastIndex) {
        parts.push(
          <Text key={`text-${index}`} style={styles.messageText}>
            {message.content.substring(lastIndex, verb.startIndex)}
          </Text>
        );
      }

      // Add the highlighted verb
      parts.push(
        <Text
          key={`verb-${index}`}
          style={styles.highlightedVerb}
          onPress={() => handleVerbPress(verb)}
        >
          {message.content.substring(verb.startIndex, verb.endIndex)}
        </Text>
      );

      lastIndex = verb.endIndex;
    });

    // Add remaining text after the last verb
    if (lastIndex < message.content.length) {
      parts.push(
        <Text key="text-end" style={styles.messageText}>
          {message.content.substring(lastIndex)}
        </Text>
      );
    }

    return <Text style={styles.messageText}>{parts}</Text>;
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.gold} />
          <Text style={styles.loadingText}>Starting conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Conversation with Florencia</Text>
          <Text style={[styles.headerSubtitle, isComplete && styles.headerSubtitleComplete]}>
            {isComplete ? '✓ Completed!' : `${userReplyCount}/${maxReplies} exchanges`}
          </Text>
        </View>

        <View style={styles.headerButton} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${(userReplyCount / maxReplies) * 100}%` }
          ]} 
        />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => (
          <View
            key={message.id || index}
            style={[
              styles.messageBubble,
              message.role === 'assistant' ? styles.assistantBubble : styles.userBubble,
            ]}
          >
            {message.role === 'assistant' && (
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>F</Text>
                </View>
              </View>
            )}
            
            <View
              style={[
                styles.messageContent,
                message.role === 'assistant' ? styles.assistantContent : styles.userContent,
              ]}
            >
              {renderMessageContent(message)}
              
              {/* Audio playback button */}
              {message.audioUrl && (
                <View style={styles.audioControlsRow}>
                  <Pressable
                    style={styles.audioButton}
                    onPress={() => playAudio(message.audioUrl!, message.id)}
                  >
                    <Ionicons
                      name={playingMessageId === message.id ? 'pause' : 'play'}
                      size={16}
                      color={message.role === 'assistant' ? colors.primary.gold : colors.text.primary}
                    />
                    <Text style={[
                      styles.audioButtonText,
                      message.role === 'user' && styles.audioButtonTextUser,
                    ]}>
                      {playingMessageId === message.id ? 'Playing...' : 'Play audio'}
                    </Text>
                  </Pressable>
                  
                  {/* Speed control - only for assistant messages */}
                  {message.role === 'assistant' && (
                    <View style={styles.speedControlContainer}>
                      <Pressable
                        style={styles.speedButton}
                        onPress={() => setSpeedMenuVisible(
                          speedMenuVisible === message.id ? null : message.id
                        )}
                      >
                        <Ionicons name="speedometer-outline" size={14} color={colors.primary.gold} />
                        <Text style={styles.speedButtonText}>{playbackSpeed.toFixed(2)}x</Text>
                      </Pressable>
                      
                      {/* Speed options popup */}
                      {speedMenuVisible === message.id && (
                        <View style={styles.speedMenu}>
                          {[0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00].map((speed) => (
                            <Pressable
                              key={speed}
                              style={[
                                styles.speedOption,
                                playbackSpeed === speed && styles.speedOptionActive,
                              ]}
                              onPress={() => {
                                setPlaybackSpeed(speed);
                                setSpeedMenuVisible(null);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }}
                            >
                              <Text style={[
                                styles.speedOptionText,
                                playbackSpeed === speed && styles.speedOptionTextActive,
                              ]}>
                                {speed.toFixed(2)}x
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}

        {isSending && (
          <View style={[styles.messageBubble, styles.userBubble]}>
            <View style={[styles.messageContent, styles.userContent]}>
              <ActivityIndicator size="small" color={colors.primary.gold} />
              <Text style={styles.sendingText}>Processing your response...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Recording controls or Continue button */}
      <View style={styles.controlsContainer}>
        {isComplete ? (
          <>
            <Text style={styles.completionHint}>
              ¡Conversación completada! Scroll up to replay any messages.
            </Text>
            <Pressable onPress={handleEpisodeComplete}>
              <LinearGradient
                colors={['#B3F5FF', '#00B8DB']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.continueButton}
              >
                <Text style={styles.continueButtonText}>Episode Complete — Back to Home</Text>
                <Ionicons name="home" size={20} color={colors.neutral[950]} />
              </LinearGradient>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.recordingHint}>
              Take a moment to think before recording your response
            </Text>
            
            <View style={styles.buttonsRow}>
              {/* Pause button placeholder - for future use */}
              <View style={styles.pauseButton}>
                <Ionicons name="pause" size={24} color={colors.text.muted} />
              </View>

              {/* Record button */}
              <Pressable
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isSending}
                style={isSending ? styles.recordButtonDisabled : undefined}
              >
                <LinearGradient
                  colors={isRecording ? ['#FF9999', '#CC0000'] : ['#99FF99', '#00CC00']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.recordButton}
                >
                  <Ionicons
                    name={isRecording ? 'stop' : 'mic'}
                    size={32}
                    color={colors.neutral[950]}
                  />
                  <Text style={styles.recordButtonText}>
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Verb Explanation Modal */}
      <Modal
        visible={verbModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVerbModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setVerbModalVisible(false)}
        >
          <View style={styles.verbModal}>
            {selectedVerb && (
              <>
                <View style={styles.verbModalHeader}>
                  <Text style={styles.verbModalTitle}>{selectedVerb.verb}</Text>
                  <Text style={styles.verbModalSubtitle}>
                    {selectedVerb.infinitive} (subjunctive)
                  </Text>
                </View>

                <View style={styles.verbModalSection}>
                  <Text style={styles.verbModalLabel}>Trigger Phrase:</Text>
                  <Text style={styles.verbModalValue}>{selectedVerb.trigger}</Text>
                </View>

                <View style={styles.verbModalSection}>
                  <Text style={styles.verbModalLabel}>Indicative Form:</Text>
                  <Text style={styles.verbModalValue}>{selectedVerb.indicativeForm}</Text>
                </View>

                <View style={styles.verbModalSection}>
                  <Text style={styles.verbModalLabel}>Why Subjunctive?</Text>
                  {renderExplanationText(selectedVerb.explanation)}
                </View>

                <Pressable
                  style={styles.verbModalClose}
                  onPress={() => setVerbModalVisible(false)}
                >
                  <Text style={styles.verbModalCloseText}>Got it!</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.elevated,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...textStyles.label,
    color: colors.text.primary,
    fontSize: 16,
  },
  headerSubtitle: {
    ...textStyles.caption,
    color: colors.primary.gold,
    marginTop: 2,
  },
  headerSubtitleComplete: {
    color: '#00FF00',
    fontWeight: '600',
  },

  // Progress bar
  progressBar: {
    height: 4,
    backgroundColor: colors.neutral[800],
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.gold,
  },

  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing[4],
    gap: spacing[4],
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  assistantBubble: {
    justifyContent: 'flex-start',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    marginRight: spacing[2],
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[950],
  },
  messageContent: {
    maxWidth: '80%',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
  },
  assistantContent: {
    backgroundColor: colors.background.elevated,
    borderTopLeftRadius: 4,
  },
  userContent: {
    backgroundColor: colors.primary.gold + '20',
    borderColor: colors.primary.gold,
    borderWidth: 1,
    borderTopRightRadius: 4,
  },
  messageText: {
    ...textStyles.body,
    color: colors.text.primary,
    lineHeight: 24,
  },
  highlightedVerb: {
    color: VERB_HIGHLIGHT_COLOR,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
  },
  audioButtonText: {
    ...textStyles.caption,
    color: colors.primary.gold,
  },
  audioButtonTextUser: {
    color: colors.text.secondary,
  },
  audioControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  speedControlContainer: {
    position: 'relative',
  },
  speedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    backgroundColor: colors.neutral[800],
    borderRadius: borderRadius.sm,
  },
  speedButtonText: {
    ...textStyles.caption,
    color: colors.primary.gold,
    fontWeight: '600',
  },
  speedMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: spacing[1],
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  speedOption: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    minWidth: 70,
  },
  speedOptionActive: {
    backgroundColor: colors.primary.gold + '30',
  },
  speedOptionText: {
    ...textStyles.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  speedOptionTextActive: {
    color: colors.primary.gold,
    fontWeight: '600',
  },
  sendingText: {
    ...textStyles.caption,
    color: colors.text.secondary,
    marginLeft: spacing[2],
  },

  // Controls
  controlsContainer: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.background.secondary,
  },
  recordingHint: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing[3],
    fontStyle: 'italic',
  },
  completionHint: {
    ...textStyles.body,
    color: colors.primary.gold,
    textAlign: 'center',
    marginBottom: spacing[4],
    fontWeight: '500',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  pauseButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.full,
    gap: spacing[2],
  },
  recordButtonDisabled: {
    opacity: 0.5,
  },
  recordButtonText: {
    ...textStyles.label,
    color: colors.neutral[950],
    fontSize: 16,
  },

  // Summary screen
  summaryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[5],
  },
  summaryCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.primary.gold + '30',
  },
  summaryTitle: {
    ...textStyles.h3,
    color: colors.text.primary,
    marginTop: spacing[4],
    textAlign: 'center',
  },
  summarySubtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[8],
    marginTop: spacing[5],
    marginBottom: spacing[4],
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...textStyles.h2,
    color: colors.primary.gold,
  },
  statLabel: {
    ...textStyles.caption,
    color: colors.text.tertiary,
    marginTop: spacing[1],
  },
  summaryMessage: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[5],
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  continueButtonText: {
    ...textStyles.label,
    color: colors.neutral[950],
    fontSize: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[5],
  },
  verbModal: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    width: '100%',
    maxWidth: 350,
    borderWidth: 1,
    borderColor: colors.primary.gold + '40',
  },
  verbModalHeader: {
    alignItems: 'center',
    marginBottom: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  verbModalTitle: {
    ...textStyles.h3,
    color: VERB_HIGHLIGHT_COLOR,
    fontWeight: '700',
  },
  verbModalSubtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  verbModalSection: {
    marginBottom: spacing[3],
  },
  verbModalLabel: {
    ...textStyles.label,
    color: colors.text.tertiary,
    marginBottom: spacing[1],
  },
  verbModalValue: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  verbModalExplanation: {
    ...textStyles.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  formulaHighlight: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  verbModalClose: {
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing[4],
  },
  verbModalCloseText: {
    ...textStyles.label,
    color: colors.neutral[950],
    fontWeight: '600',
  },
});

