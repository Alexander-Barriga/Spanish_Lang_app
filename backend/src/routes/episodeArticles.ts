import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateToken as authMiddleware } from '../middleware/auth';
import { generateWritingFeedback, calculateGrammarScore } from '../services/articleFeedback';

const router = Router();

// ============================================
// GET /episode-articles/unlocked - Get all unlocked episode articles
// ============================================
router.get('/unlocked', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get all episodes where user has completed attempts
    const { data: completedEpisodes, error: attemptsError } = await supabaseAdmin
      .from('episode_attempts')
      .select('episode_id')
      .eq('user_id', userId)
      .not('completed_at', 'is', null);

    if (attemptsError) {
      console.error('Error fetching completed episodes:', attemptsError);
      return res.status(500).json({ error: 'Failed to fetch unlocked articles' });
    }

    const episodeIds = completedEpisodes?.map(e => e.episode_id) || [];

    if (episodeIds.length === 0) {
      return res.json({ articles: [] });
    }

    // Get articles for completed episodes
    const { data: articles, error: articlesError } = await supabaseAdmin
      .from('episode_articles')
      .select(`
        *,
        episodes (
          id,
          episode_number,
          title_es,
          title_en,
          grammar_focus
        )
      `)
      .in('episode_id', episodeIds)
      .order('created_at', { ascending: false });

    if (articlesError) {
      console.error('Error fetching articles:', articlesError);
      return res.status(500).json({ error: 'Failed to fetch articles' });
    }

    // Add read status for each article
    const articlesWithStatus = await Promise.all(
      (articles || []).map(async (article) => {
        const { data: readRecord } = await supabaseAdmin
          .from('episode_article_reads')
          .select('completed')
          .eq('user_id', userId)
          .eq('episode_article_id', article.id)
          .single();

        return {
          ...article,
          has_read: readRecord?.completed || false,
        };
      })
    );

    res.json({ articles: articlesWithStatus });
  } catch (error) {
    console.error('Error in GET /episode-articles/unlocked:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /episode-articles/roadmap/:episodeId - Get roadmap progress
// ============================================
router.get('/roadmap/:episodeId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { episodeId } = req.params;

    // Get episode details
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('id, episode_number, grammar_focus, story_arc_id')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // 1. Check if episode is completed
    const { data: attempt } = await supabaseAdmin
      .from('episode_attempts')
      .select('id')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .not('completed_at', 'is', null)
      .single();

    const episodeCompleted = !!attempt;

    // 2. Check if article is read (80%+ completion)
    const { data: article } = await supabaseAdmin
      .from('episode_articles')
      .select('id')
      .eq('episode_id', episodeId)
      .single();

    let articleRead = false;
    if (article) {
      const { data: readRecord } = await supabaseAdmin
        .from('episode_article_reads')
        .select('completed')
        .eq('user_id', userId)
        .eq('episode_article_id', article.id)
        .single();

      articleRead = readRecord?.completed || false;
    }

    // 3. Check if writing is submitted
    const { data: submission } = await supabaseAdmin
      .from('episode_article_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .single();

    const writingSubmitted = !!submission;

    // 3.5. Check if conversation is completed
    const { data: conversation } = await supabaseAdmin
      .from('episode_conversations')
      .select('id, completed_at')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .single();

    const conversationCompleted = !!(conversation?.completed_at);

    // 4. Check if gym workouts are completed (any workout with matching grammar_focus)
    const { data: workouts } = await supabaseAdmin
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('grammar_focus', episode.grammar_focus)
      .not('completed_at', 'is', null)
      .limit(1);

    const gymCompleted = (workouts?.length || 0) > 0;

    // 5. Check if next episode is unlocked
    const { data: progress } = await supabaseAdmin
      .from('user_story_progress')
      .select('current_episode')
      .eq('user_id', userId)
      .eq('story_arc_id', episode.story_arc_id)
      .single();

    const currentEpisodeNum = progress?.current_episode || 1;
    const nextEpisodeUnlocked = currentEpisodeNum > episode.episode_number;

    // Get next episode ID if unlocked
    let nextEpisodeId: string | undefined;
    if (nextEpisodeUnlocked) {
      const { data: nextEpisode } = await supabaseAdmin
        .from('episodes')
        .select('id')
        .eq('story_arc_id', episode.story_arc_id)
        .eq('episode_number', episode.episode_number + 1)
        .single();

      nextEpisodeId = nextEpisode?.id;
    }

    res.json({
      episodeCompleted,
      articleRead,
      writingSubmitted,
      conversationCompleted,
      gymCompleted,
      nextEpisodeUnlocked,
      nextEpisodeId,
    });
  } catch (error) {
    console.error('Error in GET /episode-articles/roadmap/:episodeId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /episode-articles/by-article/:articleId - Get article by article ID
// ============================================
router.get('/by-article/:articleId', async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;

    const { data: article, error } = await supabaseAdmin
      .from('episode_articles')
      .select(`
        *,
        episodes (
          id,
          episode_number,
          title_es,
          title_en,
          scenario,
          grammar_focus,
          grammar_triggers
        )
      `)
      .eq('id', articleId)
      .single();

    if (error || !article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({ article });
  } catch (error) {
    console.error('Error in GET /episode-articles/by-article/:articleId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /episode-articles/:episodeId - Get article for specific episode
// ============================================
router.get('/:episodeId', async (req: Request, res: Response) => {
  try {
    const { episodeId } = req.params;

    // Check if this is a UUID (article ID) or episode ID
    // If it's a valid UUID format, try to get by article ID first
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(episodeId);
    
    let article;
    let error;

    if (isUUID) {
      // Try as article ID first
      const articleResult = await supabaseAdmin
        .from('episode_articles')
        .select(`
          *,
          episodes (
            id,
            episode_number,
            title_es,
            title_en,
            scenario,
            grammar_focus,
            grammar_triggers
          )
        `)
        .eq('id', episodeId)
        .single();
      
      if (!articleResult.error && articleResult.data) {
        article = articleResult.data;
      }
    }

    // If not found as article ID, try as episode ID
    if (!article) {
      const episodeResult = await supabaseAdmin
        .from('episode_articles')
        .select(`
          *,
          episodes (
            id,
            episode_number,
            title_es,
            title_en,
            scenario,
            grammar_focus,
            grammar_triggers
          )
        `)
        .eq('episode_id', episodeId)
        .single();
      
      article = episodeResult.data;
      error = episodeResult.error;
    }

    if (error || !article) {
      return res.status(404).json({ error: 'Article not found for this episode' });
    }

    res.json({ article });
  } catch (error) {
    console.error('Error in GET /episode-articles/:episodeId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /episode-articles/:episodeId/submission - Check if user has submitted exercise
// ============================================
router.get('/:episodeId/submission', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { episodeId } = req.params;

    const { data: submission, error } = await supabaseAdmin
      .from('episode_article_submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking submission:', error);
      return res.status(500).json({ error: 'Failed to check submission status' });
    }

    res.json({ 
      hasSubmitted: !!submission,
      submission: submission || null 
    });
  } catch (error) {
    console.error('Error in GET /episode-articles/:episodeId/submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /episode-articles/:articleId/read - Track reading progress
// ============================================
router.post('/:articleId/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { articleId } = req.params;
    const { read_seconds, completion_percent } = req.body;

    // Check if read record exists
    const { data: existingRead } = await supabaseAdmin
      .from('episode_article_reads')
      .select('id, read_seconds, completion_percent')
      .eq('user_id', userId)
      .eq('episode_article_id', articleId)
      .single();

    if (existingRead) {
      // Update existing record
      const newReadSeconds = Math.max(existingRead.read_seconds, read_seconds || 0);
      const newCompletionPercent = Math.max(existingRead.completion_percent, completion_percent || 0);
      const completed = newCompletionPercent >= 80;

      const { error: updateError } = await supabaseAdmin
        .from('episode_article_reads')
        .update({
          read_seconds: newReadSeconds,
          completion_percent: newCompletionPercent,
          completed,
        })
        .eq('id', existingRead.id);

      if (updateError) {
        console.error('Error updating read progress:', updateError);
        return res.status(500).json({ error: 'Failed to update read progress' });
      }

      res.json({ success: true, completed });
    } else {
      // Create new record
      const completed = (completion_percent || 0) >= 80;

      const { error: insertError } = await supabaseAdmin
        .from('episode_article_reads')
        .insert({
          user_id: userId,
          episode_article_id: articleId,
          read_seconds: read_seconds || 0,
          completion_percent: completion_percent || 0,
          completed,
        });

      if (insertError) {
        console.error('Error creating read record:', insertError);
        return res.status(500).json({ error: 'Failed to track read progress' });
      }

      res.json({ success: true, completed });
    }
  } catch (error) {
    console.error('Error in POST /episode-articles/:articleId/read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /episode-articles/:articleId/submit - Submit writing exercise
// ============================================
router.post('/:articleId/submit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { articleId } = req.params;
    const { submission_text, submission_type, audio_url } = req.body;

    if (!submission_text || !submission_type) {
      return res.status(400).json({ error: 'Missing required fields: submission_text, submission_type' });
    }

    if (!['text', 'voice'].includes(submission_type)) {
      return res.status(400).json({ error: 'Invalid submission_type. Must be "text" or "voice"' });
    }

    // Get article details
    const { data: article, error: articleError } = await supabaseAdmin
      .from('episode_articles')
      .select('episode_id, grammar_focus, writing_exercise_prompt')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Calculate word count
    const wordCount = submission_text.trim().split(/\s+/).length;

    // Generate AI feedback
    console.log('Generating AI feedback for submission...');
    const aiFeedback = await generateWritingFeedback(
      submission_text,
      article.grammar_focus,
      article.writing_exercise_prompt
    );
    
    const grammarScore = calculateGrammarScore(aiFeedback);

    // Insert submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('episode_article_submissions')
      .insert({
        user_id: userId,
        episode_article_id: articleId,
        episode_id: article.episode_id,
        submission_text,
        submission_type,
        audio_url: audio_url || null,
        ai_feedback: aiFeedback,
        grammar_score: grammarScore,
        word_count: wordCount,
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Error creating submission:', submissionError);
      return res.status(500).json({ error: 'Failed to submit writing exercise' });
    }

    res.json({ 
      success: true,
      submission,
    });
  } catch (error) {
    console.error('Error in POST /episode-articles/:articleId/submit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /episode-articles/submission/:submissionId/feedback - Get AI feedback on submission
// ============================================
router.get('/submission/:submissionId/feedback', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { submissionId } = req.params;

    const { data: submission, error } = await supabaseAdmin
      .from('episode_article_submissions')
      .select(`
        *,
        episode_articles (
          title,
          grammar_focus,
          writing_exercise_prompt
        ),
        episodes (
          title_es,
          title_en
        )
      `)
      .eq('id', submissionId)
      .eq('user_id', userId)
      .single();

    if (error || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({ 
      submission,
      feedback: submission.ai_feedback 
    });
  } catch (error) {
    console.error('Error in GET /episode-articles/submission/:submissionId/feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /episode-articles/:episodeId/completion-status - Check if article is completed
// ============================================
router.get('/:episodeId/completion-status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { episodeId } = req.params;

    // Get article for this episode
    const { data: article, error: articleError } = await supabaseAdmin
      .from('episode_articles')
      .select('id')
      .eq('episode_id', episodeId)
      .single();

    if (articleError || !article) {
      return res.status(404).json({ error: 'Article not found for this episode' });
    }

    // Check if user has read the article (80%+)
    const { data: readRecord } = await supabaseAdmin
      .from('episode_article_reads')
      .select('completed')
      .eq('user_id', userId)
      .eq('episode_article_id', article.id)
      .single();

    const hasRead = readRecord?.completed || false;

    // Check if user has submitted the writing exercise
    const { data: submission } = await supabaseAdmin
      .from('episode_article_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .single();

    const hasSubmitted = !!submission;

    // Article is complete if both read and submitted
    const isComplete = hasRead && hasSubmitted;

    res.json({
      hasRead,
      hasSubmitted,
      isComplete,
      articleId: article.id,
    });
  } catch (error) {
    console.error('Error in GET /episode-articles/:episodeId/completion-status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

