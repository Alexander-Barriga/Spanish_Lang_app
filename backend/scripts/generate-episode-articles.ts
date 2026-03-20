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
    writing_prompt: `1. Florencia says: "Deseo que entiendas algo desde el principio. Buenos Aires no es solo una ciudad. Es un sentimiento."

Think of a place that isn't just a location to you — it's a feeling. What do you want someone you care about to experience there? What do you hope they'll understand about it that words alone can't explain?

Begin with: "Quiero que..." or "Espero que..."

2. Florencia says: "Mi abuela me traía acá cuando era chica. Ella me enseñó que cada taza de café tiene una historia."

Florencia's grandmother brought her to Café Tortoni as a child, and those visits shaped who she became. Think of a place from your childhood that a person close to you introduced you to. What do you wish others could understand about why it still matters to you?

Begin with: "Ojalá..." or "Deseo que..."

3. Florencia says: "En Buenos Aires, las cosas no siempre son lo que parecen."

Florencia hints that she carries secrets beneath the surface. What is something about yourself that you hope people will discover over time — something that isn't obvious when they first meet you?

Begin with: "Espero que descubras..." or "No quiero que pienses..."


Close with: "Espero que..." — expressing what you hope this journey will reveal about you.`,
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
    writing_prompt: `1. Florencia says: "Mi abuela bailaba como si el mundo dejara de existir."

Florencia's grandmother danced tango as if the world stopped existing. Is there something you do — a passion, a hobby, a ritual — that makes you feel that way? What surprises you about how it makes you feel?

Begin with: "Me emociona que..." or "Es increíble que..."

2. Florencia says: "Ella me enseñó a bailar tango. Me enseñó a sentir."

Florencia's grandmother didn't just teach her dance steps — she taught her to feel. Think about someone who taught you something that went far beyond the skill itself. What did they really teach you?

Begin with: "Me alegra que..." or "Es maravilloso que..."

3. Florencia says: "¿Quieres intentarlo? No te preocupes si no es perfecto."

Florencia invites you to dance even if it won't be perfect. When was the last time you tried something new even though you were afraid of failing? What emotions surprised you?

Begin with: "Me sorprende que..." or "Es emocionante que..."


Close with: "Me alegra que..." — expressing gratitude for someone who taught you to feel, not just to do.`,
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
    writing_prompt: `1. Florencia says: "Dudo que haya sido un accidente que encontraras ese disco."

You found a "Soñemos" record at the San Telmo market — and Florencia doesn't believe it was an accident. Think about a coincidence in your own life that felt too perfect to be random. Do you doubt it was just chance?

Begin with: "Dudo que haya sido..." or "No creo que haya sido..."

2. Florencia says: "Compré algo hoy... pero es un secreto."

Florencia is keeping a secret — she bought something at the market but won't say what. We all carry small secrets and unspoken intentions. Is there something you've done for someone that they may not know about? Or a choice you've kept to yourself?

Begin with: "Es posible que haya..." or "Puede que haya..."

3. Florencia says: "En Buenos Aires, los misterios están en todas partes. Solo hay que saber mirar."

Florencia sees mystery everywhere — she doubts the obvious and questions appearances. Looking back at a moment in your past, what do you now question that you once took at face value? A relationship, a decision, a turning point?

Begin with: "No estoy seguro/a de que haya sido..." or "Dudo que..."


Close with: "Dudo que haya sido..." — expressing that some things in life are too meaningful to be mere coincidence.`,
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
    writing_prompt: `1. Florencia says: "Ahora somos amigos. Cuando compartís un mate, ya no sos un extraño."

Florencia tells you that sharing mate means you belong. In your life, what ritual or moment marked the shift from being an outsider to being welcomed? What do you hope that experience has taught you about connection?

Begin with: "Espero que hayas experimentado..." or "Me alegra que hayas..."

2. Florencia says: "Mi abuela no pudo venir al asado, pero siempre está presente."

Florencia's grandmother "couldn't make it," but she is always present in spirit. Think about someone whose absence you feel, even when surrounded by others. What do you wish you had told them during a shared moment?

Begin with: "Ojalá hayas tenido..." or "Espero que hayas sentido..."

3. Florencia says: "El mate no se toma solo. Se comparte."

Mate is never drunk alone — it's shared. Florencia is teaching you that belonging requires vulnerability and trust. When in your life have you let someone in, and how did it change you? What does belonging truly mean to you?

Begin with: "Me alegra que hayas podido..." or "Espero que hayas encontrado..."


Close with: "Ojalá hayas..." — expressing a wish that someone in your life knows how much they mean to you.`,
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
    writing_prompt: `1. Florencia says: "Si hubiera sabido lo que mi abuela sacrificó... no habría preguntado tanto."

Florencia's grandmother Valentina Reyes was offered a role at Teatro Colón — the chance of a lifetime — but chose family instead. If you had known earlier what someone sacrificed for you, what would you have done differently?

Begin with: "Si hubiera sabido..." or "No habría..."

2. Florencia says: "Ella también fue bailarina. Le ofrecieron un lugar en una compañía de tango... y no lo acepté."

Florencia herself was offered a spot in a tango company and didn't take it — just like her grandmother before her. Is there an opportunity you didn't take that still lives in your mind? What do you think would have happened if you had been braver?

Begin with: "Ojalá hubiera..." or "Si hubiera tenido el valor..."

3. Florencia says: "Hay cosas que quería decirle y ya no puedo."

Florencia stands at her grandmother's grave at Chacarita, carrying words she never said. Is there someone in your life — gone or simply distant — to whom you owe unspoken words? What would you say if you could go back?

Begin with: "Hubiera querido..." or "Si hubiera sabido..."


Close with: "Si hubiera..." — imagining a different past, but accepting the present with grace.`,
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
    writing_prompt: `1. Florencia says: "Quisiera que pudieras ver lo que yo veo cuando miro este escenario."

You're standing inside Teatro Colón — the stage where Florencia's grandmother almost performed. If you could stand in a place that represents someone else's unfulfilled dream, what would you wish for them? What dream would you want to bring back to life?

Begin with: "Quisiera que..." or "Si pudiera..."

2. Florencia says: "Los artistas sacrifican todo para que otros puedan sentir algo."

Florencia reflects on what artists give up so that others can feel something real. Have you ever given up something important so that someone else could benefit? What made that sacrifice feel worth it — or did it?

Begin with: "Como si fuera..." or "Aunque fuera difícil..."

3. Florencia says: "La ilusión y la realidad... a veces no hay diferencia."

At Teatro Colón, illusion and reality blur. Florencia asks whether beauty can reshape the world. Is there a dream you hold that others might call an illusion? What would it take for that dream to become real?

Begin with: "Desearía que..." or "Si tuviera la oportunidad..."


Close with: "Quisiera que..." — expressing the dream you would bring to life if nothing stood in your way.`,
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
    writing_prompt: `1. Florencia says: "La gente pintó estas casas con lo que tenía. No tenían mucho, pero lo hicieron hermoso."

In La Boca, poor immigrant families painted their homes with leftover ship paint — and created one of the most beautiful neighborhoods in the world. Think of a time when you built something meaningful out of very little. What did that experience teach you?

Begin with: "Como si fuera..." or "Aunque pareciera..."

2. Florencia says: "A veces las ilusiones pueden ser tan reales como la realidad."

Florencia says illusions can be as real as reality — if you choose to believe. Is there something you believe in that others might call naive or unrealistic? A hope, a conviction, a vision for the future?

Begin with: "Como si existiera..." or "Aunque no fuera obvio..."

3. Florencia says: "A veces hay que creer primero para que se haga real."

Sometimes you have to believe first for something to become real. Florencia and you are standing in a place built by dreamers. When in your life has a hope or belief — one that others doubted — actually become your reality?

Begin with: "Para que fuera posible..." or "Como si ya fuera real..."


Close with: "Como si..." — describing your life as though the dream you believe in were already true.`,
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
    writing_prompt: `1. Florencia says: "Este mate lo compré en San Telmo... el día que nos conocimos. Era para ti."

The secret purchase from Episode 3 was a mate cup — and it was for you all along. Florencia planned this farewell gift from the moment your friendship began. Has someone ever shown you that they valued your connection more than you realized? What do you wish you had known sooner?

Begin with: "Espero que..." or "Me alegra que haya..." or "Quisiera que..."

2. Florencia says: "Gracias por caminar conmigo."

Florencia thanks you for walking alongside her through Buenos Aires, through memories of her grandmother, and through her own grief. Who in your life has walked alongside you? If you could thank them using everything this journey has taught you, what would you say?

Begin with: "Ojalá que..." or "Si pudiera..." or "Hubiera querido..."

3. Florencia says: "Los sueños que compartimos... esos no tienen que terminar nunca."

The shared dreams don't have to end. This is the final episode, but Florencia is telling you that what you've built together — in language, in connection, in understanding — continues. What dreams do you carry forward? What do you wish for yourself and those you love?

Begin with: "Quiero que..." or "Espero que..." or "Ojalá..."


Close with: "Los sueños que compartimos..." — honoring what this journey gave you, and the dreams that continue.`,
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
