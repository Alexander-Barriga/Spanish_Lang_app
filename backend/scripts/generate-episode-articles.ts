/**
 * Script to generate educational articles for each episode using OpenAI GPT-4o
 * Run with: npm run generate-articles (or npx ts-node scripts/generate-episode-articles.ts)
 * 
 * Updated to match new storyline with motifs:
 * - "Soñemos" by Carlos Di Sarli
 * - Grandmother Valentina Reyes
 * - Mate cup (secret gift)
 * - Reality vs. Illusion theme
 * 
 * CRITICAL: Respects plot revelation boundaries to prevent spoilers
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

// Episode-specific details aligned with new storyline dialogue
// CRITICAL: Includes plot boundary rules to prevent spoilers
const EPISODE_DETAILS = {
  1: {
    article_title: 'The Grammar of Desire',
    emotional_theme: 'Hope, new beginnings, connection',
    grammar_unique_focus: 'Present Subjunctive for expressing desires and requests',
    key_dialogue_quote: 'Me gustaría que me traiga un café con leche, por favor',
    motif_to_use: '"Soñemos" playing in the café, grandmother mentioned vaguely',
    // PLOT BOUNDARIES
    allowed_grandmother_info: 'She brought Florencia to Café Tortoni as a child. She exists. That is ALL.',
    allowed_mate_info: 'Nothing about mate cup yet.',
    forbidden_reveals: 'DO NOT mention: grandmother\'s name (Valentina Reyes), her death, Teatro Colón, any career choices, any sacrifices. Grandmother is IMPLIED TO BE ALIVE.',
    florencia_reveals_safe: 'Her grandmother used to bring her to Café Tortoni as a child — fond memories, nothing more.',
    // WRITING PROMPT
    writing_prompt: `1. What do you hope to achieve by learning Spanish? (espero que..., quiero que...)

2. If you could travel anywhere in the Spanish-speaking world, where would you want to go and why? (me gustaría que..., deseo que...)

3. What kind of experiences do you wish to have while immersing yourself in a new culture? (ojalá que..., espero que...)


Close with: "Espero que..." — expressing your deepest hope for this journey.`,
  },
  2: {
    article_title: 'Dancing with Emotion',
    emotional_theme: 'Joy, intimacy, tango, connection through dance',
    grammar_unique_focus: 'Present Subjunctive for expressing emotional reactions',
    key_dialogue_quote: 'Es emocionante que pueda bailar tango en Buenos Aires',
    motif_to_use: 'Dancing to "Soñemos", grandmother as tango teacher',
    // PLOT BOUNDARIES
    allowed_grandmother_info: 'She taught Florencia to dance tango. She danced professionally during the Golden Age. She is ALIVE and "maybe I\'ll introduce you someday".',
    allowed_mate_info: 'Nothing about mate cup yet.',
    forbidden_reveals: 'DO NOT mention: grandmother\'s name, her death, Teatro Colón, any career choices or sacrifices. Grandmother is ALIVE in reader\'s mind.',
    florencia_reveals_safe: 'Her grandmother danced professionally during the Golden Age of tango and taught Florencia to dance.',
    // WRITING PROMPT
    writing_prompt: `1. How does music or dance make you feel? Describe a time when art moved you emotionally. (me emociona que..., es increíble que...)

2. Is there someone in your life who taught you something meaningful, like Florencia's grandmother taught her tango? (me alegra que..., es maravilloso que...)

3. What emotions do you experience when trying something new and challenging? (me sorprende que..., es emocionante que...)


Close with: "Me alegra que..." — expressing gratitude for an emotional experience in your life.`,
  },
  3: {
    article_title: 'The Art of Doubt',
    emotional_theme: 'Authenticity, skepticism, secrets, coincidence vs. fate',
    grammar_unique_focus: 'Perfect Subjunctive for expressing doubt about past events',
    key_dialogue_quote: 'Dudo que haya sido un accidente que encontraras ese disco',
    motif_to_use: 'User finds "Soñemos" record, Florencia bought something secret',
    // PLOT BOUNDARIES
    allowed_grandmother_info: 'Same as Episode 2 — alive, taught tango, danced professionally.',
    allowed_mate_info: 'Florencia bought a SECRET something at San Telmo. DO NOT reveal it is a mate cup.',
    forbidden_reveals: 'DO NOT mention: grandmother\'s name, death, Teatro Colón, sacrifices. DO NOT reveal the secret purchase is a mate cup.',
    florencia_reveals_safe: 'She bought something mysterious at San Telmo — teasing the reader, keeping the secret.',
    // WRITING PROMPT
    writing_prompt: `1. Have you ever found something by chance that felt like fate? Do you think it was coincidence or destiny? (dudo que haya sido..., no creo que haya sido...)

2. Is there something in your past that you question — a decision, a meeting, an opportunity? (es posible que haya..., puede que haya...)

3. Do you believe everything happens for a reason, or are some things just random? (no estoy seguro/a de que haya..., dudo que...)


Close with: "Dudo que haya sido..." — expressing healthy skepticism about a past event.`,
  },
  4: {
    article_title: 'The Grammar of Belonging',
    emotional_theme: 'Family, tradition, friendship rituals',
    grammar_unique_focus: 'Perfect Subjunctive for expressing wishes about completed actions',
    key_dialogue_quote: 'Ahora somos amigos',
    motif_to_use: 'Sharing mate together, the ritual of belonging',
    // PLOT BOUNDARIES
    allowed_grandmother_info: 'Same as Episode 2, plus "she couldn\'t make it to the asado" — implying she is alive but busy.',
    allowed_mate_info: 'Can discuss mate RITUAL and what sharing mate means. Secret purchase still NOT revealed.',
    forbidden_reveals: 'DO NOT mention: grandmother\'s name (Valentina Reyes), that she is DEAD, Teatro Colón offer, her sacrifice, Florencia\'s missed tango company opportunity. Grandmother is still ALIVE to the reader.',
    florencia_reveals_safe: 'Why sharing mate means "you belong" in Argentine culture. Grandmother couldn\'t make it to the asado (implying alive).',
    // WRITING PROMPT
    writing_prompt: `1. What family traditions or rituals make you feel like you belong? (espero que hayas experimentado..., me alegra que hayas...)

2. Is there a friendship that started unexpectedly and became meaningful? How did it form? (ojalá hayas tenido..., espero que hayas sentido...)

3. What does "belonging" mean to you? When have you felt truly welcomed somewhere? (me alegra que hayas podido..., espero que hayas encontrado...)


Close with: "Ojalá hayas..." — expressing a wish that something meaningful has happened in your life.`,
  },
  5: {
    article_title: 'What If: The Grammar of Regret',
    emotional_theme: 'Memory, loss, choices, grandmother\'s sacrifice',
    grammar_unique_focus: 'Pluperfect Subjunctive for hypotheticals about the past',
    key_dialogue_quote: 'Si hubiera sabido, no habría preguntado tanto',
    motif_to_use: 'Grandmother\'s grave, her choice of family over fame, Florencia\'s regret',
    // PLOT BOUNDARIES — FIRST EPISODE WHERE FULL REVEAL IS ALLOWED
    allowed_grandmother_info: 'FULL REVEAL ALLOWED: Her name is Valentina Reyes. She is deceased, buried at Chacarita. She was offered a role at Teatro Colón but chose family (was pregnant). This is the BIG REVEAL episode.',
    allowed_mate_info: 'Secret purchase can still be teased but NOT revealed.',
    forbidden_reveals: 'None for grandmother — this is the reveal episode. Still do NOT reveal the mate cup is the secret purchase.',
    florencia_reveals_safe: 'Grandmother Valentina Reyes was offered Teatro Colón but chose family. Florencia was also offered a tango company spot but didn\'t take it.',
    // WRITING PROMPT
    writing_prompt: `1. Is there a decision in your past that you wonder about? What would have happened if you had chosen differently? (si hubiera..., habría...)

2. Have you ever missed an opportunity that still lingers in your mind? What did you learn from it? (ojalá hubiera..., si hubiera tenido el valor...)

3. Is there something you wish you had said or done for someone you've lost or drifted from? (hubiera querido..., si hubiera sabido...)


Close with: "Si hubiera..." — imagining a different past, but accepting the present.`,
  },
  6: {
    article_title: 'The Grammar of Dreams',
    emotional_theme: 'Art, illusion, sacrifice, beauty as a tool',
    grammar_unique_focus: 'Imperfect Subjunctive for present/future wishes and hypotheticals',
    key_dialogue_quote: 'Los artistas usan ilusiones para atraer al público a una realidad alternativa',
    motif_to_use: 'Teatro Colón where grandmother almost performed, reality vs. illusion',
    // PLOT BOUNDARIES
    allowed_grandmother_info: 'Full backstory known — Valentina Reyes, Teatro Colón, chose family, deceased.',
    allowed_mate_info: 'Secret purchase teased but NOT revealed.',
    forbidden_reveals: 'Do NOT reveal the mate cup yet.',
    florencia_reveals_safe: 'The cost of being an artist — what performers sacrifice for their audience. Can reference grandmother\'s full story.',
    // WRITING PROMPT
    writing_prompt: `1. If you could pursue any dream without limitations, what would it be? (quisiera que..., si pudiera...)

2. Have you ever sacrificed something important to pursue a passion or help someone you love? (como si fuera..., aunque fuera difícil...)

3. Do you believe art and beauty can transform reality? How has creativity touched your life? (desearía que..., si tuviera la oportunidad...)


Close with: "Quisiera que..." — expressing a deep wish for the future.`,
  },
  7: {
    article_title: 'Beauty Born from Hardship',
    emotional_theme: 'Immigrant struggle, authentic beauty, choosing to believe',
    grammar_unique_focus: 'Imperfect Subjunctive for conditionals and comparisons (como si, aunque)',
    key_dialogue_quote: 'A veces las ilusiones pueden ser tan reales como la realidad',
    motif_to_use: 'La Boca\'s beauty from poverty, illusion becoming reality, the kiss',
    // PLOT BOUNDARIES
    allowed_grandmother_info: 'Full backstory known.',
    allowed_mate_info: 'Secret purchase teased but NOT revealed.',
    forbidden_reveals: 'Do NOT reveal the mate cup yet.',
    florencia_reveals_safe: 'Sometimes illusions can be as real as reality — choosing to believe makes it true.',
    // WRITING PROMPT
    writing_prompt: `1. Have you ever found beauty in a difficult situation? Describe a time when hardship created something meaningful. (como si fuera..., aunque pareciera...)

2. Is there something you choose to believe in, even if others might doubt it? (como si existiera..., aunque no fuera obvio...)

3. When has an "illusion" — a hope, a dream, a belief — become real in your life? (para que fuera posible..., como si ya fuera real...)


Close with: "Como si..." — describing something as though it were already true.`,
  },
  8: {
    article_title: 'Farewell in All the Tenses',
    emotional_theme: 'Gratitude, bittersweet endings, hope for the future',
    grammar_unique_focus: 'Comprehensive review of all subjunctive forms',
    key_dialogue_quote: 'Los sueños que compartimos... esos no tienen que terminar nunca',
    motif_to_use: '"Soñemos" playing full circle, mate cup revealed as farewell gift, dreams never ending',
    // PLOT BOUNDARIES — MATE CUP REVEAL
    allowed_grandmother_info: 'Full backstory known.',
    allowed_mate_info: 'REVEAL: The secret purchase from Episode 3 was a mate cup — Florencia bought it for the user as a farewell gift.',
    forbidden_reveals: 'None — all reveals complete.',
    florencia_reveals_safe: 'The mate cup was for the user all along. What this friendship meant. Hope for the future.',
    // WRITING PROMPT
    writing_prompt: `1. Reflect on your Spanish learning journey so far. What are you most proud of? What do you hope to continue? (espero que..., me alegra que haya..., quisiera que...)

2. Is there someone who has guided you in life, like Florencia guided you through Buenos Aires? What would you say to thank them? (ojalá que..., si pudiera..., hubiera querido...)

3. What dreams do you have for your future? What do you wish for yourself and those you love? (quiero que..., espero que..., ojalá...)


Close with: "Los sueños que compartimos..." — honoring a connection and looking toward the future.`,
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

interface SceneDialogue {
  florencia_says: string;
  florencia_says_en?: string;
  user_says?: string;
  user_says_en?: string;
  waiter_says?: string;
  waiter_says_en?: string;
  emotion: string;
  response_type: string;
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
 * Load and read the prompt template
 */
function loadPromptTemplate(): string {
  const templatePath = path.join(__dirname, 'prompts', 'episode-article-template.md');
  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Extract all scenes from episode with full dialogue
 */
function extractAllScenes(episode: Episode): SceneDialogue[] {
  return (episode.scenes || []).map((scene: any) => ({
    florencia_says: scene.florencia_says || '',
    florencia_says_en: scene.florencia_says_en || '',
    user_says: scene.user_says || '',
    user_says_en: scene.user_says_en || '',
    waiter_says: scene.waiter_says || '',
    waiter_says_en: scene.waiter_says_en || '',
    emotion: scene.emotion || '',
    response_type: scene.response_type || '',
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
4. Preserve all bullet points and numbered lists
5. Keep the same tone and style (Florencia's voice)
6. Do NOT include any variable markers like "SUBTITLE:" in the output

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
      max_tokens: 3000,
    });

    return completion.choices[0].message.content || englishMarkdown;
  } catch (error) {
    console.error('❌ Error generating Spanish translation:', error);
    return englishMarkdown;
  }
}

/**
 * Generate article for a single episode using OpenAI
 */
async function generateArticle(
  episode: Episode,
  templatePrompt: string
): Promise<GeneratedArticle> {
  console.log(`\n🎨 Generating article for Episode ${episode.episode_number}: ${episode.title_es}...`);

  const episodeDetail = EPISODE_DETAILS[episode.episode_number as keyof typeof EPISODE_DETAILS];
  const allScenes = extractAllScenes(episode);
  
  // Format scenes for the prompt
  const scenesForPrompt = allScenes.slice(0, 6).map((scene, i) => {
    let sceneText = `Scene ${i + 1} (${scene.emotion}):`;
    if (scene.florencia_says) sceneText += `\n  Florencia: "${scene.florencia_says}"`;
    if (scene.user_says) sceneText += `\n  User: "${scene.user_says}"`;
    if (scene.waiter_says) sceneText += `\n  Waiter: "${scene.waiter_says}"`;
    return sceneText;
  }).join('\n\n');

  // Construct the generation prompt with PLOT BOUNDARIES
  const generationPrompt = `${templatePrompt}

---

## EPISODE CONTEXT FOR GENERATION

**Episode ${episode.episode_number}**: ${episode.title_es} (${episode.title_en})

**Scenario**: ${episode.scenario}

**Grammar Focus**: ${episode.grammar_focus}

**Grammar Triggers**: ${(episode.grammar_triggers || []).join(', ')}

**Article Title**: "${episodeDetail.article_title}"

**Emotional Theme**: ${episodeDetail.emotional_theme}

**Grammar Unique Focus**: ${episodeDetail.grammar_unique_focus}

**Key Dialogue Quote to Reference**: *"${episodeDetail.key_dialogue_quote}"*

**Motif to Use**: ${episodeDetail.motif_to_use}

---

## CRITICAL: PLOT BOUNDARIES FOR THIS EPISODE

**What You CAN Say About Grandmother**: ${episodeDetail.allowed_grandmother_info}

**What You CAN Say About Mate Cup**: ${episodeDetail.allowed_mate_info}

**FORBIDDEN — DO NOT MENTION**: ${episodeDetail.forbidden_reveals}

**What Florencia Safely Reveals**: ${episodeDetail.florencia_reveals_safe}

---

**Key Scenes from Episode**:
${scenesForPrompt}

---

## YOUR TASK

Generate a complete article following the template structure. The article should:

1. Be approximately **600 words** (3-minute read) — concise and impactful
2. **WRITE THE ENTIRE ARTICLE IN ENGLISH** — Only Spanish examples, vocabulary, and quoted dialogue in Spanish (italicized)
3. **Florencia is clearly the author** from the very first paragraph
4. Reference specific dialogue from the episode (use the key dialogue quote)
5. Weave in the specified motif (respecting plot boundaries!)
6. Include ONLY the safe personal revelation about Florencia
7. **NO writing exercise section** — end with grammar summary + Florencia sign-off
8. **CRITICAL: NO PLOT LEAKS** — Only reference what the reader knows by this episode

**LANGUAGE EXAMPLES:**
- CORRECT opening: "I've been thinking about you since we left the café..."
- WRONG opening: "Querido amigo, desde que nos vimos..."
- CORRECT: "When I said *'Ahora somos amigos'*, I meant it."
- WRONG: "Cuando dije 'Ahora somos amigos', lo decía en serio."

**CONJUGATION REQUIREMENT:**
When showing verb conjugations, ALWAYS show all 5 pronoun forms:
- *yo [verb]*
- *tú [verb]*
- *él/ella/usted [verb]*
- *nosotros [verb]*
- *ustedes/ellos [verb]*

**FORMATTING REQUIREMENTS:**
- Use PURE MARKDOWN only — NO HTML
- Use short paragraphs (1-3 sentences)
- Use --- for horizontal rules between sections
- Use > for blockquotes (Spanish example passages)
- Use **bold** for emphasis
- Use *italics* for Spanish words/phrases
- Use ### for section headings
- Use emoji numbers (1️⃣, 2️⃣) for grammar rule sections
- Use bullet points (-) for lists

**CRITICAL: Do NOT wrap your output in code blocks.** Output the raw markdown directly.

At the very end, provide on a separate line:
- SUBTITLE: [A one-sentence subtitle for the article, max 120 characters]
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Florencia, a 25-year-old tango dancer from Buenos Aires, Argentina. You are writing educational grammar articles for English-speaking Spanish learners.

CRITICAL LANGUAGE REQUIREMENT:
- Write the ENTIRE article in ENGLISH
- The only Spanish text allowed is: example phrases, quoted dialogue, and vocabulary words (always in italics)
- DO NOT write greetings, explanations, or body text in Spanish
- Opening should be English like "I've been thinking about you since..." NOT "Querido amigo,"
- This is for English speakers learning Spanish, so explanations must be in English

Your voice is warm, artistic, and personal — like a letter from a friend writing in English about her Argentine culture.

CRITICAL: Respect plot boundaries and do NOT reveal information the reader doesn't know yet.`,
        },
        {
          role: 'user',
          content: generationPrompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 3000,
    });

    const generatedText = completion.choices[0].message.content || '';
    
    // Parse out the subtitle marker
    let contentMarkdown = generatedText;
    let subtitle = '';
    
    // Try to extract SUBTITLE
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
    
    // Remove subtitle marker from content
    contentMarkdown = generatedText
      .replace(/\n-\s*SUBTITLE:.+$/m, '')
      .replace(/\nSUBTITLE:.+$/m, '')
      .replace(/SUBTITLE:.+$/m, '')
      .trim();
    
    // Strip markdown code block wrappers if present
    contentMarkdown = contentMarkdown
      .replace(/^```(?:markdown|md)?\s*\n/i, '')
      .replace(/\n```\s*$/i, '')
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
      writing_exercise_prompt: episodeDetail.writing_prompt,
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
        writing_exercise_prompt: article.writing_exercise_prompt,
        author: 'Florencia',
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
`;

  fs.writeFileSync(filepath, fileContent, 'utf-8');
  console.log(`📄 Saved to: ${filepath}`);
}

/**
 * Update only writing prompts in the database (no article regeneration)
 */
async function updateWritingPromptsOnly() {
  console.log('🚀 Updating writing prompts only (no article regeneration)...\n');

  try {
    // Fetch all episodes to get their IDs
    const episodes = await fetchEpisodes();
    const episodesToUpdate = episodes.filter(e => e.episode_number >= 1 && e.episode_number <= 8);
    
    console.log(`📝 Updating writing prompts for ${episodesToUpdate.length} episodes...\n`);
    
    for (const episode of episodesToUpdate) {
      const episodeDetail = EPISODE_DETAILS[episode.episode_number as keyof typeof EPISODE_DETAILS];
      
      if (!episodeDetail) {
        console.log(`⚠️ No details found for episode ${episode.episode_number}, skipping...`);
        continue;
      }

      // Update only the writing_exercise_prompt field
      const { error } = await supabaseAdmin
        .from('episode_articles')
        .update({
          writing_exercise_prompt: episodeDetail.writing_prompt,
        })
        .eq('episode_id', episode.id);

      if (error) {
        console.error(`❌ Failed to update episode ${episode.episode_number}: ${error.message}`);
      } else {
        console.log(`✅ Episode ${episode.episode_number}: Writing prompt updated`);
      }
    }

    console.log('\n🎉 Writing prompts update complete!\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting episode article generation...\n');
  console.log('📝 New storyline with motifs: Soñemos, Valentina Reyes, mate cup, reality/illusion');
  console.log('🔒 Plot boundaries enabled to prevent spoilers\n');

  try {
    // Load prompt template
    const templatePrompt = loadPromptTemplate();
    console.log('✅ Prompt template loaded\n');

    // Fetch all episodes
    const episodes = await fetchEpisodes();

    // Generate articles for ALL episodes (1-8)
    const episodesToGenerate = episodes.filter(e => e.episode_number >= 1 && e.episode_number <= 8);
    
    console.log(`📚 Generating articles for ${episodesToGenerate.length} episodes...\n`);
    
    for (const episode of episodesToGenerate) {
      try {
        // Generate article
        const article = await generateArticle(episode, templatePrompt);
        
        // Save to file for review
        saveArticleToFile(episode.episode_number, article);
        
        // Insert into database
        await insertArticle(article);
        
        console.log(`\n✅ Episode ${episode.episode_number} complete!\n`);
        
        // Add delay to avoid rate limiting
        if (episode.episode_number < episodesToGenerate.length) {
          console.log('⏳ Waiting 3 seconds before next generation...\n');
          await new Promise(resolve => setTimeout(resolve, 3000));
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

// Run the script with optional --prompts-only flag
const args = process.argv.slice(2);
if (args.includes('--prompts-only')) {
  updateWritingPromptsOnly();
} else {
main();
}
