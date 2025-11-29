// Extended Express types
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Conversation types
export type ConversationMode = 'open' | 'topic' | 'vocabulary' | 'grammar' | 'roleplay';

export type SpanishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type CorrectionDepth = 'light' | 'standard' | 'deep';

export type AccentPreference = 'spain' | 'mexico' | 'argentina' | 'colombia';

export interface Correction {
  type: 'grammar' | 'vocabulary' | 'pronunciation' | 'conjugation';
  original: string;
  corrected: string;
  explanation: string;
  grammar_rule: string | null;
}

export interface VocabularyWord {
  spanish: string;
  english: string;
  example_sentence: string | null;
}

// WebSocket message types
export interface WSMessage {
  type: string;
  payload: Record<string, unknown>;
}

export interface AudioChunk {
  audio: string; // Base64 encoded
  timestamp: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Progress types
export interface UserStats {
  totalConversations: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  vocabularyCount: number;
  grammarRulesMastered: number;
  averageGrammarMastery: number;
  achievementsEarned: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

