import { API_URL } from '../config/constants';
import * as SecureStore from 'expo-secure-store';

// Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

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
  created_at: string;
}

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('auth_token');
    } catch {
      return null;
    }
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
    return this.request<{ conversation: ConversationResponse; initialMessage: string }>(
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
    return this.request<{ message: MessageResponse; corrections?: MessageResponse['corrections'] }>(
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
  async synthesizeSpeech(text: string, characterId?: string) {
    const token = await this.getAuthToken();

    console.log(`🔊 Synthesizing speech with character: ${characterId || 'default'}`);

    const response = await fetch(`${this.baseUrl}/voice/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({ text, characterId }),
    });

    if (!response.ok) {
      throw new Error('Speech synthesis failed');
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
}

// Export singleton instance
export const api = new ApiClient();

