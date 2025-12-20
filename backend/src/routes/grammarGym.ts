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

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // 1. Check if user has completed the writing exercise for this episode
    // Note: If multiple submissions exist for same episode, this gets the first one found
    // (typically the most recent due to Supabase's default behavior)
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('episode_article_submissions')
      .select('id, ai_feedback, episode_id')
      .eq('user_id', userId)
      .eq('episode_id', episodeId)
      .limit(1)
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
    
    // Debug: log the entire feedback structure
    console.log('[Grammar Gym Debug] Full ai_feedback structure:', JSON.stringify(aiFeedback, null, 2));
    console.log('[Grammar Gym Debug] Keys in aiFeedback:', aiFeedback ? Object.keys(aiFeedback) : 'null');
    
    // Try multiple possible paths to find errors
    let grammarErrors: GrammarError[] = [];
    
    // Check all possible paths where errors might be stored
    const possibleErrorPaths = [
      aiFeedback?.grammar?.errors,
      aiFeedback?.grammarAnalysis?.errors,
      aiFeedback?.errors,
      aiFeedback?.grammar_analysis?.errors,
      aiFeedback?.grammarErrors,
    ];
    
    console.log('[Grammar Gym Debug] Checking paths:');
    console.log('  - grammar.errors:', aiFeedback?.grammar?.errors);
    console.log('  - grammarAnalysis.errors:', aiFeedback?.grammarAnalysis?.errors);
    console.log('  - errors:', aiFeedback?.errors);
    console.log('  - grammar_analysis.errors:', aiFeedback?.grammar_analysis?.errors);
    console.log('  - grammarErrors:', aiFeedback?.grammarErrors);
    
    // Find the first non-empty error array
    for (const errors of possibleErrorPaths) {
      if (Array.isArray(errors) && errors.length > 0) {
        grammarErrors = errors.map(e => ({
          type: e.type || 'grammar',
          original: e.original || e.text || e.sentence || '',
          correction: e.correction || e.corrected || e.fix || '',
          explanation: e.explanation || e.reason || e.message || '',
        }));
        console.log('[Grammar Gym Debug] Found errors at path, count:', grammarErrors.length);
        break;
      }
    }
    
    console.log('[Grammar Gym Debug] Final extracted grammarErrors:', JSON.stringify(grammarErrors, null, 2));
    console.log('[Grammar Gym Debug] Number of errors:', grammarErrors.length);

    // 5. Generate personalized questions based on errors
    console.log('[Grammar Gym Debug] Calling generatePersonalizedQuestions with', grammarErrors.length, 'errors');
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
    console.log('[Grammar Gym Debug] Personalized questions returned:', personalizedQuestions.length);
    console.log('[Grammar Gym Debug] Default questions count:', defaultQuestions?.length || 0);

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

    // Get the episode's grammar_focus to store correctly
    const { data: episodeData, error: episodeFetchError } = await supabaseAdmin
      .from('episodes')
      .select('grammar_focus, story_arc_id, episode_number')
      .eq('id', episodeId)
      .single();

    if (episodeFetchError || !episodeData) {
      console.error('Error fetching episode for gym completion:', episodeFetchError);
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Calculate XP
    const xpEarned = calculateGymXP(correctAnswers, totalQuestions);
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // Create a workout session record for the gym
    // IMPORTANT: Use episode.grammar_focus so it matches the roadmap check
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('workout_sessions')
      .insert({
        user_id: userId,
        session_type: 'daily_workout',
        grammar_focus: episodeData.grammar_focus, // Use actual grammar_focus, not episodeId
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

    // =============================================
    // UNLOCK NEXT EPISODE - This is the final step in the episode roadmap
    // =============================================
    
    // episodeData already fetched above with story_arc_id and episode_number

    let nextEpisodeUnlocked = false;
    let nextEpisodeNumber = null;

    // Get current story progress
    const { data: storyProgress } = await supabaseAdmin
      .from('user_story_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('story_arc_id', episodeData.story_arc_id)
      .single();

    if (storyProgress) {
      // Only unlock if we haven't already unlocked this episode
      const newEpisodesCompleted = Math.max(
        storyProgress.episodes_completed || 0,
        episodeData.episode_number
      );
      const newCurrentEpisode = newEpisodesCompleted + 1;

      // Check if this actually unlocks a new episode
      if (newCurrentEpisode > storyProgress.current_episode) {
        const { error: updateError } = await supabaseAdmin
          .from('user_story_progress')
          .update({
            current_episode: newCurrentEpisode,
            episodes_completed: newEpisodesCompleted,
            last_played_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('story_arc_id', episodeData.story_arc_id);

        if (!updateError) {
          nextEpisodeUnlocked = true;
          nextEpisodeNumber = newCurrentEpisode;
          console.log(`[Grammar Gym] Unlocked episode ${newCurrentEpisode} for user ${userId}`);
        }
      }
    }

    res.json({
      success: true,
      session: session,
      xpEarned,
      accuracy,
      correctAnswers,
      totalQuestions,
      nextEpisodeUnlocked,
      nextEpisodeNumber,
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

