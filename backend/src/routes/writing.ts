import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { openai } from '../config/openai';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.use(optionalAuth);

// Get writing exercises for a specific curriculum week
router.get('/exercises/:level/:week', async (req: Request, res: Response) => {
  try {
    const { level, week } = req.params;
    const weekNum = parseInt(week);

    if (!['B1', 'B2'].includes(level.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid level' });
    }

    // Get curriculum for this week
    const { data: curriculum, error: curriculumError } = await supabaseAdmin
      .from('grammar_curriculum')
      .select('*')
      .eq('level', level.toUpperCase())
      .eq('week_number', weekNum)
      .single();

    if (curriculumError || !curriculum) {
      return res.status(404).json({ error: 'Curriculum not found' });
    }

    // Get all daily lessons with writing exercises
    const { data: lessons, error: lessonsError } = await supabaseAdmin
      .from('daily_lessons')
      .select('day_number, writing_exercises')
      .eq('curriculum_id', curriculum.id)
      .order('day_number', { ascending: true });

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return res.status(500).json({ error: 'Failed to fetch exercises' });
    }

    // Flatten writing exercises from all days
    const exercises: Array<{
      day: number;
      type: string;
      prompt: string;
      answer?: string;
      grammar_target?: string;
    }> = [];

    lessons?.forEach((lesson) => {
      const dayExercises = lesson.writing_exercises as Array<{
        type: string;
        prompt: string;
        answer?: string;
        grammar_target?: string;
      }> || [];
      
      dayExercises.forEach((exercise) => {
        exercises.push({
          day: lesson.day_number,
          ...exercise,
        });
      });
    });

    res.json({
      curriculum: {
        level: curriculum.level,
        week: curriculum.week_number,
        grammar_focus: curriculum.grammar_focus,
        title_en: curriculum.title_en,
        title_es: curriculum.title_es,
      },
      exercises,
    });
  } catch (error) {
    console.error('Exercises fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit a writing exercise and get feedback
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { exercise_type, curriculum_week, prompt, correct_answer, user_response, grammar_target } = req.body;

    if (!exercise_type || !prompt || !user_response) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let is_correct = false;
    let ai_feedback: Record<string, unknown> = {};
    let grammar_score = 0;
    let xp_earned = 0;

    // Handle different exercise types
    if (exercise_type === 'gap_fill' || exercise_type === 'sentence_transform') {
      // Simple string comparison (normalize both)
      const normalizedResponse = user_response.toLowerCase().trim();
      const normalizedAnswer = (correct_answer || '').toLowerCase().trim();
      
      is_correct = normalizedResponse === normalizedAnswer;
      grammar_score = is_correct ? 100 : 0;
      xp_earned = is_correct ? 10 : 2;

      ai_feedback = {
        correct: is_correct,
        expected: correct_answer,
        submitted: user_response,
        explanation: is_correct 
          ? '¡Correcto! Well done!' 
          : `The correct answer is "${correct_answer}". Try again!`,
      };
    } else if (exercise_type === 'free_response') {
      // Use AI to evaluate free response
      try {
        const evaluationPrompt = `You are a Spanish grammar teacher evaluating a student's written response.

Grammar Target: ${grammar_target || 'general grammar'}
Prompt: ${prompt}
Student's Response: ${user_response}

Evaluate the response and provide feedback in JSON format:
{
  "grammar_score": <0-100 score based on grammar accuracy>,
  "used_target_grammar": <true/false if they used the target grammar>,
  "grammar_examples_found": [<list of correctly used grammar structures>],
  "errors": [
    {
      "original": "<what they wrote>",
      "corrected": "<correct version>",
      "explanation": "<brief explanation>"
    }
  ],
  "overall_feedback": "<encouraging feedback in Spanish, 1-2 sentences>",
  "suggestions": "<one tip for improvement>"
}

Respond ONLY with valid JSON, no additional text.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: evaluationPrompt }],
          temperature: 0.3,
          max_tokens: 500,
        });

        const responseText = completion.choices[0]?.message?.content || '';
        
        // Parse AI response
        try {
          ai_feedback = JSON.parse(responseText);
          grammar_score = ai_feedback.grammar_score as number || 0;
          is_correct = grammar_score >= 70;
          
          // Calculate XP based on score
          xp_earned = Math.round(grammar_score / 10) + 5;
          if (ai_feedback.used_target_grammar) xp_earned += 10;
        } catch (parseError) {
          console.error('Error parsing AI feedback:', parseError);
          ai_feedback = {
            grammar_score: 50,
            overall_feedback: '¡Gracias por tu respuesta! Keep practicing.',
            errors: [],
          };
          grammar_score = 50;
          xp_earned = 10;
        }
      } catch (aiError) {
        console.error('AI evaluation error:', aiError);
        ai_feedback = {
          grammar_score: 50,
          overall_feedback: 'Response recorded. Keep practicing!',
          errors: [],
        };
        grammar_score = 50;
        xp_earned = 10;
      }
    }

    // Save the submission
    const { data, error } = await supabaseAdmin
      .from('writing_submissions')
      .insert({
        user_id: userId,
        exercise_type,
        curriculum_week: curriculum_week || null,
        prompt,
        correct_answer: correct_answer || null,
        user_response,
        is_correct,
        ai_feedback,
        grammar_score,
        xp_earned,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving submission:', error);
      return res.status(500).json({ error: 'Failed to save submission' });
    }

    // Update user's XP
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

    res.json({
      submission: data,
      feedback: ai_feedback,
      is_correct,
      xp_earned,
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's writing history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { limit = 20, offset = 0, exercise_type } = req.query;

    let query = supabaseAdmin
      .from('writing_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (exercise_type) {
      query = query.eq('exercise_type', exercise_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching writing history:', error);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    res.json({ submissions: data || [] });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get writing stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data, error } = await supabaseAdmin
      .from('writing_submissions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching writing stats:', error);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    const stats = {
      total_exercises: data?.length || 0,
      gap_fill_completed: 0,
      sentence_transform_completed: 0,
      free_response_completed: 0,
      correct_answers: 0,
      average_score: 0,
      total_xp_from_writing: 0,
    };

    let totalScore = 0;

    data?.forEach((submission) => {
      if (submission.exercise_type === 'gap_fill') stats.gap_fill_completed++;
      if (submission.exercise_type === 'sentence_transform') stats.sentence_transform_completed++;
      if (submission.exercise_type === 'free_response') stats.free_response_completed++;
      if (submission.is_correct) stats.correct_answers++;
      totalScore += submission.grammar_score || 0;
      stats.total_xp_from_writing += submission.xp_earned || 0;
    });

    stats.average_score = stats.total_exercises > 0 
      ? Math.round(totalScore / stats.total_exercises) 
      : 0;

    res.json({ stats });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

