-- Episode Conversation Schema
-- This schema supports the conversation feature where Florencia discusses the user's writing sample
-- with interactive grammar highlights for subjunctive verbs

-- ============================================
-- Episode Conversations Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.episode_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    writing_submission_id UUID REFERENCES public.episode_article_submissions(id) ON DELETE SET NULL,
    message_count INTEGER DEFAULT 0,
    user_reply_count INTEGER DEFAULT 0,  -- Tracks when to end conversation (configurable limit)
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each user can only have one conversation per episode
    UNIQUE(user_id, episode_id)
);

-- ============================================
-- Episode Conversation Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.episode_conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.episode_conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('assistant', 'user')),
    content TEXT NOT NULL,
    -- Stores verb positions and explanations for highlighted grammar
    -- Format: [{ verb, startIndex, endIndex, infinitive, indicativeForm, trigger, explanation }]
    content_with_highlights JSONB,
    audio_url TEXT,  -- URL to stored audio (Florencia's TTS or user's recording)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_episode_conversations_user_id 
    ON public.episode_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_episode_conversations_episode_id 
    ON public.episode_conversations(episode_id);

CREATE INDEX IF NOT EXISTS idx_episode_conversation_messages_conversation_id 
    ON public.episode_conversation_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_episode_conversation_messages_created_at 
    ON public.episode_conversation_messages(created_at);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE public.episode_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for episode_conversations
DROP POLICY IF EXISTS "Users can view their own episode conversations" ON public.episode_conversations;
CREATE POLICY "Users can view their own episode conversations" ON public.episode_conversations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own episode conversations" ON public.episode_conversations;
CREATE POLICY "Users can create their own episode conversations" ON public.episode_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own episode conversations" ON public.episode_conversations;
CREATE POLICY "Users can update their own episode conversations" ON public.episode_conversations
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for episode_conversation_messages
DROP POLICY IF EXISTS "Users can view messages in their episode conversations" ON public.episode_conversation_messages;
CREATE POLICY "Users can view messages in their episode conversations" ON public.episode_conversation_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.episode_conversations
            WHERE episode_conversations.id = episode_conversation_messages.conversation_id
            AND episode_conversations.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create messages in their episode conversations" ON public.episode_conversation_messages;
CREATE POLICY "Users can create messages in their episode conversations" ON public.episode_conversation_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.episode_conversations
            WHERE episode_conversations.id = episode_conversation_messages.conversation_id
            AND episode_conversations.user_id = auth.uid()
        )
    );

-- Service role bypass for backend operations
DROP POLICY IF EXISTS "Service role can manage episode conversations" ON public.episode_conversations;
CREATE POLICY "Service role can manage episode conversations" ON public.episode_conversations
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage episode conversation messages" ON public.episode_conversation_messages;
CREATE POLICY "Service role can manage episode conversation messages" ON public.episode_conversation_messages
    FOR ALL USING (true) WITH CHECK (true);

