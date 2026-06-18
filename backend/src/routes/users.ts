import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Get user profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile: data });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.patch('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const allowedFields = [
      'display_name',
      'spanish_level',
      'goals',
      'preferred_topics',
      'correction_depth',
      'voice_speed',
      'accent_preference',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json({ profile: data });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update onboarding data
router.post('/onboarding', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { spanishLevel, goals, preferredTopics } = req.body;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        spanish_level: spanishLevel,
        goals: goals || [],
        preferred_topics: preferredTopics || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to save onboarding data' });
    }

    res.json({ profile: data });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's vocabulary sets
router.get('/vocabulary-sets', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's custom sets and default sets
    const { data, error } = await supabaseAdmin
      .from('vocabulary_sets')
      .select('*')
      .or(`user_id.eq.${userId},is_default.eq.true`)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch vocabulary sets' });
    }

    res.json({ vocabularySets: data });
  } catch (error) {
    console.error('Get vocabulary sets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a vocabulary set
router.post('/vocabulary-sets', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, words, category } = req.body;

    if (!name || !words || !Array.isArray(words)) {
      return res.status(400).json({ error: 'Name and words array are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('vocabulary_sets')
      .insert({
        user_id: userId,
        name,
        description: description || null,
        words,
        category: category || 'custom',
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create vocabulary set' });
    }

    res.status(201).json({ vocabularySet: data });
  } catch (error) {
    console.error('Create vocabulary set error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a vocabulary set
router.delete('/vocabulary-sets/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const setId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabaseAdmin
      .from('vocabulary_sets')
      .delete()
      .eq('id', setId)
      .eq('user_id', userId)
      .eq('is_default', false); // Can't delete default sets

    if (error) {
      return res.status(500).json({ error: 'Failed to delete vocabulary set' });
    }

    res.json({ message: 'Vocabulary set deleted' });
  } catch (error) {
    console.error('Delete vocabulary set error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Permanently delete the authenticated user's account and all associated data.
// Deleting the auth.users row cascades to public.users and every child table
// (progress, conversations, episode data, etc.) via ON DELETE CASCADE.
router.delete('/account', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Delete account error:', error);
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    // Fallback: if the auth deletion didn't cascade for any reason, remove the
    // profile row explicitly (this also cascades to child tables).
    await supabaseAdmin.from('users').delete().eq('id', userId);

    res.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

