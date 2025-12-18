-- Grammar Gym Schema
-- Creates table for pre-generated episode grammar questions

-- Create episode_grammar_questions table
CREATE TABLE IF NOT EXISTS public.episode_grammar_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correct TEXT NOT NULL,
    explanation TEXT NOT NULL,
    grammar_trigger TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_episode_grammar_questions_episode ON public.episode_grammar_questions(episode_id);

-- Enable RLS
ALTER TABLE public.episode_grammar_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view grammar questions" ON public.episode_grammar_questions;

-- Create policy - anyone can view grammar questions (public read)
CREATE POLICY "Anyone can view grammar questions" ON public.episode_grammar_questions FOR SELECT USING (true);

-- Verification
SELECT 'Grammar Gym schema added successfully!' as status;

