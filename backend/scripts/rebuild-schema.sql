-- ============================================
-- COMPLETE SCHEMA REBUILD
-- Run this in Supabase SQL Editor
-- This will DELETE ALL DATA and recreate fresh
-- ============================================

-- Step 1: Drop all existing tables (in correct order for foreign keys)
DROP TABLE IF EXISTS public.pre_generated_audio CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;
DROP TABLE IF EXISTS public.episode_attempts CASCADE;
DROP TABLE IF EXISTS public.user_story_progress CASCADE;
DROP TABLE IF EXISTS public.episodes CASCADE;
DROP TABLE IF EXISTS public.story_arcs CASCADE;
DROP TABLE IF EXISTS public.writing_submissions CASCADE;
DROP TABLE IF EXISTS public.workout_sessions CASCADE;
DROP TABLE IF EXISTS public.placement_tests CASCADE;
DROP TABLE IF EXISTS public.daily_lessons CASCADE;
DROP TABLE IF EXISTS public.user_curriculum_progress CASCADE;
DROP TABLE IF EXISTS public.grammar_curriculum CASCADE;
DROP TABLE IF EXISTS public.quick_mission_topics CASCADE;
DROP TABLE IF EXISTS public.tutor_greetings CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.vocabulary_sets CASCADE;
DROP TABLE IF EXISTS public.progress CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop any existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_story_arcs() CASCADE;
DROP FUNCTION IF EXISTS get_episode_by_number(integer) CASCADE;
DROP FUNCTION IF EXISTS get_audio_by_key(text) CASCADE;
DROP FUNCTION IF EXISTS test_cache_simple() CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    spanish_level TEXT DEFAULT 'A1' CHECK (spanish_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    goals TEXT[] DEFAULT '{}',
    preferred_topics TEXT[] DEFAULT '{}',
    correction_depth TEXT DEFAULT 'standard' CHECK (correction_depth IN ('light', 'standard', 'deep')),
    voice_speed DECIMAL DEFAULT 1.0,
    accent_preference TEXT DEFAULT 'argentina' CHECK (accent_preference IN ('spain', 'mexico', 'argentina', 'colombia')),
    created_at TIMESTAMPTZ DEFAULT NOW(), 
    updated_at TIMESTAMPTZ DEFAULT NOW()       
);

-- Conversations table
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('open', 'topic', 'vocabulary', 'grammar', 'roleplay', 'story')),
    topic TEXT,
    grammar_focus TEXT,
    role_play_persona TEXT,
    vocabulary_set_id UUID,
    episode_id UUID,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0
);

-- Messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    audio_url TEXT,
    corrections JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress table
CREATE TABLE public.progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    grammar_mastery JSONB DEFAULT '{}',
    vocabulary_learned TEXT[] DEFAULT '{}',
    total_conversations INTEGER DEFAULT 0,
    total_minutes INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_session_at TIMESTAMPTZ,
    achievements TEXT[] DEFAULT '{}'
);

-- Vocabulary Sets table
CREATE TABLE public.vocabulary_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    words JSONB NOT NULL DEFAULT '[]',
    is_default BOOLEAN DEFAULT FALSE,
    category TEXT DEFAULT 'custom',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tutor Greetings table
CREATE TABLE public.tutor_greetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id TEXT NOT NULL CHECK (character_id IN ('florencia', 'ana_maria', 'marcela')),
    greeting_index INTEGER NOT NULL CHECK (greeting_index >= 0 AND greeting_index < 3),
    greeting_text TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(character_id, greeting_index)
);

-- ============================================
-- GRAMMAR CURRICULUM TABLES
-- ============================================

-- Grammar Curriculum table
CREATE TABLE public.grammar_curriculum (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level TEXT NOT NULL CHECK (level IN ('B1', 'B2')),
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 12),
    grammar_focus TEXT NOT NULL,
    title_es TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description TEXT,
    triggers TEXT[] DEFAULT '{}',
    example_sentences JSONB DEFAULT '[]',
    intro_audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(level, week_number)
);

-- Daily Lessons table
CREATE TABLE public.daily_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curriculum_id UUID REFERENCES public.grammar_curriculum(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
    lesson_type TEXT NOT NULL CHECK (lesson_type IN ('workout', 'review', 'challenge')),
    title TEXT NOT NULL,
    intro_text TEXT,
    mcq_questions JSONB DEFAULT '[]',
    speaking_prompts JSONB DEFAULT '[]',
    writing_exercises JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(curriculum_id, day_number)
);

-- User Curriculum Progress table
CREATE TABLE public.user_curriculum_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('B1', 'B2')),
    current_week INTEGER DEFAULT 1,
    current_day INTEGER DEFAULT 1,
    week_started_at TIMESTAMPTZ DEFAULT NOW(),
    placement_completed BOOLEAN DEFAULT FALSE,
    placement_score INTEGER,
    total_xp INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Workout Sessions table
CREATE TABLE public.workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('daily_workout', 'weekly_challenge', 'quick_mission', 'placement_test')),
    curriculum_week INTEGER,
    curriculum_day INTEGER,
    grammar_focus TEXT,
    duration_seconds INTEGER DEFAULT 0,
    mcq_correct INTEGER DEFAULT 0,
    mcq_total INTEGER DEFAULT 0,
    speaking_exchanges INTEGER DEFAULT 0,
    grammar_accuracy DECIMAL(5,2),
    subjunctive_uses INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Writing Submissions table
CREATE TABLE public.writing_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    exercise_type TEXT NOT NULL CHECK (exercise_type IN ('sentence_transform', 'gap_fill', 'free_response')),
    curriculum_week INTEGER,
    prompt TEXT NOT NULL,
    correct_answer TEXT,
    user_response TEXT NOT NULL,
    is_correct BOOLEAN,
    ai_feedback JSONB,
    grammar_score DECIMAL(5,2),
    xp_earned INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Placement Tests table
CREATE TABLE public.placement_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    mcq_answers JSONB DEFAULT '[]',
    mcq_score INTEGER DEFAULT 0,
    speaking_response TEXT,
    speaking_score INTEGER DEFAULT 0,
    combined_score INTEGER DEFAULT 0,
    assigned_level TEXT CHECK (assigned_level IN ('B1', 'B2')),
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quick Mission Topics table
CREATE TABLE public.quick_mission_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_key TEXT NOT NULL UNIQUE,
    title_es TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    grammar_targets TEXT[] DEFAULT '{}',
    vocabulary_hints TEXT[] DEFAULT '{}',
    sample_prompts JSONB DEFAULT '[]',
    difficulty TEXT DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STORY SYSTEM TABLES
-- ============================================

-- Story Arcs
CREATE TABLE public.story_arcs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id TEXT NOT NULL CHECK (character_id IN ('florencia', 'ana_maria', 'marcela')),
    arc_number INTEGER NOT NULL,
    title_es TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    total_episodes INTEGER DEFAULT 8,
    cefr_level TEXT NOT NULL CHECK (cefr_level IN ('B1', 'B2')),
    cover_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(character_id, arc_number)
);

-- Episodes
CREATE TABLE public.episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_arc_id UUID REFERENCES public.story_arcs(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    title_es TEXT NOT NULL,
    title_en TEXT NOT NULL,
    scenario TEXT NOT NULL,
    grammar_focus TEXT NOT NULL,
    grammar_triggers TEXT[] DEFAULT '{}',
    scenes JSONB NOT NULL DEFAULT '[]',
    journal_prompt_es TEXT,
    journal_prompt_en TEXT,
    estimated_duration INTEGER DEFAULT 10,
    intro_audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_arc_id, episode_number)
);

-- User Story Progress
CREATE TABLE public.user_story_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    story_arc_id UUID REFERENCES public.story_arcs(id) ON DELETE CASCADE NOT NULL,
    current_episode INTEGER DEFAULT 1,
    episodes_completed INTEGER DEFAULT 0,
    total_stars INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    last_played_at TIMESTAMPTZ,
    UNIQUE(user_id, story_arc_id)
);

-- Episode Attempts
CREATE TABLE public.episode_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    grammar_score DECIMAL(5,2),
    speaking_count INTEGER DEFAULT 0,
    writing_count INTEGER DEFAULT 0,
    stars_earned INTEGER CHECK (stars_earned >= 0 AND stars_earned <= 3),
    xp_earned INTEGER DEFAULT 0,
    path_taken JSONB DEFAULT '[]',
    duration_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal Entries
CREATE TABLE public.journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE SET NULL,
    prompt_es TEXT NOT NULL,
    prompt_en TEXT,
    entry_text TEXT NOT NULL,
    ai_feedback JSONB,
    grammar_highlights TEXT[] DEFAULT '{}',
    word_count INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-generated Audio
CREATE TABLE public.pre_generated_audio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type TEXT NOT NULL CHECK (content_type IN ('episode_intro', 'scene_dialogue', 'grammar_explanation', 'feedback')),
    content_key TEXT NOT NULL UNIQUE,
    character_id TEXT NOT NULL CHECK (character_id IN ('florencia', 'ana_maria', 'marcela')),
    text_content TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    emotion TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_started_at ON public.conversations(started_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_vocabulary_sets_user_id ON public.vocabulary_sets(user_id);
CREATE INDEX idx_grammar_curriculum_level ON public.grammar_curriculum(level);
CREATE INDEX idx_daily_lessons_curriculum ON public.daily_lessons(curriculum_id);
CREATE INDEX idx_user_curriculum_progress_user ON public.user_curriculum_progress(user_id);
CREATE INDEX idx_workout_sessions_user ON public.workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_completed ON public.workout_sessions(completed_at DESC);
CREATE INDEX idx_writing_submissions_user ON public.writing_submissions(user_id);
CREATE INDEX idx_writing_submissions_completed ON public.writing_submissions(completed_at DESC);
CREATE INDEX idx_placement_tests_user ON public.placement_tests(user_id);
CREATE INDEX idx_story_arcs_character ON public.story_arcs(character_id);
CREATE INDEX idx_episodes_arc ON public.episodes(story_arc_id);
CREATE INDEX idx_user_story_progress_user ON public.user_story_progress(user_id);
CREATE INDEX idx_user_story_progress_arc ON public.user_story_progress(story_arc_id);
CREATE INDEX idx_episode_attempts_user ON public.episode_attempts(user_id);
CREATE INDEX idx_episode_attempts_episode ON public.episode_attempts(episode_id);
CREATE INDEX idx_journal_entries_user ON public.journal_entries(user_id);
CREATE INDEX idx_journal_entries_episode ON public.journal_entries(episode_id);
CREATE INDEX idx_pre_generated_audio_key ON public.pre_generated_audio(content_key);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_greetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_curriculum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_curriculum_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writing_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_mission_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_arcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_story_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_generated_audio ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Conversations policies
CREATE POLICY "Users can view their own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Users can create messages in their conversations" ON public.messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));

-- Progress policies
CREATE POLICY "Users can view their own progress" ON public.progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON public.progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.progress FOR UPDATE USING (auth.uid() = user_id);

-- Vocabulary sets policies
CREATE POLICY "Users can view their own and default vocabulary sets" ON public.vocabulary_sets FOR SELECT USING (auth.uid() = user_id OR is_default = TRUE);
CREATE POLICY "Users can create their own vocabulary sets" ON public.vocabulary_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vocabulary sets" ON public.vocabulary_sets FOR UPDATE USING (auth.uid() = user_id AND is_default = FALSE);
CREATE POLICY "Users can delete their own vocabulary sets" ON public.vocabulary_sets FOR DELETE USING (auth.uid() = user_id AND is_default = FALSE);

-- Public read policies
CREATE POLICY "Anyone can view tutor greetings" ON public.tutor_greetings FOR SELECT USING (true);
CREATE POLICY "Anyone can view grammar curriculum" ON public.grammar_curriculum FOR SELECT USING (true);
CREATE POLICY "Anyone can view daily lessons" ON public.daily_lessons FOR SELECT USING (true);
CREATE POLICY "Anyone can view quick mission topics" ON public.quick_mission_topics FOR SELECT USING (true);
CREATE POLICY "Anyone can view story arcs" ON public.story_arcs FOR SELECT USING (true);
CREATE POLICY "Anyone can view episodes" ON public.episodes FOR SELECT USING (true);
CREATE POLICY "Anyone can view pre-generated audio" ON public.pre_generated_audio FOR SELECT USING (true);

-- User curriculum progress policies
CREATE POLICY "Users can view their own curriculum progress" ON public.user_curriculum_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own curriculum progress" ON public.user_curriculum_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own curriculum progress" ON public.user_curriculum_progress FOR UPDATE USING (auth.uid() = user_id);

-- Workout sessions policies
CREATE POLICY "Users can view their own workout sessions" ON public.workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own workout sessions" ON public.workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Writing submissions policies
CREATE POLICY "Users can view their own writing submissions" ON public.writing_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own writing submissions" ON public.writing_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Placement tests policies
CREATE POLICY "Users can view their own placement tests" ON public.placement_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own placement tests" ON public.placement_tests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User story progress policies
CREATE POLICY "Users can view their own story progress" ON public.user_story_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own story progress" ON public.user_story_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own story progress" ON public.user_story_progress FOR UPDATE USING (auth.uid() = user_id);

-- Episode attempts policies
CREATE POLICY "Users can view their own episode attempts" ON public.episode_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own episode attempts" ON public.episode_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Journal entries policies
CREATE POLICY "Users can view their own journal entries" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own journal entries" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own journal entries" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Vocabulary Sets
-- ============================================

INSERT INTO public.vocabulary_sets (name, description, words, is_default, category) VALUES
('Restaurantes', 'Essential vocabulary for dining out', 
    '[{"spanish": "la carta", "english": "the menu", "example_sentence": "¿Me puede traer la carta, por favor?"},
      {"spanish": "la cuenta", "english": "the bill", "example_sentence": "La cuenta, por favor."},
      {"spanish": "el camarero", "english": "the waiter", "example_sentence": "El camarero nos atendió muy bien."},
      {"spanish": "pedir", "english": "to order", "example_sentence": "Quiero pedir el plato del día."},
      {"spanish": "recomendar", "english": "to recommend", "example_sentence": "¿Qué me recomienda?"},
      {"spanish": "reservar", "english": "to reserve", "example_sentence": "Quisiera reservar una mesa para dos."},
      {"spanish": "la propina", "english": "the tip", "example_sentence": "Dejé una buena propina."},
      {"spanish": "el postre", "english": "the dessert", "example_sentence": "¿Tienen postres caseros?"}]'::jsonb, 
    TRUE, 'dining'),
('Viajes', 'Travel vocabulary for exploring',
    '[{"spanish": "el vuelo", "english": "the flight", "example_sentence": "Mi vuelo sale a las ocho."},
      {"spanish": "el equipaje", "english": "the luggage", "example_sentence": "¿Dónde recojo el equipaje?"},
      {"spanish": "el pasaporte", "english": "the passport", "example_sentence": "Necesito renovar mi pasaporte."},
      {"spanish": "la aduana", "english": "customs", "example_sentence": "Pasamos por la aduana sin problemas."},
      {"spanish": "el alojamiento", "english": "the accommodation", "example_sentence": "Busco alojamiento cerca del centro."},
      {"spanish": "el mapa", "english": "the map", "example_sentence": "¿Tiene un mapa de la ciudad?"},
      {"spanish": "perderse", "english": "to get lost", "example_sentence": "Me perdí buscando el museo."},
      {"spanish": "el recuerdo", "english": "the souvenir", "example_sentence": "Compré recuerdos para mi familia."}]'::jsonb, 
    TRUE, 'travel'),
('Trabajo', 'Professional and workplace vocabulary',
    '[{"spanish": "la reunión", "english": "the meeting", "example_sentence": "Tengo una reunión a las tres."},
      {"spanish": "el jefe", "english": "the boss", "example_sentence": "Mi jefe es muy comprensivo."},
      {"spanish": "el sueldo", "english": "the salary", "example_sentence": "Negocié un mejor sueldo."},
      {"spanish": "la entrevista", "english": "the interview", "example_sentence": "La entrevista fue muy bien."},
      {"spanish": "el contrato", "english": "the contract", "example_sentence": "Firmé el contrato ayer."},
      {"spanish": "las vacaciones", "english": "vacation", "example_sentence": "Me tomo vacaciones en agosto."},
      {"spanish": "el colega", "english": "the colleague", "example_sentence": "Mis colegas son muy amables."},
      {"spanish": "el proyecto", "english": "the project", "example_sentence": "Estoy trabajando en un proyecto nuevo."}]'::jsonb, 
    TRUE, 'work');

-- ============================================
-- SEED DATA: Quick Mission Topics
-- ============================================

INSERT INTO public.quick_mission_topics (topic_key, title_es, title_en, description, icon, color, grammar_targets, difficulty) VALUES
('restaurant', 'En el Restaurante', 'At the Restaurant', 'Practice ordering food and making recommendations', '🍽️', '#FF9800', ARRAY['present_subjunctive', 'recommendations'], 'intermediate'),
('travel_plans', 'Planes de Viaje', 'Travel Plans', 'Discuss travel plans and make suggestions', '✈️', '#2196F3', ARRAY['future_tense', 'subjunctive_recommendations'], 'intermediate'),
('job_interview', 'Entrevista de Trabajo', 'Job Interview', 'Practice professional conversation skills', '💼', '#607D8B', ARRAY['conditional', 'past_subjunctive'], 'advanced'),
('weekend_plans', 'Planes del Fin de Semana', 'Weekend Plans', 'Talk about your weekend activities', '🎉', '#9C27B0', ARRAY['future_tense', 'subjunctive_wishes'], 'intermediate'),
('movie_recommendation', 'Recomendar una Película', 'Movie Recommendation', 'Recommend movies and discuss opinions', '🎬', '#E91E63', ARRAY['subjunctive_recommendations', 'opinions'], 'intermediate'),
('giving_advice', 'Dar Consejos', 'Giving Advice', 'Practice giving advice to a friend', '💡', '#4CAF50', ARRAY['subjunctive_recommendations', 'imperatives'], 'intermediate');

-- ============================================
-- SEED DATA: Grammar Curriculum (B1 Weeks 1-12)
-- ============================================

INSERT INTO public.grammar_curriculum (level, week_number, grammar_focus, title_es, title_en, description, triggers, example_sentences) VALUES
('B1', 1, 'present_subjunctive_formation', 'Formación del Subjuntivo Presente', 'Present Subjunctive Formation', 'Learn to form the present subjunctive with regular -ar, -er, -ir verbs', ARRAY['que yo hable', 'que tú comas', 'que ella viva', 'que nosotros trabajemos'], '[{"spanish": "Es importante que estudies todos los días.", "english": "It is important that you study every day."}, {"spanish": "Quiero que hables más en español.", "english": "I want you to speak more in Spanish."}, {"spanish": "Es necesario que practiquemos juntos.", "english": "It is necessary that we practice together."}]'::jsonb),
('B1', 2, 'subjunctive_emotions', 'Subjuntivo con Emociones', 'Subjunctive with Emotions', 'Use the subjunctive to express emotions and feelings about others actions', ARRAY['me alegra que', 'es triste que', 'me sorprende que', 'es increíble que'], '[{"spanish": "Me alegra que estés aquí.", "english": "I am glad that you are here."}, {"spanish": "Es triste que no puedas venir.", "english": "It is sad that you cannot come."}, {"spanish": "Me sorprende que hables tan bien.", "english": "I am surprised that you speak so well."}]'::jsonb),
('B1', 3, 'subjunctive_doubt', 'Subjuntivo con Duda', 'Subjunctive with Doubt', 'Express doubt and uncertainty using the subjunctive mood', ARRAY['no creo que', 'dudo que', 'no es seguro que', 'es posible que'], '[{"spanish": "No creo que ella venga mañana.", "english": "I do not think she will come tomorrow."}, {"spanish": "Dudo que tengamos tiempo.", "english": "I doubt that we have time."}, {"spanish": "Es posible que llueva esta tarde.", "english": "It is possible that it will rain this afternoon."}]'::jsonb),
('B1', 4, 'subjunctive_desires', 'Subjuntivo con Deseos', 'Subjunctive with Desires', 'Express wishes and desires using the subjunctive mood', ARRAY['Ojalá que', 'Deseo que', 'Prefiero que', 'Necesito que'], '[{"spanish": "Ojalá que tengas un buen viaje.", "english": "I hope you have a good trip."}, {"spanish": "Deseo que seas muy feliz.", "english": "I wish you to be very happy."}, {"spanish": "Prefiero que hablemos en español.", "english": "I prefer that we speak in Spanish."}]'::jsonb),
('B1', 5, 'subjunctive_adjective_clauses', 'Subjuntivo en Cláusulas Adjetivas', 'Subjunctive in Adjective Clauses', 'Use subjunctive when describing unknown or hypothetical things', ARRAY['Busco algo que', 'Necesito alguien que', 'No hay nada que', 'Quiero un lugar que'], '[{"spanish": "Busco un trabajo que pague bien.", "english": "I am looking for a job that pays well."}, {"spanish": "Necesito alguien que hable inglés.", "english": "I need someone who speaks English."}, {"spanish": "No hay nada que me guste más.", "english": "There is nothing I like more."}]'::jsonb),
('B1', 6, 'commands_imperative', 'Mandatos e Imperativo', 'Commands and Imperative', 'Give commands in formal and informal situations, affirmative and negative', ARRAY['Habla', 'No hables', 'Hable usted', 'Vamos a'], '[{"spanish": "¡Habla más despacio, por favor!", "english": "Speak slower, please!"}, {"spanish": "No te preocupes por eso.", "english": "Dont worry about that."}, {"spanish": "Siéntese, por favor.", "english": "Please sit down (formal)."}]'::jsonb),
('B1', 7, 'preterite_imperfect_mastery', 'Pretérito vs Imperfecto', 'Preterite vs Imperfect Mastery', 'Master the distinction between completed and ongoing past actions', ARRAY['Cuando era', 'Mientras', 'De repente', 'Todos los días', 'Una vez'], '[{"spanish": "Cuando era niño, vivía en México.", "english": "When I was a child, I lived in Mexico."}, {"spanish": "Mientras estudiaba, sonó el teléfono.", "english": "While I was studying, the phone rang."}, {"spanish": "De repente, empezó a llover.", "english": "Suddenly, it started to rain."}]'::jsonb),
('B1', 8, 'present_perfect', 'Pretérito Perfecto', 'Present Perfect', 'Talk about recent past actions and experiences', ARRAY['He hablado', 'Has comido', 'Hemos visto', 'Todavía no he', 'Ya he'], '[{"spanish": "He viajado a España tres veces.", "english": "I have traveled to Spain three times."}, {"spanish": "¿Ya has comido?", "english": "Have you already eaten?"}, {"spanish": "Todavía no he terminado.", "english": "I havent finished yet."}]'::jsonb),
('B1', 9, 'future_conditional_basic', 'Futuro y Condicional Básico', 'Future and Conditional Basics', 'Express future plans and hypothetical situations', ARRAY['Mañana iré', 'La semana que viene', 'Me gustaría', 'Podría'], '[{"spanish": "Mañana iré al médico.", "english": "Tomorrow I will go to the doctor."}, {"spanish": "Me gustaría viajar a Sudamérica.", "english": "I would like to travel to South America."}, {"spanish": "¿Podrías ayudarme?", "english": "Could you help me?"}]'::jsonb),
('B1', 10, 'reflexive_verbs_advanced', 'Verbos Reflexivos Avanzados', 'Advanced Reflexive Verbs', 'Master reflexive constructions including reciprocal and emphatic uses', ARRAY['Se levanta', 'Nos vemos', 'Se quieren', 'Me di cuenta'], '[{"spanish": "Nos conocimos en una fiesta.", "english": "We met each other at a party."}, {"spanish": "Se quieren mucho.", "english": "They love each other very much."}, {"spanish": "Me di cuenta del error.", "english": "I realized the mistake."}]'::jsonb),
('B1', 11, 'object_pronoun_combinations', 'Combinación de Pronombres', 'Object Pronoun Combinations', 'Combine direct and indirect object pronouns correctly', ARRAY['Se lo di', 'Te lo digo', 'Me lo compraron', 'Se la envié'], '[{"spanish": "Se lo di ayer.", "english": "I gave it to him/her yesterday."}, {"spanish": "¿Me lo puedes explicar?", "english": "Can you explain it to me?"}, {"spanish": "Te lo prometo.", "english": "I promise it to you."}]'::jsonb),
('B1', 12, 'b1_comprehensive_review', 'Repaso Integral B1', 'B1 Comprehensive Review', 'Review and consolidate all B1 grammar structures', ARRAY['Todos los tiempos', 'Subjuntivo presente', 'Mandatos', 'Pronombres'], '[{"spanish": "Espero que hayas disfrutado este curso.", "english": "I hope you have enjoyed this course."}, {"spanish": "Si necesitas ayuda, dímelo.", "english": "If you need help, tell me."}, {"spanish": "Me alegra que hayamos llegado tan lejos.", "english": "I am glad we have come so far."}]'::jsonb);

-- ============================================
-- SEED DATA: Grammar Curriculum (B2 Weeks 1-12)
-- ============================================

INSERT INTO public.grammar_curriculum (level, week_number, grammar_focus, title_es, title_en, description, triggers, example_sentences) VALUES
('B2', 1, 'imperfect_subjunctive', 'Subjuntivo Imperfecto', 'Imperfect Subjunctive', 'Form and use the imperfect subjunctive for hypotheticals and past wishes', ARRAY['si yo tuviera', 'si pudiera', 'quisiera que', 'como si fuera'], '[{"spanish": "Si tuviera más tiempo, viajaría más.", "english": "If I had more time, I would travel more."}, {"spanish": "Quisiera que me ayudaras.", "english": "I would like you to help me."}, {"spanish": "Habla como si fuera experto.", "english": "He speaks as if he were an expert."}]'::jsonb),
('B2', 2, 'past_perfect_subjunctive', 'Pluscuamperfecto de Subjuntivo', 'Past Perfect Subjunctive', 'Express regrets and hypothetical past situations', ARRAY['si hubiera sabido', 'ojalá hubiera', 'como si hubiera', 'habría ido si'], '[{"spanish": "Si hubiera sabido, habría venido antes.", "english": "If I had known, I would have come earlier."}, {"spanish": "Ojalá hubiera estudiado más.", "english": "I wish I had studied more."}, {"spanish": "Habría ido si me hubieras invitado.", "english": "I would have gone if you had invited me."}]'::jsonb),
('B2', 3, 'subjunctive_relative_clauses', 'Subjuntivo en Cláusulas Relativas', 'Subjunctive in Relative Clauses', 'Use subjunctive when describing unknown or nonexistent things', ARRAY['busco alguien que', 'necesito algo que', 'no hay nadie que', 'quiero un lugar que'], '[{"spanish": "Busco a alguien que hable francés.", "english": "I am looking for someone who speaks French."}, {"spanish": "Necesito un apartamento que tenga balcón.", "english": "I need an apartment that has a balcony."}, {"spanish": "No hay nadie que pueda ayudarme.", "english": "There is no one who can help me."}]'::jsonb),
('B2', 4, 'como_si_constructions', 'Construcciones con Como Si', 'Como Si Constructions', 'Use como si to describe how things appear or how people behave', ARRAY['Como si fuera', 'Como si tuviera', 'Como si no supiera', 'Como si hubiera'], '[{"spanish": "Habla como si fuera experto.", "english": "He speaks as if he were an expert."}, {"spanish": "Me mira como si no me conociera.", "english": "She looks at me as if she didnt know me."}, {"spanish": "Actúa como si nada hubiera pasado.", "english": "He acts as if nothing had happened."}]'::jsonb),
('B2', 5, 'conditional_perfect', 'Condicional Perfecto', 'Conditional Perfect', 'Express what would have happened under different circumstances', ARRAY['Habría hecho', 'Habrían venido', 'No habría sabido'], '[{"spanish": "Habría ido si me hubieras invitado.", "english": "I would have gone if you had invited me."}, {"spanish": "¿Qué habrías hecho en mi lugar?", "english": "What would you have done in my place?"}, {"spanish": "Nunca habría imaginado esto.", "english": "I never would have imagined this."}]'::jsonb),
('B2', 6, 'passive_se_impersonal', 'Voz Pasiva y Se Impersonal', 'Passive Voice and Se Impersonal', 'Use passive constructions and impersonal se', ARRAY['Se dice que', 'Fue construido', 'Se habla español', 'Es considerado'], '[{"spanish": "Se dice que va a llover mañana.", "english": "They say it is going to rain tomorrow."}, {"spanish": "Este edificio fue construido en 1920.", "english": "This building was built in 1920."}, {"spanish": "Aquí se habla español.", "english": "Spanish is spoken here."}]'::jsonb),
('B2', 7, 'reported_speech', 'Estilo Indirecto', 'Indirect/Reported Speech', 'Report what others have said with appropriate tense changes', ARRAY['Dijo que', 'Me preguntó si', 'Comentó que', 'Explicó que'], '[{"spanish": "Dijo que vendría mañana.", "english": "He said he would come tomorrow."}, {"spanish": "Me preguntó si había terminado.", "english": "She asked me if I had finished."}, {"spanish": "Explicó que no había podido venir.", "english": "He explained that he hadnt been able to come."}]'::jsonb),
('B2', 8, 'advanced_connectors', 'Conectores Avanzados', 'Advanced Connectors and Discourse', 'Use sophisticated connectors for cohesive discourse', ARRAY['Sin embargo', 'No obstante', 'Por lo tanto', 'A pesar de que', 'Dado que'], '[{"spanish": "Sin embargo, no estoy de acuerdo.", "english": "However, I do not agree."}, {"spanish": "A pesar de que llovía, salimos.", "english": "Even though it was raining, we went out."}, {"spanish": "Por lo tanto, debemos actuar.", "english": "Therefore, we must act."}]'::jsonb),
('B2', 9, 'concessive_clauses', 'Cláusulas Concesivas', 'Concessive Clauses', 'Express concession using aunque, a pesar de, and similar structures', ARRAY['Aunque + subjuntivo', 'A pesar de que', 'Por más que', 'Por mucho que'], '[{"spanish": "Aunque llueva, iré a la fiesta.", "english": "Even if it rains, I will go to the party."}, {"spanish": "Por más que lo intente, no puedo.", "english": "No matter how hard I try, I cannot."}, {"spanish": "A pesar de sus errores, lo quiero.", "english": "Despite his mistakes, I love him."}]'::jsonb),
('B2', 10, 'nominalization', 'Nominalización', 'Nominalization and Clause Reduction', 'Convert clauses to noun phrases for more sophisticated expression', ARRAY['El hecho de que', 'Lo importante es', 'Lo que más me gusta'], '[{"spanish": "Lo que más me gusta es viajar.", "english": "What I like most is traveling."}, {"spanish": "El hecho de que haya llegado tarde es inaceptable.", "english": "The fact that he arrived late is unacceptable."}, {"spanish": "Lo difícil es empezar.", "english": "The difficult thing is to start."}]'::jsonb),
('B2', 11, 'subjunctive_adverbial', 'Subjuntivo en Cláusulas Adverbiales', 'Subjunctive in Adverbial Clauses', 'Use subjunctive in purpose, time, and condition clauses', ARRAY['Para que', 'Antes de que', 'Cuando + subjuntivo', 'A menos que', 'Con tal de que'], '[{"spanish": "Te lo explico para que entiendas.", "english": "I explain it to you so that you understand."}, {"spanish": "Antes de que llegues, preparo la cena.", "english": "Before you arrive, I will prepare dinner."}, {"spanish": "A menos que llueva, iremos al parque.", "english": "Unless it rains, we will go to the park."}]'::jsonb),
('B2', 12, 'b2_comprehensive_review', 'Repaso Integral B2', 'B2 Comprehensive Review', 'Review and master all B2 grammar for near-native expression', ARRAY['Todos los subjuntivos', 'Condicionales complejos', 'Conectores', 'Estilo indirecto'], '[{"spanish": "Si hubiera sabido, habría actuado diferente.", "english": "If I had known, I would have acted differently."}, {"spanish": "Por más que lo intente, parece como si no fuera suficiente.", "english": "No matter how hard I try, it seems as if it is not enough."}, {"spanish": "Dijo que ojalá hubiera podido quedarse más tiempo.", "english": "He said he wished he could have stayed longer."}]'::jsonb);

-- ============================================
-- SEED DATA: Florencia Story Arc
-- ============================================

INSERT INTO public.story_arcs (character_id, arc_number, title_es, title_en, description, location, total_episodes, cefr_level) VALUES
('florencia', 1, 'Encuentros en Buenos Aires', 'Encounters in Buenos Aires', 'Conoce a Florencia, una bailarina de tango apasionada de San Telmo. A través de ocho episodios, explorarás los cafés históricos, las milongas vibrantes, y los barrios coloridos de Buenos Aires mientras practicas gramática esencial del nivel B1.', 'Buenos Aires, Argentina', 8, 'B1');

-- Get the story arc ID for episodes
DO $$
DECLARE
    arc_id UUID;
BEGIN
    SELECT id INTO arc_id FROM public.story_arcs WHERE character_id = 'florencia' AND arc_number = 1;
    
    -- Episode 1: El Café de la Esquina
    INSERT INTO public.episodes (story_arc_id, episode_number, title_es, title_en, scenario, grammar_focus, grammar_triggers, scenes, journal_prompt_es, journal_prompt_en, estimated_duration) VALUES
    (arc_id, 1, 'El Café de la Esquina', 'The Corner Café', 'Tu primer encuentro con Florencia en el histórico Café Tortoni de Buenos Aires', 'present_subjunctive_formation', ARRAY['Quiero que', 'Es importante que', 'Espero que', 'Es necesario que'],
    '[{"scene_id": "arrival", "scene_number": 1, "florencia_says": "¡Hola! Qué bueno que estés aquí. Bienvenido a Buenos Aires. Soy Florencia, sentate, sentate. ¿Querés un café?", "audio_key": "ep1_s1_arrival", "emotion": "warm_welcome", "response_type": "guided", "options": [{"text": "¡Hola Florencia! Sí, quiero un café, gracias.", "next_scene": "coffee_order", "grammar_correct": true}, {"text": "Hola, mucho gusto. ¿Cómo estás?", "next_scene": "small_talk", "grammar_correct": true}]}, {"scene_id": "coffee_order", "scene_number": 2, "florencia_says": "¡Perfecto! Acá en Argentina tomamos mucho café. Es importante que pruebes un cortado - es espresso con un poquito de leche. ¿De dónde sos vos?", "audio_key": "ep1_s2_coffee", "emotion": "curious", "response_type": "free_speak", "grammar_hint": "Tell her where you are from using present tense", "expected_patterns": ["Soy de", "Vengo de"]}, {"scene_id": "small_talk", "scene_number": 2, "florencia_says": "¡Muy bien, gracias! Qué lindo que hayas venido a Buenos Aires. Este café, el Tortoni, tiene más de 150 años. Es importante que conozcas su historia. ¿Sabés algo de Argentina?", "audio_key": "ep1_s2_smalltalk", "emotion": "proud", "response_type": "free_speak", "grammar_hint": "Share what you know about Argentina", "expected_patterns": ["Sé que", "Conozco", "He escuchado"]}, {"scene_id": "tango_intro", "scene_number": 3, "florencia_says": "Mirá, yo soy bailarina de tango. Es mi pasión. Quiero que vengas a una milonga conmigo esta semana. ¿Te gustaría?", "audio_key": "ep1_s3_tango", "emotion": "enthusiastic", "response_type": "guided", "options": [{"text": "¡Sí! Espero que me enseñes a bailar.", "next_scene": "tango_yes", "grammar_correct": true, "uses_subjunctive": true}, {"text": "Me gustaría, pero no sé bailar.", "next_scene": "tango_nervous", "grammar_correct": true}]}, {"scene_id": "tango_yes", "scene_number": 4, "florencia_says": "¡Genial! No te preocupes si no sabés bailar. Es necesario que tengas paciencia, nada más. El tango se siente, no se piensa. Te va a encantar.", "audio_key": "ep1_s4_tango_yes", "emotion": "encouraging", "response_type": "free_speak", "grammar_hint": "Express your excitement or ask a question about tango", "expected_patterns": ["Espero que", "Quiero que", "¿Cuándo"]}, {"scene_id": "tango_nervous", "scene_number": 4, "florencia_says": "¡No importa! Quiero que sepas que todos empezamos sin saber nada. Es importante que te relajes y disfrutes. Te voy a enseñar los pasos básicos.", "audio_key": "ep1_s4_tango_nervous", "emotion": "reassuring", "response_type": "free_speak", "grammar_hint": "Thank her and express what you hope to learn", "expected_patterns": ["Gracias", "Espero que", "Quiero aprender"]}, {"scene_id": "closing", "scene_number": 5, "florencia_says": "Bueno, fue un placer conocerte. Espero que te guste Buenos Aires tanto como a mí. Nos vemos en la milonga, ¿dale?", "audio_key": "ep1_s5_closing", "emotion": "warm_goodbye", "response_type": "free_speak", "grammar_hint": "Say goodbye and express that you hope to see her soon", "expected_patterns": ["Hasta pronto", "Espero que", "Fue un placer"]}]'::jsonb,
    'Describe el Café Tortoni y tu primera impresión de Florencia. ¿Qué esperas aprender de ella? Usa frases como "Espero que..." y "Quiero que..."',
    'Describe Café Tortoni and your first impression of Florencia. What do you hope to learn from her? Use phrases like "Espero que..." and "Quiero que..."', 10);

    -- Episode 2: La Milonga
    INSERT INTO public.episodes (story_arc_id, episode_number, title_es, title_en, scenario, grammar_focus, grammar_triggers, scenes, journal_prompt_es, journal_prompt_en, estimated_duration) VALUES
    (arc_id, 2, 'La Milonga', 'The Tango Hall', 'Tu primera experiencia en una milonga tradicional de San Telmo con Florencia', 'subjunctive_emotions', ARRAY['Me alegra que', 'Es triste que', 'Me sorprende que', 'Me encanta que'],
    '[{"scene_id": "arrival_milonga", "scene_number": 1, "florencia_says": "¡Llegaste! Me alegra que hayas venido. Mirá este lugar - esta milonga tiene 80 años de historia. ¿Qué te parece?", "audio_key": "ep2_s1_arrival", "emotion": "excited", "response_type": "free_speak", "grammar_hint": "Express what you think about the place using emotion phrases", "expected_patterns": ["Me encanta", "Es increíble", "Me sorprende que"]}, {"scene_id": "tango_lesson", "scene_number": 2, "florencia_says": "Vení, te voy a mostrar los pasos básicos. Es importante que escuches la música primero. El tango tiene un ritmo especial. Me alegra que quieras aprender.", "audio_key": "ep2_s2_lesson", "emotion": "patient_teacher", "response_type": "guided", "options": [{"text": "Me sorprende que sea tan difícil escuchar el ritmo.", "next_scene": "rhythm_help", "grammar_correct": true, "uses_subjunctive": true}, {"text": "¡Me encanta la música! ¿Podemos bailar?", "next_scene": "first_dance", "grammar_correct": true}]}, {"scene_id": "rhythm_help", "scene_number": 3, "florencia_says": "No te preocupes, es normal. Me alegra que seas honesto. Cerrá los ojos y sentí la música en el corazón. El tango es emoción pura.", "audio_key": "ep2_s3_rhythm", "emotion": "encouraging", "response_type": "free_speak", "grammar_hint": "Express how you feel about learning tango", "expected_patterns": ["Me alegra que", "Es emocionante que"]}, {"scene_id": "first_dance", "scene_number": 3, "florencia_says": "¡Dale! Me encanta que tengas entusiasmo. Poné tu mano acá... así. Es triste que mucha gente no conozca el tango verdadero, solo el de las películas.", "audio_key": "ep2_s3_dance", "emotion": "nostalgic", "response_type": "free_speak", "grammar_hint": "Ask about the difference between real tango and movie tango", "expected_patterns": ["¿Por qué", "Me sorprende que", "¿Cuál es la diferencia"]}, {"scene_id": "personal_story", "scene_number": 4, "florencia_says": "Mi abuela Rosa me enseñó a bailar cuando tenía 6 años. Me emociona que su memoria viva cada vez que bailo. El tango es mi conexión con ella.", "audio_key": "ep2_s4_story", "emotion": "emotional_nostalgic", "response_type": "free_speak", "grammar_hint": "Express empathy and share something personal", "expected_patterns": ["Es hermoso que", "Me alegra que", "También yo"]}, {"scene_id": "closing_milonga", "scene_number": 5, "florencia_says": "Bailaste muy bien para ser tu primera vez. Me alegra que hayas disfrutado. ¿Querés venir al mercado de San Telmo conmigo el domingo?", "audio_key": "ep2_s5_closing", "emotion": "happy", "response_type": "guided", "options": [{"text": "¡Sí! Me encanta que me invites. ¿A qué hora?", "next_scene": "end_yes", "grammar_correct": true, "uses_subjunctive": true}, {"text": "Me encantaría. Gracias por enseñarme.", "next_scene": "end_thanks", "grammar_correct": true}]}]'::jsonb,
    'Describe tu experiencia en la milonga. ¿Qué emociones sentiste? ¿Qué te sorprendió del tango? Usa expresiones como "Me alegra que...", "Me sorprende que...", "Es emocionante que..."',
    'Describe your experience at the milonga. What emotions did you feel? What surprised you about tango? Use expressions like "Me alegra que...", "Me sorprende que...", "Es emocionante que..."', 12);

    -- Episode 3: La Feria de San Telmo
    INSERT INTO public.episodes (story_arc_id, episode_number, title_es, title_en, scenario, grammar_focus, grammar_triggers, scenes, journal_prompt_es, journal_prompt_en, estimated_duration) VALUES
    (arc_id, 3, 'La Feria de San Telmo', 'The San Telmo Market', 'Explorás el famoso mercado de antigüedades de San Telmo con Florencia', 'subjunctive_doubt', ARRAY['No creo que', 'Dudo que', 'Es posible que', 'No es seguro que'],
    '[{"scene_id": "market_arrival", "scene_number": 1, "florencia_says": "¡Bienvenido a la Feria de San Telmo! Es el mercado de antigüedades más grande de Buenos Aires. No creo que encuentres algo así en otro lugar del mundo.", "audio_key": "ep3_s1_arrival", "emotion": "proud", "response_type": "free_speak", "grammar_hint": "Express what you see or ask about the market", "expected_patterns": ["No creo que", "Es posible que", "¿Qué es"]}, {"scene_id": "antique_find", "scene_number": 2, "florencia_says": "Mirá estos discos de vinide Gardel. Dudo que sean originales de 1930, pero son hermosos igual. ¿Te gusta la música de Gardel?", "audio_key": "ep3_s2_antique", "emotion": "curious", "response_type": "guided", "options": [{"text": "No creo que conozca su música. ¿Quién es Gardel?", "next_scene": "gardel_intro", "grammar_correct": true, "uses_subjunctive": true}, {"text": "Sí, es posible que haya escuchado algunas canciones.", "next_scene": "gardel_fan", "grammar_correct": true, "uses_subjunctive": true}]}, {"scene_id": "gardel_intro", "scene_number": 3, "florencia_says": "¡Carlos Gardel es el rey del tango! Nació en Francia pero es nuestro. Hay gente que duda que haya existido alguien mejor. Decimos que cada día canta mejor, aunque murió en 1935.", "audio_key": "ep3_s3_gardel_intro", "emotion": "passionate", "response_type": "free_speak", "grammar_hint": "Express doubt or possibility about something", "expected_patterns": ["No creo que", "Es posible que", "Dudo que"]}, {"scene_id": "gardel_fan", "scene_number": 3, "florencia_says": "¡Qué bien! Es raro que los extranjeros conozcan a Gardel. Dudo que exista mejor embajador del tango argentino. ¿Cuál es tu canción favorita?", "audio_key": "ep3_s3_gardel_fan", "emotion": "impressed", "response_type": "free_speak", "grammar_hint": "Share your favorite song or express uncertainty", "expected_patterns": ["No estoy seguro", "Es posible que sea", "Creo que"]}, {"scene_id": "vendor_chat", "scene_number": 4, "florencia_says": "Este vendedor dice que este reloj es de 1890. Dudo que sea tan antiguo, pero es lindo. En las ferias no es seguro que todo sea auténtico, ¿sabés?", "audio_key": "ep3_s4_vendor", "emotion": "skeptical", "response_type": "free_speak", "grammar_hint": "Express doubt about the vendors claims", "expected_patterns": ["No creo que", "Dudo que", "Es posible que"]}, {"scene_id": "closing_market", "scene_number": 5, "florencia_says": "Fue un día genial. No creo que haya mejor manera de conocer Buenos Aires que caminando por San Telmo. ¿Querés que te cuente sobre mi familia el próximo encuentro?", "audio_key": "ep3_s5_closing", "emotion": "satisfied", "response_type": "free_speak", "grammar_hint": "Accept and express what you hope to learn", "expected_patterns": ["Sí", "Me gustaría", "Espero que"]}]'::jsonb,
    'Describe la Feria de San Telmo. ¿Qué cosas viste? ¿Dudas de la autenticidad de algunas cosas? Usa expresiones como "No creo que...", "Dudo que...", "Es posible que..."',
    'Describe the San Telmo Fair. What things did you see? Do you doubt the authenticity of some things? Use expressions like "No creo que...", "Dudo que...", "Es posible que..."', 10);

    -- Episode 4: Asado en Familia
    INSERT INTO public.episodes (story_arc_id, episode_number, title_es, title_en, scenario, grammar_focus, grammar_triggers, scenes, journal_prompt_es, journal_prompt_en, estimated_duration) VALUES
    (arc_id, 4, 'Asado en Familia', 'Family Barbecue', 'Florencia te invita a un asado dominical con su madre Elena', 'subjunctive_desires', ARRAY['Quiero que', 'Prefiero que', 'Necesito que', 'Me gustaría que'],
    '[{"scene_id": "arrival_home", "scene_number": 1, "florencia_says": "¡Pasá, pasá! Bienvenido a mi casa. Mi mamá Elena está preparando el asado. Quiero que la conozcas, es una mujer increíble.", "audio_key": "ep4_s1_arrival", "emotion": "welcoming", "response_type": "free_speak", "grammar_hint": "Thank her and express what you want to know about her family", "expected_patterns": ["Gracias", "Quiero que", "Me gustaría que"]}, {"scene_id": "meet_elena", "scene_number": 2, "florencia_says": "Mamá, este es mi amigo. Necesito que le muestres cómo hacés el chimichurri. ¡Es el mejor de Buenos Aires!", "audio_key": "ep4_s2_elena", "emotion": "proud", "response_type": "guided", "options": [{"text": "¡Mucho gusto, Elena! Me gustaría que me enseñe la receta.", "next_scene": "chimichurri", "grammar_correct": true, "uses_subjunctive": true}, {"text": "Es un placer conocerla. Su casa es muy linda.", "next_scene": "house_tour", "grammar_correct": true}]}, {"scene_id": "chimichurri", "scene_number": 3, "florencia_says": "Mi mamá prefiere que usemos perejil fresco del jardín. Dice que necesita que el chimichurri descanse una hora antes de servir. Es su secreto.", "audio_key": "ep4_s3_chimichurri", "emotion": "sharing_wisdom", "response_type": "free_speak", "grammar_hint": "Ask about the recipe or express what you want to learn", "expected_patterns": ["Quiero que", "Me gustaría que", "¿Qué necesito"]}, {"scene_id": "house_tour", "scene_number": 3, "florencia_says": "Te muestro la casa. Esta es la cocina donde mi abuela Rosa me enseñó a bailar. Quiero que veas las fotos de ella en el living.", "audio_key": "ep4_s3_house", "emotion": "nostalgic", "response_type": "free_speak", "grammar_hint": "Ask about the grandmother or express interest", "expected_patterns": ["Me gustaría que", "Quiero que", "Contame de"]}, {"scene_id": "asado_time", "scene_number": 4, "florencia_says": "El asado está listo. En Argentina, preferimos que la carne esté bien cocida, no como en otros países. ¿Vos cómo la querés?", "audio_key": "ep4_s4_asado", "emotion": "hosting", "response_type": "free_speak", "grammar_hint": "Express how you want your meat using desire phrases", "expected_patterns": ["Prefiero que", "Quiero que", "Me gustaría"]}, {"scene_id": "closing_meal", "scene_number": 5, "florencia_says": "Qué lindo fue tenerte acá. Mi mamá quiere que vuelvas pronto. Dice que necesita que alguien aprecie su cocina como vos.", "audio_key": "ep4_s5_closing", "emotion": "warm", "response_type": "free_speak", "grammar_hint": "Express gratitude and what you want for the future", "expected_patterns": ["Gracias", "Me gustaría que", "Quiero que"]}]'::jsonb,
    'Describe el asado con la familia de Florencia. ¿Qué querés aprender de la cultura argentina? ¿Qué te gustaría que te enseñen? Usa "Quiero que...", "Me gustaría que...", "Prefiero que..."',
    'Describe the barbecue with Florencias family. What do you want to learn about Argentine culture? What would you like them to teach you? Use "Quiero que...", "Me gustaría que...", "Prefiero que..."', 12);

    -- Episode 5: La Recoleta
    INSERT INTO public.episodes (story_arc_id, episode_number, title_es, title_en, scenario, grammar_focus, grammar_triggers, scenes, journal_prompt_es, journal_prompt_en, estimated_duration) VALUES
    (arc_id, 5, 'La Recoleta', 'The Recoleta Cemetery', 'Un paseo por el cementerio más famoso de Buenos Aires con reflexiones sobre la historia argentina', 'preterite_vs_imperfect', ARRAY['Cuando era', 'Mientras', 'De repente', 'Todos los días'],
    '[{"scene_id": "cemetery_entrance", "scene_number": 1, "florencia_says": "Este es el Cementerio de la Recoleta. Cuando era niña, mi abuela me traía acá todos los domingos. Siempre me contaba historias de las personas famosas que están enterradas aquí.", "audio_key": "ep5_s1_entrance", "emotion": "reflective", "response_type": "free_speak", "grammar_hint": "Ask about her childhood memories using past tenses", "expected_patterns": ["¿Cómo era", "¿Qué hacían", "Cuando eras niña"]}, {"scene_id": "evita_tomb", "scene_number": 2, "florencia_says": "Mirá, esta es la tumba de Eva Perón. Evita murió en 1952, pero mientras vivía, ayudó a millones de argentinos pobres. Era una figura muy controversial.", "audio_key": "ep5_s2_evita", "emotion": "respectful", "response_type": "guided", "options": [{"text": "¿Cómo era Evita? ¿Qué hacía por los pobres?", "next_scene": "evita_story", "grammar_correct": true}, {"text": "Mientras ella vivía, ¿la gente la quería o la odiaba?", "next_scene": "evita_opinion", "grammar_correct": true}]}, {"scene_id": "evita_story", "scene_number": 3, "florencia_says": "Evita era actriz antes de conocer a Perón. Un día conoció al coronel Perón y todo cambió. Mientras él gobernaba, ella trabajaba con los descamisados - los trabajadores pobres.", "audio_key": "ep5_s3_evita_story", "emotion": "storytelling", "response_type": "free_speak", "grammar_hint": "Use preterite and imperfect to talk about historical events", "expected_patterns": ["Entonces", "Mientras", "De repente"]}, {"scene_id": "family_memories", "scene_number": 4, "florencia_says": "Mi padre siempre decía que los domingos eran sagrados. Mientras mi mamá cocinaba, él escuchaba tangos en la radio. Un día, de repente, tuvo un infarto. Yo tenía solo 20 años.", "audio_key": "ep5_s4_memories", "emotion": "sad_nostalgic", "response_type": "free_speak", "grammar_hint": "Express empathy and share a memory of your own", "expected_patterns": ["Lo siento", "Cuando yo era", "Mi familia también"]}, {"scene_id": "closing_reflection", "scene_number": 5, "florencia_says": "Este lugar me hace pensar en el pasado. Antes yo era más triste, pero ahora entiendo que la vida continúa. ¿Vamos a tomar un café y hablar de cosas más alegres?", "audio_key": "ep5_s5_closing", "emotion": "hopeful", "response_type": "free_speak", "grammar_hint": "Accept and reflect on what you learned", "expected_patterns": ["Sí", "Antes yo", "Fue interesante"]}]'::jsonb,
    'Describe tu visita al Cementerio de la Recoleta. ¿Qué aprendiste sobre la historia argentina? Usa el pretérito y el imperfecto para contar lo que pasó y cómo era.',
    'Describe your visit to Recoleta Cemetery. What did you learn about Argentine history? Use preterite and imperfect to tell what happened and what it was like.', 10);

    -- Episode 6: Crisis Porteña
    INSERT INTO public.episodes (story_arc_id, episode_number, title_es, title_en, scenario, grammar_focus, grammar_triggers, scenes, journal_prompt_es, journal_prompt_en, estimated_duration) VALUES
    (arc_id, 6, 'Crisis Porteña', 'Buenos Aires Crisis', 'Una conversación profunda sobre los desafíos de la vida en Argentina', 'imperfect_subjunctive', ARRAY['Si tuviera', 'Si pudiera', 'Quisiera que', 'Como si fuera'],
    '[{"scene_id": "cafe_conversation", "scene_number": 1, "florencia_says": "Perdón si estoy un poco seria hoy. Si tuviera más plata, no tendría que trabajar tanto. A veces siento como si fuera imposible vivir de mi arte.", "audio_key": "ep6_s1_cafe", "emotion": "frustrated", "response_type": "free_speak", "grammar_hint": "Express empathy using hypothetical phrases", "expected_patterns": ["Si yo estuviera", "Quisiera que", "Entiendo cómo"]}, {"scene_id": "economy_talk", "scene_number": 2, "florencia_says": "Si vivieras en Argentina, entenderías. La inflación nos come vivos. Si pudiera irme a Europa, a veces pienso... pero no, este es mi país.", "audio_key": "ep6_s2_economy", "emotion": "conflicted", "response_type": "guided", "options": [{"text": "Si yo pudiera ayudarte de alguna manera, lo haría.", "next_scene": "support", "grammar_correct": true, "uses_subjunctive": true}, {"text": "¿Quisiera que te fueras de Argentina?", "next_scene": "stay_or_go", "grammar_correct": true, "uses_subjunctive": true}]}, {"scene_id": "support", "scene_number": 3, "florencia_says": "Gracias, eso significa mucho. Si todos fueran tan comprensivos como vos... A veces me siento como si nadie entendiera lo difícil que es ser artista acá.", "audio_key": "ep6_s3_support", "emotion": "touched", "response_type": "free_speak", "grammar_hint": "Continue offering support using conditional forms", "expected_patterns": ["Si necesitaras", "Quisiera que supieras", "Como si fuera"]}, {"scene_id": "stay_or_go", "scene_number": 3, "florencia_says": "No sé. Si me fuera, extrañaría todo: el mate, las milongas, mi mamá. Pero si me quedara sin cambiar nada, seguiría igual de frustrada. Es como si no hubiera solución perfecta.", "audio_key": "ep6_s3_stay_go", "emotion": "torn", "response_type": "free_speak", "grammar_hint": "Share your thoughts on her dilemma", "expected_patterns": ["Si yo fuera vos", "Quisiera que", "Como si"]}, {"scene_id": "hope_returns", "scene_number": 4, "florencia_says": "Pero sabés qué, si no tuviera esperanza, no seguiría bailando. El tango me salva. Quisiera que vieras mi show este viernes. ¿Vendrías?", "audio_key": "ep6_s4_hope", "emotion": "hopeful", "response_type": "free_speak", "grammar_hint": "Accept the invitation and express your wishes for her", "expected_patterns": ["Claro que sí", "Quisiera que", "Si pudiera"]}]'::jsonb,
    'Reflexiona sobre la conversación con Florencia. ¿Qué harías si estuvieras en su situación? ¿Qué le recomendarías? Usa el subjuntivo imperfecto: "Si tuviera...", "Quisiera que...", "Como si fuera..."',
    'Reflect on your conversation with Florencia. What would you do if you were in her situation? What would you recommend? Use imperfect subjunctive: "Si tuviera...", "Quisiera que...", "Como si fuera..."', 12);

    -- Episode 7: La Boca Colorida
    INSERT INTO public.episodes (story_arc_id, episode_number, title_es, title_en, scenario, grammar_focus, grammar_triggers, scenes, journal_prompt_es, journal_prompt_en, estimated_duration) VALUES
    (arc_id, 7, 'La Boca Colorida', 'Colorful La Boca', 'Explorando el barrio más colorido de Buenos Aires y el estadio de Boca Juniors', 'conditional_tense', ARRAY['Me gustaría', 'Podría', 'Sería', 'Tendría que'],
    '[{"scene_id": "caminito", "scene_number": 1, "florencia_says": "¡Bienvenido a La Boca! Este es el Caminito, el lugar más colorido de Buenos Aires. ¿Te gustaría sacar fotos? Podríamos caminar un rato.", "audio_key": "ep7_s1_caminito", "emotion": "cheerful", "response_type": "free_speak", "grammar_hint": "Express what you would like to do using conditional", "expected_patterns": ["Me gustaría", "Podría", "Sería genial"]}, {"scene_id": "bombonera", "scene_number": 2, "florencia_says": "Este es el estadio de Boca Juniors, La Bombonera. Mi papá era hincha fanático. Él diría que este es el lugar más sagrado de Argentina. ¿Te gusta el fútbol?", "audio_key": "ep7_s2_bombonera", "emotion": "nostalgic_proud", "response_type": "guided", "options": [{"text": "Sí, me encantaría ver un partido aquí. Sería increíble.", "next_scene": "football_fan", "grammar_correct": true}, {"text": "No mucho, pero me gustaría entender por qué es tan importante.", "next_scene": "football_culture", "grammar_correct": true}]}, {"scene_id": "football_fan", "scene_number": 3, "florencia_says": "¡Tendrías que venir un domingo de superclásico! El ambiente sería algo que nunca olvidarías. Boca contra River es más que fútbol, es pasión pura.", "audio_key": "ep7_s3_fan", "emotion": "excited", "response_type": "free_speak", "grammar_hint": "Express what you would do at a match", "expected_patterns": ["Me gustaría", "Gritaría", "Sería"]}, {"scene_id": "football_culture", "scene_number": 3, "florencia_says": "El fútbol acá es religión. Podrías decir que cada barrio tiene su equipo. Mi papá decía que sin Boca, la vida no tendría sentido. Era su forma de conectar con otros.", "audio_key": "ep7_s3_culture", "emotion": "explaining", "response_type": "free_speak", "grammar_hint": "Ask questions about the culture using conditional", "expected_patterns": ["¿Sería posible", "¿Podría", "Me gustaría saber"]}, {"scene_id": "artists_corner", "scene_number": 4, "florencia_says": "Mirá estos artistas callejeros. Me encantaría poder vivir del arte así de libre. Tendría que ser muy valiente para dejarlo todo y pintar en la calle.", "audio_key": "ep7_s4_artists", "emotion": "dreaming", "response_type": "free_speak", "grammar_hint": "Share what you would do if you were an artist", "expected_patterns": ["Yo pintaría", "Me gustaría", "Sería difícil"]}, {"scene_id": "closing_boca", "scene_number": 5, "florencia_says": "Fue un día hermoso. El próximo encuentro sería el último antes de que te vayas. ¿Te gustaría que nos despidiéramos en mi lugar favorito de Buenos Aires?", "audio_key": "ep7_s5_closing", "emotion": "bittersweet", "response_type": "free_speak", "grammar_hint": "Accept and express what the experience has meant to you", "expected_patterns": ["Me encantaría", "Sería un honor", "Tendría que"]}]'::jsonb,
    'Describe tu visita a La Boca. ¿Qué te gustaría hacer si vivieras en Buenos Aires? ¿Qué cambiarías de tu vida? Usa el condicional: "Me gustaría...", "Sería...", "Podría..."',
    'Describe your visit to La Boca. What would you like to do if you lived in Buenos Aires? What would you change about your life? Use conditional: "Me gustaría...", "Sería...", "Podría..."', 10);

    -- Episode 8: Despedida
    INSERT INTO public.episodes (story_arc_id, episode_number, title_es, title_en, scenario, grammar_focus, grammar_triggers, scenes, journal_prompt_es, journal_prompt_en, estimated_duration) VALUES
    (arc_id, 8, 'Despedida', 'Farewell', 'Tu último encuentro con Florencia en la terraza de su edificio con vista a Buenos Aires', 'comprehensive_review', ARRAY['Espero que', 'Me alegra que', 'Si pudiera', 'Me gustaría que'],
    '[{"scene_id": "rooftop", "scene_number": 1, "florencia_says": "Bienvenido a mi lugar secreto. Desde esta terraza se ve todo Buenos Aires. Es importante que veas esto antes de irte. Me alegra que hayas venido.", "audio_key": "ep8_s1_rooftop", "emotion": "warm_nostalgic", "response_type": "free_speak", "grammar_hint": "Express your feelings about the view and your time in Buenos Aires", "expected_patterns": ["Es increíble", "Me alegra que", "Espero que"]}, {"scene_id": "reflection", "scene_number": 2, "florencia_says": "¿Sabés qué? Cuando te conocí en el café, no pensé que nos íbamos a hacer tan amigos. Me sorprende que el tiempo haya pasado tan rápido.", "audio_key": "ep8_s2_reflection", "emotion": "touched", "response_type": "free_speak", "grammar_hint": "Share what you have learned and how you have changed", "expected_patterns": ["Me sorprende que", "Aprendí que", "Si no te hubiera conocido"]}, {"scene_id": "lessons_learned", "scene_number": 3, "florencia_says": "Espero que nunca olvides lo que aprendiste acá. El tango, el asado, las historias... Quiero que lleves un pedacito de Argentina con vos a donde vayas.", "audio_key": "ep8_s3_lessons", "emotion": "earnest", "response_type": "guided", "options": [{"text": "Nunca olvidaré. Me gustaría que supieras cuánto significó esto para mí.", "next_scene": "gratitude", "grammar_correct": true, "uses_subjunctive": true}, {"text": "Espero que podamos vernos de nuevo algún día.", "next_scene": "future_hope", "grammar_correct": true, "uses_subjunctive": true}]}, {"scene_id": "gratitude", "scene_number": 4, "florencia_says": "Vos también cambiaste mi vida. Me hiciste ver que puedo compartir mi cultura y mi historia. Si pudiera, detendría el tiempo ahora mismo.", "audio_key": "ep8_s4_gratitude", "emotion": "emotional", "response_type": "free_speak", "grammar_hint": "Express what you would do if you could stay longer", "expected_patterns": ["Si pudiera", "Me gustaría que", "Quisiera"]}, {"scene_id": "future_hope", "scene_number": 4, "florencia_says": "Definitivamente. Es posible que algún día yo viaje a tu país, o que vos vuelvas a Buenos Aires. Dudo que esta sea la última vez que nos veamos.", "audio_key": "ep8_s4_future", "emotion": "hopeful", "response_type": "free_speak", "grammar_hint": "Express your hopes for the future", "expected_patterns": ["Espero que", "Es posible que", "Me gustaría que"]}, {"scene_id": "final_goodbye", "scene_number": 5, "florencia_says": "Bueno, llegó el momento. No me gustan las despedidas largas. Solo quiero que sepas que te voy a extrañar. Cuidate mucho, ¿dale? Y practicá tu español.", "audio_key": "ep8_s5_goodbye", "emotion": "bittersweet_loving", "response_type": "free_speak", "grammar_hint": "Say your final goodbye using all the grammar you have learned", "expected_patterns": ["Gracias por todo", "Espero que", "Si algún día", "Me alegra que"]}]'::jsonb,
    'Escribe una carta de despedida a Florencia. Incluye: qué aprendiste, qué esperas para el futuro, y qué harías si pudieras quedarte más tiempo. Usa todos los tiempos y modos que aprendiste.',
    'Write a farewell letter to Florencia. Include: what you learned, what you hope for the future, and what you would do if you could stay longer. Use all the tenses and moods you learned.', 15);
    
END $$;

-- Final verification
SELECT 'Schema rebuild complete!' as status;
SELECT table_name, (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as columns
FROM information_schema.tables t 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

