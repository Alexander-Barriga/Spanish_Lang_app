-- Fix User Signup - Create Automatic Profile Trigger
-- Run this in Supabase SQL Editor
-- This creates profiles automatically when users sign up, bypassing RLS timing issues

-- =============================================
-- 1. Create function to handle new user signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.users (id, email, display_name, spanish_level, goals, preferred_topics, correction_depth, voice_speed, accent_preference)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NULL),
    'A1',
    '{}'::TEXT[],
    '{}'::TEXT[],
    'standard',
    1.0,
    'argentina'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create progress record
  INSERT INTO public.progress (user_id, grammar_mastery, vocabulary_learned, total_conversations, total_minutes, current_streak, longest_streak, achievements)
  VALUES (
    NEW.id,
    '{}'::jsonb,
    '{}'::TEXT[],
    0,
    0,
    0,
    0,
    '{}'::TEXT[]
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. Create trigger on auth.users
-- =============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 3. Grant necessary permissions
-- =============================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- =============================================
-- 4. Fix RLS Policies (ensure they exist)
-- =============================================

-- Users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.users FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

-- Progress table
DROP POLICY IF EXISTS "Users can view their own progress" ON public.progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.progress;

ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress" 
  ON public.progress FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" 
  ON public.progress FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
  ON public.progress FOR UPDATE 
  USING (auth.uid() = user_id);

-- =============================================
-- 5. Verify setup
-- =============================================
SELECT 'Trigger created' AS status, tgname AS trigger_name 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

SELECT 'Policies created' AS status, COUNT(*) AS policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'progress');

