import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateToken as authMiddleware } from '../middleware/auth';
import { openai } from '../config/openai';

const router = Router();

// ============================================
// GET /journal/entries - List user's journal entries
// ============================================
router.get('/entries', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { limit = 20, offset = 0 } = req.query;

    const { data: entries, error, count } = await supabaseAdmin
      .from('journal_entries')
      .select(`
        *,
        episodes (
          id,
          title_es,
          title_en,
          episode_number,
          story_arcs (
            title_es,
            title_en
          )
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      console.error('Error fetching journal entries:', error);
      return res.status(500).json({ error: 'Failed to fetch journal entries' });
    }

    res.json({ 
      entries, 
      total: count,
      hasMore: (count || 0) > Number(offset) + Number(limit)
    });
  } catch (error) {
    console.error('Error in GET /journal/entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /journal/entries/:id - Get single journal entry
// ============================================
router.get('/entries/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;

    const { data: entry, error } = await supabaseAdmin
      .from('journal_entries')
      .select(`
        *,
        episodes (
          id,
          title_es,
          title_en,
          grammar_focus,
          grammar_triggers
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !entry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    res.json({ entry });
  } catch (error) {
    console.error('Error in GET /journal/entries/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /journal/entries - Submit new journal entry
// ============================================
router.post('/entries', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { episodeId, promptEs, promptEn, entryText } = req.body;

    if (!entryText || entryText.trim().length === 0) {
      return res.status(400).json({ error: 'Entry text is required' });
    }

    // Calculate word count
    const wordCount = entryText.trim().split(/\s+/).length;

    // Base XP for completing a journal entry
    const baseXP = 30;
    const wordBonus = Math.min(20, Math.floor(wordCount / 10)); // Up to 20 bonus XP
    const xpEarned = baseXP + wordBonus;

    // Create the journal entry
    const { data: entry, error: insertError } = await supabaseAdmin
      .from('journal_entries')
      .insert({
        user_id: userId,
        episode_id: episodeId || null,
        prompt_es: promptEs || '',
        prompt_en: promptEn || '',
        entry_text: entryText.trim(),
        word_count: wordCount,
        xp_earned: xpEarned,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating journal entry:', insertError);
      return res.status(500).json({ error: 'Failed to create journal entry' });
    }

    res.json({ 
      entry,
      xpEarned,
      message: 'Journal entry saved successfully'
    });
  } catch (error) {
    console.error('Error in POST /journal/entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /journal/feedback - Get AI feedback on entry
// ============================================
router.post('/feedback', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { entryId, entryText, grammarFocus, grammarTriggers } = req.body;

    if (!entryText) {
      return res.status(400).json({ error: 'Entry text is required' });
    }

    // Build the analysis prompt
    const analysisPrompt = `Eres un tutor de español amable y alentador. Analiza este texto escrito por un estudiante de español (nivel B1-B2) y proporciona retroalimentación constructiva.

TEXTO DEL ESTUDIANTE:
"${entryText}"

${grammarFocus ? `ENFOQUE GRAMATICAL DE LA LECCIÓN: ${grammarFocus}` : ''}
${grammarTriggers?.length ? `ESTRUCTURAS OBJETIVO: ${grammarTriggers.join(', ')}` : ''}

Por favor analiza y responde en JSON con este formato:
{
  "overallImpression": "Un comentario positivo y alentador sobre el texto (2-3 oraciones)",
  "grammarHighlights": ["lista de estructuras gramaticales bien usadas"],
  "areasToImprove": [
    {
      "original": "frase con error",
      "suggestion": "versión corregida",
      "explanation": "explicación breve del error"
    }
  ],
  "vocabularyUsed": ["palabras interesantes o avanzadas que usó"],
  "suggestedVocabulary": ["2-3 palabras nuevas relacionadas con el tema"],
  "grammarScore": 85,
  "encouragement": "Un mensaje motivador final"
}

IMPORTANTE:
- Sé positivo y constructivo
- Limita las correcciones a máximo 3 errores importantes
- Celebra lo que hizo bien
- El score debe ser entre 60-100 (generoso pero honesto)`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: analysisPrompt }],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const feedbackText = completion.choices[0]?.message?.content;
    let feedback;
    
    try {
      feedback = JSON.parse(feedbackText || '{}');
    } catch (e) {
      console.error('Failed to parse AI feedback:', e);
      feedback = {
        overallImpression: '¡Buen trabajo! Tu escritura muestra progreso.',
        grammarHighlights: [],
        areasToImprove: [],
        vocabularyUsed: [],
        suggestedVocabulary: [],
        grammarScore: 75,
        encouragement: '¡Sigue practicando!'
      };
    }

    // Update the journal entry with feedback if entryId provided
    if (entryId) {
      const { error: updateError } = await supabaseAdmin
        .from('journal_entries')
        .update({
          ai_feedback: feedback,
          grammar_highlights: feedback.grammarHighlights || [],
        })
        .eq('id', entryId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating entry with feedback:', updateError);
      }
    }

    res.json({ feedback });
  } catch (error) {
    console.error('Error in POST /journal/feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /journal/prompts/:episodeId - Get prompt for episode
// ============================================
router.get('/prompts/:episodeId', async (req: Request, res: Response) => {
  try {
    const { episodeId } = req.params;

    const { data: episode, error } = await supabaseAdmin
      .from('episodes')
      .select('journal_prompt_es, journal_prompt_en, grammar_focus, grammar_triggers')
      .eq('id', episodeId)
      .single();

    if (error || !episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    res.json({
      promptEs: episode.journal_prompt_es,
      promptEn: episode.journal_prompt_en,
      grammarFocus: episode.grammar_focus,
      grammarTriggers: episode.grammar_triggers,
    });
  } catch (error) {
    console.error('Error in GET /journal/prompts/:episodeId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /journal/stats - Get user's journal statistics
// ============================================
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get total entries and stats
    const { data: entries, error } = await supabaseAdmin
      .from('journal_entries')
      .select('word_count, xp_earned, created_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching journal stats:', error);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    const totalEntries = entries?.length || 0;
    const totalWords = entries?.reduce((sum, e) => sum + (e.word_count || 0), 0) || 0;
    const totalXP = entries?.reduce((sum, e) => sum + (e.xp_earned || 0), 0) || 0;
    const averageWords = totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0;

    // Calculate streak (consecutive days with entries)
    const sortedDates = entries
      ?.map(e => new Date(e.created_at).toDateString())
      .filter((v, i, a) => a.indexOf(v) === i) // unique dates
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) || [];

    let currentStreak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    res.json({
      totalEntries,
      totalWords,
      totalXP,
      averageWords,
      currentStreak,
      longestStreak: currentStreak, // Would need separate tracking for accurate longest
    });
  } catch (error) {
    console.error('Error in GET /journal/stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

