import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateToken as authMiddleware, optionalAuth } from '../middleware/auth';
import { syncArticlesFromRSS, shouldSync } from '../services/articleSync';

const router = Router();

// ============================================
// GET /articles - List articles with popularity scores
// ============================================
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { tab = 'popular', limit = 20, offset = 0 } = req.query;

    if (tab === 'favorites') {
      // Favorites tab - requires authentication
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required for favorites' });
      }

      const { data: favorites, error } = await supabaseAdmin
        .from('article_favorites')
        .select(`
          id,
          created_at,
          articles (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (error) {
        console.error('Error fetching favorites:', error);
        return res.status(500).json({ error: 'Failed to fetch favorites' });
      }

      const articles = favorites?.map(f => ({
        ...f.articles,
        is_favorite: true
      })) || [];

      return res.json({ articles, tab: 'favorites' });
    }

    // Popular tab - get articles with popularity scores
    // Score = (opens * 1.0) + (avgCompletion * 2.0) + (totalReadMinutes * 0.5)
    const { data: articles, error } = await supabaseAdmin
      .from('articles')
      .select('*')
      .order('published_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      console.error('Error fetching articles:', error);
      return res.status(500).json({ error: 'Failed to fetch articles' });
    }

    // Calculate popularity scores
    const articlesWithScores = await Promise.all(
      (articles || []).map(async (article) => {
        const { data: reads } = await supabaseAdmin
          .from('article_reads')
          .select('read_seconds, completion_percent')
          .eq('article_id', article.id);

        const opens = reads?.length || 0;
        const avgCompletion = reads && reads.length > 0
          ? reads.reduce((sum, r) => sum + (r.completion_percent || 0), 0) / reads.length 
          : 0;
        const totalReadMinutes = (reads?.reduce((sum, r) => sum + (r.read_seconds || 0), 0) ?? 0) / 60;

        const popularityScore = (opens * 1.0) + (avgCompletion / 100 * 2.0) + (totalReadMinutes * 0.5);

        // Check if current user has favorited this article
        let isFavorite = false;
        if (userId) {
          const { data: fav } = await supabaseAdmin
            .from('article_favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('article_id', article.id)
            .single();
          isFavorite = !!fav;
        }

        return {
          ...article,
          popularity_score: popularityScore,
          read_count: opens,
          is_favorite: isFavorite
        };
      })
    );

    // Sort by popularity for 'popular' tab
    if (tab === 'popular') {
      articlesWithScores.sort((a, b) => b.popularity_score - a.popularity_score);
    }

    res.json({ articles: articlesWithScores, tab });
  } catch (error) {
    console.error('Error in GET /articles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /articles/grammar-tags - Get available grammar categories
// ============================================
router.get('/grammar-tags', async (req: Request, res: Response) => {
  try {
    const { data: curriculum, error } = await supabaseAdmin
      .from('grammar_curriculum')
      .select('grammar_focus, title_en')
      .order('level', { ascending: true })
      .order('week_number', { ascending: true });

    if (error) {
      console.error('Error fetching grammar tags:', error);
      return res.status(500).json({ error: 'Failed to fetch grammar tags' });
    }

    // Get unique grammar focuses
    const uniqueTags = [...new Map(curriculum?.map(c => [c.grammar_focus, c]) || []).values()];

    res.json({ tags: uniqueTags });
  } catch (error) {
    console.error('Error in GET /articles/grammar-tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /articles/search - Search articles
// ============================================
router.get('/search', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { q = '', grammar = '', limit = 20, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('articles')
      .select('*');

    // Text search on title and subtitle
    if (q) {
      query = query.or(`title.ilike.%${q}%,subtitle.ilike.%${q}%`);
    }

    // Filter by grammar tag
    if (grammar) {
      query = query.contains('grammar_tags', [grammar]);
    }

    const { data: articles, error } = await query
      .order('published_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      console.error('Error searching articles:', error);
      return res.status(500).json({ error: 'Failed to search articles' });
    }

    // Add favorite status for authenticated users
    const articlesWithFavorites = await Promise.all(
      (articles || []).map(async (article) => {
        let isFavorite = false;
        if (userId) {
          const { data: fav } = await supabaseAdmin
            .from('article_favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('article_id', article.id)
            .single();
          isFavorite = !!fav;
        }
        return { ...article, is_favorite: isFavorite };
      })
    );

    res.json({ articles: articlesWithFavorites });
  } catch (error) {
    console.error('Error in GET /articles/search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /articles/autocomplete - Get title suggestions
// ============================================
router.get('/autocomplete', async (req: Request, res: Response) => {
  try {
    const { q = '' } = req.query;

    if (!q || String(q).length < 2) {
      return res.json({ suggestions: [] });
    }

    const { data: articles, error } = await supabaseAdmin
      .from('articles')
      .select('title')
      .ilike('title', `%${q}%`)
      .limit(5);

    if (error) {
      console.error('Error fetching autocomplete:', error);
      return res.status(500).json({ error: 'Failed to fetch suggestions' });
    }

    const suggestions = articles?.map(a => a.title) || [];

    res.json({ suggestions });
  } catch (error) {
    console.error('Error in GET /articles/autocomplete:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /articles/:id - Get single article with full content
// ============================================
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const { data: article, error } = await supabaseAdmin
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Check if favorited
    let isFavorite = false;
    if (userId) {
      const { data: fav } = await supabaseAdmin
        .from('article_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('article_id', id)
        .single();
      isFavorite = !!fav;
    }

    res.json({ 
      article: {
        ...article,
        is_favorite: isFavorite
      }
    });
  } catch (error) {
    console.error('Error in GET /articles/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /articles/:id/read - Track article read
// ============================================
router.post('/:id/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { read_seconds = 0, completion_percent = 0 } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Upsert read record
    const { data: existing } = await supabaseAdmin
      .from('article_reads')
      .select('id, read_seconds, completion_percent')
      .eq('user_id', userId)
      .eq('article_id', id)
      .gte('opened_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (existing) {
      // Update existing read - keep the max values
      const { error } = await supabaseAdmin
        .from('article_reads')
        .update({
          read_seconds: Math.max(existing.read_seconds, read_seconds),
          completion_percent: Math.max(existing.completion_percent, completion_percent)
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating read:', error);
        return res.status(500).json({ error: 'Failed to update read' });
      }
    } else {
      // Create new read
      const { error } = await supabaseAdmin
        .from('article_reads')
        .insert({
          user_id: userId,
          article_id: id,
          read_seconds,
          completion_percent
        });

      if (error) {
        console.error('Error creating read:', error);
        return res.status(500).json({ error: 'Failed to create read' });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in POST /articles/:id/read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /articles/:id/favorite - Add to favorites
// ============================================
router.post('/:id/favorite', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data, error } = await supabaseAdmin
      .from('article_favorites')
      .insert({
        user_id: userId,
        article_id: id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Already favorited
        return res.json({ success: true, message: 'Already in favorites' });
      }
      console.error('Error adding favorite:', error);
      return res.status(500).json({ error: 'Failed to add favorite' });
    }

    res.json({ success: true, favorite: data });
  } catch (error) {
    console.error('Error in POST /articles/:id/favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// DELETE /articles/:id/favorite - Remove from favorites
// ============================================
router.delete('/:id/favorite', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { error } = await supabaseAdmin
      .from('article_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('article_id', id);

    if (error) {
      console.error('Error removing favorite:', error);
      return res.status(500).json({ error: 'Failed to remove favorite' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /articles/:id/favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /articles/sync - Manually trigger RSS sync
// ============================================
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const result = await syncArticlesFromRSS();
    res.json({ 
      success: true, 
      ...result 
    });
  } catch (error) {
    console.error('Error in POST /articles/sync:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// ============================================
// GET /articles/sync-status - Check if sync is needed
// ============================================
router.get('/sync-status', async (req: Request, res: Response) => {
  try {
    const needsSync = await shouldSync();
    res.json({ needsSync });
  } catch (error) {
    console.error('Error in GET /articles/sync-status:', error);
    res.status(500).json({ error: 'Failed to check sync status' });
  }
});

export default router;

