/**
 * Script to generate educational articles for each episode using OpenAI GPT-4o
 * Run with: npm run generate-articles (or npx ts-node scripts/generate-episode-articles.ts)
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
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

// Episode-specific details for article generation
const EPISODE_DETAILS = {
  1: {
    article_title: 'Wishing and Wanting: The Grammar of Connection',
    additional_detail: 'Her first time at Café Tortoni as a teenager, when she decided to become a dancer',
    emotional_theme: 'Hope, new beginnings, possibility',
    writing_focus: 'Express hopes and desires for language learning journey',
  },
  2: {
    article_title: 'The Language of Feeling: Why Tango Needs the Subjunctive',
    additional_detail: "Her grandmother Rosa's teaching philosophy, a specific tango memory",
    emotional_theme: 'Joy, nostalgia, connection through dance',
    writing_focus: 'Describe emotions using "me alegra que", "me sorprende que"',
  },
  3: {
    article_title: 'Questioning Reality: The Art of Argentine Skepticism',
    additional_detail: 'Growing up surrounded by antique dealers, learning to question everything',
    emotional_theme: 'Authenticity, skepticism, discernment',
    writing_focus: "Explore doubt about one's own language journey or life path",
  },
  4: {
    article_title: 'The Grammar of Longing: What We Want vs. What We Have',
    additional_detail: "Her father's unfulfilled dreams, family Sunday rituals, chimichurri secrets",
    emotional_theme: 'Family, tradition, yearning',
    writing_focus: 'Express desires for family, culture, learning using "quiero que", "me gustaría que"',
  },
  5: {
    article_title: 'Telling Your Story: The Past That Shaped You',
    additional_detail: 'The day her father died, how imperfect vs preterite shapes how she remembers',
    emotional_theme: 'Memory, loss, narrative',
    writing_focus: 'Write a memory using both tenses to show what was ongoing vs what happened',
  },
  6: {
    article_title: 'If I Were: The Grammar of Alternative Realities',
    additional_detail: 'Times she almost left Argentina, her financial struggles, why art matters',
    emotional_theme: 'Frustration, possibility, choosing to stay',
    writing_focus: 'Explore "what if" scenarios and hypothetical choices',
  },
  7: {
    article_title: 'Imagining Otherwise: The Language of Possibility',
    additional_detail: "Her dream to perform internationally, visiting her father's favorite stadium",
    emotional_theme: 'Dreams, possibilities, imagination',
    writing_focus: 'Express what you would do if circumstances were different',
  },
  8: {
    article_title: 'Saying Goodbye in All the Tenses',
    additional_detail: 'What this friendship meant, her hopes for both of your futures',
    emotional_theme: 'Gratitude, bittersweet endings, hope for future',
    writing_focus: 'Write a farewell letter using all the grammar learned',
  },
};

interface Episode {
  id: string;
  episode_number: number;
  title_es: string;
  title_en: string;
  scenario: string;
  grammar_focus: string;
  grammar_triggers: string[];
  scenes: any[];
}

interface FlorenciaDialogue {
  text_content: string;
  emotion: string;
}

interface GeneratedArticle {
  episode_id: string;
  title: string;
  subtitle: string;
  content_markdown: string;
  content_markdown_es: string;
  writing_exercise_prompt: string;
  grammar_focus: string;
  word_count: number;
  estimated_read_minutes: number;
}

/**
 * Fetch all episodes from Florencia's story arc
 */
async function fetchEpisodes(): Promise<Episode[]> {
  console.log('📚 Fetching episodes from database...');
  
  const { data: arc, error: arcError } = await supabaseAdmin
    .from('story_arcs')
    .select('id')
    .eq('character_id', 'florencia')
    .eq('arc_number', 1)
    .single();

  if (arcError || !arc) {
    throw new Error(`Failed to fetch story arc: ${arcError?.message}`);
  }

  const { data: episodes, error: episodesError } = await supabaseAdmin
    .from('episodes')
    .select('id, episode_number, title_es, title_en, scenario, grammar_focus, grammar_triggers, scenes')
    .eq('story_arc_id', arc.id)
    .order('episode_number', { ascending: true });

  if (episodesError) {
    throw new Error(`Failed to fetch episodes: ${episodesError.message}`);
  }

  console.log(`✅ Found ${episodes.length} episodes`);
  return episodes;
}

/**
 * Fetch Florencia's dialogue from pre-generated audio for voice consistency
 */
async function fetchFlorenciaDialogue(episodeNumber: number): Promise<FlorenciaDialogue[]> {
  const { data: audioData, error } = await supabaseAdmin
    .from('pre_generated_audio')
    .select('text_content, emotion')
    .eq('character_id', 'florencia')
    .like('content_key', `ep${episodeNumber}_%`);

  if (error) {
    console.warn(`⚠️  Could not fetch dialogue for episode ${episodeNumber}: ${error.message}`);
    return [];
  }

  return audioData || [];
}

/**
 * Load and read the prompt template
 */
function loadPromptTemplate(): string {
  const templatePath = path.join(__dirname, 'prompts', 'episode-article-template.md');
  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Extract key scenes from episode with Florencia's dialogue
 */
function extractKeyScenes(episode: Episode): any[] {
  // Extract first 3-4 meaningful scenes with dialogue
  return episode.scenes.slice(0, 4).map((scene: any) => ({
    florencia_says: scene.florencia_says || '',
    emotion: scene.emotion || '',
    context: scene.response_type === 'guided' ? 'Multiple choice response' : 'Free speak response',
  }));
}

/**
 * Generate Spanish translation of the English article
 */
async function generateSpanishTranslation(englishMarkdown: string): Promise<string> {
  try {
    const translationPrompt = `Translate the following educational article from English to Spanish. 

IMPORTANT INSTRUCTIONS:
1. Keep all Spanish examples, words, and phrases exactly as they are (do not translate Spanish to Spanish)
2. Translate all explanatory text from English to Spanish
3. Maintain the same markdown structure and formatting
4. Preserve all code blocks, bullet points, and numbered lists
5. Keep the same tone and style (Florencia's voice)
6. Do NOT include any variable markers like "WRITING_EXERCISE_PROMPT:" or "SUBTITLE:" in the output

Article to translate:

${englishMarkdown}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator specializing in educational content. You translate English educational articles to Spanish while preserving all Spanish examples and maintaining the original structure and formatting.',
        },
        {
          role: 'user',
          content: translationPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    return completion.choices[0].message.content || englishMarkdown;
  } catch (error) {
    console.error('❌ Error generating Spanish translation:', error);
    // Return English version as fallback
    return englishMarkdown;
  }
}

/**
 * Generate article for a single episode using OpenAI
 */
async function generateArticle(
  episode: Episode,
  dialogueSamples: FlorenciaDialogue[],
  templatePrompt: string
): Promise<GeneratedArticle> {
  console.log(`\n🎨 Generating article for Episode ${episode.episode_number}: ${episode.title_es}...`);

  const episodeDetail = EPISODE_DETAILS[episode.episode_number as keyof typeof EPISODE_DETAILS];
  const keyScenes = extractKeyScenes(episode);

  // Construct the generation prompt
  const generationPrompt = `${templatePrompt}

---

## EPISODE CONTEXT FOR GENERATION

**Episode ${episode.episode_number}**: ${episode.title_es} (${episode.title_en})

**Scenario**: ${episode.scenario}

**Grammar Focus**: ${episode.grammar_focus}

**Grammar Triggers**: ${episode.grammar_triggers.join(', ')}

**Article Title**: "${episodeDetail.article_title}"

**Emotional Theme**: ${episodeDetail.emotional_theme}

**Key Scenes from Episode**:
${keyScenes.map((scene, i) => `
Scene ${i + 1}:
- Florencia says: "${scene.florencia_says}"
- Emotion: ${scene.emotion}
- Context: ${scene.context}
`).join('\n')}

**Florencia's Voice Samples** (from audio transcripts):
${dialogueSamples.slice(0, 5).map(d => `- "${d.text_content}" (${d.emotion})`).join('\n')}

**What to Reveal About Florencia**: ${episodeDetail.additional_detail}

**Writing Exercise Focus**: ${episodeDetail.writing_focus}

---

## YOUR TASK

Generate a complete article matching the Substack aesthetic reference. The article should:

1. Be 800-1200 words (3-5 minute read) - concise and impactful
2. **All explanatory text must be in English** - Only Spanish examples, words, phrases in Spanish (italicized)
3. Use Florencia's authentic voice (vos, Argentine Spanish) in quoted dialogue only
4. **Match the Substack article aesthetic exactly** - short paragraphs, generous whitespace, philosophical tone
5. Reference specific dialogue from the episode
6. Reveal the specified personal detail about Florencia
7. End with a transformative writing exercise

**FORMATTING REQUIREMENTS (CRITICAL):**
- Use PURE MARKDOWN only - NO HTML of any kind
- Use short paragraphs (1-3 sentences)
- Use --- for horizontal rules between sections
- Use > for blockquotes (Spanish example passages)
- Use **bold** for emphasis
- Use *italics* for Spanish words/phrases
- Use ### for section headings
- Use emoji numbers (1️⃣, 2️⃣) for grammar rule sections
- Use bullet points (-) for lists
- For verb conjugations, use simple markdown lists, NOT tables

**EXAMPLE CONJUGATION FORMAT:**
### 2️⃣ How do we form it?

Take the *ellos* preterite → drop **-ron** → add:

- **-ra, -ras, -ra, -ramos, -ran**

Examples:
- *hablaron → hablara*
- *tuvieron → tuviera*
- *fueron → fuera*

**DO NOT USE HTML TABLES.** Keep it clean and simple like the Substack reference.

**CRITICAL: Do NOT wrap your output in code blocks.** Output the raw markdown directly without \`\`\`markdown or \`\`\` wrappers. The content should start directly with the article title.

At the very end, provide (on separate lines):
- WRITING_EXERCISE_PROMPT: [Just the exercise portion, suitable for database storage]
- SUBTITLE: [A one-sentence subtitle for the article, max 120 characters]
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a creative writing assistant helping generate educational content for Spanish language learners. You write in the voice of Florencia, a 35-year-old tango dancer from Buenos Aires.',
        },
        {
          role: 'user',
          content: generationPrompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    });

    const generatedText = completion.choices[0].message.content || '';
    
    // Parse out the special markers at the end (more robust pattern matching)
    let contentMarkdown = generatedText;
    let writingExercisePrompt = 'Complete the writing exercise described in the article.';
    let subtitle = '';
    
    // Try to extract WRITING_EXERCISE_PROMPT (with or without leading dash)
    const exercisePatterns = [
      /\n-\s*WRITING_EXERCISE_PROMPT:\s*(.+?)(?=\n-\s*SUBTITLE:|\n*SUBTITLE:|\n*$)/s,
      /\nWRITING_EXERCISE_PROMPT:\s*(.+?)(?=\nSUBTITLE:|\n*$)/s,
      /WRITING_EXERCISE_PROMPT:\s*(.+?)(?=SUBTITLE:|$)/s,
    ];
    
    for (const pattern of exercisePatterns) {
      const match = generatedText.match(pattern);
      if (match) {
        writingExercisePrompt = match[1].trim();
        break;
      }
    }
    
    // Try to extract SUBTITLE (with or without leading dash)
    const subtitlePatterns = [
      /\n-\s*SUBTITLE:\s*(.+?)$/m,
      /\nSUBTITLE:\s*(.+?)$/m,
      /SUBTITLE:\s*(.+?)$/m,
    ];
    
    for (const pattern of subtitlePatterns) {
      const match = generatedText.match(pattern);
      if (match) {
        subtitle = match[1].trim();
        break;
      }
    }
    
    // Remove all markers from the main content (multiple patterns to catch all variations)
    contentMarkdown = generatedText
      .replace(/\n-\s*WRITING_EXERCISE_PROMPT:.+$/s, '')
      .replace(/\nWRITING_EXERCISE_PROMPT:.+$/s, '')
      .replace(/WRITING_EXERCISE_PROMPT:.+$/s, '')
      .replace(/\n-\s*SUBTITLE:.+$/m, '')
      .replace(/\nSUBTITLE:.+$/m, '')
      .replace(/SUBTITLE:.+$/m, '')
      .trim();
    
    // Strip markdown code block wrappers if present (```markdown ... ```)
    contentMarkdown = contentMarkdown
      .replace(/^```(?:markdown|md)?\s*\n/i, '')  // Remove opening ```markdown
      .replace(/\n```\s*$/i, '')                   // Remove closing ```
      .trim();

    // Calculate metrics
    const wordCount = contentMarkdown.split(/\s+/).length;
    const estimatedReadMinutes = Math.ceil(wordCount / 200);

    console.log(`✅ Generated English article: ${wordCount} words, ~${estimatedReadMinutes} min read`);

    // Generate Spanish translation
    console.log(`🌐 Generating Spanish translation...`);
    let spanishTranslation = await generateSpanishTranslation(contentMarkdown);
    
    // Strip markdown code block wrappers from Spanish translation if present
    spanishTranslation = spanishTranslation
      .replace(/^```(?:markdown|md)?\s*\n/i, '')
      .replace(/\n```\s*$/i, '')
      .trim();

    console.log(`✅ Generated Spanish translation`);

    return {
      episode_id: episode.id,
      title: episodeDetail.article_title,
      subtitle,
      content_markdown: contentMarkdown,
      content_markdown_es: spanishTranslation,
      writing_exercise_prompt: writingExercisePrompt,
      grammar_focus: episode.grammar_focus,
      word_count: wordCount,
      estimated_read_minutes: estimatedReadMinutes,
    };
  } catch (error) {
    console.error(`❌ Error generating article for episode ${episode.episode_number}:`, error);
    throw error;
  }
}

/**
 * Insert generated article into database
 */
async function insertArticle(article: GeneratedArticle): Promise<void> {
  // Check if article already exists for this episode
  const { data: existing } = await supabaseAdmin
    .from('episode_articles')
    .select('id')
    .eq('episode_id', article.episode_id)
    .single();

  if (existing) {
    // Update existing article
    const { error } = await supabaseAdmin
      .from('episode_articles')
      .update({
        title: article.title,
        subtitle: article.subtitle,
        content_markdown: article.content_markdown,
        content_markdown_es: article.content_markdown_es,
        writing_exercise_prompt: article.writing_exercise_prompt,
        grammar_focus: article.grammar_focus,
        word_count: article.word_count,
        estimated_read_minutes: article.estimated_read_minutes,
      })
      .eq('id', existing.id);

    if (error) {
      throw new Error(`Failed to update article: ${error.message}`);
    }

    console.log(`✅ Article updated in database`);
  } else {
    // Insert new article
    const { error } = await supabaseAdmin
      .from('episode_articles')
      .insert({
        episode_id: article.episode_id,
        title: article.title,
        subtitle: article.subtitle,
        content_markdown: article.content_markdown,
        content_markdown_es: article.content_markdown_es,
        author: 'Florencia',
        writing_exercise_prompt: article.writing_exercise_prompt,
        grammar_focus: article.grammar_focus,
        word_count: article.word_count,
        estimated_read_minutes: article.estimated_read_minutes,
      });

    if (error) {
      throw new Error(`Failed to insert article: ${error.message}`);
    }

    console.log(`✅ Article saved to database`);
  }
}

/**
 * Save article to file for review
 */
function saveArticleToFile(episodeNumber: number, article: GeneratedArticle): void {
  const outputDir = path.join(__dirname, 'generated-articles');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `episode-${episodeNumber}-article.md`;
  const filepath = path.join(outputDir, filename);

  const fileContent = `---
title: ${article.title}
subtitle: ${article.subtitle}
grammar_focus: ${article.grammar_focus}
word_count: ${article.word_count}
estimated_read_minutes: ${article.estimated_read_minutes}
---

${article.content_markdown}

---

## Writing Exercise Prompt (Database Version)

${article.writing_exercise_prompt}
`;

  fs.writeFileSync(filepath, fileContent, 'utf-8');
  console.log(`📄 Saved to: ${filepath}`);
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting episode article generation...\n');

  try {
    // Load prompt template
    const templatePrompt = loadPromptTemplate();
    console.log('✅ Prompt template loaded\n');

    // Fetch all episodes
    const episodes = await fetchEpisodes();

    // Generate articles for episodes 4-8
    const episodesToGenerate = episodes.filter(e => e.episode_number >= 4 && e.episode_number <= 8);
    
    for (const episode of episodesToGenerate) {
      try {
        // Fetch Florencia's dialogue samples
        const dialogueSamples = await fetchFlorenciaDialogue(episode.episode_number);
        
        // Generate article
        const article = await generateArticle(episode, dialogueSamples, templatePrompt);
        
        // Save to file for review
        saveArticleToFile(episode.episode_number, article);
        
        // Insert into database
        await insertArticle(article);
        
        console.log(`\n✅ Episode ${episode.episode_number} complete!\n`);
        
        // Add delay to avoid rate limiting
        if (episode.episode_number < episodes.length) {
          console.log('⏳ Waiting 2 seconds before next generation...\n');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`\n❌ Failed to generate article for episode ${episode.episode_number}:`, error);
        console.log('Continuing with next episode...\n');
      }
    }

    console.log('\n🎉 Article generation complete!');
    console.log(`📁 Articles saved to: ${path.join(__dirname, 'generated-articles')}`);
    console.log('💾 Articles inserted into database\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();

