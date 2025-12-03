import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// ============================================
// GET /audio/:contentKey - Get pre-generated audio URL
// ============================================
router.get('/:contentKey', async (req: Request, res: Response) => {
  try {
    const { contentKey } = req.params;

    const { data: audio, error } = await supabaseAdmin
      .from('pre_generated_audio')
      .select('audio_url, text_content, emotion, duration_ms')
      .eq('content_key', contentKey)
      .single();

    if (error || !audio) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    res.json({
      audioUrl: audio.audio_url,
      textContent: audio.text_content,
      emotion: audio.emotion,
      durationMs: audio.duration_ms,
    });
  } catch (error) {
    console.error('Error in GET /audio/:contentKey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /audio/episode/:episodeId - Get all audio for an episode
// ============================================
router.get('/episode/:episodeId', async (req: Request, res: Response) => {
  try {
    const { episodeId } = req.params;

    // First get the episode to find its content keys
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('episode_number, scenes, story_arcs(character_id)')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Extract all audio keys from scenes
    const audioKeys: string[] = [];
    if (episode.scenes && Array.isArray(episode.scenes)) {
      for (const scene of episode.scenes) {
        if (scene.audio_key) {
          audioKeys.push(scene.audio_key);
        }
      }
    }

    // Fetch all pre-generated audio for these keys
    const { data: audioItems, error: audioError } = await supabaseAdmin
      .from('pre_generated_audio')
      .select('content_key, audio_url, text_content, emotion, duration_ms')
      .in('content_key', audioKeys);

    if (audioError) {
      console.error('Error fetching episode audio:', audioError);
      return res.status(500).json({ error: 'Failed to fetch audio' });
    }

    // Create a map for easy lookup
    const audioMap: Record<string, any> = {};
    audioItems?.forEach(item => {
      audioMap[item.content_key] = {
        audioUrl: item.audio_url,
        textContent: item.text_content,
        emotion: item.emotion,
        durationMs: item.duration_ms,
      };
    });

    res.json({
      episodeId,
      audioCount: audioItems?.length || 0,
      audio: audioMap,
    });
  } catch (error) {
    console.error('Error in GET /audio/episode/:episodeId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /audio/batch - Get multiple audio items by keys
// ============================================
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { contentKeys } = req.body;

    if (!contentKeys || !Array.isArray(contentKeys) || contentKeys.length === 0) {
      return res.status(400).json({ error: 'contentKeys array is required' });
    }

    // Limit batch size
    if (contentKeys.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 keys per batch' });
    }

    const { data: audioItems, error } = await supabaseAdmin
      .from('pre_generated_audio')
      .select('content_key, audio_url, text_content, emotion, duration_ms')
      .in('content_key', contentKeys);

    if (error) {
      console.error('Error fetching batch audio:', error);
      return res.status(500).json({ error: 'Failed to fetch audio' });
    }

    // Create a map for easy lookup
    const audioMap: Record<string, any> = {};
    audioItems?.forEach(item => {
      audioMap[item.content_key] = {
        audioUrl: item.audio_url,
        textContent: item.text_content,
        emotion: item.emotion,
        durationMs: item.duration_ms,
      };
    });

    res.json({
      found: audioItems?.length || 0,
      requested: contentKeys.length,
      audio: audioMap,
    });
  } catch (error) {
    console.error('Error in POST /audio/batch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

