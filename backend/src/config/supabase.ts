import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from backend directory (handles different working directories)
const envPath = path.resolve(__dirname, '../../.env');

// Manually check if .env exists and load it
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env file:', result.error);
  } else if (result.parsed) {
    // dotenv v17 may not auto-inject, so manually set if needed
    Object.keys(result.parsed).forEach(key => {
      if (!process.env[key]) {
        process.env[key] = result.parsed![key];
      }
    });
  }
} else {
  console.error('Warning: .env file not found at', envPath);
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Debug: log what we got (masked)
if (!supabaseUrl) {
  console.error('SUPABASE_URL is not set!');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPA')));
}

// Client for public operations (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Database types
export type SubscriptionTier = 'free' | 'monthly' | 'annual' | 'comp';
export type EntitlementSource = 'revenuecat' | 'comp_code' | 'admin';

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
  is_admin: boolean;
  is_premium: boolean;
  subscription_tier: SubscriptionTier | null;
  subscription_expires_at: string | null;
  entitlement_source: EntitlementSource | null;
  revenuecat_app_user_id: string | null;
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

