-- Run this in Supabase SQL Editor to create a helper function
-- This function bypasses PostgREST's schema cache

-- First, reload the schema
NOTIFY pgrst, 'reload schema';

-- Create a function to get episodes
CREATE OR REPLACE FUNCTION get_episodes_for_audio(ep_num integer DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    episode_number integer,
    title_es text,
    scenes jsonb,
    character_id text
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        e.id,
        e.episode_number,
        e.title_es,
        e.scenes,
        sa.character_id
    FROM public.episodes e
    JOIN public.story_arcs sa ON e.story_arc_id = sa.id
    WHERE (ep_num IS NULL OR e.episode_number = ep_num)
    ORDER BY e.episode_number;
$$;

-- Reload schema again after creating function
NOTIFY pgrst, 'reload schema';

-- Test the function
SELECT * FROM get_episodes_for_audio(1);

