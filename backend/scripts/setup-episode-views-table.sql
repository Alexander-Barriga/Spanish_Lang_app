-- ============================================
-- Setup user_episode_views table
-- Run this script in Supabase SQL Editor to create the table for tracking episode views
-- ============================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_episode_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    view_count INTEGER NOT NULL DEFAULT 1,
    last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, episode_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_episode_views_user ON public.user_episode_views(user_id);
CREATE INDEX IF NOT EXISTS idx_user_episode_views_episode ON public.user_episode_views(episode_id);

-- Enable Row Level Security
ALTER TABLE public.user_episode_views ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own episode views" ON public.user_episode_views;
DROP POLICY IF EXISTS "Users can insert own episode views" ON public.user_episode_views;
DROP POLICY IF EXISTS "Users can update own episode views" ON public.user_episode_views;

-- Create RLS policies
CREATE POLICY "Users can view own episode views"
    ON public.user_episode_views FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own episode views"
    ON public.user_episode_views FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own episode views"
    ON public.user_episode_views FOR UPDATE
    USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_episode_views TO authenticated;

-- Verify the table was created
SELECT 'user_episode_views table created successfully' AS status;
