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
  // Determine number of questions: 1-3 based on error count
  const numQuestions = Math.min(Math.max(errors.length, 1), 3);
  
  // Take the first N errors to base questions on
  const errorsToUse = errors.slice(0, numQuestions);
  
  // If no errors, create a general question based on the grammar focus
  if (errorsToUse.length === 0) {
    errorsToUse.push({
      type: episodeContext.grammar_focus.replace(/_/g, ' '),
      original: '',
      correction: '',
      explanation: 'General practice for this grammar concept',
    });
  }

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

Create ${numQuestions} multiple choice question(s) that:
1. Test the SAME grammatical concept that the student struggled with
2. Use DIFFERENT sentences than the student's original errors (create analogous situations)
3. Reference characters or scenes from the episode scenario when possible
4. Have exactly 4 answer options
5. Include a clear explanation of why the correct answer is right

Return a JSON array with this structure:
[
  {
    "question": "Complete the sentence: Es importante que ella _____ (estudiar) todos los días.",
    "options": ["estudia", "estudie", "estudiará", "estudiando"],
    "correct": "estudie",
    "explanation": "After 'Es importante que', we use the subjunctive mood. 'Estudie' is the present subjunctive form of 'estudiar' for ella/él/usted."
  }
]

**Important**:
- Make questions contextually relevant to the episode
- Ensure all 4 options are plausible but only one is grammatically correct
- The explanation should be educational and encouraging
- Return ONLY the JSON array, no additional text`;

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
    const parsed = JSON.parse(responseText);
    
    // Handle both array and object with array property
    const questions: MCQQuestion[] = Array.isArray(parsed) ? parsed : (parsed.questions || []);
    
    // Mark all as personalized
    return questions.map(q => ({
      ...q,
      isPersonalized: true,
    }));
  } catch (error) {
    console.error('Error generating personalized questions:', error);
    
    // Fallback: return a generic question based on grammar focus
    return [{
      question: `Complete: Es importante que nosotros _____ (practicar) el español.`,
      options: ['practicamos', 'practiquemos', 'practicaremos', 'practicando'],
      correct: 'practiquemos',
      explanation: 'After expressions like "Es importante que", we use the subjunctive. "Practiquemos" is the present subjunctive form for nosotros.',
      isPersonalized: true,
    }];
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

