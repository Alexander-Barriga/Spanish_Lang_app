/**
 * Script to extract all storyline dialogue from episode SQL files
 * and output a single formatted plain text file
 * 
 * Run with: npx ts-node scripts/extract-storyline-dialogue.ts
 */

import fs from 'fs';
import path from 'path';

interface Scene {
  scene_id: string;
  scene_number: number;
  florencia_says?: string;
  florencia_says_en?: string;
  user_says?: string;
  user_says_en?: string;
  waiter_says?: string;
  waiter_says_en?: string;
  response_type: string;
  emotion: string;
  audio_key?: string;
  cultural_context?: string;
}

interface EpisodeData {
  episodeNumber: number;
  title: string;
  grammarFocus: string;
  characters: string;
  scenes: Scene[];
}

// Episode metadata extracted from SQL file comments
const EPISODE_METADATA: Record<number, { title: string; grammarFocus: string; characters: string }> = {
  1: {
    title: 'Cafe Tortoni - Introductions',
    grammarFocus: 'Present Subjunctive (expressing desire)',
    characters: 'Florencia, User, Waiter',
  },
  2: {
    title: 'Milonga en Salón Marabú - Introduction to Tango',
    grammarFocus: 'Present Subjunctive (expressing emotion)',
    characters: 'Florencia, User',
  },
  3: {
    title: 'San Telmo Market - Introduction to Porteño History',
    grammarFocus: 'Perfect Subjunctive (expressing doubt)',
    characters: 'Florencia, User',
  },
  4: {
    title: 'Family Asado - Family, Tradition, and Mate',
    grammarFocus: 'Perfect Subjunctive (expressing desire about past)',
    characters: 'Florencia, User',
  },
  5: {
    title: 'Cementerio de la Chacarita - Legacy to Become an Artist',
    grammarFocus: 'Pluperfect Subjunctive (hypotheticals about the past)',
    characters: 'Florencia, User',
  },
  6: {
    title: 'Teatro Colón - High Culture and the Illusions of the Artist',
    grammarFocus: 'Imperfect Subjunctive (wishes and hypotheticals)',
    characters: 'Florencia, User',
  },
  7: {
    title: 'La Boca - Immigrant Hardship, Beauty, and Revealed Truths',
    grammarFocus: 'Imperfect Subjunctive (conditionals and comparisons)',
    characters: 'Florencia, User',
  },
  8: {
    title: 'Farewell at Cafe Tortoni - Piercing Through the Illusions',
    grammarFocus: 'Comprehensive Review (all subjunctive forms)',
    characters: 'Florencia, User, Waiter',
  },
};

/**
 * Extract JSON scenes array from SQL file content
 */
function extractScenesFromSQL(sqlContent: string): Scene[] {
  // Match the JSON array between SET scenes = '[' and ']'::jsonb
  const jsonMatch = sqlContent.match(/SET scenes = '\[([\s\S]*?)\]'::jsonb/);
  
  if (!jsonMatch) {
    console.error('Could not find scenes JSON in SQL file');
    return [];
  }

  try {
    // Reconstruct the JSON array
    const jsonString = '[' + jsonMatch[1] + ']';
    // Handle SQL escaped single quotes ('' -> ')
    const cleanedJson = jsonString.replace(/''/g, "'");
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error('Error parsing JSON from SQL:', error);
    return [];
  }
}

/**
 * Format a single scene as plain text
 */
function formatScene(scene: Scene): string {
  const lines: string[] = [];
  
  lines.push(`--- Scene ${scene.scene_number} ---`);
  lines.push(`[Emotion: ${scene.emotion}]`);
  lines.push(`[Response Type: ${scene.response_type}]`);
  lines.push('');

  // Waiter dialogue (if present)
  if (scene.waiter_says) {
    lines.push('WAITER (Spanish):');
    lines.push(scene.waiter_says);
    lines.push('');
    if (scene.waiter_says_en) {
      lines.push('WAITER (English):');
      lines.push(scene.waiter_says_en);
      lines.push('');
    }
  }

  // Florencia dialogue
  if (scene.florencia_says) {
    lines.push('FLORENCIA (Spanish):');
    lines.push(scene.florencia_says);
    lines.push('');
    if (scene.florencia_says_en) {
      lines.push('FLORENCIA (English):');
      lines.push(scene.florencia_says_en);
      lines.push('');
    }
  }

  // User dialogue (if present)
  if (scene.user_says) {
    lines.push('USER (Spanish):');
    lines.push(scene.user_says);
    lines.push('');
    if (scene.user_says_en) {
      lines.push('USER (English):');
      lines.push(scene.user_says_en);
      lines.push('');
    }
  }

  // Cultural context (if present)
  if (scene.cultural_context) {
    lines.push('Cultural Context:');
    lines.push(scene.cultural_context);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format a complete episode as plain text
 */
function formatEpisode(episode: EpisodeData): string {
  const lines: string[] = [];
  const separator = '================================================================================';
  
  lines.push(separator);
  lines.push(`EPISODE ${episode.episodeNumber}: ${episode.title}`);
  lines.push(`Grammar Focus: ${episode.grammarFocus}`);
  lines.push(`Characters: ${episode.characters}`);
  lines.push(separator);
  lines.push('');

  for (const scene of episode.scenes) {
    lines.push(formatScene(scene));
  }

  return lines.join('\n');
}

/**
 * Main function to extract all dialogue
 */
async function main() {
  console.log('📖 Extracting storyline dialogue from episode SQL files...\n');

  const episodeDialogueDir = path.join(__dirname, 'episode-dialogue');
  const outputPath = path.join(__dirname, 'storyline-complete.txt');
  
  const episodeFiles = [
    'episode-1-cafe-tortoni.sql',
    'episode-2-salon-marabu.sql',
    'episode-3-san-telmo.sql',
    'episode-4-family-asado.sql',
    'episode-5-cementerio.sql',
    'episode-6-teatro-colon.sql',
    'episode-7-la-boca.sql',
    'episode-8-farewell.sql',
  ];

  const allEpisodes: string[] = [];
  
  // Header
  allEpisodes.push('================================================================================');
  allEpisodes.push('SPANISH LANGUAGE APP - COMPLETE STORYLINE DIALOGUE');
  allEpisodes.push('8 Episodes with Florencia in Buenos Aires');
  allEpisodes.push('================================================================================');
  allEpisodes.push('');
  allEpisodes.push('This document contains all dialogue from the 8-episode mini-series.');
  allEpisodes.push('Each episode focuses on a specific Spanish Subjunctive grammar concept');
  allEpisodes.push('while telling an immersive story set in Buenos Aires, Argentina.');
  allEpisodes.push('');
  allEpisodes.push('KEY MOTIFS:');
  allEpisodes.push('- "Soñemos" by Carlos Di Sarli - The song that plays throughout the story');
  allEpisodes.push('- Grandmother Valentina Reyes - Florencia\'s late grandmother, a tango legend');
  allEpisodes.push('- Mate cup - A secret gift Florencia buys for the user');
  allEpisodes.push('- Reality vs. Illusion - The philosophical theme woven throughout');
  allEpisodes.push('');
  allEpisodes.push('');

  for (let i = 0; i < episodeFiles.length; i++) {
    const episodeNumber = i + 1;
    const filename = episodeFiles[i];
    const filepath = path.join(episodeDialogueDir, filename);

    console.log(`📄 Processing Episode ${episodeNumber}: ${filename}`);

    try {
      const sqlContent = fs.readFileSync(filepath, 'utf-8');
      const scenes = extractScenesFromSQL(sqlContent);
      
      if (scenes.length === 0) {
        console.error(`   ⚠️ No scenes found in ${filename}`);
        continue;
      }

      const metadata = EPISODE_METADATA[episodeNumber];
      const episodeData: EpisodeData = {
        episodeNumber,
        title: metadata.title,
        grammarFocus: metadata.grammarFocus,
        characters: metadata.characters,
        scenes,
      };

      const formattedEpisode = formatEpisode(episodeData);
      allEpisodes.push(formattedEpisode);
      allEpisodes.push('\n\n');

      console.log(`   ✅ Extracted ${scenes.length} scenes`);
    } catch (error) {
      console.error(`   ❌ Error processing ${filename}:`, error);
    }
  }

  // Footer
  allEpisodes.push('================================================================================');
  allEpisodes.push('END OF STORYLINE');
  allEpisodes.push('================================================================================');

  // Write to file
  fs.writeFileSync(outputPath, allEpisodes.join('\n'), 'utf-8');
  console.log(`\n✅ Storyline extracted successfully!`);
  console.log(`📁 Output file: ${outputPath}`);
}

main().catch(console.error);

