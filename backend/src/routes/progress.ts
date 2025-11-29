import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Get user progress
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabaseAdmin
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    res.json({ progress: data });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update streak
router.post('/streak', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: progress, error: fetchError } = await supabaseAdmin
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    const today = new Date();
    const lastSession = progress.last_session_at ? new Date(progress.last_session_at) : null;
    
    let newStreak = progress.current_streak;
    
    if (lastSession) {
      const daysSinceLastSession = Math.floor(
        (today.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastSession === 0) {
        // Already practiced today, no change
      } else if (daysSinceLastSession === 1) {
        // Consecutive day, increment streak
        newStreak += 1;
      } else {
        // Streak broken, reset to 1
        newStreak = 1;
      }
    } else {
      // First session ever
      newStreak = 1;
    }

    const longestStreak = Math.max(progress.longest_streak, newStreak);

    const { data, error } = await supabaseAdmin
      .from('progress')
      .update({
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_session_at: today.toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update streak' });
    }

    res.json({ progress: data });
  } catch (error) {
    console.error('Update streak error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update grammar mastery
router.post('/grammar', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { grammarRule, score } = req.body;

    if (!grammarRule || score === undefined) {
      return res.status(400).json({ error: 'Grammar rule and score are required' });
    }

    const { data: progress, error: fetchError } = await supabaseAdmin
      .from('progress')
      .select('grammar_mastery')
      .eq('user_id', userId)
      .single();

    if (fetchError || !progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    const grammarMastery = progress.grammar_mastery || {};
    const currentScore = grammarMastery[grammarRule] || 0;
    // Weighted average to smooth out scores
    grammarMastery[grammarRule] = Math.round((currentScore * 0.7 + score * 0.3) * 100) / 100;

    const { data, error } = await supabaseAdmin
      .from('progress')
      .update({ grammar_mastery: grammarMastery })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update grammar mastery' });
    }

    res.json({ progress: data });
  } catch (error) {
    console.error('Update grammar mastery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add vocabulary learned
router.post('/vocabulary', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { words } = req.body;

    if (!words || !Array.isArray(words)) {
      return res.status(400).json({ error: 'Words array is required' });
    }

    const { data: progress, error: fetchError } = await supabaseAdmin
      .from('progress')
      .select('vocabulary_learned')
      .eq('user_id', userId)
      .single();

    if (fetchError || !progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    const currentVocab = new Set(progress.vocabulary_learned || []);
    words.forEach((word: string) => currentVocab.add(word));

    const { data, error } = await supabaseAdmin
      .from('progress')
      .update({ vocabulary_learned: Array.from(currentVocab) })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update vocabulary' });
    }

    res.json({ progress: data });
  } catch (error) {
    console.error('Update vocabulary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get achievements
router.get('/achievements', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: progress } = await supabaseAdmin
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    // Calculate available achievements
    const allAchievements = [
      { id: 'first_chat', name: 'First Conversation', description: 'Complete your first conversation', icon: '💬', requirement: progress.total_conversations >= 1 },
      { id: 'streak_7', name: '7-Day Streak', description: 'Practice for 7 days in a row', icon: '🔥', requirement: progress.longest_streak >= 7 },
      { id: 'streak_30', name: '30-Day Streak', description: 'Practice for 30 days in a row', icon: '⚡', requirement: progress.longest_streak >= 30 },
      { id: 'vocab_100', name: 'Word Collector', description: 'Learn 100 vocabulary words', icon: '📚', requirement: (progress.vocabulary_learned?.length || 0) >= 100 },
      { id: 'vocab_500', name: 'Word Master', description: 'Learn 500 vocabulary words', icon: '🎓', requirement: (progress.vocabulary_learned?.length || 0) >= 500 },
      { id: 'chats_10', name: 'Conversationalist', description: 'Complete 10 conversations', icon: '🗣️', requirement: progress.total_conversations >= 10 },
      { id: 'chats_50', name: 'Social Butterfly', description: 'Complete 50 conversations', icon: '🦋', requirement: progress.total_conversations >= 50 },
      { id: 'time_60', name: 'Dedicated Learner', description: 'Spend 60 minutes practicing', icon: '⏰', requirement: progress.total_minutes >= 60 },
      { id: 'time_300', name: 'Language Enthusiast', description: 'Spend 5 hours practicing', icon: '🌟', requirement: progress.total_minutes >= 300 },
    ];

    const earned = allAchievements.filter(a => a.requirement).map(a => a.id);
    const available = allAchievements.map(({ requirement, ...rest }) => ({
      ...rest,
      earned: requirement,
    }));

    // Update earned achievements in database
    if (earned.length !== (progress.achievements?.length || 0)) {
      await supabaseAdmin
        .from('progress')
        .update({ achievements: earned })
        .eq('user_id', userId);
    }

    res.json({ achievements: available });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: progress } = await supabaseAdmin
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    // Calculate grammar mastery percentage
    const grammarRules = Object.keys(progress.grammar_mastery || {});
    const averageMastery = grammarRules.length > 0
      ? grammarRules.reduce((sum, key) => sum + (progress.grammar_mastery[key] || 0), 0) / grammarRules.length
      : 0;

    const stats = {
      totalConversations: progress.total_conversations,
      totalMinutes: progress.total_minutes,
      currentStreak: progress.current_streak,
      longestStreak: progress.longest_streak,
      vocabularyCount: progress.vocabulary_learned?.length || 0,
      grammarRulesMastered: grammarRules.filter(k => progress.grammar_mastery[k] >= 80).length,
      averageGrammarMastery: Math.round(averageMastery),
      achievementsEarned: progress.achievements?.length || 0,
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

