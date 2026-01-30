-- Master Script: Run All Episode Dialogue Updates
-- This script updates all 8 episodes with the new immersive dialogue
-- Run this in Supabase SQL Editor to update all episode content

-- ============================================
-- PRE-FLIGHT CHECK
-- ============================================
DO $$
DECLARE
    v_arc_id UUID;
    v_episode_count INTEGER;
BEGIN
    -- Verify story arc exists
    SELECT id INTO v_arc_id FROM public.story_arcs WHERE title_en ILIKE '%Buenos Aires%' LIMIT 1;
    
    IF v_arc_id IS NULL THEN
        RAISE EXCEPTION 'ERROR: Buenos Aires story arc not found. Please ensure the story arc exists before running this script.';
    END IF;
    
    -- Verify all 8 episodes exist
    SELECT COUNT(*) INTO v_episode_count FROM public.episodes WHERE story_arc_id = v_arc_id;
    
    IF v_episode_count < 8 THEN
        RAISE EXCEPTION 'ERROR: Only % episodes found. Expected 8 episodes for the Buenos Aires story arc.', v_episode_count;
    END IF;
    
    RAISE NOTICE '✅ Pre-flight check passed: Story arc ID = %, Episode count = %', v_arc_id, v_episode_count;
END $$;

-- ============================================
-- EPISODE 1: Café Tortoni - Introductions
-- Grammar Focus: Present Subjunctive (expressing desire)
-- ============================================
\echo 'Updating Episode 1: Café Tortoni...'
\i episode-1-cafe-tortoni.sql

-- ============================================
-- EPISODE 2: Milonga en Salón Marabú
-- Grammar Focus: Present Subjunctive (expressing emotion)
-- ============================================
\echo 'Updating Episode 2: Salón Marabú...'
\i episode-2-salon-marabu.sql

-- ============================================
-- EPISODE 3: San Telmo Market
-- Grammar Focus: Perfect Subjunctive (expressing doubt)
-- ============================================
\echo 'Updating Episode 3: San Telmo Market...'
\i episode-3-san-telmo.sql

-- ============================================
-- EPISODE 4: Family Asado
-- Grammar Focus: Perfect Subjunctive (expressing desire)
-- ============================================
\echo 'Updating Episode 4: Family Asado...'
\i episode-4-family-asado.sql

-- ============================================
-- EPISODE 5: Cementerio de la Chacarita
-- Grammar Focus: Pluperfect Subjunctive (various applications)
-- ============================================
\echo 'Updating Episode 5: Cementerio de la Chacarita...'
\i episode-5-cementerio.sql

-- ============================================
-- EPISODE 6: Teatro Colón
-- Grammar Focus: Imperfect Subjunctive (various applications)
-- ============================================
\echo 'Updating Episode 6: Teatro Colón...'
\i episode-6-teatro-colon.sql

-- ============================================
-- EPISODE 7: La Boca
-- Grammar Focus: Imperfect Subjunctive (continued)
-- ============================================
\echo 'Updating Episode 7: La Boca...'
\i episode-7-la-boca.sql

-- ============================================
-- EPISODE 8: Farewell at Café Tortoni
-- Grammar Focus: All Subjunctive Grammar (comprehensive review)
-- ============================================
\echo 'Updating Episode 8: Farewell at Café Tortoni...'
\i episode-8-farewell.sql

-- ============================================
-- POST-UPDATE VERIFICATION
-- ============================================
DO $$
DECLARE
    v_arc_id UUID;
    v_ep RECORD;
    v_total_scenes INTEGER := 0;
BEGIN
    SELECT id INTO v_arc_id FROM public.story_arcs WHERE title_en ILIKE '%Buenos Aires%' LIMIT 1;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '📊 EPISODE DIALOGUE UPDATE SUMMARY';
    RAISE NOTICE '============================================';
    
    FOR v_ep IN 
        SELECT episode_number, title_es, jsonb_array_length(scenes) as scene_count
        FROM public.episodes 
        WHERE story_arc_id = v_arc_id 
        ORDER BY episode_number
    LOOP
        RAISE NOTICE 'Episode %: % - % scenes', v_ep.episode_number, v_ep.title_es, v_ep.scene_count;
        v_total_scenes := v_total_scenes + v_ep.scene_count;
    END LOOP;
    
    RAISE NOTICE '--------------------------------------------';
    RAISE NOTICE 'Total scenes across all episodes: %', v_total_scenes;
    RAISE NOTICE '✅ All episodes updated successfully!';
    RAISE NOTICE '============================================';
END $$;

