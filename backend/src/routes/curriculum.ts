import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.use(optionalAuth);

// Get curriculum for a specific level (B1 or B2)
router.get('/:level', async (req: Request, res: Response) => {
  try {
    const { level } = req.params;
    
    if (!['B1', 'B2'].includes(level.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid level. Must be B1 or B2.' });
    }

    const { data, error } = await supabaseAdmin
      .from('grammar_curriculum')
      .select('*')
      .eq('level', level.toUpperCase())
      .order('week_number', { ascending: true });

    if (error) {
      console.error('Error fetching curriculum:', error);
      return res.status(500).json({ error: 'Failed to fetch curriculum' });
    }

    res.json({ curriculum: data });
  } catch (error) {
    console.error('Curriculum fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific week content with daily lessons
router.get('/:level/week/:weekNumber', async (req: Request, res: Response) => {
  try {
    const { level, weekNumber } = req.params;
    const week = parseInt(weekNumber);

    if (!['B1', 'B2'].includes(level.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid level. Must be B1 or B2.' });
    }

    if (isNaN(week) || week < 1 || week > 12) {
      return res.status(400).json({ error: 'Invalid week number. Must be 1-12.' });
    }

    // Get curriculum week
    const { data: curriculumData, error: curriculumError } = await supabaseAdmin
      .from('grammar_curriculum')
      .select('*')
      .eq('level', level.toUpperCase())
      .eq('week_number', week)
      .single();

    if (curriculumError || !curriculumData) {
      return res.status(404).json({ error: 'Week not found' });
    }

    // Get daily lessons for this week
    const { data: lessonsData, error: lessonsError } = await supabaseAdmin
      .from('daily_lessons')
      .select('*')
      .eq('curriculum_id', curriculumData.id)
      .order('day_number', { ascending: true });

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return res.status(500).json({ error: 'Failed to fetch lessons' });
    }

    res.json({
      week: curriculumData,
      lessons: lessonsData || [],
    });
  } catch (error) {
    console.error('Week fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's curriculum progress
router.get('/user/progress', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data, error } = await supabaseAdmin
      .from('user_curriculum_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching progress:', error);
      return res.status(500).json({ error: 'Failed to fetch progress' });
    }

    // If no progress exists, return default values
    if (!data) {
      return res.json({
        progress: {
          level: null,
          current_week: 1,
          current_day: 1,
          placement_completed: false,
          total_xp: 0,
        },
      });
    }

    res.json({ progress: data });
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize or update user's curriculum progress
router.post('/user/progress', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { level, current_week, current_day, placement_completed, placement_score, total_xp } = req.body;

    // Check if progress already exists
    const { data: existing } = await supabaseAdmin
      .from('user_curriculum_progress')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existing) {
      // Update existing progress
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (level !== undefined) updateData.level = level;
      if (current_week !== undefined) updateData.current_week = current_week;
      if (current_day !== undefined) updateData.current_day = current_day;
      if (placement_completed !== undefined) updateData.placement_completed = placement_completed;
      if (placement_score !== undefined) updateData.placement_score = placement_score;
      if (total_xp !== undefined) updateData.total_xp = total_xp;

      result = await supabaseAdmin
        .from('user_curriculum_progress')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      // Create new progress
      result = await supabaseAdmin
        .from('user_curriculum_progress')
        .insert({
          user_id: userId,
          level: level || 'B1',
          current_week: current_week || 1,
          current_day: current_day || 1,
          placement_completed: placement_completed || false,
          placement_score: placement_score || null,
          total_xp: total_xp || 0,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating progress:', result.error);
      return res.status(500).json({ error: 'Failed to update progress' });
    }

    res.json({ progress: result.data });
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Advance to next day/week
router.post('/user/advance', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get current progress
    const { data: progress, error: progressError } = await supabaseAdmin
      .from('user_curriculum_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (progressError || !progress) {
      return res.status(404).json({ error: 'No curriculum progress found' });
    }

    let newDay = progress.current_day + 1;
    let newWeek = progress.current_week;

    // If day > 7, advance to next week
    if (newDay > 7) {
      newDay = 1;
      newWeek = Math.min(progress.current_week + 1, 12);
    }

    const { data, error } = await supabaseAdmin
      .from('user_curriculum_progress')
      .update({
        current_day: newDay,
        current_week: newWeek,
        week_started_at: newDay === 1 ? new Date().toISOString() : progress.week_started_at,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error advancing progress:', error);
      return res.status(500).json({ error: 'Failed to advance progress' });
    }

    res.json({ 
      progress: data,
      message: newDay === 1 ? 'Advanced to new week!' : 'Advanced to next day',
    });
  } catch (error) {
    console.error('Advance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's lesson for user
router.get('/user/today', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's progress
    const { data: progress, error: progressError } = await supabaseAdmin
      .from('user_curriculum_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      console.error('Error fetching progress:', progressError);
      return res.status(500).json({ error: 'Failed to fetch progress' });
    }

    // If no progress or placement not completed
    if (!progress || !progress.placement_completed) {
      return res.json({
        needsPlacement: true,
        progress: progress || null,
      });
    }

    // Get curriculum for user's level and week
    const { data: curriculum, error: curriculumError } = await supabaseAdmin
      .from('grammar_curriculum')
      .select('*')
      .eq('level', progress.level)
      .eq('week_number', progress.current_week)
      .single();

    if (curriculumError || !curriculum) {
      return res.status(404).json({ error: 'Curriculum not found for current week' });
    }

    // Get today's lesson
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from('daily_lessons')
      .select('*')
      .eq('curriculum_id', curriculum.id)
      .eq('day_number', progress.current_day)
      .single();

    if (lessonError && lessonError.code !== 'PGRST116') {
      console.error('Error fetching lesson:', lessonError);
      return res.status(500).json({ error: 'Failed to fetch lesson' });
    }

    res.json({
      needsPlacement: false,
      progress,
      curriculum,
      lesson: lesson || null,
    });
  } catch (error) {
    console.error('Today lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

