/**
 * Script to regenerate all 8 episodes with enriched narrative content
 * 
 * This script:
 * 1. Reads the narrative arc and scene template
 * 2. Generates enhanced scenes with cultural context
 * 3. Updates episodes in the database
 * 4. Optionally generates images for each scene
 * 
 * Run with: npx ts-node scripts/regenerate-episodes.ts
 * 
 * Options:
 *   --dry-run       Don't save to database, just preview
 *   --episode=N     Only regenerate episode N
 *   --with-images   Also generate images (costs ~$2.50 total)
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../src/config/supabase';
import OpenAI from 'openai';
import { imageGenerationService } from '../src/services/imageGeneration';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment variables');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// ============================================
// Episode Configuration from Narrative Arc
// ============================================

const EPISODE_CONFIGS = [
  {
    episodeNumber: 1,
    title_es: 'El Café de la Esquina',
    title_en: 'The Corner Café',
    location: 'Café Tortoni, Avenida de Mayo',
    grammar_focus: 'present_subjunctive_formation',
    grammar_triggers: ['Quiero que...', 'Espero que...', 'Me alegra que...'],
    theme: 'First Impressions',
    culturalContext: `Café Tortoni, founded in 1858, is Argentina's oldest café and a living monument to Buenos Aires' golden age. Its marble tables, stained glass, and wood-paneled walls have hosted poets, politicians, and tango legends. The café represents the city's European sophistication blended with local soul.`,
    emotionalArc: ['curiosity', 'cautious_hope', 'trust', 'invitation'],
    florenciaReveals: [
      'She comes to this café every Tuesday because her grandmother Rosa used to bring her here',
      "She's a tango dancer, not just someone who knows about tango",
      'She wants to show the user the real Buenos Aires, not the postcard version',
    ],
    callbackSeeds: ['rosa_mention', 'tortoni_memory', 'lugares_donde_vivimos'],
  },
  {
    episodeNumber: 2,
    title_es: 'La Milonga',
    title_en: 'The Dance Hall',
    location: 'A traditional milonga in San Telmo',
    grammar_focus: 'subjunctive_emotions',
    grammar_triggers: ['Me sorprende que...', 'Es triste que...', 'Me alegra que...'],
    theme: 'Trust Building',
    culturalContext: `A milonga is not just a dance—it's a sacred social ritual. Unlike the flashy tango shows for tourists, authentic milongas follow strict codes: the cabeceo (eye contact invitation), the tanda (set of songs), the cortina (break between tandas). The dim lighting, the careful navigation of dancers, the unspoken rules—this is where Buenos Aires breathes.`,
    emotionalArc: ['nervous_welcome', 'teaching', 'vulnerability', 'connection'],
    florenciaReveals: [
      'Her grandmother Rosa was a famous milonguera in the 1960s',
      'She was scared the first time she danced publicly too',
      'The tango is in the heart, not the feet',
    ],
    callbackTo: ['tortoni_memory'],
    callbackSeeds: ['rosa_milonguera', 'milonga_codes'],
  },
  {
    episodeNumber: 3,
    title_es: 'El Mercado de San Telmo',
    title_en: 'The San Telmo Market',
    location: 'San Telmo Antique Market',
    grammar_focus: 'subjunctive_doubt',
    grammar_triggers: ['No creo que...', 'Dudo que...', 'No es posible que...'],
    theme: 'Authentic vs. Fake',
    culturalContext: `The San Telmo market, housed in a 19th-century iron structure, is a treasure trove of Argentina's past—antique silver mate sets, vintage tango records, colonial furniture, and yes, plenty of fakes for unwary tourists. The neighborhood was once home to wealthy families who fled during yellow fever epidemics, leaving their mansions to become conventillos (tenements). Today it's a bohemian mix of artists, dealers, and dreamers.`,
    emotionalArc: ['playfulness', 'teaching', 'philosophical', 'deeper_connection'],
    florenciaReveals: [
      'She grew up surrounded by antique dealers—her father was one',
      'Authenticity has imperfections; perfection is suspicious',
      'She judges people by curiosity, not perfection',
    ],
    callbackTo: ['milonga_codes'],
    callbackSeeds: ['father_antiques', 'authentic_vs_fake'],
  },
  {
    episodeNumber: 4,
    title_es: 'El Asado',
    title_en: 'The Family Barbecue',
    location: "Florencia's family home in San Telmo",
    grammar_focus: 'subjunctive_desires',
    grammar_triggers: ['Quiero que...', 'Deseo que...', 'Me gustaría que...'],
    theme: 'Belonging',
    culturalContext: `Asado is not just Argentine barbecue—it's a Sunday religion. Families gather for hours around the parrilla (grill), with the asador (grill master) commanding respect. The meal includes chorizo, morcilla (blood sausage), ribs, and the sacred entraña. Chimichurri is made from family recipes passed down generations. To be invited to a family asado is to be accepted into the inner circle.`,
    emotionalArc: ['nervous_sharing', 'warmth', 'inclusion', 'nostalgia'],
    florenciaReveals: [
      "Her father used to be the asador—now her uncle does it, but it's not the same",
      'Family chimichurri recipe from her grandfather',
      "This is the first time she's brought someone outside family to asado since her father passed",
    ],
    callbackTo: ['father_antiques'],
    callbackSeeds: ['chimichurri_recipe', 'father_asador'],
  },
  {
    episodeNumber: 5,
    title_es: 'La Boca',
    title_en: 'The Colorful Neighborhood',
    location: 'La Boca neighborhood, beyond Caminito',
    grammar_focus: 'preterite_vs_imperfect',
    grammar_triggers: ['Cuando era...', 'Un día...', 'Siempre...'],
    theme: 'Taking Risks',
    culturalContext: `La Boca is Buenos Aires' most colorful and conflicted neighborhood. The famous Caminito street with its painted tin houses was once a working-class port area. Italian immigrants built homes from discarded ship materials, painting them with leftover marine paint—hence the rainbow of colors. Beyond the tourist strip, the neighborhood remains gritty and real, home to the legendary Boca Juniors football club and generations of artists.`,
    emotionalArc: ['nostalgia', 'vulnerability', 'shared_pain', 'courage'],
    florenciaReveals: [
      'Her father died suddenly when she was 19—heart attack, no goodbye',
      'She almost quit dancing after he died',
      'Her grandmother Rosa convinced her to continue',
    ],
    callbackTo: ['father_asador', 'chimichurri_recipe'],
    callbackSeeds: ['father_death', 'rosa_advice'],
  },
  {
    episodeNumber: 6,
    title_es: 'La Crisis',
    title_en: 'Economic Reality',
    location: "A local café / Florencia's apartment",
    grammar_focus: 'imperfect_subjunctive',
    grammar_triggers: ['Si tuviera...', 'Si pudiera...', 'Ojalá pudiera...'],
    theme: 'Resilience',
    culturalContext: `Argentina has experienced devastating economic crises (2001 corralito, periodic devaluations, inflation that can exceed 100% annually). For porteños, economic instability isn't abstract—it's the reason they carry dollars, distrust banks, and have learned to adapt quickly. Florencia's generation has never known stability, yet they persist with art, humor, and community.`,
    emotionalArc: ['anxiety', 'honesty', 'solidarity', 'resilience'],
    florenciaReveals: [
      'She works three jobs: dance instructor, occasional waitress, tourist translator',
      "She's had opportunities to leave Argentina but hasn't taken them",
      'Her grandmother survived worse—the dictatorship era',
    ],
    callbackTo: ['father_death', 'rosa_advice'],
    callbackSeeds: ['economic_reality', 'rosa_wisdom'],
  },
  {
    episodeNumber: 7,
    title_es: 'La Bombonera',
    title_en: 'The Stadium',
    location: 'Outside La Bombonera stadium (Boca Juniors)',
    grammar_focus: 'conditional',
    grammar_triggers: ['Sería...', 'Podría...', '¿Qué harías?'],
    theme: 'Chasing Dreams',
    culturalContext: `La Bombonera ("The Chocolate Box") is the legendary home of Club Atlético Boca Juniors, possibly the most passionate football club in the world. The stadium literally shakes when fans jump. For porteños, Boca vs. River (the Superclásico) is more than sport—it's identity, tribal belonging, and collective ecstasy. The surrounding neighborhood thrums with team colors and murals.`,
    emotionalArc: ['energy', 'dreams', 'mutual_sharing', 'commitment'],
    florenciaReveals: [
      "She once had an offer to perform in Spain—she didn't take it",
      'She thought her mother needed her more than she needed her dreams',
      "She's going to apply for international opportunities again",
    ],
    callbackTo: ['economic_reality', 'rosa_wisdom'],
    callbackSeeds: ['missed_opportunity'],
  },
  {
    episodeNumber: 8,
    title_es: 'La Despedida',
    title_en: 'The Farewell',
    location: 'Café Tortoni / Buenos Aires waterfront at sunset',
    grammar_focus: 'comprehensive_review',
    grammar_triggers: ['All forms integrated'],
    theme: 'Bittersweet Endings',
    culturalContext: `Goodbyes in Buenos Aires are never simple. Porteños are famous for extending departures—one more coffee, one more story, one more embrace. The waterfront (Costanera Sur or Puerto Madero) at sunset captures the city's melancholy beauty—the mix of old and new, the river that connects to the world beyond.`,
    emotionalArc: ['nostalgia', 'gratitude', 'growth_acknowledged', 'open_hope'],
    florenciaReveals: [
      "She's giving the user her grandmother Rosa's chimichurri recipe—in Rosa's handwriting",
      'She applied for international opportunities—outcome unknown',
      'The user inspired her to try again',
    ],
    callbackTo: ['tortoni_memory', 'rosa_mention', 'chimichurri_recipe', 'lugares_donde_vivimos'],
  },
];

// ============================================
// Scene Generation
// ============================================

interface SceneConfig {
  sceneId: string;
  sceneNumber: number;
  emotionalBeat: string;
  florenciaReveals: string;
  isFreeSpeakScene: boolean;
}

async function generateScenesForEpisode(episodeConfig: typeof EPISODE_CONFIGS[0]): Promise<any[]> {
  console.log(`\n🎬 Generating scenes for Episode ${episodeConfig.episodeNumber}: ${episodeConfig.title_en}`);
  
  // Read the scene template
  const templatePath = path.join(__dirname, 'prompts', 'episode-scene-template.md');
  const template = fs.readFileSync(templatePath, 'utf-8');
  
  // Read the narrative arc for context
  const narrativeArcPath = path.join(__dirname, 'prompts', 'narrative-arc.md');
  const narrativeArc = fs.readFileSync(narrativeArcPath, 'utf-8');
  
  // Build the prompt
  const systemPrompt = `You are generating interactive scenes for a Spanish language learning app.

${template}

NARRATIVE ARC CONTEXT:
${narrativeArc}

Generate 4 scenes for this episode following all requirements in the template.`;

  const userPrompt = `Generate 4 scenes for Episode ${episodeConfig.episodeNumber}: "${episodeConfig.title_es}" (${episodeConfig.title_en})

EPISODE DETAILS:
- Location: ${episodeConfig.location}
- Grammar Focus: ${episodeConfig.grammar_focus}
- Grammar Triggers: ${episodeConfig.grammar_triggers.join(', ')}
- Theme: ${episodeConfig.theme}
- Cultural Context: ${episodeConfig.culturalContext}
- Emotional Arc: ${episodeConfig.emotionalArc.join(' → ')}

FLORENCIA REVEALS IN THIS EPISODE:
${episodeConfig.florenciaReveals.map((r, i) => `${i + 1}. ${r}`).join('\n')}

${episodeConfig.callbackTo ? `CALLBACKS TO PREVIOUS EPISODES:\n${episodeConfig.callbackTo.join(', ')}` : ''}

CALLBACK SEEDS TO PLANT:
${episodeConfig.callbackSeeds?.join(', ') || 'None'}

Generate exactly 4 scenes with:
- Scene 1: Opening (guided response)
- Scene 2: Deepening (guided response)  
- Scene 3: Key moment (free_speak response)
- Scene 4: Closing/transition (guided response)

Return ONLY valid JSON in this format:
{
  "scenes": [
    {
      "scene_id": "scene_1",
      "scene_number": 1,
      "florencia_says": "Spanish with vos conjugations",
      "translation": "English translation",
      "audio_key": "ep${episodeConfig.episodeNumber}_scene_1",
      "emotion": "curious",
      "response_type": "guided",
      "cultural_context": "2-3 sentences explaining for newcomers",
      "scene_image_prompt": "Detailed DALL-E prompt",
      "emotional_beat": "curiosity",
      "callback_to": null,
      "florencia_reveals": "What she shares here",
      "options": [
        {"text": "Spanish option", "next_scene": "scene_2", "grammar_correct": true, "uses_subjunctive": true}
      ],
      "grammar_hint": "Instruction for grammar use",
      "expected_patterns": ["Quiero que...", "Espero que..."]
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseText);
    
    if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
      throw new Error('Invalid response format: missing scenes array');
    }

    console.log(`  ✅ Generated ${parsed.scenes.length} scenes`);
    return parsed.scenes;
  } catch (error) {
    console.error(`  ❌ Error generating scenes:`, error);
    throw error;
  }
}

// ============================================
// Database Update
// ============================================

async function updateEpisodeInDatabase(
  episodeConfig: typeof EPISODE_CONFIGS[0],
  scenes: any[],
  dryRun: boolean
): Promise<void> {
  console.log(`\n💾 ${dryRun ? '[DRY RUN] Would update' : 'Updating'} Episode ${episodeConfig.episodeNumber} in database...`);

  // First, find the episode ID
  const { data: arc, error: arcError } = await supabaseAdmin
    .from('story_arcs')
    .select('id')
    .eq('character_id', 'florencia')
    .eq('arc_number', 1)
    .single();

  if (arcError || !arc) {
    throw new Error(`Failed to fetch story arc: ${arcError?.message}`);
  }

  const { data: episode, error: episodeError } = await supabaseAdmin
    .from('episodes')
    .select('id')
    .eq('story_arc_id', arc.id)
    .eq('episode_number', episodeConfig.episodeNumber)
    .single();

  if (episodeError || !episode) {
    throw new Error(`Failed to find episode ${episodeConfig.episodeNumber}: ${episodeError?.message}`);
  }

  if (dryRun) {
    console.log(`  📋 Would update episode ${episode.id} with ${scenes.length} scenes`);
    console.log(`  📋 Sample scene:`, JSON.stringify(scenes[0], null, 2).slice(0, 500) + '...');
    return;
  }

  // Update the episode
  const { error: updateError } = await supabaseAdmin
    .from('episodes')
    .update({
      scenes,
      cultural_context: episodeConfig.culturalContext,
      character_development_notes: episodeConfig.florenciaReveals.join('\n'),
      callback_references: episodeConfig.callbackSeeds || [],
    })
    .eq('id', episode.id);

  if (updateError) {
    throw new Error(`Failed to update episode: ${updateError.message}`);
  }

  console.log(`  ✅ Episode ${episodeConfig.episodeNumber} updated successfully`);
}

// ============================================
// Image Generation
// ============================================

async function generateImagesForEpisode(
  episodeConfig: typeof EPISODE_CONFIGS[0],
  scenes: any[],
  dryRun: boolean
): Promise<void> {
  console.log(`\n🎨 ${dryRun ? '[DRY RUN] Would generate' : 'Generating'} images for Episode ${episodeConfig.episodeNumber}...`);

  if (dryRun) {
    console.log(`  📋 Would generate ${scenes.length} scene images`);
    for (const scene of scenes) {
      console.log(`    - ${scene.scene_id}: ${scene.scene_image_prompt?.slice(0, 80)}...`);
    }
    return;
  }

  await imageGenerationService.initializeBucket();

  for (const scene of scenes) {
    if (!scene.scene_image_prompt) {
      console.log(`  ⚠️ Scene ${scene.scene_id} has no image prompt, skipping`);
      continue;
    }

    console.log(`  🖼️ Generating image for ${scene.scene_id}...`);
    
    const result = await imageGenerationService.generateSceneImage({
      episodeNumber: episodeConfig.episodeNumber,
      sceneId: scene.scene_id,
      sceneDescription: scene.scene_image_prompt,
      location: episodeConfig.location,
      emotionalBeat: scene.emotional_beat || 'connection',
      culturalContext: scene.cultural_context,
    });

    if (result.success && result.image) {
      // Update the scene with the image URL
      scene.scene_image_url = result.image.url;
      scene.scene_image_storage_path = result.image.storagePath;
      console.log(`    ✅ Image stored: ${result.image.storagePath}`);
    } else {
      console.log(`    ❌ Failed: ${result.error}`);
    }

    // Rate limit protection
    await delay(3000);
  }
}

// ============================================
// Main Execution
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const withImages = args.includes('--with-images');
  const episodeArg = args.find(a => a.startsWith('--episode='));
  const targetEpisode = episodeArg ? parseInt(episodeArg.split('=')[1]) : null;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Episode Regeneration Script - Narrative Enhancement    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no database changes)' : '💾 LIVE (will update database)'}`);
  console.log(`Images: ${withImages ? '🎨 Will generate images (~$0.32/episode)' : '📝 Text only'}`);
  console.log(`Target: ${targetEpisode ? `Episode ${targetEpisode} only` : 'All 8 episodes'}`);
  console.log();

  const episodesToProcess = targetEpisode
    ? EPISODE_CONFIGS.filter(e => e.episodeNumber === targetEpisode)
    : EPISODE_CONFIGS;

  if (episodesToProcess.length === 0) {
    console.error(`❌ Episode ${targetEpisode} not found`);
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  for (const episodeConfig of episodesToProcess) {
    try {
      // Generate scenes
      const scenes = await generateScenesForEpisode(episodeConfig);

      // Optionally generate images
      if (withImages) {
        await generateImagesForEpisode(episodeConfig, scenes, dryRun);
      }

      // Update database
      await updateEpisodeInDatabase(episodeConfig, scenes, dryRun);

      successCount++;
    } catch (error) {
      console.error(`\n❌ Failed to process Episode ${episodeConfig.episodeNumber}:`, error);
      failCount++;
    }

    // Rate limit between episodes
    if (episodesToProcess.indexOf(episodeConfig) < episodesToProcess.length - 1) {
      console.log('\n⏳ Waiting before next episode...');
      await delay(5000);
    }
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`✅ Completed: ${successCount} episodes`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} episodes`);
  }
  console.log('════════════════════════════════════════════════════════════');

  if (dryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.');
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

