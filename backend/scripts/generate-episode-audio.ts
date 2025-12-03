/**
 * Script to generate and upload pre-recorded episode audio files
 * Run with: npx ts-node scripts/generate-episode-audio.ts
 * 
 * This script:
 * 1. Reads all episodes from the database
 * 2. Extracts all dialogue lines and audio keys
 * 3. Generates audio using ElevenLabs API
 * 4. Uploads to Supabase Storage
 * 5. Stores metadata in pre_generated_audio table
 */

import dotenv from 'dotenv';
import { supabaseAdmin } from '../src/config/supabase';
import { getVoiceIdForCharacter } from '../src/config/voices';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const AUDIO_BUCKET = 'episode-audio';

if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
  process.exit(1);
}

interface Scene {
  scene_id: string;
  florencia_says: string;
  audio_key: string;
  emotion: string;
}

interface Episode {
  id: string;
  episode_number: number;
  title_es: string;
  title_en: string;
  scenes: Scene[];
  story_arc_id: string;
}

interface StoryArc {
  id: string;
  character_id: string;
}

// Emotion to voice settings mapping
const emotionSettings: Record<string, { stability: number; style: number }> = {
  warm_welcome: { stability: 0.5, style: 0.6 },
  curious: { stability: 0.5, style: 0.5 },
  proud: { stability: 0.4, style: 0.7 },
  enthusiastic: { stability: 0.3, style: 0.8 },
  encouraging: { stability: 0.5, style: 0.6 },
  reassuring: { stability: 0.6, style: 0.5 },
  warm_goodbye: { stability: 0.5, style: 0.5 },
  excited: { stability: 0.3, style: 0.8 },
  patient_teacher: { stability: 0.6, style: 0.4 },
  nostalgic: { stability: 0.6, style: 0.4 },
  emotional_nostalgic: { stability: 0.7, style: 0.3 },
  happy: { stability: 0.4, style: 0.7 },
  impressed: { stability: 0.4, style: 0.6 },
  skeptical: { stability: 0.5, style: 0.4 },
  satisfied: { stability: 0.5, style: 0.5 },
  passionate: { stability: 0.3, style: 0.8 },
  reflective: { stability: 0.6, style: 0.4 },
  respectful: { stability: 0.6, style: 0.4 },
  storytelling: { stability: 0.5, style: 0.5 },
  sad_nostalgic: { stability: 0.7, style: 0.3 },
  hopeful: { stability: 0.5, style: 0.6 },
  welcoming: { stability: 0.5, style: 0.6 },
  sharing_wisdom: { stability: 0.6, style: 0.4 },
  hosting: { stability: 0.5, style: 0.5 },
  warm: { stability: 0.5, style: 0.5 },
  frustrated: { stability: 0.4, style: 0.5 },
  conflicted: { stability: 0.5, style: 0.4 },
  touched: { stability: 0.6, style: 0.5 },
  torn: { stability: 0.5, style: 0.4 },
  cheerful: { stability: 0.4, style: 0.7 },
  nostalgic_proud: { stability: 0.5, style: 0.5 },
  explaining: { stability: 0.6, style: 0.4 },
  dreaming: { stability: 0.5, style: 0.5 },
  bittersweet: { stability: 0.6, style: 0.4 },
  warm_nostalgic: { stability: 0.6, style: 0.5 },
  earnest: { stability: 0.5, style: 0.5 },
  emotional: { stability: 0.6, style: 0.5 },
  bittersweet_loving: { stability: 0.6, style: 0.5 },
  default: { stability: 0.5, style: 0.5 },
};

/**
 * Initialize the episode-audio storage bucket
 */
async function initializeBucket(): Promise<void> {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === AUDIO_BUCKET);

    if (!bucketExists) {
      const { error } = await supabaseAdmin.storage.createBucket(AUDIO_BUCKET, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB limit
        allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
      });

      if (error) {
        console.error('❌ Failed to create bucket:', error);
        throw error;
      }
      console.log('✅ Created episode-audio bucket');
    } else {
      console.log('✅ episode-audio bucket already exists');
    }
  } catch (error) {
    console.error('❌ Bucket initialization error:', error);
    throw error;
  }
}

/**
 * Generate audio using ElevenLabs API
 */
async function generateAudio(
  text: string, 
  voiceId: string,
  emotion: string = 'default'
): Promise<Buffer> {
  const settings = emotionSettings[emotion] || emotionSettings.default;
  
  console.log(`  🎤 Generating: "${text.substring(0, 50)}..." (${emotion})`);
  
  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY!,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: settings.stability,
        similarity_boost: 0.75,
        style: settings.style,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`  ✅ Generated ${audioBuffer.length} bytes`);
  return audioBuffer;
}

/**
 * Upload audio to Supabase Storage
 */
async function uploadAudio(
  audioBuffer: Buffer,
  contentKey: string,
  episodeNumber: number
): Promise<string> {
  const filename = `episode-${episodeNumber}/${contentKey}.mp3`;
  
  console.log(`  📤 Uploading: ${filename}`);
  
  const { data, error } = await supabaseAdmin.storage
    .from(AUDIO_BUCKET)
    .upload(filename, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload error: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(AUDIO_BUCKET)
    .getPublicUrl(filename);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL');
  }

  return urlData.publicUrl;
}

/**
 * Save audio metadata to database
 */
async function saveAudioToDB(
  contentKey: string,
  characterId: string,
  textContent: string,
  audioUrl: string,
  emotion: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('pre_generated_audio')
    .upsert({
      content_key: contentKey,
      content_type: 'scene_dialogue',
      character_id: characterId,
      text_content: textContent,
      audio_url: audioUrl,
      emotion,
    }, {
      onConflict: 'content_key',
    });

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }
  console.log(`  💾 Saved to database`);
}

/**
 * Check if audio already exists
 */
async function audioExists(contentKey: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('pre_generated_audio')
    .select('id')
    .eq('content_key', contentKey)
    .single();
  
  return !!data;
}

/**
 * Fetch episodes from database
 */
async function fetchEpisodes(episodeNumber?: number): Promise<{ episodes: Episode[]; characterId: string }> {
  console.log('📚 Fetching episodes from database...');
  
  // First get the story arc to get character_id
  const { data: arcData, error: arcError } = await supabaseAdmin
    .from('story_arcs')
    .select('id, character_id')
    .eq('character_id', 'florencia')
    .single();
  
  if (arcError || !arcData) {
    throw new Error(`Failed to fetch story arc: ${arcError?.message}`);
  }
  
  // Now fetch episodes
  let query = supabaseAdmin
    .from('episodes')
    .select('id, episode_number, title_es, title_en, scenes, story_arc_id')
    .eq('story_arc_id', arcData.id)
    .order('episode_number');
  
  if (episodeNumber) {
    query = query.eq('episode_number', episodeNumber);
  }
  
  const { data: episodes, error: episodesError } = await query;
  
  if (episodesError) {
    throw new Error(`Failed to fetch episodes: ${episodesError.message}`);
  }
  
  if (!episodes || episodes.length === 0) {
    throw new Error('No episodes found');
  }
  
  console.log(`✅ Found ${episodes.length} episode(s)`);
  
  return { 
    episodes: episodes as Episode[], 
    characterId: arcData.character_id 
  };
}

/**
 * Main function to generate episode audio
 */
async function generateEpisodeAudio(episodeNumber?: number): Promise<void> {
  console.log('🚀 Starting episode audio generation...\n');

  // Initialize bucket
  await initializeBucket();
  console.log('');

  // Fetch episodes from database
  const { episodes, characterId } = await fetchEpisodes(episodeNumber);
  
  console.log(`\n📖 Processing ${episodes.length} episode(s) for character: ${characterId}\n`);

  const voiceId = getVoiceIdForCharacter(characterId);
  
  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalCost = 0;

  for (const episode of episodes) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📖 Episode ${episode.episode_number}: ${episode.title_en}`);
    console.log(`   (${episode.title_es})`);
    
    const scenes = episode.scenes || [];
    console.log(`   Scenes to process: ${scenes.length}`);

    for (const scene of scenes) {
      if (!scene.audio_key || !scene.florencia_says) {
        console.log(`   ⏭️ Skipping scene without audio_key or dialogue`);
        continue;
      }

      // Check if already generated
      if (await audioExists(scene.audio_key)) {
        console.log(`   ⏭️ ${scene.audio_key} already exists`);
        totalSkipped++;
        continue;
      }

      try {
        // Generate audio
        const audioBuffer = await generateAudio(
          scene.florencia_says,
          voiceId,
          scene.emotion
        );

        // Estimate cost (ElevenLabs charges ~$0.30 per 1000 characters)
        const estimatedCost = (scene.florencia_says.length / 1000) * 0.30;
        totalCost += estimatedCost;

        // Upload
        const audioUrl = await uploadAudio(
          audioBuffer,
          scene.audio_key,
          episode.episode_number
        );

        // Save to database
        await saveAudioToDB(
          scene.audio_key,
          characterId,
          scene.florencia_says,
          audioUrl,
          scene.emotion
        );

        totalGenerated++;

        // Rate limiting delay (to avoid hitting API limits)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`   ❌ Error processing ${scene.audio_key}:`, error);
        totalErrors++;
      }
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n✅ Audio generation complete!`);
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Generated: ${totalGenerated} audio clips`);
  console.log(`   ⏭️ Skipped (existing): ${totalSkipped}`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log(`   💰 Estimated cost: ~$${totalCost.toFixed(2)}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
let episodeNumber: number | undefined;

if (args.includes('--episode')) {
  const idx = args.indexOf('--episode');
  episodeNumber = parseInt(args[idx + 1], 10);
  if (isNaN(episodeNumber)) {
    console.error('❌ Invalid episode number');
    process.exit(1);
  }
}

if (args.includes('--help')) {
  console.log(`
Episode Audio Generator

Usage:
  npx ts-node scripts/generate-episode-audio.ts [options]

Options:
  --episode <number>  Generate audio for specific episode only
  --help              Show this help message

Examples:
  npx ts-node scripts/generate-episode-audio.ts          # Generate all episodes
  npx ts-node scripts/generate-episode-audio.ts --episode 1  # Episode 1 only
  `);
  process.exit(0);
}

// Run
generateEpisodeAudio(episodeNumber)
  .then(() => {
    console.log('\n🎉 Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
