-- Reset User Progress Script
-- This will reset all progress for a specific user back to Episode 1
-- User ID: 98186726-1300-4ea4-b7d2-4f9ffed98182

-- Set the user ID
DO $$
DECLARE
    target_user_id UUID := '98186726-1300-4ea4-b7d2-4f9ffed98182';
BEGIN
    -- 1. Reset story progress to Episode 1
    UPDATE public.user_story_progress
    SET 
        current_episode = 1,
        episodes_completed = 0,
        total_stars = 0,
        total_xp = 0,
        last_played_at = NULL
    WHERE user_id = target_user_id;

    -- 2. Delete all episode attempts
    DELETE FROM public.episode_attempts
    WHERE user_id = target_user_id;

    -- 3. Delete all writing submissions
    DELETE FROM public.episode_article_submissions
    WHERE user_id = target_user_id;

    -- 4. Delete all article read progress
    DELETE FROM public.episode_article_reads
    WHERE user_id = target_user_id;

    -- 5. Delete workout sessions (grammar gym completions)
    DELETE FROM public.workout_sessions
    WHERE user_id = target_user_id;

    -- 6. Reset general progress (optional - keeps streak data)
    UPDATE public.progress
    SET 
        total_conversations = 0,
        total_minutes = 0,
        grammar_mastery = '{}',
        vocabulary_learned = '{}'
    WHERE user_id = target_user_id;

    -- 7. Reset curriculum progress if exists
    UPDATE public.user_curriculum_progress
    SET 
        total_xp = 0,
        current_week = 1
    WHERE user_id = target_user_id;

    RAISE NOTICE 'Progress reset complete for user %', target_user_id;
END $$;

-- Verify the reset
SELECT 'user_story_progress' as table_name, current_episode, episodes_completed 
FROM public.user_story_progress 
WHERE user_id = '98186726-1300-4ea4-b7d2-4f9ffed98182';

SELECT 'episode_attempts' as table_name, COUNT(*) as count 
FROM public.episode_attempts 
WHERE user_id = '98186726-1300-4ea4-b7d2-4f9ffed98182';

SELECT 'episode_article_submissions' as table_name, COUNT(*) as count 
FROM public.episode_article_submissions 
WHERE user_id = '98186726-1300-4ea4-b7d2-4f9ffed98182';

