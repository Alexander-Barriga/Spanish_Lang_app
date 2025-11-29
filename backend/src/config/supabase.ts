import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client for public operations (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Database types
export interface User {
  id: string;
  email: string;
  display_name: string | null;
  spanish_level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  goals: string[];
  preferred_topics: string[];
  correction_depth: 'light' | 'standard' | 'deep';
  voice_speed: number;
  accent_preference: 'spain' | 'mexico' | 'argentina' | 'colombia';
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  mode: 'open' | 'topic' | 'vocabulary' | 'grammar' | 'roleplay';
  topic: string | null;
  grammar_focus: string | null;
  role_play_persona: string | null;
  vocabulary_set_id: string | null;
  started_at: string;
  ended_at: string | null;
  message_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  audio_url: string | null;
  corrections: Correction[] | null;
  created_at: string;
}

export interface Correction {
  type: 'grammar' | 'vocabulary' | 'pronunciation' | 'conjugation';
  original: string;
  corrected: string;
  explanation: string;
  grammar_rule: string | null;
}

export interface Progress {
  id: string;
  user_id: string;
  grammar_mastery: Record<string, number>;
  vocabulary_learned: string[];
  total_conversations: number;
  total_minutes: number;
  current_streak: number;
  longest_streak: number;
  last_session_at: string;
  achievements: string[];
}

export interface VocabularySet {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  words: VocabularyWord[];
  is_default: boolean;
  category: string;
  created_at: string;
}

export interface VocabularyWord {
  spanish: string;
  english: string;
  example_sentence: string | null;
}

