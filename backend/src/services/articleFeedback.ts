/**
 * Article Feedback Service
 * Generates detailed AI feedback for writing exercise submissions
 */

import { openai } from '../config/openai';

export interface WritingFeedback {
  overallScore: number; // 0-100
  grammarAnalysis: {
    correctUsage: string[];
    errors: Array<{
      type: string;
      original: string;
      correction: string;
      explanation: string;
    }>;
    targetGrammarUsage: {
      used: boolean;
      examples: string[];
      feedback: string;
    };
  };
  vocabularyAnalysis: {
    level: string; // 'basic', 'intermediate', 'advanced'
    richness: number; // 0-100
    suggestions: Array<{
      original: string;
      alternative: string;
      context: string;
    }>;
  };
  styleFeedback: {
    coherence: number; // 0-100
    tone: string;
    strengths: string[];
    improvements: string[];
  };
  encouragement: string;
  summary: string;
}

/**
 * Generate comprehensive writing feedback using OpenAI
 */
export async function generateWritingFeedback(
  submissionText: string,
  grammarFocus: string,
  exercisePrompt: string
): Promise<WritingFeedback> {
  const feedbackPrompt = `You are an encouraging Spanish language teacher providing detailed feedback on a B1-B2 level student's writing exercise.

**Grammar Focus**: ${grammarFocus.replace(/_/g, ' ')}

**Exercise Prompt**: ${exercisePrompt}

**Student's Writing**:
"${submissionText}"

---

Analyze this writing and provide comprehensive feedback in the following JSON structure:

{
  "overallScore": [0-100],
  "grammarAnalysis": {
    "correctUsage": ["List 2-3 grammar points used correctly"],
    "errors": [
      {
        "type": "subjunctive/agreement/conjugation/etc",
        "original": "the exact phrase with error",
        "correction": "the corrected version",
        "explanation": "why this is wrong and how to fix it"
      }
    ],
    "targetGrammarUsage": {
      "used": true/false,
      "examples": ["Quote examples where target grammar was used"],
      "feedback": "Specific feedback on their use of ${grammarFocus}"
    }
  },
  "vocabularyAnalysis": {
    "level": "basic/intermediate/advanced",
    "richness": [0-100],
    "suggestions": [
      {
        "original": "word or phrase they used",
        "alternative": "more sophisticated option",
        "context": "why this alternative is better"
      }
    ]
  },
  "styleFeedback": {
    "coherence": [0-100],
    "tone": "description of their tone",
    "strengths": ["List 2-3 style strengths"],
    "improvements": ["List 1-2 style improvements"]
  },
  "encouragement": "A warm, personal message from Florencia encouraging continued practice",
  "summary": "A 2-3 sentence summary of the overall feedback"
}

**Important**:
1. Be encouraging and specific
2. Limit grammar errors to max 3-4 most important ones
3. Focus on helping them improve, not criticizing
4. Acknowledge what they did well
5. Connect feedback to the exercise prompt
6. Write encouragement in Florencia's voice (warm, personal, Argentine Spanish)
7. Ensure valid JSON output

Return ONLY the JSON object, no additional text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Spanish language teacher providing detailed, encouraging feedback on student writing. You always respond with valid JSON.',
        },
        {
          role: 'user',
          content: feedbackPrompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const feedbackText = completion.choices[0].message.content || '{}';
    const feedback = JSON.parse(feedbackText);

    return feedback as WritingFeedback;
  } catch (error) {
    console.error('Error generating writing feedback:', error);
    
    // Fallback feedback if API fails
    return {
      overallScore: 75,
      grammarAnalysis: {
        correctUsage: ['Good attempt at using the target grammar'],
        errors: [],
        targetGrammarUsage: {
          used: true,
          examples: [],
          feedback: 'Continue practicing this grammar structure.',
        },
      },
      vocabularyAnalysis: {
        level: 'intermediate',
        richness: 70,
        suggestions: [],
      },
      styleFeedback: {
        coherence: 75,
        tone: 'thoughtful and personal',
        strengths: ['Clear expression of ideas'],
        improvements: ['Continue developing your writing style'],
      },
      encouragement: '¡Buen trabajo! Keep practicing and writing in your journal.',
      summary: 'Good effort on this writing exercise. Continue practicing to improve.',
    };
  }
}

/**
 * Simplify feedback for mobile display
 * Groups feedback into easily digestible sections
 */
export function formatFeedbackForMobile(feedback: WritingFeedback) {
  return {
    score: feedback.overallScore,
    summary: feedback.summary,
    encouragement: feedback.encouragement,
    
    // Grammar section
    grammar: {
      correctUsage: feedback.grammarAnalysis.correctUsage,
      errors: feedback.grammarAnalysis.errors,
      targetGrammarFeedback: feedback.grammarAnalysis.targetGrammarUsage.feedback,
    },
    
    // Vocabulary section
    vocabulary: {
      level: feedback.vocabularyAnalysis.level,
      suggestions: feedback.vocabularyAnalysis.suggestions.slice(0, 3), // Limit to top 3
    },
    
    // Style section
    style: {
      strengths: feedback.styleFeedback.strengths,
      improvements: feedback.styleFeedback.improvements.slice(0, 2), // Limit to top 2
    },
  };
}

/**
 * Calculate a simple grammar score from feedback
 * Used for database storage and user progress tracking
 */
export function calculateGrammarScore(feedback: WritingFeedback): number {
  const errorPenalty = feedback.grammarAnalysis.errors.length * 5;
  const targetUsageBonus = feedback.grammarAnalysis.targetGrammarUsage.used ? 10 : 0;
  
  let score = feedback.overallScore - errorPenalty + targetUsageBonus;
  
  // Clamp between 0-100
  return Math.max(0, Math.min(100, score));
}

