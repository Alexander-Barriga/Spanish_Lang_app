import { Router, Request, Response } from 'express';
import multer from 'multer';
import { supabaseAdmin } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import {
  requirePremiumForEpisodeId,
  requirePremiumForConversationId,
} from '../middleware/requirePremium';
import {
  generateFlorenciaResponse,
  generateFlorenciaAudio,
  transcribeUserAudio,
  shouldEndConversation,
  generateConversationSummary,
  generateFarewellMessage,
  extractSubjunctiveVerbs,
  MAX_USER_EXCHANGES,
  HighlightedVerb,
} from '../services/episodeConversation';

const router = Router();

async function unlockNextEpisode(userId: string, episodeId: string) {
  const { data: episode } = await supabaseAdmin
    .from('episodes')
    .select('story_arc_id, episode_number')
    .eq('id', episodeId)
    .single();

  if (!episode) {
    console.error('[unlockNextEpisode] Episode not found:', episodeId);
    return { unlocked: false };
  }

  let { data: storyProgress } = await supabaseAdmin
    .from('user_story_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('story_arc_id', episode.story_arc_id)
    .single();

  if (!storyProgress) {
    console.log(`[unlockNextEpisode] No user_story_progress found for user ${userId}, creating one...`);
    const { data: newProgress, error: insertError } = await supabaseAdmin
      .from('user_story_progress')
      .upsert({
        user_id: userId,
        story_arc_id: episode.story_arc_id,
        current_episode: 1,
        episodes_completed: 0,
        total_stars: 0,
        total_xp: 0,
        last_played_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !newProgress) {
      console.error('[unlockNextEpisode] Failed to create user_story_progress:', insertError?.message);
      return { unlocked: false };
    }
    storyProgress = newProgress;
  }

  const newEpisodesCompleted = Math.max(
    storyProgress.episodes_completed || 0,
    episode.episode_number
  );
  const newCurrentEpisode = newEpisodesCompleted + 1;

  if (newCurrentEpisode > storyProgress.current_episode) {
    const { error } = await supabaseAdmin
      .from('user_story_progress')
      .update({
        current_episode: newCurrentEpisode,
        episodes_completed: newEpisodesCompleted,
        last_played_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('story_arc_id', episode.story_arc_id);

    if (error) {
      console.error('[unlockNextEpisode] Failed to update progress:', error.message);
    } else {
      console.log(`[unlockNextEpisode] Unlocked episode ${newCurrentEpisode} for user ${userId}`);
      return { unlocked: true, nextEpisodeNumber: newCurrentEpisode };
    }
  } else {
    console.log(`[unlockNextEpisode] Episode ${newCurrentEpisode} already unlocked (current: ${storyProgress.current_episode})`);
  }

  return { unlocked: false };
}

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Apply auth middleware to all routes
router.use(authenticateToken);

// ============================================
// GET /episode-conversation/:episodeId - Get existing conversation
// ============================================
router.get('/:episodeId', requirePremiumForEpisodeId(), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { episodeId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get existing conversation for this episode
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('episode_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .single();

    if (convError && convError.code !== 'PGRST116') {
      console.error('Error fetching conversation:', convError);
      return res.status(500).json({ error: 'Failed to fetch conversation' });
    }

    if (!conversation) {
      return res.json({ conversation: null, messages: [] });
    }

    // Get all messages for this conversation
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('episode_conversation_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Transform messages to camelCase for frontend
    const formattedMessages = (messages || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      highlightedVerbs: m.content_with_highlights,
      audioUrl: m.audio_url,
      created_at: m.created_at,
    }));

    res.json({
      conversation,
      messages: formattedMessages,
      isComplete: !!conversation.completed_at,
      userReplyCount: conversation.user_reply_count,
      maxReplies: MAX_USER_EXCHANGES,
    });
  } catch (error) {
    console.error('Error in GET /episode-conversation/:episodeId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /episode-conversation/:episodeId/start - Start new conversation
// ============================================
router.post('/:episodeId/start', requirePremiumForEpisodeId(), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { episodeId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if conversation already exists
    const { data: existingConv } = await supabaseAdmin
      .from('episode_conversations')
      .select('id, completed_at')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .single();

    if (existingConv) {
      // If already completed, return the existing conversation
      if (existingConv.completed_at) {
        return res.status(400).json({ 
          error: 'Conversation already completed',
          conversationId: existingConv.id,
        });
      }
      
      // Resume existing conversation
      const { data: messages } = await supabaseAdmin
        .from('episode_conversation_messages')
        .select('*')
        .eq('conversation_id', existingConv.id)
        .order('created_at', { ascending: true });

      // Transform messages to camelCase for frontend
      const formattedMessages = (messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        highlightedVerbs: m.content_with_highlights,
        audioUrl: m.audio_url,
        created_at: m.created_at,
      }));

      // Count user replies for resumed conversation
      const userReplyCount = formattedMessages.filter((m: any) => m.role === 'user').length;

      return res.json({
        conversationId: existingConv.id,
        messages: formattedMessages,
        resumed: true,
        userReplyCount,
        maxReplies: MAX_USER_EXCHANGES,
      });
    }

    // Get episode details
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('id, title_es, title_en, grammar_focus, grammar_triggers, scenario')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Get user's writing submission for this episode
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('episode_article_submissions')
      .select('id, submission_text, ai_feedback')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .single();

    if (submissionError || !submission) {
      return res.status(400).json({ 
        error: 'Writing submission required before starting conversation' 
      });
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabaseAdmin
      .from('episode_conversations')
      .insert({
        user_id: userId,
        episode_id: episodeId,
        writing_submission_id: submission.id,
        message_count: 0,
        user_reply_count: 0,
      })
      .select()
      .single();

    if (createError || !newConversation) {
      console.error('Error creating conversation:', createError);
      return res.status(500).json({ error: 'Failed to create conversation' });
    }

    // Generate Florencia's greeting
    const episodeContext = {
      episodeId: episode.id,
      titleEs: episode.title_es,
      titleEn: episode.title_en,
      grammarFocus: episode.grammar_focus,
      grammarTriggers: episode.grammar_triggers || [],
      scenario: episode.scenario,
    };

    const writingSubmission = {
      submissionText: submission.submission_text,
      aiFeedback: submission.ai_feedback,
    };

    const greeting = await generateFlorenciaResponse(
      episodeContext,
      writingSubmission,
      [],
      true // isGreeting
    );

    // Generate audio for greeting
    let audioUrl: string | null = null;
    try {
      const audioBuffer = await generateFlorenciaAudio(greeting.message);
      
      // Store audio in Supabase storage - use 'audio-recordings' bucket (matches storageService)
      const audioFileName = `conversation-audio/${newConversation.id}/florencia-${Date.now()}.mp3`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('audio-recordings')
        .upload(audioFileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (!uploadError) {
        // Use signed URL since bucket is private
        const { data: urlData } = await supabaseAdmin.storage
          .from('audio-recordings')
          .createSignedUrl(audioFileName, 60 * 60 * 24); // 24 hour expiry
        audioUrl = urlData?.signedUrl || null;
      }
    } catch (audioError: any) {
      console.error('Audio generation error:', audioError.message);
      // Continue without audio
    }

    // Save greeting message
    const { data: greetingMessage, error: msgError } = await supabaseAdmin
      .from('episode_conversation_messages')
      .insert({
        conversation_id: newConversation.id,
        role: 'assistant',
        content: greeting.message,
        content_with_highlights: greeting.highlightedVerbs,
        audio_url: audioUrl,
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error saving greeting:', msgError);
    }

    // Update message count
    await supabaseAdmin
      .from('episode_conversations')
      .update({ message_count: 1 })
      .eq('id', newConversation.id);

    res.json({
      conversationId: newConversation.id,
      message: {
        id: greetingMessage?.id,
        role: 'assistant',
        content: greeting.message,
        highlightedVerbs: greeting.highlightedVerbs,
        audioUrl,
      },
      userReplyCount: 0,
      maxReplies: MAX_USER_EXCHANGES,
    });
  } catch (error) {
    console.error('Error in POST /episode-conversation/:episodeId/start:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /episode-conversation/:conversationId/message - Send user message
// ============================================
router.post(
  '/:conversationId/message',
  requirePremiumForConversationId('episode_conversations'),
  upload.single('audio'),
  async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get conversation and verify ownership
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('episode_conversations')
      .select('*, episodes(*)')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (conversation.completed_at) {
      return res.status(400).json({ error: 'Conversation already completed' });
    }

    // Get user's message (from transcription or text)
    let userMessage: string;
    let userAudioUrl: string | null = null;

    if (req.file) {
      // Transcribe audio - pass the correct MIME type
      userMessage = await transcribeUserAudio(req.file.buffer, req.file.mimetype);

      // Store user's audio - use correct extension based on MIME type
      const mimeToExt: Record<string, string> = {
        'audio/m4a': 'm4a',
        'audio/mp4': 'm4a',
        'audio/x-m4a': 'm4a',
        'audio/aac': 'aac',
        'audio/wav': 'wav',
        'audio/webm': 'webm',
        'audio/3gpp': '3gp',
        'audio/x-caf': 'caf',
      };
      const fileExt = mimeToExt[req.file.mimetype] || 'm4a';
      const audioFileName = `conversation-audio/${conversationId}/user-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('audio-recordings')
        .upload(audioFileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = await supabaseAdmin.storage
          .from('audio-recordings')
          .createSignedUrl(audioFileName, 60 * 60 * 24); // 24 hour expiry
        userAudioUrl = urlData?.signedUrl || null;
      }
    } else if (req.body.message) {
      userMessage = req.body.message;
    } else {
      return res.status(400).json({ error: 'Message or audio required' });
    }

    // Save user message
    const { data: userMsg } = await supabaseAdmin
      .from('episode_conversation_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        audio_url: userAudioUrl,
      })
      .select()
      .single();

    // Update reply count
    const newReplyCount = (conversation.user_reply_count || 0) + 1;

    await supabaseAdmin
      .from('episode_conversations')
      .update({
        user_reply_count: newReplyCount,
        message_count: (conversation.message_count || 0) + 1,
      })
      .eq('id', conversationId);

    // Check if conversation should end
    if (shouldEndConversation(newReplyCount)) {
      // Get all messages for context
      const { data: allMessages } = await supabaseAdmin
        .from('episode_conversation_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      const episode = conversation.episodes;
      const episodeContext = {
        episodeId: episode.id,
        titleEs: episode.title_es,
        titleEn: episode.title_en,
        grammarFocus: episode.grammar_focus,
        grammarTriggers: episode.grammar_triggers || [],
        scenario: episode.scenario,
      };

      // Generate Florencia's farewell message
      const conversationHistory = allMessages?.map(m => ({ 
        role: m.role as 'assistant' | 'user', 
        content: m.content 
      })) || [];
      
      // Add the user's final message to history for context
      conversationHistory.push({ role: 'user', content: userMessage });
      
      const farewellText = await generateFarewellMessage(episodeContext, conversationHistory);

      // Extract any subjunctive verbs that naturally appeared in the farewell
      const farewellHighlightedVerbs = await extractSubjunctiveVerbs(farewellText, episodeContext);
      console.log(`[Conversation] Farewell has ${farewellHighlightedVerbs.length} subjunctive verbs`);

      // Generate TTS audio for farewell
      let farewellAudioUrl: string | null = null;
      try {
        const audioBuffer = await generateFlorenciaAudio(farewellText);
        
        const audioFileName = `conversation-audio/${conversationId}/florencia-farewell-${Date.now()}.mp3`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from('audio-recordings')
          .upload(audioFileName, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = await supabaseAdmin.storage
            .from('audio-recordings')
            .createSignedUrl(audioFileName, 60 * 60 * 24); // 24 hour expiry
          farewellAudioUrl = urlData?.signedUrl || null;
        }
      } catch (audioError) {
        console.error('Error generating farewell audio:', audioError);
      }

      // Save farewell message to database
      const { data: farewellMsg } = await supabaseAdmin
        .from('episode_conversation_messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: farewellText,
          content_with_highlights: farewellHighlightedVerbs, // Include any natural subjunctive verbs
          audio_url: farewellAudioUrl,
        })
        .select()
        .single();

      // Mark conversation as complete
      await supabaseAdmin
        .from('episode_conversations')
        .update({ 
          completed_at: new Date().toISOString(),
          message_count: (conversation.message_count || 0) + 2, // User message + farewell
        })
        .eq('id', conversationId);

      // Unlock next episode
      await unlockNextEpisode(userId, conversation.episode_id);

      // Generate summary
      const summary = await generateConversationSummary(
        [...conversationHistory, { role: 'assistant', content: farewellText }],
        episodeContext
      );

      return res.json({
        userMessage: {
          id: userMsg?.id,
          role: 'user',
          content: userMessage,
          audioUrl: userAudioUrl,
        },
        florenciaMessage: {
          id: farewellMsg?.id,
          role: 'assistant',
          content: farewellText,
          highlightedVerbs: farewellHighlightedVerbs, // Include any natural subjunctive verbs
          audioUrl: farewellAudioUrl,
        },
        conversationComplete: true,
        summary,
        userReplyCount: newReplyCount,
        maxReplies: MAX_USER_EXCHANGES,
      });
    }

    // Get conversation history for context
    const { data: historyMessages } = await supabaseAdmin
      .from('episode_conversation_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // Get writing submission
    const { data: submission } = await supabaseAdmin
      .from('episode_article_submissions')
      .select('submission_text, ai_feedback')
      .eq('id', conversation.writing_submission_id)
      .single();

    // Generate Florencia's response
    const episode = conversation.episodes;
    const episodeContext = {
      episodeId: episode.id,
      titleEs: episode.title_es,
      titleEn: episode.title_en,
      grammarFocus: episode.grammar_focus,
      grammarTriggers: episode.grammar_triggers || [],
      scenario: episode.scenario,
    };

    const response = await generateFlorenciaResponse(
      episodeContext,
      { submissionText: submission?.submission_text || '', aiFeedback: submission?.ai_feedback },
      historyMessages?.map(m => ({ role: m.role as 'assistant' | 'user', content: m.content })) || [],
      false
    );

    // Generate audio for response
    let responseAudioUrl: string | null = null;
    try {
      const audioBuffer = await generateFlorenciaAudio(response.message);
      
      const audioFileName = `conversation-audio/${conversationId}/florencia-${Date.now()}.mp3`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('audio-recordings')
        .upload(audioFileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = await supabaseAdmin.storage
          .from('audio-recordings')
          .createSignedUrl(audioFileName, 60 * 60 * 24); // 24 hour expiry
        responseAudioUrl = urlData?.signedUrl || null;
      }
    } catch (audioError) {
      console.error('Error generating response audio:', audioError);
    }

    // Save Florencia's response
    const { data: florenciaMsg } = await supabaseAdmin
      .from('episode_conversation_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: response.message,
        content_with_highlights: response.highlightedVerbs,
        audio_url: responseAudioUrl,
      })
      .select()
      .single();

    // Update message count
    await supabaseAdmin
      .from('episode_conversations')
      .update({
        message_count: (conversation.message_count || 0) + 2,
      })
      .eq('id', conversationId);

    res.json({
      userMessage: {
        id: userMsg?.id,
        role: 'user',
        content: userMessage,
        audioUrl: userAudioUrl,
      },
      florenciaMessage: {
        id: florenciaMsg?.id,
        role: 'assistant',
        content: response.message,
        highlightedVerbs: response.highlightedVerbs,
        audioUrl: responseAudioUrl,
      },
      conversationComplete: false,
      userReplyCount: newReplyCount,
      maxReplies: MAX_USER_EXCHANGES,
    });
  } catch (error) {
    console.error('Error in POST /episode-conversation/:conversationId/message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
  }
);

// ============================================
// POST /episode-conversation/:conversationId/complete - Mark complete
// ============================================
router.post(
  '/:conversationId/complete',
  requirePremiumForConversationId('episode_conversations'),
  async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify ownership
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('episode_conversations')
      .select('*, episodes(*)')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Mark as complete
    await supabaseAdmin
      .from('episode_conversations')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Unlock next episode
    await unlockNextEpisode(userId, conversation.episode_id);

    res.json({ 
      success: true,
      message: 'Conversation completed',
    });
  } catch (error) {
    console.error('Error in POST /episode-conversation/:conversationId/complete:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
  }
);

// ============================================
// GET /episode-conversation/:episodeId/access - Check access
// ============================================
router.get('/:episodeId/access', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { episodeId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has completed writing exercise
    const { data: submission } = await supabaseAdmin
      .from('episode_article_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .single();

    res.json({
      hasAccess: !!submission,
      writingCompleted: !!submission,
    });
  } catch (error) {
    console.error('Error in GET /episode-conversation/:episodeId/access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

