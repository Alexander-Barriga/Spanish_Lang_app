import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { optionalAuth } from '../middleware/auth';
import { generatePersonalizedQuestions, calculateGymXP, MCQQuestion, GrammarError } from '../services/grammarGym';

const router = Router();

router.use(optionalAuth);

// Get grammar gym questions for an episode
// Returns 3 pre-generated default questions + 1-3 personalized questions based on writing errors
router.get('/episode/:episodeId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { episodeId } = req.params;

    // #region agent log - B, C
    console.log(`[DEBUG] Grammar Gym GET /episode/:episodeId hit - episodeId: ${episodeId}, userId: ${userId}`);
    try {
      const fs = require('fs');
      fs.appendFileSync('/Users/alexanderbarriga/Spanish_Lang_app/.cursor/debug.log', JSON.stringify({location:'grammarGym.ts:14',message:'route handler execute',data:{episodeId:episodeId,userId:userId,path:'/episode/:episodeId'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C'}) + '\n');
    } catch (e) {
      // Log write failed, continue
    }
    // #endregion

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // 1. Check if user has completed the writing exercise for this episode
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('episode_article_submissions')
      .select('id, ai_feedback, episode_id')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .single();

    if (submissionError && submissionError.code !== 'PGRST116') {
      console.error('Error checking submission:', submissionError);
      return res.status(500).json({ error: 'Failed to check writing submission' });
    }

    if (!submission) {
      return res.status(403).json({ 
        error: 'Writing exercise required',
        message: 'You must complete the writing exercise before accessing the Grammar Gym.',
      });
    }

    // 2. Fetch episode details for context
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('id, title_es, title_en, scenario, grammar_focus, grammar_triggers')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      console.error('Error fetching episode:', episodeError);
      return res.status(404).json({ error: 'Episode not found' });
    }

    // 3. Fetch pre-generated default questions for this episode
    const { data: defaultQuestions, error: questionsError } = await supabaseAdmin
      .from('episode_grammar_questions')
      .select('id, question, options, correct, explanation, grammar_trigger')
      .eq('episode_id', episodeId)
      .limit(3);

    if (questionsError) {
      console.error('Error fetching default questions:', questionsError);
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }

    // 4. Extract grammar errors from the user's writing submission
    const aiFeedback = submission.ai_feedback as any;
    const grammarErrors: GrammarError[] = aiFeedback?.grammar?.errors || 
                                           aiFeedback?.grammarAnalysis?.errors || 
                                           [];

    // 5. Generate personalized questions based on errors
    const personalizedQuestions = await generatePersonalizedQuestions(
      grammarErrors,
      {
        title_es: episode.title_es,
        title_en: episode.title_en,
        scenario: episode.scenario,
        grammar_focus: episode.grammar_focus,
        grammar_triggers: episode.grammar_triggers || [],
      }
    );

    // 6. Combine default and personalized questions
    const allQuestions: MCQQuestion[] = [
      ...(defaultQuestions || []).map(q => ({
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        isPersonalized: false,
      })),
      ...personalizedQuestions,
    ];

    res.json({
      episode: {
        id: episode.id,
        title_es: episode.title_es,
        title_en: episode.title_en,
        grammar_focus: episode.grammar_focus,
        grammar_triggers: episode.grammar_triggers,
      },
      questions: allQuestions,
      totalQuestions: allQuestions.length,
      defaultCount: defaultQuestions?.length || 0,
      personalizedCount: personalizedQuestions.length,
    });
  } catch (error) {
    console.error('Grammar gym questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete grammar gym session
router.post('/episode/:episodeId/complete', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { episodeId } = req.params;
    const { correctAnswers, totalQuestions, results } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (typeof correctAnswers !== 'number' || typeof totalQuestions !== 'number') {
      return res.status(400).json({ error: 'correctAnswers and totalQuestions are required' });
    }

    // Calculate XP
    const xpEarned = calculateGymXP(correctAnswers, totalQuestions);
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // Create a workout session record for the gym
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('workout_sessions')
      .insert({
        user_id: userId,
        session_type: 'daily_workout',
        grammar_focus: episodeId, // Store episode ID for reference
        duration_seconds: 0, // Will be updated by client if needed
        mcq_correct: correctAnswers,
        mcq_total: totalQuestions,
        speaking_exchanges: 0,
        grammar_accuracy: accuracy,
        xp_earned: xpEarned,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating gym session:', sessionError);
      return res.status(500).json({ error: 'Failed to record gym completion' });
    }

    // Update user's total XP in curriculum progress
    const { data: progress } = await supabaseAdmin
      .from('user_curriculum_progress')
      .select('total_xp')
      .eq('user_id', userId)
      .single();

    if (progress) {
      await supabaseAdmin
        .from('user_curriculum_progress')
        .update({
          total_xp: (progress.total_xp || 0) + xpEarned,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    // Update streak in progress table
    const { data: userProgress } = await supabaseAdmin
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userProgress) {
      const lastSession = userProgress.last_session_at ? new Date(userProgress.last_session_at) : null;
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      let newStreak = userProgress.current_streak || 0;
      
      if (!lastSession || lastSession < oneDayAgo) {
        const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        if (lastSession && lastSession > twoDaysAgo) {
          newStreak += 1;
        } else if (!lastSession) {
          newStreak = 1;
        } else {
          newStreak = 1;
        }
      }

      await supabaseAdmin
        .from('progress')
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, userProgress.longest_streak || 0),
          last_session_at: now.toISOString(),
        })
        .eq('user_id', userId);
    }

    res.json({
      success: true,
      session: session,
      xpEarned,
      accuracy,
      correctAnswers,
      totalQuestions,
    });
  } catch (error) {
    console.error('Grammar gym complete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user can access grammar gym for an episode
router.get('/episode/:episodeId/access', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { episodeId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has completed the writing exercise
    const { data: submission } = await supabaseAdmin
      .from('episode_article_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .single();

    res.json({
      canAccess: !!submission,
      hasWritingSubmission: !!submission,
    });
  } catch (error) {
    console.error('Grammar gym access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

