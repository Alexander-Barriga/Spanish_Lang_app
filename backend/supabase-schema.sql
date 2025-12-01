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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON public.conversations(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_vocabulary_sets_user_id ON public.vocabulary_sets(user_id);

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

