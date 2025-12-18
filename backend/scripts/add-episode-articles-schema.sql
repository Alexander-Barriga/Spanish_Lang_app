-- ============================================
-- ADD EPISODE ARTICLES TABLES
-- This script adds only the new tables needed for episode articles
-- WITHOUT dropping or altering any existing tables
-- Run this in Supabase SQL Editor
-- ============================================

-- Episode Articles - AI-generated educational articles linked to episodes
CREATE TABLE IF NOT EXISTS public.episode_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    content_html TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    author TEXT DEFAULT 'Florencia',
    writing_exercise_prompt TEXT NOT NULL,
    grammar_focus TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    estimated_read_minutes INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(episode_id)
);

-- Episode Article Submissions - User's writing exercise responses
CREATE TABLE IF NOT EXISTS public.episode_article_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    episode_article_id UUID REFERENCES public.episode_articles(id) ON DELETE CASCADE NOT NULL,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    submission_text TEXT NOT NULL,
    submission_type TEXT CHECK (submission_type IN ('text', 'voice')) NOT NULL,
    audio_url TEXT,
    ai_feedback JSONB,
    grammar_score DECIMAL(5,2),
    word_count INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, episode_id)
);

-- Episode Article Reads - Track reading progress
CREATE TABLE IF NOT EXISTS public.episode_article_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    episode_article_id UUID REFERENCES public.episode_articles(id) ON DELETE CASCADE NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    read_seconds INTEGER DEFAULT 0,
    completion_percent INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_episode_articles_episode ON public.episode_articles(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_article_submissions_user ON public.episode_article_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_episode_article_submissions_episode ON public.episode_article_submissions(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_article_reads_user ON public.episode_article_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_episode_article_reads_article ON public.episode_article_reads(episode_article_id);

-- Enable RLS
ALTER TABLE public.episode_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_article_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_article_reads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view episode articles" ON public.episode_articles;
DROP POLICY IF EXISTS "Users can view own submissions" ON public.episode_article_submissions;
DROP POLICY IF EXISTS "Users can create own submissions" ON public.episode_article_submissions;
DROP POLICY IF EXISTS "Users can view own article reads" ON public.episode_article_reads;
DROP POLICY IF EXISTS "Users can create own article reads" ON public.episode_article_reads;
DROP POLICY IF EXISTS "Users can update own article reads" ON public.episode_article_reads;

-- Create policies for episode_articles - public read
CREATE POLICY "Anyone can view episode articles" ON public.episode_articles FOR SELECT USING (true);

-- Create policies for episode_article_submissions
CREATE POLICY "Users can view own submissions" ON public.episode_article_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own submissions" ON public.episode_article_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for episode_article_reads
CREATE POLICY "Users can view own article reads" ON public.episode_article_reads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own article reads" ON public.episode_article_reads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own article reads" ON public.episode_article_reads FOR UPDATE USING (auth.uid() = user_id);

-- Verification
SELECT 'Episode articles schema added successfully!' as status;

