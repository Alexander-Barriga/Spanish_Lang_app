-- Create RPC functions to bypass PostgREST schema cache issues
-- These functions provide API access to the new tables

-- 1. Get all story arcs
CREATE OR REPLACE FUNCTION get_story_arcs()
RETURNS TABLE (
    id uuid,
    character_id text,
    arc_number integer,
    title_es text,
    title_en text,
    description text,
    location text,
    total_episodes integer,
    cefr_level text,
    cover_image_url text
) 
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT id, character_id, arc_number, title_es, title_en, description, 
           location, total_episodes, cefr_level, cover_image_url
    FROM public.story_arcs
    ORDER BY character_id, arc_number;
$$;

-- 2. Get episodes for a story arc (already created earlier, but let's ensure it exists)
CREATE OR REPLACE FUNCTION get_episodes_for_audio(ep_num integer DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    episode_number integer,
    title_es text,
    scenes jsonb,
    character_id text
) 
LANGUAGE sql SECURITY DEFINER
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

-- 3. Get episode details by ID
CREATE OR REPLACE FUNCTION get_episode_by_id(episode_uuid uuid)
RETURNS TABLE (
    id uuid,
    story_arc_id uuid,
    episode_number integer,
    title_es text,
    title_en text,
    scenario text,
    grammar_focus text,
    grammar_triggers text[],
    scenes jsonb,
    journal_prompt_es text,
    journal_prompt_en text,
    estimated_duration integer,
    intro_audio_url text,
    character_id text,
    arc_title_es text
) 
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT 
        e.id, e.story_arc_id, e.episode_number, e.title_es, e.title_en,
        e.scenario, e.grammar_focus, e.grammar_triggers, e.scenes,
        e.journal_prompt_es, e.journal_prompt_en, e.estimated_duration,
        e.intro_audio_url, sa.character_id, sa.title_es as arc_title_es
    FROM public.episodes e
    JOIN public.story_arcs sa ON e.story_arc_id = sa.id
    WHERE e.id = episode_uuid;
$$;

-- 4. Get episode by number
CREATE OR REPLACE FUNCTION get_episode_by_number(ep_num integer)
RETURNS TABLE (
    id uuid,
    story_arc_id uuid,
    episode_number integer,
    title_es text,
    title_en text,
    scenario text,
    grammar_focus text,
    grammar_triggers text[],
    scenes jsonb,
    journal_prompt_es text,
    journal_prompt_en text,
    estimated_duration integer,
    intro_audio_url text,
    character_id text,
    arc_title_es text
) 
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT 
        e.id, e.story_arc_id, e.episode_number, e.title_es, e.title_en,
        e.scenario, e.grammar_focus, e.grammar_triggers, e.scenes,
        e.journal_prompt_es, e.journal_prompt_en, e.estimated_duration,
        e.intro_audio_url, sa.character_id, sa.title_es as arc_title_es
    FROM public.episodes e
    JOIN public.story_arcs sa ON e.story_arc_id = sa.id
    WHERE e.episode_number = ep_num
    LIMIT 1;
$$;

-- 5. Get pre-generated audio by content key
CREATE OR REPLACE FUNCTION get_audio_by_key(content_key_param text)
RETURNS TABLE (
    id uuid,
    content_type text,
    content_key text,
    character_id text,
    text_content text,
    audio_url text,
    emotion text
) 
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT id, content_type, content_key, character_id, text_content, audio_url, emotion
    FROM public.pre_generated_audio
    WHERE content_key = content_key_param;
$$;

-- 6. Get user story progress
CREATE OR REPLACE FUNCTION get_user_story_progress(user_uuid uuid)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    story_arc_id uuid,
    current_episode integer,
    episodes_completed integer,
    total_stars integer,
    total_xp integer,
    last_played_at timestamptz,
    arc_title_es text,
    character_id text
) 
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT 
        usp.id, usp.user_id, usp.story_arc_id, usp.current_episode,
        usp.episodes_completed, usp.total_stars, usp.total_xp, usp.last_played_at,
        sa.title_es as arc_title_es, sa.character_id
    FROM public.user_story_progress usp
    JOIN public.story_arcs sa ON usp.story_arc_id = sa.id
    WHERE usp.user_id = user_uuid;
$$;

-- 7. Upsert user story progress
CREATE OR REPLACE FUNCTION upsert_user_story_progress(
    p_user_id uuid,
    p_story_arc_id uuid,
    p_current_episode integer DEFAULT 1,
    p_episodes_completed integer DEFAULT 0,
    p_total_stars integer DEFAULT 0,
    p_total_xp integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    result_id uuid;
BEGIN
    INSERT INTO public.user_story_progress (
        user_id, story_arc_id, current_episode, episodes_completed, 
        total_stars, total_xp, last_played_at
    )
    VALUES (
        p_user_id, p_story_arc_id, p_current_episode, p_episodes_completed,
        p_total_stars, p_total_xp, NOW()
    )
    ON CONFLICT (user_id, story_arc_id) DO UPDATE SET
        current_episode = EXCLUDED.current_episode,
        episodes_completed = EXCLUDED.episodes_completed,
        total_stars = EXCLUDED.total_stars,
        total_xp = EXCLUDED.total_xp,
        last_played_at = NOW()
    RETURNING id INTO result_id;
    
    RETURN result_id;
END;
$$;

-- 8. Insert episode attempt
CREATE OR REPLACE FUNCTION insert_episode_attempt(
    p_user_id uuid,
    p_episode_id uuid,
    p_grammar_score decimal,
    p_speaking_count integer,
    p_writing_count integer,
    p_stars_earned integer,
    p_xp_earned integer,
    p_path_taken jsonb,
    p_duration_seconds integer
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    result_id uuid;
BEGIN
    INSERT INTO public.episode_attempts (
        user_id, episode_id, grammar_score, speaking_count, writing_count,
        stars_earned, xp_earned, path_taken, duration_seconds
    )
    VALUES (
        p_user_id, p_episode_id, p_grammar_score, p_speaking_count, p_writing_count,
        p_stars_earned, p_xp_earned, p_path_taken, p_duration_seconds
    )
    RETURNING id INTO result_id;
    
    RETURN result_id;
END;
$$;

-- 9. Get journal entries for user
CREATE OR REPLACE FUNCTION get_user_journal_entries(user_uuid uuid)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    episode_id uuid,
    prompt_es text,
    prompt_en text,
    entry_text text,
    ai_feedback jsonb,
    grammar_highlights text[],
    word_count integer,
    xp_earned integer,
    created_at timestamptz
) 
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT id, user_id, episode_id, prompt_es, prompt_en, entry_text,
           ai_feedback, grammar_highlights, word_count, xp_earned, created_at
    FROM public.journal_entries
    WHERE user_id = user_uuid
    ORDER BY created_at DESC;
$$;

-- 10. Insert journal entry
CREATE OR REPLACE FUNCTION insert_journal_entry(
    p_user_id uuid,
    p_episode_id uuid,
    p_prompt_es text,
    p_prompt_en text,
    p_entry_text text,
    p_word_count integer
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    result_id uuid;
BEGIN
    INSERT INTO public.journal_entries (
        user_id, episode_id, prompt_es, prompt_en, entry_text, word_count
    )
    VALUES (
        p_user_id, p_episode_id, p_prompt_es, p_prompt_en, p_entry_text, p_word_count
    )
    RETURNING id INTO result_id;
    
    RETURN result_id;
END;
$$;

-- 11. Update journal entry with AI feedback
CREATE OR REPLACE FUNCTION update_journal_feedback(
    p_entry_id uuid,
    p_ai_feedback jsonb,
    p_grammar_highlights text[],
    p_xp_earned integer
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.journal_entries
    SET ai_feedback = p_ai_feedback,
        grammar_highlights = p_grammar_highlights,
        xp_earned = p_xp_earned
    WHERE id = p_entry_id;
END;
$$;

-- Reload schema to make functions available
NOTIFY pgrst, 'reload schema';

-- Test the functions
SELECT 'Testing get_story_arcs...' as test;
SELECT * FROM get_story_arcs() LIMIT 1;

SELECT 'Testing get_episode_by_number...' as test;
SELECT id, episode_number, title_es FROM get_episode_by_number(1);

SELECT 'Testing get_audio_by_key...' as test;
SELECT content_key, audio_url FROM get_audio_by_key('ep1_s1_arrival');

SELECT 'All RPC functions created successfully!' as status;


