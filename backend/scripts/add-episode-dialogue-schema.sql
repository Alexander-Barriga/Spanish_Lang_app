-- Episode Dialogue Schema Migration
-- Adds new fields to support scripted user dialogue with translations

-- ============================================
-- Add new columns to episodes table for enhanced dialogue
-- ============================================

-- Note: The scenes JSONB column already exists. This migration documents
-- the new structure for scene objects within that column.

-- New scene object structure:
-- {
--   "scene_id": "string",
--   "scene_number": number,
--   "florencia_says": "Spanish dialogue",
--   "florencia_says_en": "English translation",
--   "user_says": "User's scripted Spanish line (optional)",
--   "user_says_en": "User's line English translation (optional)",
--   "waiter_says": "Waiter's Spanish line (Episodes 1 & 8 only)",
--   "waiter_says_en": "Waiter's line English translation",
--   "response_type": "scripted" | "listen_only",
--   "emotion": "string",
--   "audio_key": "string",
--   "cultural_context": "string (optional)",
--   "scene_image_url": "string (optional)",
--   "scene_image_storage_path": "string (optional)"
-- }

-- ============================================
-- Create a view for easier dialogue management
-- ============================================
CREATE OR REPLACE VIEW public.episode_dialogue_summary AS
SELECT 
    e.id as episode_id,
    e.episode_number,
    e.title_es,
    e.title_en,
    e.grammar_focus,
    jsonb_array_length(e.scenes) as scene_count,
    sa.title_es as story_arc_title
FROM public.episodes e
LEFT JOIN public.story_arcs sa ON e.story_arc_id = sa.id
ORDER BY e.episode_number;

-- ============================================
-- Function to validate scene structure
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_episode_scenes(scenes_json JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    scene JSONB;
    required_fields TEXT[] := ARRAY['scene_id', 'scene_number', 'florencia_says', 'response_type'];
    field TEXT;
BEGIN
    -- Check if scenes is an array
    IF jsonb_typeof(scenes_json) != 'array' THEN
        RETURN FALSE;
    END IF;
    
    -- Validate each scene
    FOR scene IN SELECT * FROM jsonb_array_elements(scenes_json)
    LOOP
        -- Check required fields
        FOREACH field IN ARRAY required_fields
        LOOP
            IF NOT scene ? field THEN
                RAISE NOTICE 'Missing required field: %', field;
                RETURN FALSE;
            END IF;
        END LOOP;
        
        -- Validate response_type
        IF scene->>'response_type' NOT IN ('scripted', 'listen_only', 'guided', 'free_speak') THEN
            RAISE NOTICE 'Invalid response_type: %', scene->>'response_type';
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Add comment documenting the new schema
-- ============================================
COMMENT ON COLUMN public.episodes.scenes IS 
'JSONB array of scene objects. Each scene contains:
- scene_id (required): Unique identifier
- scene_number (required): Order in episode
- florencia_says (required): Florencia''s Spanish dialogue
- florencia_says_en: English translation
- user_says: User''s scripted Spanish line
- user_says_en: User''s line English translation  
- waiter_says: Waiter dialogue (Ep 1 & 8 only)
- waiter_says_en: Waiter translation
- response_type (required): scripted | listen_only
- emotion: For TTS synthesis
- audio_key: Pre-generated audio reference
- cultural_context: Location/cultural exposition
- scene_image_url: Image URL for scene';

