-- LoboLingo Database Schema for Supabase
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    spanish_level TEXT DEFAULT 'A1' CHECK (spanish_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    goals TEXT[] DEFAULT '{}',
    preferred_topics TEXT[] DEFAULT '{}',
    correction_depth TEXT DEFAULT 'standard' CHECK (correction_depth IN ('light', 'standard', 'deep')),
    voice_speed DECIMAL DEFAULT 1.0,
    accent_preference TEXT DEFAULT 'mexico' CHECK (accent_preference IN ('spain', 'mexico', 'argentina', 'colombia')),
    created_at TIMESTAMPTZ DEFAULT NOW(), 
    updated_at TIMESTAMPTZ DEFAULT NOW()       
);

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('open', 'topic', 'vocabulary', 'grammar', 'roleplay')),
    topic TEXT,
    grammar_focus TEXT,
    role_play_persona TEXT,
    vocabulary_set_id UUID,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    audio_url TEXT,
    corrections JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress table
CREATE TABLE IF NOT EXISTS public.progress (
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
CREATE TABLE IF NOT EXISTS public.vocabulary_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    words JSONB NOT NULL DEFAULT '[]',
    is_default BOOLEAN DEFAULT FALSE,
    category TEXT DEFAULT 'custom',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tutor Greetings table (stores pre-generated greeting audio)
CREATE TABLE IF NOT EXISTS public.tutor_greetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id TEXT NOT NULL CHECK (character_id IN ('malena', 'ana_maria', 'marcela')),
    greeting_index INTEGER NOT NULL CHECK (greeting_index >= 0 AND greeting_index < 3),
    greeting_text TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(character_id, greeting_index)
);

-- ============================================
-- GRAMMAR GYM TABLES
-- ============================================

-- Grammar Curriculum table - Defines the 12-week curriculum for each level
CREATE TABLE IF NOT EXISTS public.grammar_curriculum (
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

-- Daily Lessons table - Specific content for each day within a week
CREATE TABLE IF NOT EXISTS public.daily_lessons (
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

-- User Curriculum Progress table - Tracks where user is in curriculum
CREATE TABLE IF NOT EXISTS public.user_curriculum_progress (
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

-- Workout Sessions table - Tracks completed workouts
CREATE TABLE IF NOT EXISTS public.workout_sessions (
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

-- Writing Exercises table - Stores writing submissions and feedback
CREATE TABLE IF NOT EXISTS public.writing_submissions (
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

-- Placement Tests table - Stores placement test results
CREATE TABLE IF NOT EXISTS public.placement_tests (
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

-- Quick Mission Topics table - Predefined topics for quick missions
CREATE TABLE IF NOT EXISTS public.quick_mission_topics (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON public.conversations(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_vocabulary_sets_user_id ON public.vocabulary_sets(user_id);

-- Grammar Gym indexes
CREATE INDEX IF NOT EXISTS idx_grammar_curriculum_level ON public.grammar_curriculum(level);
CREATE INDEX IF NOT EXISTS idx_daily_lessons_curriculum ON public.daily_lessons(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_user_curriculum_progress_user ON public.user_curriculum_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON public.workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed ON public.workout_sessions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_writing_submissions_user ON public.writing_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_submissions_completed ON public.writing_submissions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_placement_tests_user ON public.placement_tests(user_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations" ON public.conversations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own conversations" ON public.conversations;
CREATE POLICY "Users can create their own conversations" ON public.conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
CREATE POLICY "Users can update their own conversations" ON public.conversations
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
CREATE POLICY "Users can create messages in their conversations" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

-- RLS Policies for progress
DROP POLICY IF EXISTS "Users can view their own progress" ON public.progress;
CREATE POLICY "Users can view their own progress" ON public.progress
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own progress" ON public.progress;
CREATE POLICY "Users can insert their own progress" ON public.progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own progress" ON public.progress;
CREATE POLICY "Users can update their own progress" ON public.progress
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for vocabulary sets
DROP POLICY IF EXISTS "Users can view their own and default vocabulary sets" ON public.vocabulary_sets;
CREATE POLICY "Users can view their own and default vocabulary sets" ON public.vocabulary_sets
    FOR SELECT USING (auth.uid() = user_id OR is_default = TRUE);

DROP POLICY IF EXISTS "Users can create their own vocabulary sets" ON public.vocabulary_sets;
CREATE POLICY "Users can create their own vocabulary sets" ON public.vocabulary_sets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own vocabulary sets" ON public.vocabulary_sets;
CREATE POLICY "Users can update their own vocabulary sets" ON public.vocabulary_sets
    FOR UPDATE USING (auth.uid() = user_id AND is_default = FALSE);

DROP POLICY IF EXISTS "Users can delete their own vocabulary sets" ON public.vocabulary_sets;
CREATE POLICY "Users can delete their own vocabulary sets" ON public.vocabulary_sets
    FOR DELETE USING (auth.uid() = user_id AND is_default = FALSE);

-- RLS Policies for tutor greetings (public read access, admin write)
ALTER TABLE public.tutor_greetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tutor greetings" ON public.tutor_greetings;
CREATE POLICY "Anyone can view tutor greetings" ON public.tutor_greetings
    FOR SELECT USING (true);

-- Enable RLS on Grammar Gym tables
ALTER TABLE public.grammar_curriculum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_curriculum_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writing_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_mission_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grammar_curriculum (public read)
DROP POLICY IF EXISTS "Anyone can view grammar curriculum" ON public.grammar_curriculum;
CREATE POLICY "Anyone can view grammar curriculum" ON public.grammar_curriculum
    FOR SELECT USING (true);

-- RLS Policies for daily_lessons (public read)
DROP POLICY IF EXISTS "Anyone can view daily lessons" ON public.daily_lessons;
CREATE POLICY "Anyone can view daily lessons" ON public.daily_lessons
    FOR SELECT USING (true);

-- RLS Policies for user_curriculum_progress
DROP POLICY IF EXISTS "Users can view their own curriculum progress" ON public.user_curriculum_progress;
CREATE POLICY "Users can view their own curriculum progress" ON public.user_curriculum_progress
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own curriculum progress" ON public.user_curriculum_progress;
CREATE POLICY "Users can insert their own curriculum progress" ON public.user_curriculum_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own curriculum progress" ON public.user_curriculum_progress;
CREATE POLICY "Users can update their own curriculum progress" ON public.user_curriculum_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for workout_sessions
DROP POLICY IF EXISTS "Users can view their own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can view their own workout sessions" ON public.workout_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own workout sessions" ON public.workout_sessions;
CREATE POLICY "Users can insert their own workout sessions" ON public.workout_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for writing_submissions
DROP POLICY IF EXISTS "Users can view their own writing submissions" ON public.writing_submissions;
CREATE POLICY "Users can view their own writing submissions" ON public.writing_submissions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own writing submissions" ON public.writing_submissions;
CREATE POLICY "Users can insert their own writing submissions" ON public.writing_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for placement_tests
DROP POLICY IF EXISTS "Users can view their own placement tests" ON public.placement_tests;
CREATE POLICY "Users can view their own placement tests" ON public.placement_tests
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own placement tests" ON public.placement_tests;
CREATE POLICY "Users can insert their own placement tests" ON public.placement_tests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for quick_mission_topics (public read)
DROP POLICY IF EXISTS "Anyone can view quick mission topics" ON public.quick_mission_topics;
CREATE POLICY "Anyone can view quick mission topics" ON public.quick_mission_topics
    FOR SELECT USING (true);

-- Insert default vocabulary sets (only if they don't exist)
INSERT INTO public.vocabulary_sets (name, description, words, is_default, category)
SELECT 'Restaurantes', 'Essential vocabulary for dining out', 
    '[
        {"spanish": "la carta", "english": "the menu", "example_sentence": "¿Me puede traer la carta, por favor?"},
        {"spanish": "la cuenta", "english": "the bill", "example_sentence": "La cuenta, por favor."},
        {"spanish": "el camarero", "english": "the waiter", "example_sentence": "El camarero nos atendió muy bien."},
        {"spanish": "pedir", "english": "to order", "example_sentence": "Quiero pedir el plato del día."},
        {"spanish": "recomendar", "english": "to recommend", "example_sentence": "¿Qué me recomienda?"},
        {"spanish": "reservar", "english": "to reserve", "example_sentence": "Quisiera reservar una mesa para dos."},
        {"spanish": "la propina", "english": "the tip", "example_sentence": "Dejé una buena propina."},
        {"spanish": "el postre", "english": "the dessert", "example_sentence": "¿Tienen postres caseros?"}
    ]'::jsonb, TRUE, 'dining'
WHERE NOT EXISTS (SELECT 1 FROM public.vocabulary_sets WHERE name = 'Restaurantes' AND is_default = TRUE);

INSERT INTO public.vocabulary_sets (name, description, words, is_default, category)
SELECT 'Viajes', 'Travel vocabulary for exploring',
    '[
        {"spanish": "el vuelo", "english": "the flight", "example_sentence": "Mi vuelo sale a las ocho."},
        {"spanish": "el equipaje", "english": "the luggage", "example_sentence": "¿Dónde recojo el equipaje?"},
        {"spanish": "el pasaporte", "english": "the passport", "example_sentence": "Necesito renovar mi pasaporte."},
        {"spanish": "la aduana", "english": "customs", "example_sentence": "Pasamos por la aduana sin problemas."},
        {"spanish": "el alojamiento", "english": "the accommodation", "example_sentence": "Busco alojamiento cerca del centro."},
        {"spanish": "el mapa", "english": "the map", "example_sentence": "¿Tiene un mapa de la ciudad?"},
        {"spanish": "perderse", "english": "to get lost", "example_sentence": "Me perdí buscando el museo."},
        {"spanish": "el recuerdo", "english": "the souvenir", "example_sentence": "Compré recuerdos para mi familia."}
    ]'::jsonb, TRUE, 'travel'
WHERE NOT EXISTS (SELECT 1 FROM public.vocabulary_sets WHERE name = 'Viajes' AND is_default = TRUE);

INSERT INTO public.vocabulary_sets (name, description, words, is_default, category)
SELECT 'Trabajo', 'Professional and workplace vocabulary',
    '[
        {"spanish": "la reunión", "english": "the meeting", "example_sentence": "Tengo una reunión a las tres."},
        {"spanish": "el jefe", "english": "the boss", "example_sentence": "Mi jefe es muy comprensivo."},
        {"spanish": "el sueldo", "english": "the salary", "example_sentence": "Negocié un mejor sueldo."},
        {"spanish": "la entrevista", "english": "the interview", "example_sentence": "La entrevista fue muy bien."},
        {"spanish": "el contrato", "english": "the contract", "example_sentence": "Firmé el contrato ayer."},
        {"spanish": "las vacaciones", "english": "vacation", "example_sentence": "Me tomo vacaciones en agosto."},
        {"spanish": "el colega", "english": "the colleague", "example_sentence": "Mis colegas son muy amables."},
        {"spanish": "el proyecto", "english": "the project", "example_sentence": "Estoy trabajando en un proyecto nuevo."}
    ]'::jsonb, TRUE, 'work'
WHERE NOT EXISTS (SELECT 1 FROM public.vocabulary_sets WHERE name = 'Trabajo' AND is_default = TRUE);

-- ============================================
-- GRAMMAR GYM CURRICULUM SEED DATA
-- ============================================

-- B1 Curriculum (Weeks 1-3)
INSERT INTO public.grammar_curriculum (level, week_number, grammar_focus, title_es, title_en, description, triggers, example_sentences)
SELECT 'B1', 1, 'present_subjunctive_formation', 
    'Formación del Subjuntivo Presente',
    'Present Subjunctive Formation',
    'Learn to form the present subjunctive with regular -ar, -er, -ir verbs',
    ARRAY['que yo hable', 'que tú comas', 'que ella viva', 'que nosotros trabajemos'],
    '[
        {"spanish": "Es importante que estudies todos los días.", "english": "It is important that you study every day."},
        {"spanish": "Quiero que hables más en español.", "english": "I want you to speak more in Spanish."},
        {"spanish": "Es necesario que practiquemos juntos.", "english": "It is necessary that we practice together."}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.grammar_curriculum WHERE level = 'B1' AND week_number = 1);

INSERT INTO public.grammar_curriculum (level, week_number, grammar_focus, title_es, title_en, description, triggers, example_sentences)
SELECT 'B1', 2, 'subjunctive_emotions',
    'Subjuntivo con Emociones',
    'Subjunctive with Emotions',
    'Use the subjunctive to express emotions and feelings about others actions',
    ARRAY['me alegra que', 'es triste que', 'me sorprende que', 'es increíble que'],
    '[
        {"spanish": "Me alegra que estés aquí.", "english": "I am glad that you are here."},
        {"spanish": "Es triste que no puedas venir.", "english": "It is sad that you cannot come."},
        {"spanish": "Me sorprende que hables tan bien.", "english": "I am surprised that you speak so well."}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.grammar_curriculum WHERE level = 'B1' AND week_number = 2);

INSERT INTO public.grammar_curriculum (level, week_number, grammar_focus, title_es, title_en, description, triggers, example_sentences)
SELECT 'B1', 3, 'subjunctive_doubt',
    'Subjuntivo con Duda',
    'Subjunctive with Doubt',
    'Express doubt and uncertainty using the subjunctive mood',
    ARRAY['no creo que', 'dudo que', 'no es seguro que', 'es posible que'],
    '[
        {"spanish": "No creo que ella venga mañana.", "english": "I do not think she will come tomorrow."},
        {"spanish": "Dudo que tengamos tiempo.", "english": "I doubt that we have time."},
        {"spanish": "Es posible que llueva esta tarde.", "english": "It is possible that it will rain this afternoon."}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.grammar_curriculum WHERE level = 'B1' AND week_number = 3);

-- B2 Curriculum (Weeks 1-3)
INSERT INTO public.grammar_curriculum (level, week_number, grammar_focus, title_es, title_en, description, triggers, example_sentences)
SELECT 'B2', 1, 'imperfect_subjunctive',
    'Subjuntivo Imperfecto',
    'Imperfect Subjunctive',
    'Form and use the imperfect subjunctive for hypotheticals and past wishes',
    ARRAY['si yo tuviera', 'si pudiera', 'quisiera que', 'como si fuera'],
    '[
        {"spanish": "Si tuviera más tiempo, viajaría más.", "english": "If I had more time, I would travel more."},
        {"spanish": "Quisiera que me ayudaras.", "english": "I would like you to help me."},
        {"spanish": "Habla como si fuera experto.", "english": "He speaks as if he were an expert."}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.grammar_curriculum WHERE level = 'B2' AND week_number = 1);

INSERT INTO public.grammar_curriculum (level, week_number, grammar_focus, title_es, title_en, description, triggers, example_sentences)
SELECT 'B2', 2, 'past_perfect_subjunctive',
    'Pluscuamperfecto de Subjuntivo',
    'Past Perfect Subjunctive',
    'Express regrets and hypothetical past situations',
    ARRAY['si hubiera sabido', 'ojalá hubiera', 'como si hubiera', 'habría ido si'],
    '[
        {"spanish": "Si hubiera sabido, habría venido antes.", "english": "If I had known, I would have come earlier."},
        {"spanish": "Ojalá hubiera estudiado más.", "english": "I wish I had studied more."},
        {"spanish": "Habría ido si me hubieras invitado.", "english": "I would have gone if you had invited me."}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.grammar_curriculum WHERE level = 'B2' AND week_number = 2);

INSERT INTO public.grammar_curriculum (level, week_number, grammar_focus, title_es, title_en, description, triggers, example_sentences)
SELECT 'B2', 3, 'subjunctive_relative_clauses',
    'Subjuntivo en Cláusulas Relativas',
    'Subjunctive in Relative Clauses',
    'Use subjunctive when describing unknown or nonexistent things',
    ARRAY['busco alguien que', 'necesito algo que', 'no hay nadie que', 'quiero un lugar que'],
    '[
        {"spanish": "Busco a alguien que hable francés.", "english": "I am looking for someone who speaks French."},
        {"spanish": "Necesito un apartamento que tenga balcón.", "english": "I need an apartment that has a balcony."},
        {"spanish": "No hay nadie que pueda ayudarme.", "english": "There is no one who can help me."}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.grammar_curriculum WHERE level = 'B2' AND week_number = 3);

-- Quick Mission Topics seed data
INSERT INTO public.quick_mission_topics (topic_key, title_es, title_en, description, icon, color, grammar_targets, difficulty)
SELECT 'restaurant', 'En el Restaurante', 'At the Restaurant', 'Practice ordering food and making recommendations', '🍽️', '#FF9800', ARRAY['present_subjunctive', 'recommendations'], 'intermediate'
WHERE NOT EXISTS (SELECT 1 FROM public.quick_mission_topics WHERE topic_key = 'restaurant');

INSERT INTO public.quick_mission_topics (topic_key, title_es, title_en, description, icon, color, grammar_targets, difficulty)
SELECT 'travel_plans', 'Planes de Viaje', 'Travel Plans', 'Discuss travel plans and make suggestions', '✈️', '#2196F3', ARRAY['future_tense', 'subjunctive_recommendations'], 'intermediate'
WHERE NOT EXISTS (SELECT 1 FROM public.quick_mission_topics WHERE topic_key = 'travel_plans');

INSERT INTO public.quick_mission_topics (topic_key, title_es, title_en, description, icon, color, grammar_targets, difficulty)
SELECT 'job_interview', 'Entrevista de Trabajo', 'Job Interview', 'Practice professional conversation skills', '💼', '#607D8B', ARRAY['conditional', 'past_subjunctive'], 'advanced'
WHERE NOT EXISTS (SELECT 1 FROM public.quick_mission_topics WHERE topic_key = 'job_interview');

INSERT INTO public.quick_mission_topics (topic_key, title_es, title_en, description, icon, color, grammar_targets, difficulty)
SELECT 'weekend_plans', 'Planes del Fin de Semana', 'Weekend Plans', 'Talk about your weekend activities', '🎉', '#9C27B0', ARRAY['future_tense', 'subjunctive_wishes'], 'intermediate'
WHERE NOT EXISTS (SELECT 1 FROM public.quick_mission_topics WHERE topic_key = 'weekend_plans');

INSERT INTO public.quick_mission_topics (topic_key, title_es, title_en, description, icon, color, grammar_targets, difficulty)
SELECT 'movie_recommendation', 'Recomendar una Película', 'Movie Recommendation', 'Recommend movies and discuss opinions', '🎬', '#E91E63', ARRAY['subjunctive_recommendations', 'opinions'], 'intermediate'
WHERE NOT EXISTS (SELECT 1 FROM public.quick_mission_topics WHERE topic_key = 'movie_recommendation');

INSERT INTO public.quick_mission_topics (topic_key, title_es, title_en, description, icon, color, grammar_targets, difficulty)
SELECT 'giving_advice', 'Dar Consejos', 'Giving Advice', 'Practice giving advice to a friend', '💡', '#4CAF50', ARRAY['subjunctive_recommendations', 'imperatives'], 'intermediate'
WHERE NOT EXISTS (SELECT 1 FROM public.quick_mission_topics WHERE topic_key = 'giving_advice');

-- Daily Lessons for B1 Week 1 (Present Subjunctive Formation)
INSERT INTO public.daily_lessons (curriculum_id, day_number, lesson_type, title, intro_text, mcq_questions, speaking_prompts, writing_exercises)
SELECT 
    gc.id,
    1,
    'workout',
    'Introduction to Subjunctive',
    'Today we learn the basic formation of the present subjunctive. The subjunctive is used to express wishes, doubts, and emotions.',
    '[
        {"question": "Complete: Es importante que tú _____ (hablar) español.", "options": ["hablas", "hables", "hablar", "hablás"], "correct": "hables", "explanation": "After ''Es importante que'', use subjunctive: hables"},
        {"question": "Complete: Quiero que ella _____ (comer) conmigo.", "options": ["come", "coma", "comer", "comía"], "correct": "coma", "explanation": "After ''Quiero que'', use subjunctive: coma"},
        {"question": "Complete: Es necesario que nosotros _____ (estudiar).", "options": ["estudiamos", "estudiemos", "estudiar", "estudiábamos"], "correct": "estudiemos", "explanation": "After ''Es necesario que'', use subjunctive: estudiemos"}
    ]'::jsonb,
    '[
        {"prompt": "Your tutor wants you to practice more. Say: I want you to practice every day.", "expected_grammar": "Quiero que practiques", "hint": "Use ''Quiero que'' + subjunctive"},
        {"prompt": "Tell your tutor it is important that they speak slowly.", "expected_grammar": "Es importante que hables", "hint": "Use ''Es importante que'' + subjunctive"}
    ]'::jsonb,
    '[
        {"type": "gap_fill", "prompt": "Es necesario que ella _____ (trabajar) más.", "answer": "trabaje"},
        {"type": "sentence_transform", "prompt": "Change to subjunctive: Creo que él estudia mucho → No creo que él _____", "answer": "estudie"}
    ]'::jsonb
FROM public.grammar_curriculum gc
WHERE gc.level = 'B1' AND gc.week_number = 1
AND NOT EXISTS (SELECT 1 FROM public.daily_lessons dl WHERE dl.curriculum_id = gc.id AND dl.day_number = 1);

INSERT INTO public.daily_lessons (curriculum_id, day_number, lesson_type, title, intro_text, mcq_questions, speaking_prompts, writing_exercises)
SELECT 
    gc.id,
    2,
    'workout',
    'Irregular Subjunctive Verbs',
    'Some common verbs have irregular subjunctive forms. Let us practice ser, estar, ir, and saber.',
    '[
        {"question": "Complete: Es importante que tú _____ (ser) puntual.", "options": ["eres", "seas", "ser", "serás"], "correct": "seas", "explanation": "Ser in subjunctive: sea, seas, sea, seamos, sean"},
        {"question": "Complete: Quiero que ella _____ (estar) aquí.", "options": ["está", "esté", "estar", "estará"], "correct": "esté", "explanation": "Estar in subjunctive: esté, estés, esté, estemos, estén"},
        {"question": "Complete: Es necesario que nosotros _____ (ir) juntos.", "options": ["vamos", "vayamos", "ir", "iremos"], "correct": "vayamos", "explanation": "Ir in subjunctive: vaya, vayas, vaya, vayamos, vayan"}
    ]'::jsonb,
    '[
        {"prompt": "Tell your friend you want them to be happy.", "expected_grammar": "Quiero que seas feliz", "hint": "Use ''Quiero que'' + ser in subjunctive"},
        {"prompt": "Say it is important that we go together.", "expected_grammar": "Es importante que vayamos", "hint": "Use ''Es importante que'' + ir in subjunctive"}
    ]'::jsonb,
    '[
        {"type": "gap_fill", "prompt": "Quiero que tú _____ (saber) la verdad.", "answer": "sepas"},
        {"type": "gap_fill", "prompt": "Es necesario que él _____ (ir) al médico.", "answer": "vaya"}
    ]'::jsonb
FROM public.grammar_curriculum gc
WHERE gc.level = 'B1' AND gc.week_number = 1
AND NOT EXISTS (SELECT 1 FROM public.daily_lessons dl WHERE dl.curriculum_id = gc.id AND dl.day_number = 2);

INSERT INTO public.daily_lessons (curriculum_id, day_number, lesson_type, title, intro_text, mcq_questions, speaking_prompts, writing_exercises)
SELECT 
    gc.id,
    3,
    'workout',
    'More Practice with Triggers',
    'Today we focus on recognizing when to use subjunctive. Look for trigger phrases!',
    '[
        {"question": "Which sentence requires subjunctive?", "options": ["Creo que viene", "No creo que viene", "Sé que viene", "Pienso que viene"], "correct": "No creo que viene", "explanation": "''No creo que'' expresses doubt, requiring subjunctive: No creo que venga"},
        {"question": "Complete: Espero que tú _____ (tener) un buen día.", "options": ["tienes", "tengas", "tener", "tendrás"], "correct": "tengas", "explanation": "''Espero que'' expresses hope/wish, requiring subjunctive"},
        {"question": "Complete: Es mejor que nosotros _____ (salir) temprano.", "options": ["salimos", "salgamos", "salir", "saldremos"], "correct": "salgamos", "explanation": "''Es mejor que'' requires subjunctive: salgamos"}
    ]'::jsonb,
    '[
        {"prompt": "Express hope that your friend has a good trip.", "expected_grammar": "Espero que tengas", "hint": "Use ''Espero que'' + tener in subjunctive"},
        {"prompt": "Say it is better that we leave early.", "expected_grammar": "Es mejor que salgamos", "hint": "Use ''Es mejor que'' + salir in subjunctive"}
    ]'::jsonb,
    '[
        {"type": "free_response", "prompt": "Write 2-3 sentences about what you want your Spanish tutor to do. Use ''Quiero que...'' and ''Es importante que...''", "grammar_target": "present_subjunctive"}
    ]'::jsonb
FROM public.grammar_curriculum gc
WHERE gc.level = 'B1' AND gc.week_number = 1
AND NOT EXISTS (SELECT 1 FROM public.daily_lessons dl WHERE dl.curriculum_id = gc.id AND dl.day_number = 3);

-- Daily Lessons for B2 Week 1 (Imperfect Subjunctive)
INSERT INTO public.daily_lessons (curriculum_id, day_number, lesson_type, title, intro_text, mcq_questions, speaking_prompts, writing_exercises)
SELECT 
    gc.id,
    1,
    'workout',
    'Introduction to Imperfect Subjunctive',
    'The imperfect subjunctive is used for hypothetical situations, past wishes, and polite requests. It has two forms: -ra and -se.',
    '[
        {"question": "Complete: Si yo _____ (tener) más tiempo, viajaría.", "options": ["tengo", "tuviera", "tendría", "tenía"], "correct": "tuviera", "explanation": "Use imperfect subjunctive in ''si'' clauses for hypotheticals: tuviera"},
        {"question": "Complete: Quisiera que tú me _____ (ayudar).", "options": ["ayudas", "ayudaras", "ayudes", "ayudarías"], "correct": "ayudaras", "explanation": "After ''Quisiera que'', use imperfect subjunctive: ayudaras"},
        {"question": "Complete: Si ella _____ (poder), vendría.", "options": ["puede", "pudiera", "podría", "pueda"], "correct": "pudiera", "explanation": "Poder in imperfect subjunctive: pudiera"}
    ]'::jsonb,
    '[
        {"prompt": "Say: If I had more money, I would buy a house.", "expected_grammar": "Si tuviera más dinero, compraría", "hint": "Use ''Si'' + imperfect subjunctive + conditional"},
        {"prompt": "Express a polite wish: I would like you to help me.", "expected_grammar": "Quisiera que me ayudaras", "hint": "Use ''Quisiera que'' + imperfect subjunctive"}
    ]'::jsonb,
    '[
        {"type": "gap_fill", "prompt": "Si yo _____ (ser) rico, donaría mucho dinero.", "answer": "fuera"},
        {"type": "sentence_transform", "prompt": "Make hypothetical: Tengo tiempo → Si yo _____", "answer": "tuviera tiempo"}
    ]'::jsonb
FROM public.grammar_curriculum gc
WHERE gc.level = 'B2' AND gc.week_number = 1
AND NOT EXISTS (SELECT 1 FROM public.daily_lessons dl WHERE dl.curriculum_id = gc.id AND dl.day_number = 1);

INSERT INTO public.daily_lessons (curriculum_id, day_number, lesson_type, title, intro_text, mcq_questions, speaking_prompts, writing_exercises)
SELECT 
    gc.id,
    2,
    'workout',
    'Como si + Imperfect Subjunctive',
    'Use ''como si'' (as if) with imperfect subjunctive to describe how something appears or how someone behaves.',
    '[
        {"question": "Complete: Él habla como si _____ (ser) experto.", "options": ["es", "sea", "fuera", "sería"], "correct": "fuera", "explanation": "''Como si'' always requires imperfect subjunctive: fuera"},
        {"question": "Complete: Actúa como si no _____ (saber) nada.", "options": ["sabe", "sepa", "supiera", "sabría"], "correct": "supiera", "explanation": "''Como si'' + imperfect subjunctive: supiera"},
        {"question": "Complete: Me mira como si yo _____ (tener) algo malo.", "options": ["tengo", "tenga", "tuviera", "tendría"], "correct": "tuviera", "explanation": "''Como si'' requires imperfect subjunctive regardless of main verb tense"}
    ]'::jsonb,
    '[
        {"prompt": "Describe someone who talks as if they knew everything.", "expected_grammar": "Habla como si supiera", "hint": "Use ''como si'' + imperfect subjunctive of saber"},
        {"prompt": "Say: She acts as if she were the boss.", "expected_grammar": "Actúa como si fuera la jefa", "hint": "Use ''como si'' + fuera"}
    ]'::jsonb,
    '[
        {"type": "gap_fill", "prompt": "Él gasta dinero como si _____ (ser) millonario.", "answer": "fuera"},
        {"type": "free_response", "prompt": "Describe someone you know using ''como si'' + imperfect subjunctive. Example: Mi amigo habla como si...", "grammar_target": "imperfect_subjunctive"}
    ]'::jsonb
FROM public.grammar_curriculum gc
WHERE gc.level = 'B2' AND gc.week_number = 1
AND NOT EXISTS (SELECT 1 FROM public.daily_lessons dl WHERE dl.curriculum_id = gc.id AND dl.day_number = 2);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKET FOR AUDIO RECORDINGS
-- ============================================
-- Note: Run this in the Supabase dashboard SQL editor
-- The storage bucket is created programmatically by the backend,
-- but you can also create it manually:

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('audio-recordings', 'audio-recordings', false);

-- Storage policies for audio recordings
-- Users can only access their own audio files
-- The path format is: userId/conversationId/filename

-- Policy: Users can upload to their own folder
-- CREATE POLICY "Users can upload their own audio"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'audio-recordings' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Policy: Users can read their own audio
-- CREATE POLICY "Users can read their own audio"  
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'audio-recordings' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

-- Policy: Users can delete their own audio
-- CREATE POLICY "Users can delete their own audio"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'audio-recordings' AND
--   (storage.foldername(name))[1] = auth.uid()::text
-- );

