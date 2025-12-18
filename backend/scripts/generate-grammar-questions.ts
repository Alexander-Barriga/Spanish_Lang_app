/**
 * Script to generate grammar gym questions for each episode using OpenAI GPT-4o
 * Run with: npx ts-node scripts/generate-grammar-questions.ts
 */

import dotenv from 'dotenv';
import { supabaseAdmin } from '../src/config/supabase';
import OpenAI from 'openai';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment variables');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

interface Episode {
  id: string;
  episode_number: number;
  title_es: string;
  title_en: string;
  scenario: string;
  grammar_focus: string;
  grammar_triggers: string[];
}

interface MCQQuestion {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  grammar_trigger: string;
}

async function generateQuestionsForEpisode(episode: Episode): Promise<MCQQuestion[]> {
  console.log(`\n📝 Generating questions for Episode ${episode.episode_number}: ${episode.title_en}`);
  console.log(`   Grammar focus: ${episode.grammar_focus}`);
  
  const prompt = `You are a Spanish language teacher creating multiple choice questions for B1-B2 level students.

**Episode Context**:
- Episode ${episode.episode_number}: "${episode.title_es}" (${episode.title_en})
- Scenario: ${episode.scenario}
- Grammar Focus: ${episode.grammar_focus.replace(/_/g, ' ')}
- Grammar Triggers: ${episode.grammar_triggers.join(', ')}

Create exactly 3 multiple choice questions that:
1. Test the grammar concept (${episode.grammar_focus.replace(/_/g, ' ')})
2. Use complete Spanish sentences with a blank to fill in
3. Have exactly 4 answer options each
4. Include one of the grammar triggers when possible
5. Are contextually relevant to the episode's scenario about Buenos Aires and tango
6. Have clear, educational explanations

You MUST return a JSON object with a "questions" array containing exactly 3 question objects.

Return this exact structure:
{
  "questions": [
    {
      "question": "Complete the sentence: Es importante que ella _____ (estudiar) todos los días.",
      "options": ["estudia", "estudie", "estudiará", "estudiando"],
      "correct": "estudie",
      "explanation": "After 'Es importante que', we use the subjunctive mood. 'Estudie' is the present subjunctive form of 'estudiar' for ella/él/usted.",
      "grammar_trigger": "Es importante que"
    },
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct": "...",
      "explanation": "...",
      "grammar_trigger": "..."
    },
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct": "...",
      "explanation": "...",
      "grammar_trigger": "..."
    }
  ]
}

**Important**:
- You MUST return exactly 3 questions in the "questions" array
- Create questions that test real understanding, not just pattern matching
- Make the distractors (wrong options) plausible but grammatically incorrect
- Each question should use a different trigger phrase when possible
- Explanations should be educational and help the student learn`;

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
    console.log(`   Raw response preview: ${responseText.substring(0, 300)}...`);
    
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`   ❌ JSON parse error:`, parseError);
      return [];
    }
    
    // Handle various response formats from OpenAI
    let questions: MCQQuestion[] = [];
    
    if (Array.isArray(parsed)) {
      // Direct array of questions
      questions = parsed;
      console.log(`   Format: direct array`);
    } else if (parsed.questions && Array.isArray(parsed.questions)) {
      // Object with "questions" array property
      questions = parsed.questions;
      console.log(`   Format: { questions: [...] }`);
    } else if (typeof parsed === 'object' && parsed.question) {
      // Single question object - wrap it in an array
      questions = [parsed as MCQQuestion];
      console.log(`   Format: single question object (wrapped)`);
    } else if (typeof parsed === 'object') {
      // Try to find any array property that looks like questions
      for (const [key, value] of Object.entries(parsed)) {
        if (Array.isArray(value) && value.length > 0 && (value[0] as any).question) {
          questions = value as MCQQuestion[];
          console.log(`   Format: found questions under key "${key}"`);
          break;
        }
      }
    }
    
    // Log each question for debugging
    questions.forEach((q, i) => {
      console.log(`   Q${i + 1}: ${q.question ? q.question.substring(0, 60) + '...' : 'MISSING'}`);
    });
    
    console.log(`   ✓ Generated ${questions.length} questions`);
    return questions;
  } catch (error) {
    console.error(`   ❌ Error generating questions:`, error);
    return [];
  }
}

async function saveQuestionsToDatabase(episodeId: string, questions: MCQQuestion[]) {
  // First, delete any existing questions for this episode
  const { error: deleteError } = await supabaseAdmin
    .from('episode_grammar_questions')
    .delete()
    .eq('episode_id', episodeId);

  if (deleteError) {
    console.error(`   ❌ Error deleting old questions:`, deleteError);
    return false;
  }

  // Filter and validate questions - ensure all required fields are present
  const validQuestions = questions.filter(q => {
    const isValid = q.question && 
                    q.options && 
                    Array.isArray(q.options) && 
                    q.options.length >= 2 &&
                    q.correct && 
                    q.explanation;
    if (!isValid) {
      console.log(`   ⚠️ Skipping invalid question:`, JSON.stringify(q).substring(0, 100));
    }
    return isValid;
  });

  if (validQuestions.length === 0) {
    console.log(`   ⚠️ No valid questions to insert`);
    return false;
  }

  // Insert new questions
  const questionsToInsert = validQuestions.map(q => ({
    episode_id: episodeId,
    question: q.question,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
    grammar_trigger: q.grammar_trigger || null,
  }));

  const { error: insertError } = await supabaseAdmin
    .from('episode_grammar_questions')
    .insert(questionsToInsert);

  if (insertError) {
    console.error(`   ❌ Error inserting questions:`, insertError);
    return false;
  }

  console.log(`   ✓ Saved ${validQuestions.length} questions to database`);
  return true;
}

async function main() {
  console.log('🏋️ Grammar Gym Question Generator');
  console.log('='.repeat(50));

  // Fetch all episodes with their grammar details
  const { data: arcs, error: arcsError } = await supabaseAdmin
    .from('story_arcs')
    .select('id, title_en')
    .order('arc_number', { ascending: true });

  if (arcsError || !arcs?.length) {
    console.error('❌ Failed to fetch story arcs:', arcsError);
    process.exit(1);
  }

  let totalQuestionsGenerated = 0;

  for (const arc of arcs) {
    console.log(`\n📚 Story Arc: ${arc.title_en}`);
    console.log('-'.repeat(40));

    const { data: episodes, error: episodesError } = await supabaseAdmin
      .from('episodes')
      .select('id, episode_number, title_es, title_en, scenario, grammar_focus, grammar_triggers')
      .eq('story_arc_id', arc.id)
      .order('episode_number', { ascending: true });

    if (episodesError || !episodes?.length) {
      console.log('   No episodes found');
      continue;
    }

    for (const episode of episodes) {
      // Generate questions for this episode
      const questions = await generateQuestionsForEpisode(episode);

      if (questions.length > 0) {
        // Save to database
        const saved = await saveQuestionsToDatabase(episode.id, questions);
        if (saved) {
          totalQuestionsGenerated += questions.length;
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Generation complete!`);
  console.log(`   Total questions generated: ${totalQuestionsGenerated}`);
  console.log('='.repeat(50));
}

// Run the script
main().catch(console.error);

