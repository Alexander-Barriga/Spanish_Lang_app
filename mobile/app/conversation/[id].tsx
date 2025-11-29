import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ScrollView,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { colors, textStyles, spacing, borderRadius, shadows } from '../../src/theme';
import { useAudioPlayback } from '../../src/hooks/useAudioPlayback';
import { api } from '../../src/services/api';
import { VAD_CONFIG, getTutorById } from '../../src/config/constants';
import { useAuth } from '../../src/contexts/AuthContext';

const { width, height } = Dimensions.get('window');

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  corrections?: Array<{
    type: string;
    original: string;
    corrected: string;
    explanation: string;
  }>;
}

export default function ConversationScreen() {
  const { id, mode, topic, grammarFocus, persona } = useLocalSearchParams<{
    id: string;
    mode?: string;
    topic?: string;
    grammarFocus?: string;
    persona?: string;
  }>();

  // Get the selected tutor character for voice synthesis
  const { selectedTutorId } = useAuth();
  const selectedTutor = getTutorById(selectedTutorId);

  const [state, setState] = useState<ConversationState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [currentCorrection, setCurrentCorrection] = useState<Message['corrections']>(undefined);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Recording refs - using refs to avoid stale closure issues
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isRecordingRef = useRef(false);
  const recordingStartTimeRef = useRef<number>(0);

  // Animation values (using React Native's built-in Animated)
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Audio playback hook
  const { 
    isPlaying, 
    playAudio,
    stopAudio,
  } = useAudioPlayback({
    onPlaybackComplete: () => {
      setState('idle');
    },
    onError: (error) => {
      console.error('Playback error:', error);
      setState('idle');
    },
  });

  // Initialize conversation
  useEffect(() => {
    initializeConversation();
    return () => {
      // Cleanup on unmount
      cleanupRecording();
      stopAudio();
    };
  }, []);

  // Pulse animation for listening state
  useEffect(() => {
    if (state === 'listening') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [state]);

  const cleanupRecording = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        // Ignore cleanup errors
      }
      recordingRef.current = null;
      isRecordingRef.current = false;
    }
  };

  const initializeConversation = async () => {
    try {
      console.log('🚀 Initializing conversation with mode:', mode, 'character:', selectedTutorId);
      
      // Create a new conversation on the backend with selected tutor
      const result = await api.createConversation({
        mode: mode || 'open',
        topic: topic,
        grammarFocus: grammarFocus,
        rolePlayPersona: persona,
        characterId: selectedTutorId,
      });

      console.log('📋 Conversation creation result:', JSON.stringify(result, null, 2));

      if (result.data) {
        const newConversationId = result.data.conversation.id;
        console.log('✅ Conversation created with ID:', newConversationId);
        setConversationId(newConversationId);
        
        // Add the initial greeting
        const greeting: Message = {
          id: '1',
          role: 'assistant',
          content: result.data.initialMessage || getLocalGreeting(),
        };
        setMessages([greeting]);
        
        // Play the greeting audio
        await speakText(greeting.content);
      } else {
        // Fallback to local greeting if API fails
        console.warn('⚠️ API returned no data, error:', result.error);
        const greeting: Message = {
          id: '1',
          role: 'assistant',
          content: getLocalGreeting(),
        };
        setMessages([greeting]);
        setState('idle');
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('❌ Failed to initialize conversation:', error);
      // Fallback to local greeting
      const greeting: Message = {
        id: '1',
        role: 'assistant',
        content: getLocalGreeting(),
      };
      setMessages([greeting]);
      setIsInitialized(true);
      setState('idle');
    }
  };

  const getLocalGreeting = () => {
    switch (mode) {
      case 'topic':
        return `¡Hola! Estoy emocionado de hablar sobre ${topic || 'este tema'}. ¿Por dónde quieres empezar?`;
      case 'grammar':
        return `¡Perfecto! Vamos a practicar ${grammarFocus || 'gramática'}. No te preocupes por los errores - ¡estoy aquí para ayudarte!`;
      case 'roleplay':
        return `*Entra en personaje* ¡Hola! Soy ${persona || 'tu compañero de práctica'}. ¿De qué quieras hablar?`;
      default:
        return '¡Hola! Soy Lobo, tu compañero de español. ¿Cómo estás hoy? Podemos hablar de lo que quieras.';
    }
  };

  // Text-to-Speech function
  const speakText = async (text: string) => {
    try {
      setState('speaking');
      
      console.log(`🗣️ Speaking with tutor: ${selectedTutor?.name || 'default'} (${selectedTutorId})`);
      
      // Call the TTS endpoint with the selected tutor character
      const audioBuffer = await api.synthesizeSpeech(text, selectedTutorId);
      
      // Convert ArrayBuffer to base64 data URI for playback
      const base64 = arrayBufferToBase64(audioBuffer);
      const audioUri = `data:audio/mpeg;base64,${base64}`;
      
      await playAudio(audioUri);
    } catch (error) {
      console.error('TTS error:', error);
      // Even if TTS fails, show the text and move on
      setState('idle');
    }
  };

  // Helper function to convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Start recording function
  const startRecording = async () => {
    try {
      console.log('📱 Requesting microphone permission...');
      
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone access to use voice chat.');
        setState('idle');
        return;
      }

      // IMPORTANT: Clean up any existing recording first
      if (recordingRef.current) {
        console.log('🧹 Cleaning up previous recording...');
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {
          // Ignore errors during cleanup
          console.log('Cleanup warning (can ignore):', e);
        }
        recordingRef.current = null;
        isRecordingRef.current = false;
      }

      console.log('🎤 Starting recording...');
      
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      isRecordingRef.current = true;
      recordingStartTimeRef.current = Date.now();
      
      console.log('✅ Recording started successfully');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setState('idle');
      isRecordingRef.current = false;
      recordingRef.current = null;
      Alert.alert('Recording Error', 'Could not start recording. Please try again.');
    }
  };

  // Stop recording and process
  const stopRecording = async () => {
    console.log('🛑 Stopping recording...');
    
    if (!recordingRef.current || !isRecordingRef.current) {
      console.log('⚠️ No active recording to stop');
      setState('idle');
      return;
    }

    const recording = recordingRef.current;
    recordingRef.current = null;
    isRecordingRef.current = false;
    
    setState('processing');

    try {
      await recording.stopAndUnloadAsync();
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      const uri = recording.getURI();
      const recordingDuration = Date.now() - recordingStartTimeRef.current;
      
      console.log(`📁 Recording saved to: ${uri}`);
      console.log(`⏱️ Recording duration: ${recordingDuration}ms`);
      
      // Check minimum recording length
      if (!uri || recordingDuration < VAD_CONFIG.minRecordingLength) {
        console.log('⚠️ Recording too short, ignoring');
        setState('idle');
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Process the recording
      await processRecording(uri);
      
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      setState('idle');
      Alert.alert('Error', 'Could not process your recording. Please try again.');
    }
  };

  // Process the recorded audio
  const processRecording = async (audioUri: string) => {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Transcribing audio...');
      
      // Transcribe the audio (pass conversationId for storage organization)
      const transcribeStart = Date.now();
      const transcriptionResult = await api.transcribeAudio(audioUri, conversationId || undefined);
      console.log(`⏱️ Transcription took: ${Date.now() - transcribeStart}ms`);
      
      if (transcriptionResult.error) {
        console.error('❌ Transcription error:', transcriptionResult.error);
        throw new Error(transcriptionResult.error);
      }
      
      if (!transcriptionResult.data?.transcript) {
        console.log('⚠️ No transcript received');
        setState('idle');
        Alert.alert('Could not understand', 'Please try speaking again, more clearly.');
        return;
      }

      const userText = transcriptionResult.data.transcript;
      console.log(`💬 Transcription: "${userText}"`);
      
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userText,
      };
      setMessages(prev => [...prev, userMessage]);

      console.log('🤖 Getting AI response...');
      
      // Get AI response (include audioUrl to save with message)
      let currentConversationId = conversationId;
      
      // If we don't have a conversation ID, try to create one now
      if (!currentConversationId) {
        console.log('⚠️ No conversation ID, attempting to create one...');
        try {
          const createResult = await api.createConversation({
            mode: mode || 'open',
            topic: topic,
            grammarFocus: grammarFocus,
            rolePlayPersona: persona,
            characterId: selectedTutorId,
          });
          
          if (createResult.data?.conversation?.id) {
            currentConversationId = createResult.data.conversation.id;
            setConversationId(currentConversationId);
            console.log('✅ Late conversation created:', currentConversationId);
          }
        } catch (createError) {
          console.error('❌ Failed to create conversation:', createError);
        }
      }
      
      if (currentConversationId) {
        console.log('📤 Sending message to conversation:', currentConversationId);
        const aiStart = Date.now();
        const responseResult = await api.sendMessage(currentConversationId, userText, selectedTutorId);
        console.log(`⏱️ AI response took: ${Date.now() - aiStart}ms`);
        
        if (responseResult.error) {
          console.error('❌ AI response error:', responseResult.error);
          throw new Error(responseResult.error);
        }
        
        if (responseResult.data) {
          const aiMessage: Message = {
            id: responseResult.data.message.id,
            role: 'assistant',
            content: responseResult.data.message.content,
            corrections: responseResult.data.corrections,
          };
          
          console.log(`🤖 AI response: "${aiMessage.content}"`);
          setMessages(prev => [...prev, aiMessage]);
          
          if (aiMessage.corrections && aiMessage.corrections.length > 0) {
            setCurrentCorrection(aiMessage.corrections);
          }
          
          // Speak the response
          const ttsStart = Date.now();
          await speakText(aiMessage.content);
          console.log(`⏱️ TTS took: ${Date.now() - ttsStart}ms`);
          console.log(`⏱️ TOTAL response time: ${Date.now() - startTime}ms`);
        } else {
          throw new Error('Failed to get AI response');
        }
      } else {
        // Fallback if still no conversation ID
        console.log('⚠️ Still no conversation ID after retry, using local fallback');
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Lo siento, hubo un problema de conexión. Por favor, intenta de nuevo.',
        };
        setMessages(prev => [...prev, aiMessage]);
        setState('idle');
      }
    } catch (error) {
      console.error('❌ Processing error:', error);
      setState('idle');
      Alert.alert('Error', 'Could not process your message. Please try again.');
    }
  };

  // Track if we're currently processing a mic press to prevent double-taps
  const isProcessingRef = useRef(false);

  const handleMicPress = async () => {
    // Prevent double-tap issues
    if (isProcessingRef.current) {
      console.log('⏳ Already processing, ignoring tap');
      return;
    }
    
    console.log(`🎯 Mic pressed. Current state: ${state}`);
    isProcessingRef.current = true;
    
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (state === 'idle') {
        // Start recording
        setState('listening');
        await startRecording();
      } else if (state === 'listening') {
        // Stop recording and process
        await stopRecording();
      }
    } finally {
      // Small delay before allowing another press
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);
    }
  };

  const handleEndConversation = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // End the conversation on the backend
    if (conversationId) {
      try {
        await api.endConversation(conversationId);
      } catch (error) {
        console.error('Failed to end conversation:', error);
      }
    }
    
    // Cleanup
    await cleanupRecording();
    await stopAudio();
    
    router.back();
  };

  const getStateText = () => {
    switch (state) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Thinking...';
      case 'speaking':
        return 'Speaking...';
      default:
        return 'Tap to speak';
    }
  };

  const getStateColor = () => {
    switch (state) {
      case 'listening':
        return colors.success;
      case 'processing':
        return colors.warning;
      case 'speaking':
        return colors.secondary.teal;
      default:
        return colors.primary.gold;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.secondary, colors.background.primary]}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={handleEndConversation}>
            <Ionicons name="chevron-down" size={24} color={colors.text.primary} />
          </Pressable>
          
          <View style={styles.headerCenter}>
            <View style={[styles.statusDot, { backgroundColor: getStateColor() }]} />
            <Text style={styles.headerTitle}>
              {mode === 'roleplay' ? persona : mode === 'topic' ? topic : (selectedTutor?.name || 'Lobo')}
            </Text>
            {selectedTutor && (
              <Text style={styles.headerFlag}>{selectedTutor.flag}</Text>
            )}
          </View>
          
          <Pressable 
            style={styles.headerButton} 
            onPress={() => setShowTranscript(!showTranscript)}
          >
            <Ionicons 
              name={showTranscript ? 'chatbubbles' : 'chatbubbles-outline'} 
              size={22} 
              color={colors.text.primary} 
            />
          </Pressable>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {showTranscript ? (
            // Transcript View
            <ScrollView 
              ref={scrollViewRef}
              style={styles.transcriptContainer}
              contentContainerStyle={styles.transcriptContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
            >
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageContainer,
                    message.role === 'user' && styles.userMessageContainer,
                  ]}
                >
                  <View style={[
                    styles.messageBubble,
                    message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}>
                    <Text style={[
                      styles.messageText,
                      message.role === 'user' && styles.userMessageText,
                    ]}>
                      {message.content}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            // Avatar View
            <View style={styles.avatarContainer}>
              <Animated.View style={[
                styles.avatarWrapper, 
                { transform: [{ scale: pulseAnim }] }
              ]}>
                {state === 'listening' && (
                  <View style={styles.listeningRing} />
                )}
                <View style={styles.avatar}>
                  <Text style={styles.avatarEmoji}>🐺</Text>
                </View>
              </Animated.View>
              
              <Text style={styles.stateText}>
                {getStateText()}
              </Text>

              {/* Current Message Preview */}
              {messages.length > 0 && state === 'idle' && (
                <View style={styles.messagePreview}>
                  <Text style={styles.messagePreviewText} numberOfLines={3}>
                    {messages[messages.length - 1].content}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Correction Card */}
        {currentCorrection && currentCorrection.length > 0 && (
          <View style={styles.correctionCard}>
            <View style={styles.correctionHeader}>
              <Ionicons name="bulb" size={16} color={colors.primary.gold} />
              <Text style={styles.correctionTitle}>Feedback</Text>
              <Pressable onPress={() => setCurrentCorrection(undefined)}>
                <Ionicons name="close" size={18} color={colors.text.secondary} />
              </Pressable>
            </View>
            {currentCorrection.map((correction, i) => (
              <View key={i} style={styles.correctionItem}>
                <Text style={styles.correctionText}>{correction.explanation}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <Pressable style={styles.sideButton} onPress={handleEndConversation}>
            <Ionicons name="stop" size={24} color={colors.error} />
          </Pressable>
          
          <Pressable 
            style={[
              styles.micButton,
              state === 'listening' && styles.micButtonListening,
              state === 'processing' && styles.micButtonProcessing,
              state === 'speaking' && styles.micButtonSpeaking,
            ]}
            onPress={handleMicPress}
            disabled={state === 'processing' || state === 'speaking'}
          >
            <Ionicons 
              name={state === 'listening' ? 'stop' : 'mic'} 
              size={32} 
              color={colors.neutral[900]} 
            />
          </Pressable>
          
          <Pressable style={styles.sideButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color={colors.text.secondary} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    ...textStyles.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  headerFlag: {
    fontSize: 14,
    marginLeft: spacing[1],
  },
  content: {
    flex: 1,
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing[6],
  },
  listeningRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: colors.success,
    top: -20,
    left: -20,
    opacity: 0.3,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  avatarEmoji: {
    fontSize: 64,
  },
  stateText: {
    ...textStyles.body,
    color: colors.text.secondary,
    marginBottom: spacing[6],
  },
  messagePreview: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  messagePreviewText: {
    ...textStyles.body,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 24,
  },
  transcriptContainer: {
    flex: 1,
  },
  transcriptContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  messageContainer: {
    marginBottom: spacing[3],
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
  },
  assistantBubble: {
    backgroundColor: colors.background.card,
    borderBottomLeftRadius: borderRadius.sm,
  },
  userBubble: {
    backgroundColor: colors.primary.gold,
    borderBottomRightRadius: borderRadius.sm,
  },
  messageText: {
    ...textStyles.body,
    color: colors.text.primary,
    lineHeight: 22,
  },
  userMessageText: {
    color: colors.neutral[900],
  },
  correctionCard: {
    backgroundColor: colors.background.card,
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.primary.gold + '40',
  },
  correctionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  correctionTitle: {
    ...textStyles.label,
    color: colors.primary.gold,
    flex: 1,
  },
  correctionItem: {
    marginTop: spacing[2],
  },
  correctionText: {
    ...textStyles.bodySmall,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[6],
    gap: spacing[6],
  },
  sideButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.gold,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  micButtonListening: {
    backgroundColor: colors.success,
  },
  micButtonProcessing: {
    backgroundColor: colors.warning,
    opacity: 0.7,
  },
  micButtonSpeaking: {
    backgroundColor: colors.secondary.teal,
    opacity: 0.7,
  },
});
