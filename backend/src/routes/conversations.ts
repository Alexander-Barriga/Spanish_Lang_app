import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { optionalAuth } from '../middleware/auth';
import { ConversationService } from '../services/conversation';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Use optional auth - will authenticate if token provided, otherwise continue
router.use(optionalAuth);

// In-memory storage for development when not authenticated
interface DevConversation {
  id: string;
  mode: string;
  topic?: string;
  grammar_focus?: string;
  role_play_persona?: string;
  messages: Array<{ id: string; role: string; content: string; corrections?: unknown }>;
  started_at: string;
}
const devConversations = new Map<string, DevConversation>();

// Create a new conversation
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const isAuthenticated = !!userId;
    
    const { mode, topic, grammarFocus, rolePlayPersona, characterId } = req.body;

    if (!mode) {
      return res.status(400).json({ error: 'Conversation mode is required' });
    }

    console.log(`🎭 Creating conversation with character: ${characterId || 'default'}`);

    // Get initial AI greeting (personalized if character is selected)
    const conversationService = new ConversationService();
    const greetingResult = await conversationService.generateGreeting(mode, {
      topic,
      grammarFocus,
      persona: rolePlayPersona,
    }, characterId);
    const greeting = greetingResult.text;

    // If authenticated, use database
    if (isAuthenticated) {
      console.log(`📝 Creating DB conversation for user: ${userId}`);
      
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .insert({
          user_id: userId,
          mode,
          topic: topic || null,
          grammar_focus: grammarFocus || null,
          role_play_persona: rolePlayPersona || null,
          message_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Create conversation error:', error);
        return res.status(500).json({ error: 'Failed to create conversation' });
      }

      // Save greeting as first message
      await supabaseAdmin.from('messages').insert({
        conversation_id: data.id,
        role: 'assistant',
        content: greeting,
        audio_url: null,
        corrections: null,
      });

      // Update message count
      await supabaseAdmin
        .from('conversations')
        .update({ message_count: 1 })
        .eq('id', data.id);

      return res.status(201).json({
        conversation: data,
        initialMessage: greeting,
        greetingAudioUrl: greetingResult.audioUrl || null,
      });
    }

    // Not authenticated - use in-memory storage for development
    console.log('📝 Creating in-memory conversation (dev mode)');
    
    const conversationId = uuidv4();
    const devConversation: DevConversation = {
      id: conversationId,
      mode,
      topic,
      grammar_focus: grammarFocus,
      role_play_persona: rolePlayPersona,
      messages: [{ id: uuidv4(), role: 'assistant', content: greeting }],
      started_at: new Date().toISOString(),
    };
    
    devConversations.set(conversationId, devConversation);
    console.log(`✅ Dev conversation created: ${conversationId}`);

    res.status(201).json({
      conversation: {
        id: conversationId,
        mode,
        topic,
        grammar_focus: grammarFocus,
        role_play_persona: rolePlayPersona,
        started_at: devConversation.started_at,
        message_count: 1,
      },
      initialMessage: greeting,
      greetingAudioUrl: greetingResult.audioUrl || null,
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's conversations
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      const conversations = Array.from(devConversations.values()).map(c => ({
        id: c.id,
        mode: c.mode,
        topic: c.topic,
        grammar_focus: c.grammar_focus,
        role_play_persona: c.role_play_persona,
        started_at: c.started_at,
        message_count: c.messages.length,
      }));
      return res.json({ conversations, total: conversations.length, limit: 20, offset: 0 });
    }

    const { limit = 20, offset = 0 } = req.query;

    const { data, error, count } = await supabaseAdmin
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    res.json({
      conversations: data,
      total: count,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific conversation with messages
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const conversationId = req.params.id;

    // Check dev conversations first
    const devConv = devConversations.get(conversationId);
    if (devConv) {
      return res.json({
        conversation: {
          id: devConv.id,
          mode: devConv.mode,
          topic: devConv.topic,
          grammar_focus: devConv.grammar_focus,
          role_play_persona: devConv.role_play_persona,
          started_at: devConv.started_at,
          message_count: devConv.messages.length,
        },
        messages: devConv.messages,
      });
    }

    if (!userId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.json({
      conversation,
      messages,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a message in a conversation
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const conversationId = req.params.id;
    const { content, audioUrl, characterId } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    console.log(`🎭 Message with character: ${characterId || 'default'}`);

    // Check if this is a dev conversation
    const devConv = devConversations.get(conversationId);
    if (devConv) {
      console.log(`💬 Processing message in dev conversation: ${conversationId}`);
      
      // Add user message
      devConv.messages.push({ id: uuidv4(), role: 'user', content });

      // Generate AI response with character personality
      const conversationService = new ConversationService();
      const response = await conversationService.generateResponse(
        content,
        {
          id: devConv.id,
          user_id: 'dev-user',
          mode: devConv.mode as 'open' | 'topic' | 'vocabulary' | 'grammar' | 'roleplay',
          topic: devConv.topic || null,
          grammar_focus: devConv.grammar_focus || null,
          role_play_persona: devConv.role_play_persona || null,
          vocabulary_set_id: null,
          started_at: devConv.started_at,
          ended_at: null,
          message_count: devConv.messages.length,
        },
        devConv.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        null,
        characterId // Pass character ID for personality
      );

      // Add AI response
      const aiMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.content,
        corrections: response.corrections,
        emotion: response.emotion,
      };
      devConv.messages.push(aiMessage);

      console.log(`🤖 AI Response: "${response.content.substring(0, 50)}..."`);
      if (response.emotion) {
        console.log(`🎭 Emotion: ${response.emotion.type} (intensity: ${response.emotion.intensity})`);
      }

      return res.json({
        message: aiMessage,
        corrections: response.corrections,
        emotion: response.emotion,
      });
    }

    if (!userId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content,
      audio_url: audioUrl || null,
      corrections: null,
    });

    const { data: previousMessages } = await supabaseAdmin
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    const conversationService = new ConversationService();
    const response = await conversationService.generateResponse(
      content,
      conversation,
      previousMessages || [],
      userProfile,
      characterId // Pass character ID for personality
    );

    const { data: aiMessage, error: aiMsgError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: response.content,
        audio_url: null,
        corrections: response.corrections,
        metadata: response.emotion ? { emotion: response.emotion } : null,
      })
      .select()
      .single();

    if (aiMsgError) {
      console.warn('⚠️ Failed to save AI message to DB:', aiMsgError.message);
    }

    await supabaseAdmin
      .from('conversations')
      .update({ message_count: conversation.message_count + 2 })
      .eq('id', conversationId);

    console.log(`🤖 AI Response: "${response.content.substring(0, 50)}..."`);
    if (response.emotion) {
      console.log(`🎭 Emotion: ${response.emotion.type} (intensity: ${response.emotion.intensity})`);
    }

    const finalMessage = aiMessage 
      ? { ...aiMessage, emotion: response.emotion }
      : { id: `${conversationId}-${Date.now()}`, role: 'assistant', content: response.content, emotion: response.emotion };

    res.json({
      message: finalMessage,
      corrections: response.corrections,
      emotion: response.emotion,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End a conversation
router.post('/:id/end', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const conversationId = req.params.id;

    if (devConversations.has(conversationId)) {
      const devConv = devConversations.get(conversationId)!;
      devConversations.delete(conversationId);
      return res.json({ 
        conversation: { 
          ...devConv, 
          ended_at: new Date().toISOString(),
          message_count: devConv.messages.length,
        } 
      });
    }

    if (!userId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data: progress } = await supabaseAdmin
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (progress) {
      const durationMinutes = Math.round(
        (new Date(data.ended_at!).getTime() - new Date(data.started_at).getTime()) / 60000
      );

      await supabaseAdmin
        .from('progress')
        .update({
          total_conversations: progress.total_conversations + 1,
          total_minutes: progress.total_minutes + durationMinutes,
          last_session_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    res.json({ conversation: data });
  } catch (error) {
    console.error('End conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

