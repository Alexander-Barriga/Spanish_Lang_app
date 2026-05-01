import { API_URL } from '../config/constants';
import { authTokenManager } from './authToken';

// Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  /**
   * Set when the server replies with a 403 PAYWALL envelope, signalling that
   * the request was blocked because the user is on the free tier and tried to
   * access premium content. Callers can use this to surface the paywall.
   */
  paywall?: boolean;
}

export interface SubscriptionStatus {
  isPremium: boolean;
  tier: 'free' | 'monthly' | 'annual' | 'comp' | null;
  expiresAt: string | null;
  source: 'revenuecat' | 'comp_code' | 'admin' | null;
}

export interface RedeemCodeResponse {
  ok: boolean;
  kind: 'full_access' | 'percent_off';
  percentOff?: number;
  entitlement?: SubscriptionStatus;
}

/**
 * Optional global listener invoked any time the server returns 403 PAYWALL.
 * The mobile app installs one of these in its top-level navigator so that any
 * screen (not just ones that explicitly check) can route the user to /paywall.
 */
type PaywallListener = () => void;
let paywallListener: PaywallListener | null = null;
export const setPaywallListener = (listener: PaywallListener | null) => {
  paywallListener = listener;
};

export interface ConversationResponse {
  id: string;
  mode: string;
  topic?: string;
  grammar_focus?: string;
  role_play_persona?: string;
  started_at: string;
  message_count: number;
}

export interface MessageResponse {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  corrections?: Array<{
    type: string;
    original: string;
    corrected: string;
    explanation: string;
  }>;
  emotion?: EmotionData;
  created_at: string;
}

// Emotion types for human-like voice synthesis
export type EmotionType =
  // Positive Emotions
  | 'content' | 'pleased' | 'happy' | 'joyful' | 'excited' | 'ecstatic'
  | 'proud' | 'amused' | 'playful'
  // Encouraging Emotions
  | 'reassuring' | 'encouraging' | 'enthusiastic' | 'empathetic'
  | 'compassionate' | 'nurturing'
  // Contemplative Emotions
  | 'thoughtful' | 'curious' | 'concerned' | 'worried' | 'disappointed'
  | 'frustrated' | 'stern'
  // Surprise Emotions
  | 'intrigued' | 'surprised' | 'amazed' | 'astonished' | 'shocked';

export interface EmotionData {
  type: EmotionType;
  intensity: number; // 0.0 to 1.0
}

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    // Get token from the in-memory token manager (set by AuthContext)
    let token = authTokenManager.getToken();
    
    if (token) {
      console.log('🔑 Auth token available (in-memory)');
      return token;
    }
    
    // Try to restore from SecureStore if not in memory
    console.log('🔍 Token not in memory, checking SecureStore...');
    token = await authTokenManager.getTokenAsync();
    
    if (token) {
      console.log('🔑 Auth token restored from SecureStore');
      return token;
    }
    
    console.log('⚠️ No auth token - user may not be logged in');
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
    
    try {
      const token = await this.getAuthToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`📡 API Response: ${response.status} ${response.statusText}`);

      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ API Error: ${data.error || 'Request failed'}`);

        // If token is invalid/expired, clear it so user can re-authenticate
        if (response.status === 401 || data.error?.includes('Invalid') || data.error?.includes('expired')) {
          console.log('🔓 Clearing invalid/expired token');
          authTokenManager.setToken(null);
        }

        // 403 PAYWALL envelope -> notify the global listener (e.g. router) so
        // the user is taken to the paywall, and surface a typed flag back to
        // the caller so it can render its own fallback UI.
        if (response.status === 403 && data?.code === 'PAYWALL') {
          console.log('🔒 Paywall response received');
          if (paywallListener) {
            try {
              paywallListener();
            } catch (listenerError) {
              console.error('Paywall listener threw:', listenerError);
            }
          }
          return { error: data.error || 'Premium subscription required', paywall: true };
        }

        return { error: data.error || 'Request failed' };
      }

      return { data };
    } catch (error) {
      console.error('❌ API Network error:', error);
      console.error('URL was:', url);
      return { error: 'Network error' };
    }
  }

  // Auth endpoints
  async signIn(email: string, password: string) {
    return this.request<{ user: unknown; session: { access_token: string } }>(
      '/auth/signin',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
  }

  async signUp(email: string, password: string, displayName?: string) {
    return this.request<{ user: unknown; session: { access_token: string } }>(
      '/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      }
    );
  }

  async getCurrentUser() {
    return this.request<{ user: unknown }>('/auth/me');
  }

  // Conversation endpoints
  async createConversation(params: {
    mode: string;
    topic?: string;
    grammarFocus?: string;
    rolePlayPersona?: string;
    vocabularySetId?: string;
    characterId?: string;
  }) {
    return this.request<{ conversation: ConversationResponse; initialMessage: string; greetingAudioUrl?: string | null }>(
      '/conversations',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  }

  async getConversations(limit = 20, offset = 0) {
    return this.request<{ conversations: ConversationResponse[]; total: number }>(
      `/conversations?limit=${limit}&offset=${offset}`
    );
  }

  async getConversation(id: string) {
    return this.request<{ conversation: ConversationResponse; messages: MessageResponse[] }>(
      `/conversations/${id}`
    );
  }

  async sendMessage(conversationId: string, content: string, characterId?: string) {
    return this.request<{ 
      message: MessageResponse; 
      corrections?: MessageResponse['corrections'];
      emotion?: EmotionData;
    }>(
      `/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content, characterId }),
      }
    );
  }

  async endConversation(conversationId: string) {
    return this.request<{ conversation: ConversationResponse }>(
      `/conversations/${conversationId}/end`,
      {
        method: 'POST',
      }
    );
  }

  // Voice endpoints
  async synthesizeSpeech(text: string, characterId?: string, emotion?: EmotionData) {
    const token = await this.getAuthToken();

    if (emotion) {
      console.log(`🔊 Synthesizing speech with character: ${characterId || 'default'}, emotion: ${emotion.type} (${(emotion.intensity * 100).toFixed(0)}%)`);
    } else {
      console.log(`🔊 Synthesizing speech with character: ${characterId || 'default'} (neutral)`);
    }

    const response = await fetch(`${this.baseUrl}/voice/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({ text, characterId, emotion }),
    });

    if (!response.ok) {
      // Try to get error details from response
      let errorMessage = 'Speech synthesis failed';
      let isQuotaError = false;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          
          console.error('❌ TTS API Error Response:', {
            status: response.status,
            error: errorData.error,
            details: errorData.details,
            isQuotaError: errorData.isQuotaError,
            statusCode: errorData.statusCode,
          });
          
          if (errorData.details) {
            errorMessage = errorData.details;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
          
          // Check for quota exceeded - use backend's isQuotaError flag if available
          // Only show quota error if backend explicitly says it's a quota issue
          if (errorData.isQuotaError === true) {
            isQuotaError = true;
            errorMessage = 'Voice quota exceeded. Please check your ElevenLabs account or try again later.';
          } else if (response.status === 402) {
            // 402 = Payment Required, typically means quota exceeded
            isQuotaError = true;
            errorMessage = 'Voice quota exceeded. Please check your ElevenLabs account or try again later.';
          } else if (response.status === 429) {
            // 429 = Too Many Requests (rate limit, not quota)
            errorMessage = 'Too many requests. Please wait a moment and try again.';
          } else {
            // Not a quota error - show the actual error
            console.warn('⚠️ TTS error is NOT quota-related:', errorMessage);
          }
        } else {
          // Non-JSON error response
          const errorText = await response.text();
          console.error('❌ TTS API Error (non-JSON):', {
            status: response.status,
            contentType,
            errorText: errorText.substring(0, 200),
          });
          errorMessage = `Speech synthesis failed (HTTP ${response.status})`;
        }
      } catch (e) {
        // Response is not JSON or parsing failed, use default message
        console.warn('Could not parse error response:', e);
      }
      
      const error = new Error(errorMessage);
      (error as any).statusCode = response.status;
      (error as any).isQuotaError = isQuotaError;
      throw error;
    }

    return response.arrayBuffer();
  }

  // Get available tutor characters
  async getTutorCharacters() {
    return this.request<{ 
      characters: Array<{
        id: string;
        name: string;
        accent: string;
        country: string;
        flag: string;
        description: string;
        personality: string;
      }>;
      defaultCharacterId: string;
    }>('/voice/voices');
  }

  async transcribeAudio(
    audioUri: string, 
    conversationId?: string
  ): Promise<ApiResponse<{ transcript: string; confidence: number }>> {
    try {
      const token = await this.getAuthToken();

      console.log('📤 Transcribing audio from:', audioUri);

      // Read the audio file
      const response = await fetch(audioUri);
      const blob = await response.blob();
      
      console.log('📦 Audio blob size:', blob.size, 'type:', blob.type);

      // Determine file extension from URI or blob type
      let filename = 'audio.m4a'; // Default for iOS
      let mimeType = 'audio/m4a';
      
      if (audioUri.includes('.wav')) {
        filename = 'audio.wav';
        mimeType = 'audio/wav';
      } else if (audioUri.includes('.webm')) {
        filename = 'audio.webm';
        mimeType = 'audio/webm';
      } else if (audioUri.includes('.mp3')) {
        filename = 'audio.mp3';
        mimeType = 'audio/mpeg';
      } else if (audioUri.includes('.caf')) {
        filename = 'audio.caf';
        mimeType = 'audio/x-caf';
      }
      
      // Use blob type if available
      if (blob.type && blob.type !== 'application/octet-stream') {
        mimeType = blob.type;
      }

      const formData = new FormData();
      // React Native FormData requires this specific format
      formData.append('audio', {
        uri: audioUri,
        type: mimeType,
        name: filename,
      } as unknown as Blob);
      
      // Include conversationId for storage organization
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }

      console.log('📤 Sending to backend:', `${this.baseUrl}/voice/transcribe`);

      const apiResponse = await fetch(`${this.baseUrl}/voice/transcribe`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          // Don't set Content-Type - let fetch set it with boundary
        },
        body: formData,
      });

      console.log('📥 Response status:', apiResponse.status);

      const data = await apiResponse.json();
      console.log('📥 Response data:', data);

      if (!apiResponse.ok) {
        return { error: data.error || 'Transcription failed' };
      }

      return { data };
    } catch (error) {
      console.error('❌ Transcription error:', error);
      return { error: 'Transcription failed' };
    }
  }

  // Progress endpoints
  async getProgress() {
    return this.request<{ progress: unknown }>('/progress');
  }

  async updateStreak() {
    return this.request<{ progress: unknown }>('/progress/streak', {
      method: 'POST',
    });
  }

  async getStats() {
    return this.request<{ stats: unknown }>('/progress/stats');
  }

  async getAchievements() {
    return this.request<{ achievements: unknown[] }>('/progress/achievements');
  }

  // User endpoints
  async updateProfile(updates: Record<string, unknown>) {
    return this.request<{ profile: unknown }>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getVocabularySets() {
    return this.request<{ vocabularySets: unknown[] }>('/users/vocabulary-sets');
  }

  async createVocabularySet(data: {
    name: string;
    description?: string;
    words: Array<{ spanish: string; english: string; example_sentence?: string }>;
    category?: string;
  }) {
    return this.request<{ vocabularySet: unknown }>('/users/vocabulary-sets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // CURRICULUM ENDPOINTS
  // ============================================

  async getAllGrammarTopics() {
    return this.request<{ grammarTopics: GrammarTopic[] }>('/curriculum/grammar/all');
  }

  async getCurriculum(level: 'B1' | 'B2') {
    return this.request<{ curriculum: CurriculumWeek[] }>(`/curriculum/${level}`);
  }

  async getCurriculumWeek(level: 'B1' | 'B2', weekNumber: number) {
    return this.request<{ week: CurriculumWeek; lessons: DailyLesson[] }>(
      `/curriculum/${level}/week/${weekNumber}`
    );
  }

  async getUserCurriculumProgress() {
    return this.request<{ progress: UserCurriculumProgress }>('/curriculum/user/progress');
  }

  async updateUserCurriculumProgress(data: Partial<UserCurriculumProgress>) {
    return this.request<{ progress: UserCurriculumProgress }>('/curriculum/user/progress', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async advanceCurriculum() {
    return this.request<{ progress: UserCurriculumProgress; message: string }>(
      '/curriculum/user/advance',
      { method: 'POST' }
    );
  }

  async getTodayLesson() {
    return this.request<{
      needsPlacement: boolean;
      progress: UserCurriculumProgress | null;
      curriculum?: CurriculumWeek;
      lesson?: DailyLesson;
    }>('/curriculum/user/today');
  }

  // ============================================
  // WORKOUT ENDPOINTS
  // ============================================

  async startWorkout(data: {
    session_type: 'daily_workout' | 'weekly_challenge' | 'quick_mission' | 'placement_test';
    curriculum_week?: number;
    curriculum_day?: number;
    grammar_focus?: string;
  }) {
    return this.request<{ session: WorkoutSession }>('/workouts/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeWorkout(sessionId: string, data: {
    duration_seconds: number;
    mcq_correct: number;
    mcq_total: number;
    speaking_exchanges: number;
    grammar_accuracy?: number;
    subjunctive_uses?: number;
  }) {
    return this.request<{ session: WorkoutSession; xp_earned: number; message: string }>(
      `/workouts/${sessionId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async getWorkoutHistory(limit = 20, offset = 0, sessionType?: string) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (sessionType) params.append('session_type', sessionType);
    return this.request<{ sessions: WorkoutSession[]; total: number }>(
      `/workouts/history?${params}`
    );
  }

  async getWorkoutStats() {
    return this.request<{ stats: WorkoutStats }>('/workouts/stats');
  }

  async getQuickMissionTopics() {
    return this.request<{ topics: QuickMissionTopic[] }>('/workouts/quick-missions/topics');
  }

  // ============================================
  // WRITING ENDPOINTS
  // ============================================

  async getWritingExercises(level: 'B1' | 'B2', week: number) {
    return this.request<{
      curriculum: { level: string; week: number; grammar_focus: string; title_en: string; title_es: string };
      exercises: WritingExercise[];
    }>(`/writing/exercises/${level}/${week}`);
  }

  async submitWriting(data: {
    exercise_type: 'sentence_transform' | 'gap_fill' | 'free_response';
    curriculum_week?: number;
    prompt: string;
    correct_answer?: string;
    user_response: string;
    grammar_target?: string;
  }) {
    return this.request<{
      submission: WritingSubmission;
      feedback: Record<string, unknown>;
      is_correct: boolean;
      xp_earned: number;
    }>('/writing/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWritingHistory(limit = 20, offset = 0, exerciseType?: string) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (exerciseType) params.append('exercise_type', exerciseType);
    return this.request<{ submissions: WritingSubmission[] }>(`/writing/history?${params}`);
  }

  async getWritingStats() {
    return this.request<{ stats: WritingStats }>('/writing/stats');
  }

  // ============================================
  // PLACEMENT TEST ENDPOINTS
  // ============================================

  async getPlacementQuestions() {
    return this.request<{
      questions: PlacementQuestion[];
      speaking_prompt: { prompt_es: string; prompt_en: string };
      total_questions: number;
    }>('/placement/questions');
  }

  async submitPlacementMCQ(answers: Array<{ question_id: number; selected: string }>) {
    return this.request<{
      test_id: string;
      mcq_score: number;
      correct: number;
      total: number;
      b1_score: number;
      b2_score: number;
      results: Array<{
        question_id: number;
        user_answer: string;
        correct_answer: string;
        is_correct: boolean;
        explanation: string;
      }>;
      next_step: string;
    }>('/placement/submit-mcq', {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  }

  async submitPlacementSpeaking(testId: string, transcription: string) {
    return this.request<{
      test: Record<string, unknown>;
      mcq_score: number;
      speaking_score: number;
      combined_score: number;
      assigned_level: 'B1' | 'B2';
      speaking_feedback: Record<string, unknown>;
      message: string;
      next_steps: {
        level: string;
        start_week: number;
        curriculum_focus: string;
      };
    }>('/placement/submit-speaking', {
      method: 'POST',
      body: JSON.stringify({ test_id: testId, transcription }),
    });
  }

  async skipPlacement(level: 'B1' | 'B2') {
    return this.request<{ progress: UserCurriculumProgress; message: string }>(
      '/placement/skip',
      {
        method: 'POST',
        body: JSON.stringify({ level }),
      }
    );
  }

  async getPlacementStatus() {
    return this.request<{
      placement_completed: boolean;
      level: 'B1' | 'B2' | null;
      placement_score: number | null;
    }>('/placement/status');
  }

  // ============================================
  // STORY SYSTEM METHODS
  // ============================================

  async getStoryArcs() {
    return this.request<{ arcs: StoryArc[] }>('/stories/arcs');
  }

  async getStoryArc(arcId: string) {
    return this.request<{ arc: StoryArc; episodes: Episode[] }>(`/stories/arcs/${arcId}`);
  }

  async getEpisode(episodeId: string) {
    return this.request<{ episode: Episode & { story_arcs: StoryArc } }>(`/stories/episodes/${episodeId}`);
  }

  async getCurrentStory() {
    return this.request<{
      hasStarted: boolean;
      arc: StoryArc | null;
      progress: UserStoryProgress | null;
      currentEpisode: Episode | null;
    }>('/stories/current');
  }

  async analyzeGrammarResponse(params: {
    userResponse: string;
    grammarFocus?: string;
    expectedPatterns?: string[];
    grammarHint?: string;
    contextDialogue?: string;
  }) {
    return this.request<{
      analysis: {
        usedCorrectExpression: boolean;
        usedCorrectConjugation: boolean;
        overallCorrect: boolean;
        expressionUsed: string | null;
        feedbackMessage: string;
        detailedFeedback: string | null;
        correctedVersion: string | null;
        correctionExplanation: string | null;
      };
    }>('/stories/analyze-response', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getStoryProgress() {
    return this.request<{
      arcs: (StoryArc & { progress: UserStoryProgress | null; isUnlocked: boolean })[];
    }>('/stories/progress');
  }

  async startStoryArc(storyArcId: string) {
    return this.request<{
      progress: UserStoryProgress;
      firstEpisode: Episode;
      message: string;
    }>('/stories/progress/start', {
      method: 'POST',
      body: JSON.stringify({ storyArcId }),
    });
  }

  async recordEpisodeAttempt(data: {
    episodeId: string;
    grammarScore?: number;
    speakingCount?: number;
    writingCount?: number;
    starsEarned?: number;
    pathTaken?: any[];
    durationSeconds?: number;
  }) {
    return this.request<{
      attempt: any;
      xpEarned: number;
      message: string;
      nextEpisode: number;
    }>('/stories/attempt', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // EPISODE VIDEO VIEWS
  // ============================================

  /**
   * Track that a user has started watching an episode video.
   * Call this when video playback begins.
   */
  async trackEpisodeView(episodeId: string) {
    return this.request<{
      viewed: boolean;
      firstView: boolean;
      viewCount: number;
    }>(`/stories/episodes/${episodeId}/view`, {
      method: 'POST',
    });
  }

  /**
   * Get all episode view statuses for the current user.
   * Used to determine which episodes are unlocked for rewatching.
   */
  async getEpisodeViews() {
    return this.request<{
      views: Array<{
        episodeId: string;
        episodeNumber: number;
        firstViewedAt: string;
        viewCount: number;
        lastViewedAt: string;
      }>;
    }>('/stories/episodes/views');
  }

  // ============================================
  // JOURNAL METHODS
  // ============================================

  async getJournalEntries(limit = 20, offset = 0) {
    return this.request<{
      entries: JournalEntry[];
      total: number;
      hasMore: boolean;
    }>(`/journal/entries?limit=${limit}&offset=${offset}`);
  }

  async getJournalEntry(entryId: string) {
    return this.request<{ entry: JournalEntry }>(`/journal/entries/${entryId}`);
  }

  async createJournalEntry(data: {
    episodeId?: string;
    promptEs: string;
    promptEn?: string;
    entryText: string;
  }) {
    return this.request<{
      entry: JournalEntry;
      xpEarned: number;
      message: string;
    }>('/journal/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getJournalFeedback(data: {
    entryId?: string;
    entryText: string;
    grammarFocus?: string;
    grammarTriggers?: string[];
  }) {
    return this.request<{ feedback: any }>('/journal/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getJournalPrompt(episodeId: string) {
    return this.request<{
      promptEs: string;
      promptEn: string;
      grammarFocus: string;
      grammarTriggers: string[];
    }>(`/journal/prompts/${episodeId}`);
  }

  async getJournalStats() {
    return this.request<JournalStats>('/journal/stats');
  }

  // ============================================
  // EPISODE ARTICLES METHODS
  // ============================================

  async getUnlockedEpisodeArticles() {
    return this.request<{
      articles: EpisodeArticle[];
    }>('/episode-articles/unlocked');
  }

  // DEV MODE: Get all articles regardless of episode completion
  async getAllEpisodeArticles() {
    return this.request<{
      articles: EpisodeArticle[];
    }>('/episode-articles/all');
  }

  async getEpisodeArticle(episodeId: string) {
    return this.request<{
      article: EpisodeArticle;
      images?: Array<{
        id: string;
        image_type: 'header' | 'inline';
        position: number;
        image_url: string;
        alt_text?: string;
      }>;
    }>(`/episode-articles/${episodeId}`);
  }

  async getEpisodeRoadmap(episodeId: string) {
    return this.request<{
      episodeCompleted: boolean;
      articleRead: boolean;
      writingSubmitted: boolean;
      conversationCompleted: boolean;
      nextEpisodeUnlocked: boolean;
      nextEpisodeId?: string;
    }>(`/episode-articles/roadmap/${episodeId}`);
  }

  async trackEpisodeArticleRead(articleId: string, readSeconds: number, completionPercent: number) {
    return this.request<{
      success: boolean;
      completed: boolean;
    }>(`/episode-articles/${articleId}/read`, {
      method: 'POST',
      body: JSON.stringify({
        read_seconds: readSeconds,
        completion_percent: completionPercent,
      }),
    });
  }

  async submitEpisodeArticleExercise(
    articleId: string,
    submissionText: string,
    submissionType: 'text' | 'voice',
    audioUrl?: string
  ) {
    return this.request<{
      success: boolean;
      submission: EpisodeArticleSubmission;
    }>(`/episode-articles/${articleId}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        submission_text: submissionText,
        submission_type: submissionType,
        audio_url: audioUrl,
      }),
    });
  }

  async getEpisodeArticleFeedback(submissionId: string) {
    return this.request<{
      submission: EpisodeArticleSubmission;
      feedback: any;
    }>(`/episode-articles/submission/${submissionId}/feedback`);
  }

  async checkEpisodeArticleCompletion(episodeId: string) {
    return this.request<{
      hasRead: boolean;
      hasSubmitted: boolean;
      isComplete: boolean;
      articleId: string;
    }>(`/episode-articles/${episodeId}/completion-status`);
  }

  async checkEpisodeArticleSubmission(episodeId: string) {
    return this.request<{
      hasSubmitted: boolean;
      submission: EpisodeArticleSubmission | null;
    }>(`/episode-articles/${episodeId}/submission`);
  }

  // ============================================
  // EPISODE CONVERSATION METHODS
  // ============================================

  async getEpisodeConversation(episodeId: string) {
    return this.request<{
      conversation: EpisodeConversation | null;
      messages: EpisodeConversationMessage[];
      isComplete: boolean;
      userReplyCount: number;
      maxReplies: number;
    }>(`/episode-conversation/${episodeId}`);
  }

  async startEpisodeConversation(episodeId: string) {
    return this.request<{
      conversationId: string;
      message: EpisodeConversationMessage;
      userReplyCount: number;
      maxReplies: number;
      resumed?: boolean;
      messages?: EpisodeConversationMessage[];
    }>(`/episode-conversation/${episodeId}/start`, {
      method: 'POST',
    });
  }

  async sendEpisodeConversationMessage(conversationId: string, audioBlob: Blob) {
    const formData = new FormData();
    formData.append('audio', {
      uri: (audioBlob as any).uri || '',
      type: (audioBlob as any).mimeType || 'audio/webm',
      name: 'recording.webm',
    } as any);

    const token = await this.getAuthToken();
    const response = await fetch(`${this.baseUrl}/episode-conversation/${conversationId}/message`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      return { error: data.error || 'Failed to send message' };
    }

    return {
      data: data as {
        userMessage: EpisodeConversationMessage;
        florenciaMessage?: EpisodeConversationMessage;
        conversationComplete: boolean;
        summary?: ConversationSummary;
        userReplyCount: number;
        maxReplies: number;
      },
    };
  }

  async sendEpisodeConversationTextMessage(conversationId: string, message: string) {
    return this.request<{
      userMessage: EpisodeConversationMessage;
      florenciaMessage?: EpisodeConversationMessage;
      conversationComplete: boolean;
      summary?: ConversationSummary;
      userReplyCount: number;
      maxReplies: number;
    }>(`/episode-conversation/${conversationId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async completeEpisodeConversation(conversationId: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/episode-conversation/${conversationId}/complete`, {
      method: 'POST',
    });
  }

  async checkEpisodeConversationAccess(episodeId: string) {
    return this.request<{
      hasAccess: boolean;
      writingCompleted: boolean;
    }>(`/episode-conversation/${episodeId}/access`);
  }

  // ============================================
  // AUDIO CACHE METHODS
  // ============================================

  async getPreGeneratedAudio(contentKey: string) {
    return this.request<{
      audioUrl: string;
      textContent: string;
      emotion?: string;
      durationMs?: number;
    }>(`/audio/${contentKey}`);
  }

  async getEpisodeAudio(episodeId: string) {
    return this.request<{
      episodeId: string;
      audioCount: number;
      audio: Record<string, {
        audioUrl: string;
        textContent: string;
        emotion?: string;
        durationMs?: number;
      }>;
    }>(`/audio/episode/${episodeId}`);
  }

  async batchGetAudio(contentKeys: string[]) {
    return this.request<{
      found: number;
      requested: number;
      audio: Record<string, {
        audioUrl: string;
        textContent: string;
        emotion?: string;
        durationMs?: number;
      }>;
    }>('/audio/batch', {
      method: 'POST',
      body: JSON.stringify({ contentKeys }),
    });
  }

  // ============================================
  // ARTICLES METHODS (Legacy - kept for compatibility)
  // ============================================

  async getGrammarTags() {
    return this.request<{ tags: Array<{ grammar_focus: string; title_en: string }> }>('/articles/grammar-tags');
  }

  // ============================================
  // SUBSCRIPTION / REDEMPTION
  // ============================================

  async getSubscriptionStatus() {
    return this.request<SubscriptionStatus>('/subscription/status');
  }

  async verifySubscription() {
    return this.request<SubscriptionStatus>('/subscription/verify');
  }

  async redeemCode(code: string) {
    return this.request<RedeemCodeResponse>('/redemption/redeem', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }
}

// ============================================
// TYPE DEFINITIONS
// ============================================

// Legacy Article interface - kept for backward compatibility
// Episode articles use EpisodeArticle interface instead
export interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  content_html: string | null;
  author: string;
  published_at: string;
  grammar_tags: string[];
  word_count: number;
  estimated_read_minutes: number;
  is_favorite: boolean;
}

export interface CurriculumWeek {
  id: string;
  level: 'B1' | 'B2';
  week_number: number;
  grammar_focus: string;
  title_es: string;
  title_en: string;
  description: string;
  triggers: string[];
  example_sentences: Array<{ spanish: string; english: string }>;
}

// Alias for grammar topic selection UI
export type GrammarTopic = CurriculumWeek;

export interface DailyLesson {
  id: string;
  curriculum_id: string;
  day_number: number;
  lesson_type: 'workout' | 'review' | 'challenge';
  title: string;
  intro_text: string;
  mcq_questions: MCQQuestion[];
  speaking_prompts: SpeakingPrompt[];
  writing_exercises: Array<{
    type: string;
    prompt: string;
    answer?: string;
    grammar_target?: string;
  }>;
}

export interface MCQQuestion {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

export interface SpeakingPrompt {
  prompt: string;
  expected_grammar: string;
  hint: string;
}

export interface UserCurriculumProgress {
  id?: string;
  user_id?: string;
  level: 'B1' | 'B2' | null;
  current_week: number;
  current_day: number;
  week_started_at?: string;
  placement_completed: boolean;
  placement_score?: number;
  total_xp: number;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  session_type: 'daily_workout' | 'weekly_challenge' | 'quick_mission' | 'placement_test';
  curriculum_week?: number;
  curriculum_day?: number;
  grammar_focus?: string;
  duration_seconds: number;
  mcq_correct: number;
  mcq_total: number;
  speaking_exchanges: number;
  grammar_accuracy?: number;
  subjunctive_uses: number;
  xp_earned: number;
  completed_at: string;
}

export interface WorkoutStats {
  total_workouts: number;
  total_duration_minutes: number;
  total_xp: number;
  average_accuracy: number;
  daily_workouts: number;
  weekly_challenges: number;
  quick_missions: number;
  this_week_workouts: number;
}

export interface QuickMissionTopic {
  id: string;
  topic_key: string;
  title_es: string;
  title_en: string;
  description: string;
  icon: string;
  color: string;
  grammar_targets: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface WritingExercise {
  day: number;
  type: 'sentence_transform' | 'gap_fill' | 'free_response';
  prompt: string;
  answer?: string;
  grammar_target?: string;
}

export interface WritingSubmission {
  id: string;
  user_id: string;
  exercise_type: string;
  curriculum_week?: number;
  prompt: string;
  correct_answer?: string;
  user_response: string;
  is_correct: boolean;
  ai_feedback: Record<string, unknown>;
  grammar_score: number;
  xp_earned: number;
  completed_at: string;
}

export interface WritingStats {
  total_exercises: number;
  gap_fill_completed: number;
  sentence_transform_completed: number;
  free_response_completed: number;
  correct_answers: number;
  average_score: number;
  total_xp_from_writing: number;
}

export interface PlacementQuestion {
  id: number;
  text: string;
  options: string[];
}

// Story System Interfaces
export interface StoryArc {
  id: string;
  character_id: string;
  arc_number: number;
  title_es: string;
  title_en: string;
  description: string;
  location: string;
  total_episodes: number;
  cefr_level: string;
  cover_image_url?: string;
}

export interface Episode {
  id: string;
  story_arc_id: string;
  episode_number: number;
  title_es: string;
  title_en: string;
  scenario: string;
  grammar_focus: string;
  grammar_triggers: string[];
  scenes: any[];
  video_url?: string;
  journal_prompt_es?: string;
  journal_prompt_en?: string;
  estimated_duration: number;
  intro_audio_url?: string;
}

export interface UserStoryProgress {
  id: string;
  user_id: string;
  story_arc_id: string;
  current_episode: number;
  episodes_completed: number;
  total_stars: number;
  total_xp: number;
  unlocked_at: string;
  last_played_at?: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  episode_id?: string;
  prompt_es: string;
  prompt_en?: string;
  entry_text: string;
  ai_feedback?: any;
  grammar_highlights: string[];
  word_count: number;
  xp_earned: number;
  created_at: string;
}

export interface JournalStats {
  totalEntries: number;
  totalWords: number;
  totalXP: number;
  averageWords: number;
  currentStreak: number;
  longestStreak: number;
}

// Episode Articles Interfaces
export interface EpisodeArticle {
  id: string;
  episode_id: string;
  title: string;
  subtitle: string;
  content_html: string;
  content_markdown: string;
  content_html_es?: string;
  content_markdown_es?: string;
  author: string;
  writing_exercise_prompt: string;
  grammar_focus: string;
  word_count: number;
  estimated_read_minutes: number;
  created_at: string;
  episodes?: Episode;
}

export interface EpisodeArticleSubmission {
  id: string;
  user_id: string;
  episode_article_id: string;
  episode_id: string;
  submission_text: string;
  submission_type: 'text' | 'voice';
  audio_url?: string;
  ai_feedback: any;
  grammar_score: number;
  word_count: number;
  completed_at: string;
}

// Episode Conversation Interfaces
export interface HighlightedVerb {
  verb: string;
  startIndex: number;
  endIndex: number;
  infinitive: string;
  indicativeForm: string;
  trigger: string;
  explanation: string;
}

export interface EpisodeConversationMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  highlightedVerbs?: HighlightedVerb[];
  audioUrl?: string;
  created_at?: string;
}

export interface EpisodeConversation {
  id: string;
  user_id: string;
  episode_id: string;
  writing_submission_id: string;
  message_count: number;
  user_reply_count: number;
  completed_at?: string;
  created_at: string;
}

export interface ConversationSummary {
  summary: string;
  grammarExamplesUsed: number;
  userExchanges: number;
}

// Export singleton instance
export const api = new ApiClient();

