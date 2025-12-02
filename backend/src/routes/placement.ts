import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { openai } from '../config/openai';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.use(optionalAuth);

// Placement test questions - hardcoded for consistency
const PLACEMENT_QUESTIONS = [
  // B1-level questions (should be answered correctly by B1+)
  {
    id: 1,
    text: "Complete: 'No creo que ella _____ mañana.'",
    options: ['viene', 'venga', 'vendrá', 'venía'],
    correct: 'venga',
    level_indicator: 'B1',
    grammar_point: 'present_subjunctive_doubt',
    explanation: 'After "No creo que" (doubt expression), use subjunctive.',
  },
  {
    id: 2,
    text: "Complete: 'Es importante que tú _____ español todos los días.'",
    options: ['practicas', 'practiques', 'practicar', 'practicarás'],
    correct: 'practiques',
    level_indicator: 'B1',
    grammar_point: 'present_subjunctive_necessity',
    explanation: 'After "Es importante que", use subjunctive.',
  },
  {
    id: 3,
    text: "Complete: 'Me alegra que ustedes _____ aquí.'",
    options: ['están', 'estén', 'estarán', 'estaban'],
    correct: 'estén',
    level_indicator: 'B1',
    grammar_point: 'present_subjunctive_emotion',
    explanation: 'After "Me alegra que" (emotion), use subjunctive.',
  },
  // B2-level questions (distinguish B1 from B2)
  {
    id: 4,
    text: "Complete: 'Si yo _____ más dinero, viajaría por todo el mundo.'",
    options: ['tengo', 'tenga', 'tuviera', 'tendría'],
    correct: 'tuviera',
    level_indicator: 'B2',
    grammar_point: 'imperfect_subjunctive_conditional',
    explanation: 'Use imperfect subjunctive in "si" clauses for hypotheticals.',
  },
  {
    id: 5,
    text: "Complete: 'Habla como si _____ experto en el tema.'",
    options: ['es', 'sea', 'fuera', 'sería'],
    correct: 'fuera',
    level_indicator: 'B2',
    grammar_point: 'imperfect_subjunctive_como_si',
    explanation: '"Como si" always requires imperfect subjunctive.',
  },
  {
    id: 6,
    text: "Complete: 'Si hubiera sabido, _____ antes.'",
    options: ['vengo', 'vendría', 'habría venido', 'hubiera venido'],
    correct: 'habría venido',
    level_indicator: 'B2',
    grammar_point: 'past_perfect_subjunctive_conditional',
    explanation: 'Past hypotheticals use past perfect subjunctive + conditional perfect.',
  },
];

const SPEAKING_PROMPT = {
  prompt_es: 'Describe una situación difícil que tuviste en el pasado y cómo la resolviste. Habla por 30-60 segundos.',
  prompt_en: 'Describe a difficult situation you had in the past and how you resolved it. Speak for 30-60 seconds.',
  evaluation_criteria: [
    'Use of past tenses (preterite, imperfect)',
    'Complexity of sentence structure',
    'Use of subjunctive (if applicable)',
    'Vocabulary range',
    'Fluency and coherence',
  ],
};

// Get placement test questions
router.get('/questions', async (req: Request, res: Response) => {
  try {
    res.json({
      questions: PLACEMENT_QUESTIONS.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        // Don't send correct answer or level indicator to client
      })),
      speaking_prompt: {
        prompt_es: SPEAKING_PROMPT.prompt_es,
        prompt_en: SPEAKING_PROMPT.prompt_en,
      },
      total_questions: PLACEMENT_QUESTIONS.length,
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit MCQ answers
router.post('/submit-mcq', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers array is required' });
    }

    // Score the answers
    let correct = 0;
    let b1_correct = 0;
    let b2_correct = 0;
    const results: Array<{
      question_id: number;
      user_answer: string;
      correct_answer: string;
      is_correct: boolean;
      explanation: string;
    }> = [];

    answers.forEach((answer: { question_id: number; selected: string }) => {
      const question = PLACEMENT_QUESTIONS.find(q => q.id === answer.question_id);
      if (question) {
        const isCorrect = answer.selected === question.correct;
        if (isCorrect) {
          correct++;
          if (question.level_indicator === 'B1') b1_correct++;
          if (question.level_indicator === 'B2') b2_correct++;
        }
        results.push({
          question_id: question.id,
          user_answer: answer.selected,
          correct_answer: question.correct,
          is_correct: isCorrect,
          explanation: question.explanation,
        });
      }
    });

    // Calculate MCQ score (0-100)
    const mcq_score = Math.round((correct / PLACEMENT_QUESTIONS.length) * 100);

    // Ensure user exists in users table (handles case where profile wasn't created on signup)
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      console.log('Creating missing user profile for:', userId);
      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: req.user?.email || '',
          spanish_level: 'A1',
          goals: [],
          preferred_topics: [],
          correction_depth: 'standard',
          voice_speed: 1.0,
          accent_preference: 'mexico',
        });
      
      if (userError) {
        console.error('Error creating user profile:', userError);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }
    }

    // Store partial results (will be completed with speaking)
    const { data, error } = await supabaseAdmin
      .from('placement_tests')
      .insert({
        user_id: userId,
        mcq_answers: results,
        mcq_score,
        speaking_response: null,
        speaking_score: null,
        combined_score: null,
        assigned_level: null,
        completed_at: null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving MCQ results:', error);
      return res.status(500).json({ error: 'Failed to save results', details: error.message });
    }

    res.json({
      test_id: data.id,
      mcq_score,
      correct,
      total: PLACEMENT_QUESTIONS.length,
      b1_score: Math.round((b1_correct / 3) * 100),
      b2_score: Math.round((b2_correct / 3) * 100),
      results,
      next_step: 'speaking',
    });
  } catch (error) {
    console.error('Submit MCQ error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit speaking response and complete placement
router.post('/submit-speaking', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { test_id, transcription } = req.body;

    if (!test_id || !transcription) {
      return res.status(400).json({ error: 'Test ID and transcription are required' });
    }

    // Get the existing test
    const { data: existingTest, error: fetchError } = await supabaseAdmin
      .from('placement_tests')
      .select('*')
      .eq('id', test_id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingTest) {
      return res.status(404).json({ error: 'Placement test not found' });
    }

    // Evaluate speaking with AI
    let speaking_score = 50; // Default score
    let speaking_feedback: Record<string, unknown> = {};

    try {
      const evaluationPrompt = `You are a Spanish language proficiency evaluator. Evaluate this spoken response for grammar level.

Speaking Prompt: "${SPEAKING_PROMPT.prompt_es}"
Student's Response (transcribed): "${transcription}"

Evaluate based on:
1. Use of past tenses (preterite, imperfect) - correctly distinguishing them
2. Sentence complexity and structure
3. Use of subjunctive (any type)
4. Vocabulary range and appropriateness
5. Overall coherence

Provide a JSON response:
{
  "score": <0-100, where 50 is basic B1, 70+ suggests B2>,
  "grammar_level_indicators": {
    "past_tense_accuracy": <0-100>,
    "uses_subjunctive": <true/false>,
    "subjunctive_accuracy": <0-100 or null if not used>,
    "sentence_complexity": "simple" | "moderate" | "complex"
  },
  "strengths": ["<list of strengths>"],
  "areas_for_improvement": ["<list of areas>"],
  "suggested_level": "B1" | "B2",
  "brief_feedback": "<1-2 sentence encouraging feedback in Spanish>"
}

Respond ONLY with valid JSON.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: evaluationPrompt }],
        temperature: 0.3,
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      
      try {
        speaking_feedback = JSON.parse(responseText);
        speaking_score = speaking_feedback.score as number || 50;
      } catch (parseError) {
        console.error('Error parsing speaking evaluation:', parseError);
        speaking_feedback = {
          score: 50,
          suggested_level: 'B1',
          brief_feedback: '¡Gracias por tu respuesta!',
        };
      }
    } catch (aiError) {
      console.error('AI evaluation error:', aiError);
      speaking_feedback = {
        score: 50,
        suggested_level: 'B1',
        brief_feedback: 'Evaluation completed.',
      };
    }

    // Calculate combined score and assign level
    const mcq_score = existingTest.mcq_score || 0;
    const combined_score = Math.round((mcq_score * 0.6) + (speaking_score * 0.4));
    
    // Level assignment logic
    let assigned_level = 'B1';
    if (combined_score >= 70) {
      assigned_level = 'B2';
    }

    // Update the placement test
    const { data, error: updateError } = await supabaseAdmin
      .from('placement_tests')
      .update({
        speaking_response: transcription,
        speaking_score,
        combined_score,
        assigned_level,
        completed_at: new Date().toISOString(),
      })
      .eq('id', test_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating placement test:', updateError);
      return res.status(500).json({ error: 'Failed to complete placement test' });
    }

    // Update user's curriculum progress
    const { error: progressError } = await supabaseAdmin
      .from('user_curriculum_progress')
      .upsert({
        user_id: userId,
        level: assigned_level,
        current_week: 1,
        current_day: 1,
        placement_completed: true,
        placement_score: combined_score,
        total_xp: 100, // Bonus XP for completing placement
        week_started_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (progressError) {
      console.error('Error updating curriculum progress:', progressError);
      // Don't fail the request, just log the error
    }

    res.json({
      test: data,
      mcq_score,
      speaking_score,
      combined_score,
      assigned_level,
      speaking_feedback,
      message: `You have been placed at level ${assigned_level}!`,
      next_steps: {
        level: assigned_level,
        start_week: 1,
        curriculum_focus: assigned_level === 'B1' 
          ? 'Present Subjunctive Formation' 
          : 'Imperfect Subjunctive',
      },
    });
  } catch (error) {
    console.error('Submit speaking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Skip placement and choose level manually
router.post('/skip', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { level } = req.body;

    if (!level || !['B1', 'B2'].includes(level.toUpperCase())) {
      return res.status(400).json({ error: 'Valid level (B1 or B2) is required' });
    }

    // Update user's curriculum progress
    const { data, error } = await supabaseAdmin
      .from('user_curriculum_progress')
      .upsert({
        user_id: userId,
        level: level.toUpperCase(),
        current_week: 1,
        current_day: 1,
        placement_completed: true,
        placement_score: null, // No score since skipped
        total_xp: 0,
        week_started_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error skipping placement:', error);
      return res.status(500).json({ error: 'Failed to skip placement' });
    }

    res.json({
      progress: data,
      message: `Level set to ${level.toUpperCase()}. You can start your curriculum!`,
    });
  } catch (error) {
    console.error('Skip placement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user has completed placement
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data, error } = await supabaseAdmin
      .from('user_curriculum_progress')
      .select('placement_completed, level, placement_score')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking placement status:', error);
      return res.status(500).json({ error: 'Failed to check status' });
    }

    res.json({
      placement_completed: data?.placement_completed || false,
      level: data?.level || null,
      placement_score: data?.placement_score || null,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

