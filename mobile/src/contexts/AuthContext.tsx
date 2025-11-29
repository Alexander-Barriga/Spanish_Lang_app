import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_TUTOR_ID } from '../config/constants';

// Types
interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  spanish_level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  goals: string[];
  preferred_topics: string[];
  correction_depth: 'light' | 'standard' | 'deep';
  voice_speed: number;
  accent_preference: 'spain' | 'mexico' | 'argentina' | 'colombia';
  tutor_character?: string; // The selected tutor character ID
}

interface UserProgress {
  current_streak: number;
  longest_streak: number;
  total_conversations: number;
  total_minutes: number;
  vocabulary_learned: string[];
  grammar_mastery: Record<string, number>;
  achievements: string[];
}

interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
  progress: UserProgress | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Tutor character selection (stored locally)
  selectedTutorId: string;
  setSelectedTutorId: (tutorId: string) => Promise<void>;
}

// Secure storage adapter for Supabase
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      console.error('Error storing item:', key);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      console.error('Error removing item:', key);
    }
  },
};

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage key for tutor character
const TUTOR_CHARACTER_KEY = 'selected_tutor_character';

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTutorId, setSelectedTutorIdState] = useState<string>(DEFAULT_TUTOR_ID);

  // Fetch user profile and progress
  const fetchUserData = async (supabaseUser: SupabaseUser): Promise<AuthUser> => {
    const [profileResult, progressResult] = await Promise.all([
      supabase.from('users').select('*').eq('id', supabaseUser.id).single(),
      supabase.from('progress').select('*').eq('user_id', supabaseUser.id).single(),
    ]);

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      profile: profileResult.data as UserProfile | null,
      progress: progressResult.data as UserProgress | null,
    };
  };

  // Load selected tutor character from storage
  const loadSelectedTutor = async () => {
    try {
      const storedTutor = await SecureStore.getItemAsync(TUTOR_CHARACTER_KEY);
      if (storedTutor) {
        setSelectedTutorIdState(storedTutor);
        console.log('✅ Loaded tutor character:', storedTutor);
      }
    } catch (error) {
      console.error('Error loading tutor character:', error);
    }
  };

  // Save selected tutor character
  const setSelectedTutorId = async (tutorId: string) => {
    try {
      await SecureStore.setItemAsync(TUTOR_CHARACTER_KEY, tutorId);
      setSelectedTutorIdState(tutorId);
      console.log('✅ Saved tutor character:', tutorId);
    } catch (error) {
      console.error('Error saving tutor character:', error);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Load tutor character preference
        await loadSelectedTutor();

        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Store the token for API calls
          await SecureStore.setItemAsync('auth_token', session.access_token);
          console.log('✅ Session restored for user:', session.user.id);
          
          const userData = await fetchUserData(session.user);
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Store the token for API calls
          await SecureStore.setItemAsync('auth_token', session.access_token);
          const userData = await fetchUserData(session.user);
          setUser(userData);
        } else if (event === 'SIGNED_OUT') {
          // Clear the stored token
          await SecureStore.deleteItemAsync('auth_token');
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Update stored token on refresh
          await SecureStore.setItemAsync('auth_token', session.access_token);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Sign in
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    if (data.user && data.session) {
      // Store the access token for API calls
      await SecureStore.setItemAsync('auth_token', data.session.access_token);
      console.log('✅ Auth token stored for user:', data.user.id);
      
      const userData = await fetchUserData(data.user);
      setUser(userData);
    }
  };

  // Sign up
  const signUp = async (email: string, password: string, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      console.log('✅ User created in Supabase Auth:', data.user.id);
      
      // Store the access token for API calls (if session exists)
      if (data.session) {
        await SecureStore.setItemAsync('auth_token', data.session.access_token);
        console.log('✅ Auth token stored');
      }

      // Create user profile
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        display_name: displayName || null,
        spanish_level: 'A1',
        goals: [],
        preferred_topics: [],
        correction_depth: 'standard',
        voice_speed: 1.0,
        accent_preference: 'mexico',
      });

      if (profileError) {
        console.error('❌ Profile creation error:', profileError);
      } else {
        console.log('✅ User profile created');
      }

      // Create progress record
      const { error: progressError } = await supabase.from('progress').insert({
        user_id: data.user.id,
        grammar_mastery: {},
        vocabulary_learned: [],
        total_conversations: 0,
        total_minutes: 0,
        current_streak: 0,
        longest_streak: 0,
        achievements: [],
      });

      if (progressError) {
        console.error('❌ Progress creation error:', progressError);
      } else {
        console.log('✅ Progress record created');
      }

      const userData = await fetchUserData(data.user);
      setUser(userData);
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Refresh user data
  const refreshUser = async () => {
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    
    if (supabaseUser) {
      const userData = await fetchUserData(supabaseUser);
      setUser(userData);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        refreshUser,
        selectedTutorId,
        setSelectedTutorId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Export supabase client for direct use
export { supabase };

