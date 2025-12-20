/**
 * Grammar Gym Service
 * Generates personalized MCQ questions based on user's writing errors
 */

import { openai } from '../config/openai';

export interface GrammarError {
  type: string;
  original: string;
  correction: string;
  explanation: string;
}

export interface MCQQuestion {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  isPersonalized?: boolean;
}

interface EpisodeContext {
  title_es: string;
  title_en: string;
  scenario: string;
  grammar_focus: string;
  grammar_triggers: string[];
}

/**
 * Generate personalized MCQ questions based on user's writing errors
 * Creates analogous sentences that test the same grammatical concept
 */
export async function generatePersonalizedQuestions(
  errors: GrammarError[],
  episodeContext: EpisodeContext
): Promise<MCQQuestion[]> {
  console.log('[Grammar Gym Service] generatePersonalizedQuestions called');
  console.log('[Grammar Gym Service] errors received:', JSON.stringify(errors, null, 2));
  console.log('[Grammar Gym Service] errors.length:', errors.length);
  
  // If no errors, return empty array - user had perfect writing!
  if (errors.length === 0) {
    console.log('[Grammar Gym Service] No errors, returning empty array');
    return []; // Perfect writing - no additional questions needed
  }
  
  console.log('[Grammar Gym Service] Generating personalized questions for', errors.length, 'errors');
  
  // Determine number of questions: 0-3 based on error count (1-to-1 mapping, capped at 3)
  const numQuestions = Math.min(errors.length, 3);
  
  // Take the first N errors to base questions on
  const errorsToUse = errors.slice(0, numQuestions);

  const prompt = `You are a Spanish language teacher creating multiple choice questions for a B1-B2 student.

**Episode Context**:
- Title: ${episodeContext.title_es} (${episodeContext.title_en})
- Scenario: ${episodeContext.scenario}
- Grammar Focus: ${episodeContext.grammar_focus.replace(/_/g, ' ')}
- Grammar Triggers: ${episodeContext.grammar_triggers.join(', ')}

**Student's Writing Errors** (use these to inform the questions):
${errorsToUse.map((e, i) => `${i + 1}. Error type: ${e.type}
   Original: "${e.original}"
   Correction: "${e.correction}"
   Issue: ${e.explanation}`).join('\n\n')}

Create EXACTLY ${numQuestions} multiple choice question(s) that:
1. Test the SAME grammatical concept that the student struggled with
2. Use DIFFERENT sentences than the student's original errors (create analogous situations)
3. Reference characters or scenes from the episode scenario when possible
4. Have exactly 4 UNIQUE answer options (no duplicates)
5. Include a clear explanation of why the correct answer is right

You MUST return a JSON array containing EXACTLY ${numQuestions} question object(s). Even if creating just 1 question, wrap it in an array.

Example format (with 2 questions):
[
  {
    "question": "Completa la oración: Es importante que ella _____ (estudiar) todos los días.",
    "options": ["estudia", "estudie", "estudiará", "estudiando"],
    "correct": "estudie",
    "explanation": "After 'Es importante que', we use the subjunctive mood."
  },
  {
    "question": "Completa la oración: Dudo que él _____ (venir) a la fiesta.",
    "options": ["viene", "venga", "vendrá", "viniendo"],
    "correct": "venga",
    "explanation": "After 'Dudo que', we use the subjunctive mood."
  }
]

**Critical Requirements**:
- Return ONLY a valid JSON array, no additional text or markdown
- Create EXACTLY ${numQuestions} questions (one for each error listed above)
- Each question must have exactly 4 UNIQUE options (no repeated options)
- Make questions contextually relevant to the episode
- The explanation should be educational and encouraging`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Spanish language teacher creating engaging, educational MCQ questions. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0].message.content || '[]';
    console.log('[Grammar Gym Service] OpenAI raw response:', responseText);
    
    const parsed = JSON.parse(responseText);
    console.log('[Grammar Gym Service] Parsed response type:', typeof parsed, Array.isArray(parsed) ? 'isArray' : 'notArray');
    console.log('[Grammar Gym Service] Parsed keys:', parsed ? Object.keys(parsed) : 'null');
    
    // Check if OpenAI returned an error response
    if (parsed.error) {
      console.error('[Grammar Gym Service] OpenAI returned error:', parsed.error);
      throw new Error(`OpenAI error: ${parsed.error}`);
    }
    
    // Handle multiple response formats from OpenAI:
    // 1. Array of questions: [{...}, {...}]
    // 2. Object with questions array: { questions: [{...}, {...}] }
    // 3. Single question object: { question: "...", options: [...], ... }
    let questions: MCQQuestion[] = [];
    
    if (Array.isArray(parsed)) {
      // Format 1: Direct array of questions
      questions = parsed;
    } else if (parsed.questions && Array.isArray(parsed.questions)) {
      // Format 2: Object with questions property
      questions = parsed.questions;
    } else if (parsed.question && parsed.options && parsed.correct) {
      // Format 3: Single question object - wrap in array
      console.log('[Grammar Gym Service] Detected single question object, wrapping in array');
      questions = [parsed];
    }
    
    // Validate that we got valid questions
    if (questions.length === 0) {
      console.error('[Grammar Gym Service] No valid questions extracted from response');
      throw new Error('No valid questions in OpenAI response');
    }
    
    console.log('[Grammar Gym Service] Extracted questions count:', questions.length);
    
    // Mark all as personalized
    const personalizedQuestions = questions.map(q => ({
      ...q,
      isPersonalized: true,
    }));
    console.log('[Grammar Gym Service] Successfully generated', personalizedQuestions.length, 'personalized questions');
    return personalizedQuestions;
  } catch (error) {
    console.error('[Grammar Gym Service] Error generating personalized questions:', error);
    
    // Fallback: return generic subjunctive questions based on the number of errors
    // This ensures users still get personalized practice even if AI generation fails
    const fallbackQuestions: MCQQuestion[] = [
      {
        question: `Completa la oración: Es importante que nosotros _____ (practicar) el español todos los días.`,
        options: ['practicamos', 'practiquemos', 'practicaremos', 'practicando'],
        correct: 'practiquemos',
        explanation: 'Después de expresiones como "Es importante que", usamos el subjuntivo. "Practiquemos" es la forma del presente de subjuntivo para nosotros.',
        isPersonalized: true,
      },
      {
        question: `Completa la oración: Ojalá que ella _____ (venir) a la fiesta mañana.`,
        options: ['viene', 'venga', 'vendrá', 'viniendo'],
        correct: 'venga',
        explanation: 'Después de "Ojalá que", siempre usamos el subjuntivo. "Venga" es la forma del presente de subjuntivo de "venir" para ella/él/usted.',
        isPersonalized: true,
      },
      {
        question: `Completa la oración: Dudo que ellos _____ (saber) la respuesta correcta.`,
        options: ['saben', 'sepan', 'sabrán', 'sabiendo'],
        correct: 'sepan',
        explanation: 'Después de expresiones de duda como "Dudo que", usamos el subjuntivo. "Sepan" es la forma irregular del presente de subjuntivo de "saber" para ellos.',
        isPersonalized: true,
      },
    ];
    
    // Return the appropriate number of fallback questions based on error count
    const questionsToReturn = fallbackQuestions.slice(0, numQuestions);
    console.log('[Grammar Gym Service] Returning', questionsToReturn.length, 'fallback questions');
    return questionsToReturn;
  }
}

/**
 * Calculate XP earned from gym session
 */
export function calculateGymXP(correctAnswers: number, totalQuestions: number): number {
  // Base XP for completing
  let xp = 30;
  
  // Bonus XP for accuracy
  if (totalQuestions > 0) {
    const accuracy = correctAnswers / totalQuestions;
    xp += Math.round(accuracy * 40); // Up to 40 bonus XP for 100% accuracy
  }
  
  // Perfect score bonus
  if (correctAnswers === totalQuestions && totalQuestions > 0) {
    xp += 10;
  }
  
  return xp;
}

