import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { optionalAuth } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(optionalAuth);

// Start a new workout session
router.post('/start', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { session_type, curriculum_week, curriculum_day, grammar_focus } = req.body;

    if (!session_type) {
      return res.status(400).json({ error: 'Session type is required' });
    }

    const validTypes = ['daily_workout', 'weekly_challenge', 'quick_mission', 'placement_test'];
    if (!validTypes.includes(session_type)) {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    // Create a new workout session (we'll update it when completed)
    const sessionId = uuidv4();
    const { data, error } = await supabaseAdmin
      .from('workout_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        session_type,
        curriculum_week: curriculum_week || null,
        curriculum_day: curriculum_day || null,
        grammar_focus: grammar_focus || null,
        duration_seconds: 0,
        mcq_correct: 0,
        mcq_total: 0,
        speaking_exchanges: 0,
        xp_earned: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating workout session:', error);
      return res.status(500).json({ error: 'Failed to create workout session' });
    }

    res.status(201).json({ session: data });
  } catch (error) {
    console.error('Workout start error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete a workout session
router.post('/:sessionId/complete', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      duration_seconds,
      mcq_correct,
      mcq_total,
      speaking_exchanges,
      grammar_accuracy,
      subjunctive_uses,
    } = req.body;

    // Calculate XP earned
    let xp_earned = 0;
    
    // Base XP for completing
    xp_earned += 50;
    
    // Bonus XP for MCQ accuracy
    if (mcq_total > 0) {
      const accuracy = mcq_correct / mcq_total;
      xp_earned += Math.round(accuracy * 50);
    }
    
    // Bonus XP for speaking exchanges
    xp_earned += (speaking_exchanges || 0) * 10;
    
    // Bonus for subjunctive usage
    xp_earned += (subjunctive_uses || 0) * 5;

    // Update the workout session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('workout_sessions')
      .update({
        duration_seconds: duration_seconds || 0,
        mcq_correct: mcq_correct || 0,
        mcq_total: mcq_total || 0,
        speaking_exchanges: speaking_exchanges || 0,
        grammar_accuracy: grammar_accuracy || null,
        subjunctive_uses: subjunctive_uses || 0,
        xp_earned,
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (sessionError) {
      console.error('Error completing workout:', sessionError);
      return res.status(500).json({ error: 'Failed to complete workout' });
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
          total_xp: (progress.total_xp || 0) + xp_earned,
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
        // Check if it's a new day (not more than 2 days gap)
        const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        if (lastSession && lastSession > twoDaysAgo) {
          newStreak += 1;
        } else if (!lastSession) {
          newStreak = 1;
        } else {
          newStreak = 1; // Reset streak
        }
      }

      await supabaseAdmin
        .from('progress')
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, userProgress.longest_streak || 0),
          last_session_at: now.toISOString(),
          total_conversations: (userProgress.total_conversations || 0) + 1,
          total_minutes: (userProgress.total_minutes || 0) + Math.round((duration_seconds || 0) / 60),
        })
        .eq('user_id', userId);
    }

    res.json({
      session,
      xp_earned,
      message: 'Workout completed!',
    });
  } catch (error) {
    console.error('Workout complete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's workout history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { limit = 20, offset = 0, session_type } = req.query;

    let query = supabaseAdmin
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (session_type) {
      query = query.eq('session_type', session_type);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching workout history:', error);
      return res.status(500).json({ error: 'Failed to fetch workout history' });
    }

    res.json({
      sessions: data || [],
      total: count || data?.length || 0,
    });
  } catch (error) {
    console.error('Workout history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get workout stats summary
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get all completed workouts
    const { data: workouts, error } = await supabaseAdmin
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .not('completed_at', 'is', null);

    if (error) {
      console.error('Error fetching workout stats:', error);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    // Calculate stats
    const stats = {
      total_workouts: workouts?.length || 0,
      total_duration_minutes: 0,
      total_xp: 0,
      average_accuracy: 0,
      daily_workouts: 0,
      weekly_challenges: 0,
      quick_missions: 0,
      this_week_workouts: 0,
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    let totalAccuracy = 0;
    let accuracyCount = 0;

    workouts?.forEach((workout) => {
      stats.total_duration_minutes += Math.round((workout.duration_seconds || 0) / 60);
      stats.total_xp += workout.xp_earned || 0;

      if (workout.grammar_accuracy !== null) {
        totalAccuracy += workout.grammar_accuracy;
        accuracyCount++;
      }

      if (workout.session_type === 'daily_workout') stats.daily_workouts++;
      if (workout.session_type === 'weekly_challenge') stats.weekly_challenges++;
      if (workout.session_type === 'quick_mission') stats.quick_missions++;

      if (new Date(workout.completed_at) > oneWeekAgo) {
        stats.this_week_workouts++;
      }
    });

    stats.average_accuracy = accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : 0;

    res.json({ stats });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get quick mission topics
router.get('/quick-missions/topics', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('quick_mission_topics')
      .select('*')
      .order('title_en', { ascending: true });

    if (error) {
      console.error('Error fetching topics:', error);
      return res.status(500).json({ error: 'Failed to fetch topics' });
    }

    res.json({ topics: data || [] });
  } catch (error) {
    console.error('Topics fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

