/**
 * Script to generate and upload tutor greeting audio files
 * Run with: npx ts-node scripts/generate-greetings.ts
 */

import dotenv from 'dotenv';
import { supabaseAdmin } from '../src/config/supabase';
import { getTutorCharacter, getVoiceIdForCharacter } from '../src/config/voices';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
  process.exit(1);
}

// Greeting texts for each character (matching conversation.ts)
const GREETINGS: Record<string, string[]> = {
  florencia: [
    '¡Hola! Soy Florencia, de Buenos Aires. ¿Cómo andás? Contame algo de vos.',
    '¡Che, qué bueno conocerte! Soy Florencia. ¿Qué querés practicar hoy?',
    '¡Hola! Acá Florencia, lista para charlar. ¿Arrancamos?',
  ],
  ana_maria: [
    '¡Hola! Soy Ana María, de Oaxaca. ¡Qué gusto conocerte! ¿Cómo estás?',
    '¡Ay, qué padre! Soy Ana María. ¿Ya comiste? Bueno, vamos a practicar español.',
    '¡Hola, hola! Ana María aquí, lista para platicar. ¿Qué onda?',
  ],
  marcela: [
    '¡Quiubo! Soy Marcela, de Medellín. ¿Qué más, pues? ¡Vamos a hablar!',
    '¡Hola, parcero! Soy Marcela. ¡Qué chimba conocerte! ¿Listo para practicar?',
    '¡Ey! Marcela aquí, desde la Comuna 13. ¿Arrancamos pues?',
  ],
};

const GREETINGS_BUCKET = 'tutor-greetings';

/**
 * Initialize the tutor-greetings storage bucket
 */
async function initializeBucket(): Promise<void> {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === GREETINGS_BUCKET);

    if (!bucketExists) {
      const { error } = await supabaseAdmin.storage.createBucket(GREETINGS_BUCKET, {
        public: true, // Public bucket so anyone can access greeting audio
        fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
        allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
      });

      if (error) {
        console.error('❌ Failed to create bucket:', error);
        throw error;
      }
      console.log('✅ Created tutor-greetings bucket');
    } else {
      console.log('✅ tutor-greetings bucket already exists');
    }
  } catch (error) {
    console.error('❌ Bucket initialization error:', error);
    throw error;
  }
}

/**
 * Generate audio using ElevenLabs API
 */
async function generateAudio(text: string, voiceId: string): Promise<Buffer> {
  console.log(`  🎤 Generating audio for: "${text.substring(0, 50)}..."`);
  
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
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
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
  characterId: string,
  greetingIndex: number
): Promise<string> {
  const filename = `${characterId}/greeting-${greetingIndex}.mp3`;
  
  console.log(`  📤 Uploading to: ${filename}`);
  
  const { data, error } = await supabaseAdmin.storage
    .from(GREETINGS_BUCKET)
    .upload(filename, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    throw new Error(`Upload error: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from(GREETINGS_BUCKET)
    .getPublicUrl(filename);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL');
  }

  console.log(`  ✅ Uploaded: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

/**
 * Save greeting metadata to database
 */
async function saveGreetingToDB(
  characterId: string,
  greetingIndex: number,
  greetingText: string,
  audioUrl: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('tutor_greetings')
    .upsert({
      character_id: characterId,
      greeting_index: greetingIndex,
      greeting_text: greetingText,
      audio_url: audioUrl,
    }, {
      onConflict: 'character_id,greeting_index',
    });

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }
  console.log(`  💾 Saved to database`);
}

/**
 * Main function to generate and upload all greetings
 */
async function generateAllGreetings(): Promise<void> {
  console.log('🚀 Starting greeting generation...\n');

  // Initialize bucket
  await initializeBucket();
  console.log('');

  const characters = ['florencia', 'ana_maria', 'marcela'];
  let totalCost = 0;

  for (const characterId of characters) {
    const character = getTutorCharacter(characterId);
    if (!character) {
      console.error(`❌ Character not found: ${characterId}`);
      continue;
    }

    console.log(`\n📝 Processing ${character.name} (${characterId})...`);
    const voiceId = getVoiceIdForCharacter(characterId);
    const greetings = GREETINGS[characterId] || [];

    for (let i = 0; i < greetings.length; i++) {
      const greetingText = greetings[i];
      console.log(`\n  Greeting ${i + 1}/${greetings.length}:`);

      try {
        // Generate audio
        const audioBuffer = await generateAudio(greetingText, voiceId);
        
        // Estimate cost (roughly $0.30 per 1000 characters)
        const estimatedCost = (greetingText.length / 1000) * 0.30;
        totalCost += estimatedCost;

        // Upload to Supabase
        const audioUrl = await uploadAudio(audioBuffer, characterId, i);

        // Save to database
        await saveGreetingToDB(characterId, i, greetingText, audioUrl);

        console.log(`  ✅ Completed greeting ${i + 1} for ${character.name}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`  ❌ Error processing greeting ${i + 1}:`, error);
        throw error;
      }
    }
  }

  console.log(`\n\n✅ All greetings generated and uploaded!`);
  console.log(`💰 Estimated ElevenLabs cost: ~$${totalCost.toFixed(2)}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Characters: ${characters.length}`);
  console.log(`   - Greetings per character: 3`);
  console.log(`   - Total greetings: ${characters.length * 3}`);
}

// Run the script
generateAllGreetings()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

