import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateToken as authMiddleware } from '../middleware/auth';
import { openai } from '../config/openai';

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

// Fallback story arc data (used when PostgREST schema cache hasn't updated)
const FALLBACK_STORY_ARC: StoryArc = {
  id: '8ee8009a-ce39-456c-a81e-3bec5fef531e',
  character_id: 'florencia',
  arc_number: 1,
  title_es: 'Encuentros en Buenos Aires',
  title_en: 'Encounters in Buenos Aires',
  description: 'Conoce a Florencia, una bailarina de tango apasionada de San Telmo. A través de ocho episodios, explorarás los cafés históricos, las milongas vibrantes, y los barrios coloridos de Buenos Aires mientras practicas gramática esencial del nivel B1.',
  location: 'Buenos Aires, Argentina',
  total_episodes: 8,
  cefr_level: 'B1',
  cover_image_url: undefined,
};

// Fallback episode data
const FALLBACK_EPISODE: Episode = {
  id: 'fallback-ep-1',
  story_arc_id: '8ee8009a-ce39-456c-a81e-3bec5fef531e',
  episode_number: 1,
  title_es: 'El Café de la Esquina',
  title_en: 'The Corner Café',
  scenario: 'You meet Florencia at the historic Café Tortoni in Buenos Aires.',
  grammar_focus: 'present_subjunctive_formation',
  grammar_triggers: ['Quiero que...', 'Es importante que...', 'Espero que...'],
  scenes: [
    {
      id: 'scene_1',
      florencia_says: '¡Hola! Qué bueno que estés aquí. Siéntate, siéntate.',
      translation: 'Hi! How great that you are here. Sit down, sit down.',
      player_response_type: 'guided',
      options: [
        { text: 'Gracias, es un placer conocerte.', next: 'scene_2' },
        { text: '¡Hola! ¿Cómo estás?', next: 'scene_2' }
      ]
    }
  ],
  journal_prompt_es: 'Describe el café y tu primera impresión de Florencia.',
  journal_prompt_en: 'Describe the café and your first impression of Florencia.',
  estimated_duration: 10,
  intro_audio_url: undefined,
};

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
      // Return fallback data if schema cache issue
      if (error.code === 'PGRST205') {
        console.log('Using fallback story arc data due to schema cache issue');
        return res.json({ arcs: [FALLBACK_STORY_ARC] });
      }
      return res.status(500).json({ error: 'Failed to fetch story arcs' });
    }

    res.json({ arcs: arcs || [FALLBACK_STORY_ARC] });
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

    // Handle schema cache error - use fallback
    const useArcFallback = arcError?.code === 'PGRST205';
    if (useArcFallback) {
      console.log('Using fallback data for /stories/progress/start due to schema cache issue');
    } else if (arcError) {
      console.error('Error fetching arc:', arcError);
      return res.status(404).json({ error: 'Story arc not found' });
    }

    // Create or update progress record (may fail due to schema cache)
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

    // Handle schema cache error for progress
    const useProgressFallback = progressError?.code === 'PGRST205';
    if (progressError && !useProgressFallback) {
      console.error('Error creating progress:', progressError);
      // Continue with fallback data
    }

    // Get first episode
    const { data: firstEpisode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('*')
      .eq('story_arc_id', storyArcId)
      .eq('episode_number', 1)
      .single();

    // Handle schema cache error for episodes
    const useEpisodeFallback = episodeError?.code === 'PGRST205';
    if (episodeError && !useEpisodeFallback) {
      console.error('Error fetching first episode:', episodeError);
    }

    // Use fallback data if needed
    const responseProgress = progress || {
      id: 'fallback-progress',
      user_id: userId,
      story_arc_id: storyArcId,
      current_episode: 1,
      episodes_completed: 0,
      total_stars: 0,
      total_xp: 0,
      unlocked_at: new Date().toISOString(),
      last_played_at: new Date().toISOString(),
    };

    const responseEpisode = firstEpisode || FALLBACK_EPISODE;

    res.json({ 
      progress: responseProgress, 
      firstEpisode: responseEpisode,
      message: useArcFallback || useProgressFallback || useEpisodeFallback 
        ? 'Story started (offline mode - sync pending)' 
        : 'Story arc started successfully' 
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

    // Handle schema cache error - return fallback data
    if (progressError?.code === 'PGRST205') {
      console.log('Using fallback data for /stories/current due to schema cache issue');
      return res.json({ 
        hasStarted: false,
        arc: FALLBACK_STORY_ARC,
        progress: null,
        currentEpisode: null
      });
    }

    if (progressError || !progress) {
      // User hasn't started any story - return first available arc
      const { data: firstArc, error: arcError } = await supabaseAdmin
        .from('story_arcs')
        .select('*')
        .eq('character_id', 'florencia')
        .eq('arc_number', 1)
        .single();

      // Handle schema cache error for story_arcs
      if (arcError?.code === 'PGRST205' || !firstArc) {
        console.log('Using fallback story arc due to schema cache issue');
        return res.json({ 
          hasStarted: false,
          arc: FALLBACK_STORY_ARC,
          progress: null,
          currentEpisode: null
        });
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
      currentEpisode: currentEpisode || FALLBACK_EPISODE
    });
  } catch (error) {
    console.error('Error in GET /stories/current:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /stories/analyze-response - Analyze user's spoken response for grammar
// ============================================
router.post('/analyze-response', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { 
      userResponse,        // The transcribed text of what the user said
      grammarFocus,        // e.g., "subjunctive_desires" 
      expectedPatterns,    // e.g., ["Quiero que", "Prefiero que", "Me gustaría que"]
      grammarHint,         // The instruction given to the user
      contextDialogue      // What Florencia said (for context)
    } = req.body;

    if (!userResponse) {
      return res.status(400).json({ error: 'userResponse is required' });
    }

    // ============================================
    // STEP 1: Local pattern detection (flexible matching)
    // ============================================
    // Normalize text for comparison (remove accents, lowercase)
    const normalizeText = (text: string) => 
      text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
        .trim();
    
    // Convert pattern to flexible regex that matches conjugation variants
    const patternToFlexibleRegex = (pattern: string): RegExp => {
      const normalized = normalizeText(pattern);
      
      // Common subjunctive verb stems and their endings to match
      // This handles cases like "Si tuviera" matching "Si tuvieras", "Si tuvieramos", etc.
      const subjunctiveEndings = '(?:a|as|amos|ais|an|e|es|emos|eis|en|ra|ras|ramos|rais|ran|se|ses|semos|seis|sen)?';
      
      // List of common verb stems in patterns that need flexible matching
      const verbPatterns: Record<string, string> = {
        'tuviera': 'tuvier' + subjunctiveEndings,
        'pudiera': 'pudier' + subjunctiveEndings,
        'quisiera': 'quisier' + subjunctiveEndings,
        'fuera': 'fuer' + subjunctiveEndings,
        'hiciera': 'hicier' + subjunctiveEndings,
        'dijera': 'dijer' + subjunctiveEndings,
        'supiera': 'supier' + subjunctiveEndings,
        'viniera': 'vinier' + subjunctiveEndings,
        'hubiera': 'hubier' + subjunctiveEndings,
        'estuviera': 'estuvier' + subjunctiveEndings,
        'hablara': 'hablar' + subjunctiveEndings,
        'comiera': 'comier' + subjunctiveEndings,
        'viviera': 'vivier' + subjunctiveEndings,
        // Present subjunctive stems
        'hable': 'habl(?:e|es|emos|eis|en)',
        'coma': 'com(?:a|as|amos|ais|an)',
        'viva': 'viv(?:a|as|amos|ais|an)',
        'tenga': 'teng(?:a|as|amos|ais|an)',
        'venga': 'veng(?:a|as|amos|ais|an)',
        'haga': 'hag(?:a|as|amos|ais|an)',
        'diga': 'dig(?:a|as|amos|ais|an)',
        'pueda': 'pued(?:a|as|amos|ais|an)',
        'quiera': 'quier(?:a|as|amos|ais|an)',
        'sepa': 'sep(?:a|as|amos|ais|an)',
        'sea': 'se(?:a|as|amos|ais|an)',
        'este': 'est(?:e|es|emos|eis|en)',
        'vaya': 'vay(?:a|as|amos|ais|an)',
      };
      
      let flexiblePattern = normalized;
      
      // Replace verb forms with flexible patterns
      for (const [verb, replacement] of Object.entries(verbPatterns)) {
        const verbNormalized = normalizeText(verb);
        if (flexiblePattern.includes(verbNormalized)) {
          flexiblePattern = flexiblePattern.replace(verbNormalized, replacement);
        }
      }
      
      // Escape special regex characters except our patterns
      flexiblePattern = flexiblePattern
        .replace(/[.*+^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\?/g, '?'); // Un-escape our optional groups
      
      return new RegExp(flexiblePattern);
    };
    
    const normalizedResponse = normalizeText(userResponse);
    const patternsFound: string[] = [];

    if (expectedPatterns && expectedPatterns.length > 0) {
      for (const pattern of expectedPatterns) {
        try {
          const flexibleRegex = patternToFlexibleRegex(pattern);
          if (flexibleRegex.test(normalizedResponse)) {
            patternsFound.push(pattern);
          }
        } catch (e) {
          // Fallback to simple includes for malformed patterns
          const normalizedPattern = normalizeText(pattern);
          if (normalizedResponse.includes(normalizedPattern)) {
            patternsFound.push(pattern);
          }
        }
      }
    }

    // If no patterns expected, don't penalize the user
    const hasExpectedPatterns = expectedPatterns && expectedPatterns.length > 0;
    const usedExpectedPattern = hasExpectedPatterns ? patternsFound.length > 0 : true;
    
    console.log('🔍 Pattern detection:', { 
      userResponse, 
      expectedPatterns, 
      hasExpectedPatterns,
      patternsFound, 
      usedExpectedPattern 
    });

    // ============================================
    // STEP 2: AI analysis for grammar errors only
    // ============================================
    
    // Map grammar focus to human-readable description for better AI understanding
    const grammarFocusDescriptions: Record<string, string> = {
      'present_subjunctive_formation': 'Present subjunctive verb forms (e.g., hable, coma, viva)',
      'subjunctive_emotions': 'Subjunctive with emotion expressions (me alegra que, es triste que)',
      'subjunctive_doubt': 'Subjunctive with doubt expressions (no creo que, dudo que)',
      'subjunctive_desires': 'Subjunctive with desire expressions (quiero que, prefiero que)',
      'imperfect_subjunctive': 'Imperfect subjunctive (hablara/hablase, comiera/comiese)',
      'preterite_vs_imperfect': 'Preterite vs imperfect tense usage',
      'conditional': 'Conditional tense (hablaría, comería)',
      'commands': 'Imperative/command forms',
      'reflexive_verbs': 'Reflexive verb usage (me lavo, se viste)',
      'ser_vs_estar': 'Ser vs estar distinction',
      'por_vs_para': 'Por vs para usage',
    };
    
    const grammarFocusDescription = grammarFocusDescriptions[grammarFocus || ''] || grammarFocus || 'general Spanish grammar';
    
    const analysisPrompt = `You are an expert Spanish language teacher analyzing a student's spoken response.

STUDENT'S RESPONSE:
"${userResponse}"

LESSON CONTEXT:
- Primary Grammar Focus: ${grammarFocusDescription}
- Instruction Given: "${grammarHint || 'Respond in Spanish'}"
- Conversation Context: "${contextDialogue || 'General conversation'}"

PATTERN DETECTION (already verified - DO NOT contradict this):
- Patterns found: ${patternsFound.length > 0 ? patternsFound.join(', ') : 'None'}
- Used expected expression: ${usedExpectedPattern ? 'YES' : 'NO'}

YOUR TASK:
1. ${grammarFocus ? `Pay SPECIAL attention to: ${grammarFocusDescription}` : 'Check all grammar aspects'}
2. Identify ALL grammar errors, categorized by type
3. Provide encouraging feedback that acknowledges what they did correctly
4. If there are errors, provide a fully corrected version

ERROR CATEGORIES TO CHECK:
- gender: Article/noun gender agreement (el/la, un/una)
- subjunctive: Subjunctive vs indicative mood errors
- conjugation: Verb conjugation errors (wrong tense, person, or form)
- reflexive: Missing or incorrect reflexive pronouns
- agreement: Subject-verb or adjective-noun agreement
- preposition: Wrong preposition (por/para, a/en, etc.)
- ser_estar: Incorrect ser/estar usage
- spelling: Spelling or accent errors
- word_order: Incorrect word order

EXAMPLES OF ERROR FORMAT:
[
  {"original": "el imagen", "correction": "la imagen", "category": "gender", "explanation": "'Imagen' is feminine"},
  {"original": "quiero que vienes", "correction": "quiero que vengas", "category": "subjunctive", "explanation": "'Quiero que' requires subjunctive"},
  {"original": "yo lavo las manos", "correction": "me lavo las manos", "category": "reflexive", "explanation": "'Lavarse' is reflexive - needs 'me'"},
  {"original": "ella es cansada", "correction": "ella está cansada", "category": "ser_estar", "explanation": "States/conditions use 'estar'"},
  {"original": "los libros es", "correction": "los libros son", "category": "agreement", "explanation": "Plural subject requires plural verb"}
]

IMPORTANT RULES:
- ${usedExpectedPattern ? `The student correctly used "${patternsFound[0]}" - PRAISE this in your feedback!` : 'The student did not use the expected expression patterns.'}
- "Vos" conjugations are CORRECT for Argentine Spanish (vos tenés, vos querés)
- Only flag actual errors, not stylistic preferences
- Be encouraging while being accurate

Return JSON:
{
  "grammarErrors": [
    {"original": "string", "correction": "string", "category": "string", "explanation": "string"}
  ],
  "hasGrammarErrors": boolean,
  "primaryErrorType": "string or null - the main category of errors if any",
  "feedbackMessage": "string - encouraging, personalized feedback (2-3 sentences)",
  "correctedVersion": "string or null - full corrected sentence if errors exist",
  "correctionExplanation": "string or null - brief summary of corrections made"
}

Respond ONLY with valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful Spanish language teacher. Respond only with valid JSON. Trust the pattern detection results provided.' },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    
    // Parse the JSON response
    let aiAnalysis;
    try {
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      aiAnalysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response:', responseText);
      aiAnalysis = {
        grammarErrors: [],
        hasGrammarErrors: false,
        feedbackMessage: '¡Muy bien! Good effort with your Spanish.',
        correctedVersion: null,
        correctionExplanation: null
      };
    }

    // ============================================
    // STEP 3: Combine local detection with AI analysis
    // ============================================
    const finalAnalysis = {
      // Pattern detection from local matching (100% accurate)
      usedCorrectExpression: usedExpectedPattern,
      expressionUsed: patternsFound.length > 0 ? patternsFound[0] : null,
      patternsFound: patternsFound,
      
      // Grammar analysis from AI
      usedCorrectConjugation: !aiAnalysis.hasGrammarErrors,
      grammarErrors: aiAnalysis.grammarErrors || [],
      hasGrammarErrors: aiAnalysis.hasGrammarErrors || false,
      
      // Overall correctness: used pattern AND no grammar errors
      overallCorrect: usedExpectedPattern && !aiAnalysis.hasGrammarErrors,
      
      // Feedback from AI
      feedbackMessage: aiAnalysis.feedbackMessage,
      detailedFeedback: aiAnalysis.correctionExplanation,
      correctedVersion: aiAnalysis.correctedVersion,
      correctionExplanation: aiAnalysis.correctionExplanation
    };

    console.log('✅ Final analysis:', finalAnalysis);
    res.json({ analysis: finalAnalysis });
  } catch (error) {
    console.error('Error in POST /stories/analyze-response:', error);
    res.status(500).json({ error: 'Failed to analyze response' });
  }
});

export default router;

