import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateToken as authMiddleware } from '../middleware/auth';

const router = Router();

// Types for story system
interface StoryArc {
  id: string;
  character_id: string;
  arc_number: number;
  title_es: string;
  title_en: string;
  description: string;
  location: string;
  total_episodes: number;
  cefr_level: string;
  cover_image_url?: string;
}

interface Episode {
  id: string;
  story_arc_id: string;
  episode_number: number;
  title_es: string;
  title_en: string;
  scenario: string;
  grammar_focus: string;
  grammar_triggers: string[];
  scenes: any[];
  journal_prompt_es?: string;
  journal_prompt_en?: string;
  estimated_duration: number;
  intro_audio_url?: string;
}

interface UserStoryProgress {
  id: string;
  user_id: string;
  story_arc_id: string;
  current_episode: number;
  episodes_completed: number;
  total_stars: number;
  total_xp: number;
  unlocked_at: string;
  last_played_at?: string;
}

// ============================================
// GET /stories/arcs - List all available story arcs
// ============================================
router.get('/arcs', async (req: Request, res: Response) => {
  try {
    const { data: arcs, error } = await supabaseAdmin
      .from('story_arcs')
      .select('*')
      .order('arc_number', { ascending: true });

    if (error) {
      console.error('Error fetching story arcs:', error);
      return res.status(500).json({ error: 'Failed to fetch story arcs' });
    }

    res.json({ arcs });
  } catch (error) {
    console.error('Error in GET /stories/arcs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /stories/arcs/:id - Get story arc with episodes
// ============================================
router.get('/arcs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get the story arc
    const { data: arc, error: arcError } = await supabaseAdmin
      .from('story_arcs')
      .select('*')
      .eq('id', id)
      .single();

    if (arcError || !arc) {
      return res.status(404).json({ error: 'Story arc not found' });
    }

    // Get episodes for this arc
    const { data: episodes, error: episodesError } = await supabaseAdmin
      .from('episodes')
      .select('id, episode_number, title_es, title_en, scenario, grammar_focus, estimated_duration, intro_audio_url')
      .eq('story_arc_id', id)
      .order('episode_number', { ascending: true });

    if (episodesError) {
      console.error('Error fetching episodes:', episodesError);
      return res.status(500).json({ error: 'Failed to fetch episodes' });
    }

    res.json({ arc, episodes });
  } catch (error) {
    console.error('Error in GET /stories/arcs/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /stories/episodes/:id - Get full episode content
// ============================================
router.get('/episodes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: episode, error } = await supabaseAdmin
      .from('episodes')
      .select(`
        *,
        story_arcs (
          id,
          character_id,
          title_es,
          title_en,
          location,
          cefr_level
        )
      `)
      .eq('id', id)
      .single();

    if (error || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    res.json({ episode });
  } catch (error) {
    console.error('Error in GET /stories/episodes/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /stories/progress - Get user's progress across all arcs
// ============================================
router.get('/progress', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's progress for all story arcs
    const { data: progress, error: progressError } = await supabaseAdmin
      .from('user_story_progress')
      .select(`
        *,
        story_arcs (
          id,
          character_id,
          title_es,
          title_en,
          total_episodes,
          cefr_level
        )
      `)
      .eq('user_id', userId);

    if (progressError) {
      console.error('Error fetching user progress:', progressError);
      return res.status(500).json({ error: 'Failed to fetch progress' });
    }

    // Get all available story arcs to show locked ones too
    const { data: allArcs, error: arcsError } = await supabaseAdmin
      .from('story_arcs')
      .select('*')
      .order('arc_number', { ascending: true });

    if (arcsError) {
      console.error('Error fetching arcs:', arcsError);
      return res.status(500).json({ error: 'Failed to fetch arcs' });
    }

    // Merge progress with all arcs
    const arcsWithProgress = allArcs?.map(arc => {
      const userProgress = progress?.find(p => p.story_arc_id === arc.id);
      return {
        ...arc,
        progress: userProgress || null,
        isUnlocked: !!userProgress,
      };
    });

    res.json({ arcs: arcsWithProgress });
  } catch (error) {
    console.error('Error in GET /stories/progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /stories/progress/start - Start/unlock a story arc
// ============================================
router.post('/progress/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { storyArcId } = req.body;
    if (!storyArcId) {
      return res.status(400).json({ error: 'storyArcId is required' });
    }

    // Check if arc exists
    const { data: arc, error: arcError } = await supabaseAdmin
      .from('story_arcs')
      .select('id, total_episodes')
      .eq('id', storyArcId)
      .single();

    if (arcError || !arc) {
      return res.status(404).json({ error: 'Story arc not found' });
    }

    // Create or update progress record
    const { data: progress, error: progressError } = await supabaseAdmin
      .from('user_story_progress')
      .upsert({
        user_id: userId,
        story_arc_id: storyArcId,
        current_episode: 1,
        episodes_completed: 0,
        total_stars: 0,
        total_xp: 0,
        unlocked_at: new Date().toISOString(),
        last_played_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,story_arc_id',
      })
      .select()
      .single();

    if (progressError) {
      console.error('Error creating progress:', progressError);
      return res.status(500).json({ error: 'Failed to start story' });
    }

    // Get first episode
    const { data: firstEpisode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('*')
      .eq('story_arc_id', storyArcId)
      .eq('episode_number', 1)
      .single();

    if (episodeError) {
      console.error('Error fetching first episode:', episodeError);
    }

    res.json({ 
      progress, 
      firstEpisode,
      message: 'Story arc started successfully' 
    });
  } catch (error) {
    console.error('Error in POST /stories/progress/start:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /stories/attempt - Record episode attempt
// ============================================
router.post('/attempt', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { 
      episodeId, 
      grammarScore, 
      speakingCount, 
      writingCount, 
      starsEarned, 
      pathTaken,
      durationSeconds 
    } = req.body;

    if (!episodeId) {
      return res.status(400).json({ error: 'episodeId is required' });
    }

    // Calculate XP based on performance
    const baseXP = 50;
    const starBonus = (starsEarned || 0) * 25;
    const grammarBonus = Math.round((grammarScore || 0) * 0.5);
    const speakingBonus = (speakingCount || 0) * 10;
    const xpEarned = baseXP + starBonus + grammarBonus + speakingBonus;

    // Record the attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('episode_attempts')
      .insert({
        user_id: userId,
        episode_id: episodeId,
        grammar_score: grammarScore || 0,
        speaking_count: speakingCount || 0,
        writing_count: writingCount || 0,
        stars_earned: Math.min(3, Math.max(0, starsEarned || 0)),
        xp_earned: xpEarned,
        path_taken: pathTaken || [],
        duration_seconds: durationSeconds || 0,
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Error recording attempt:', attemptError);
      return res.status(500).json({ error: 'Failed to record attempt' });
    }

    // Get episode to find story arc
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('story_arc_id, episode_number')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Update user's story progress
    const { data: currentProgress, error: progressFetchError } = await supabaseAdmin
      .from('user_story_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('story_arc_id', episode.story_arc_id)
      .single();

    if (progressFetchError) {
      console.error('Error fetching current progress:', progressFetchError);
    }

    // Update progress
    const newEpisodesCompleted = Math.max(
      currentProgress?.episodes_completed || 0,
      episode.episode_number
    );
    const newCurrentEpisode = newEpisodesCompleted + 1;

    const { error: updateError } = await supabaseAdmin
      .from('user_story_progress')
      .update({
        current_episode: newCurrentEpisode,
        episodes_completed: newEpisodesCompleted,
        total_stars: (currentProgress?.total_stars || 0) + (starsEarned || 0),
        total_xp: (currentProgress?.total_xp || 0) + xpEarned,
        last_played_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('story_arc_id', episode.story_arc_id);

    if (updateError) {
      console.error('Error updating progress:', updateError);
    }

    // Also update global user progress (optional - RPC might not exist)
    try {
      await supabaseAdmin.rpc('increment_user_xp', { 
        user_id_input: userId, 
        xp_amount: xpEarned 
      });
    } catch {
      // RPC might not exist, that's okay
    }

    res.json({ 
      attempt,
      xpEarned,
      message: 'Episode completed successfully',
      nextEpisode: newCurrentEpisode
    });
  } catch (error) {
    console.error('Error in POST /stories/attempt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /stories/current - Get user's current story and episode
// ============================================
router.get('/current', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's most recent progress
    const { data: progress, error: progressError } = await supabaseAdmin
      .from('user_story_progress')
      .select(`
        *,
        story_arcs (*)
      `)
      .eq('user_id', userId)
      .order('last_played_at', { ascending: false })
      .limit(1)
      .single();

    if (progressError || !progress) {
      // User hasn't started any story - return first available arc
      const { data: firstArc, error: arcError } = await supabaseAdmin
        .from('story_arcs')
        .select('*')
        .eq('character_id', 'florencia')
        .eq('arc_number', 1)
        .single();

      if (arcError || !firstArc) {
        return res.status(404).json({ error: 'No stories available' });
      }

      return res.json({ 
        hasStarted: false,
        arc: firstArc,
        progress: null,
        currentEpisode: null
      });
    }

    // Get current episode
    const { data: currentEpisode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('*')
      .eq('story_arc_id', progress.story_arc_id)
      .eq('episode_number', progress.current_episode)
      .single();

    if (episodeError) {
      console.error('Error fetching current episode:', episodeError);
    }

    res.json({
      hasStarted: true,
      arc: progress.story_arcs,
      progress,
      currentEpisode
    });
  } catch (error) {
    console.error('Error in GET /stories/current:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

