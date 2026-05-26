/**
 * Generates and uploads pre-stored Florencia greeting audio for each episode's
 * conversational task. Running this script once eliminates OpenAI + ElevenLabs
 * costs on every conversation start — audio is stored in the public episode-audio
 * bucket with permanent URLs.
 *
 * Run from the backend directory:
 *   npx ts-node scripts/generate-episode-conversation-greetings.ts
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

// ============================================
// Episode-specific greeting texts
// Each greeting:
//  - Is in Florencia's warm Argentine voice (vos, che)
//  - References the episode location and theme
//  - Naturally uses the episode's grammar focus (subjunctive)
//  - Ends with a question to open the conversation
// ============================================
const EPISODE_GREETINGS: Record<number, { text: string; emotion: string }> = {
  1: {
    text: '¡Che, qué bueno que hayas escrito sobre el Café Tortoni! Es que ese lugar tiene una historia increíble, ¿no? Quiero que me cuentes qué fue lo que más te llamó la atención cuando escribiste sobre él.',
    emotion: 'warm_welcome',
  },
  2: {
    text: '¡Hola! Me alegra tanto que hayas podido capturar la energía de esa noche en el Marabú. El tango tiene algo que te emociona cada vez que lo sentís. ¿Qué querés que conversemos sobre lo que escribiste?',
    emotion: 'enthusiastic',
  },
  3: {
    text: '¡Buenas! Dudo que haya sido pura casualidad que ese disco de Di Sarli te llamara la atención en San Telmo. Tu texto me hizo pensar mucho. ¿Creés que fue suerte o algo más que te atrajo hacia él?',
    emotion: 'curious',
  },
  4: {
    text: '¡Che, me encanta que hayas escrito sobre el asado! Ese momento del mate fue muy especial — me alegra que lo hayas sentido así también. ¿Qué fue lo más difícil de describir en español?',
    emotion: 'warm',
  },
  5: {
    text: 'Tu texto sobre la Chacarita me llegó al corazón, de verdad. Si hubiera sabido que ese lugar te iba a afectar tanto, habríamos pasado más tiempo entre los murales. ¿Hay algo que desearías haber hecho diferente ese día?',
    emotion: 'reflective',
  },
  6: {
    text: '¡Hola! El Teatro Colón es otro mundo, ¿verdad? Me encantó cómo reflexionaste sobre los artistas y las ilusiones. Si pudieras volver ahora mismo, ¿a qué parte del teatro irías primero?',
    emotion: 'impressed',
  },
  7: {
    text: '¡Buenas! Esas casas de colores de La Boca tienen algo que te atrapa, ¿no? Tu reflexión sobre la belleza que nace del sacrificio me pareció muy profunda. Si pudieras vivir en ese barrio, ¿lo elegirías?',
    emotion: 'passionate',
  },
  8: {
    text: 'Che... llegamos al final de nuestro viaje por Buenos Aires. Aunque no me guste que se acabe tan rápido, estoy muy orgullosa de todo lo que hemos compartido. ¿Qué es lo que más vas a recordar de estas semanas?',
    emotion: 'sad_nostalgic',
  },
};

// Emotion → ElevenLabs voice settings
const emotionSettings: Record<string, { stability: number; style: number }> = {
  warm_welcome:  { stability: 0.5, style: 0.6 },
  enthusiastic:  { stability: 0.3, style: 0.8 },
  curious:       { stability: 0.5, style: 0.5 },
  warm:          { stability: 0.5, style: 0.5 },
  reflective:    { stability: 0.6, style: 0.4 },
  impressed:     { stability: 0.4, style: 0.6 },
  passionate:    { stability: 0.3, style: 0.8 },
  sad_nostalgic: { stability: 0.7, style: 0.3 },
};

async function generateAudio(text: string, voiceId: string, emotion: string): Promise<Buffer> {
  const settings = emotionSettings[emotion] || { stability: 0.5, style: 0.5 };

  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
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
    throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function uploadAudio(buffer: Buffer, episodeNumber: number): Promise<string> {
  const path = `florencia-greetings/ep${episodeNumber}-conv-greeting.mp3`;

  const { error } = await supabaseAdmin.storage
    .from(AUDIO_BUCKET)
    .upload(path, buffer, { contentType: 'audio/mpeg', upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabaseAdmin.storage.from(AUDIO_BUCKET).getPublicUrl(path);
  if (!urlData?.publicUrl) throw new Error('Could not get public URL after upload');
  return urlData.publicUrl;
}

async function saveToDatabase(
  episodeNumber: number,
  text: string,
  audioUrl: string,
  emotion: string
): Promise<void> {
  const contentKey = `ep${episodeNumber}_florencia_conv_greeting`;

  const { error } = await supabaseAdmin.from('pre_generated_audio').upsert(
    {
      content_key: contentKey,
      content_type: 'florencia_conv_greeting',
      character_id: 'florencia',
      text_content: text,
      audio_url: audioUrl,
      emotion,
    },
    { onConflict: 'content_key' }
  );

  if (error) throw new Error(`Database upsert failed: ${error.message}`);
}

async function main(): Promise<void> {
  console.log('🎙️  Generating episode conversation greetings for Florencia\n');

  const voiceId = getVoiceIdForCharacter('florencia');
  if (!voiceId) {
    console.error('❌ Florencia voice ID not configured (ELEVENLABS_VOICE_ID_ARGENTINA or ELEVENLABS_VOICE_ID)');
    process.exit(1);
  }

  const episodes = Object.keys(EPISODE_GREETINGS).map(Number).sort((a, b) => a - b);
  let totalCost = 0;

  for (const epNum of episodes) {
    const { text, emotion } = EPISODE_GREETINGS[epNum];
    console.log(`\n📝 Episode ${epNum}:`);
    console.log(`   "${text.substring(0, 70)}..."`);

    try {
      console.log('   🎤 Generating audio via ElevenLabs…');
      const audioBuffer = await generateAudio(text, voiceId, emotion);
      const estimatedCost = (text.length / 1000) * 0.3;
      totalCost += estimatedCost;
      console.log(`   ✅ Audio: ${audioBuffer.length} bytes  (~$${estimatedCost.toFixed(3)})`);

      console.log('   📤 Uploading to Supabase episode-audio bucket…');
      const publicUrl = await uploadAudio(audioBuffer, epNum);
      console.log(`   ✅ URL: ${publicUrl}`);

      console.log('   💾 Saving to pre_generated_audio table…');
      await saveToDatabase(epNum, text, publicUrl, emotion);
      console.log('   ✅ Saved');

      // Small delay to respect ElevenLabs rate limits
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (err) {
      console.error(`   ❌ Failed for episode ${epNum}:`, err);
      throw err;
    }
  }

  console.log(`\n\n✅ All ${episodes.length} episode greetings generated and stored!`);
  console.log(`💰 Estimated ElevenLabs cost: ~$${totalCost.toFixed(2)}`);
  console.log('\nThe backend will now serve these pre-stored greetings on conversation start.');
  console.log('No OpenAI or ElevenLabs API calls will be made for the initial greeting.');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Script failed:', err);
    process.exit(1);
  });
