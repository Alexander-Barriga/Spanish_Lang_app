import dotenv from 'dotenv';

dotenv.config();

// Tutor character types
export interface TutorCharacter {
  id: string;
  name: string;
  accent: string;
  country: string;
  flag: string;
  description: string;
  personality: string;
  voiceId: string;
}

// Voice IDs from environment variables
// These map to ElevenLabs voice IDs for different Spanish accents
const VOICE_IDS = {
  argentina: process.env.ELEVENLABS_VOICE_ID_ARGENTINA || process.env.ELEVENLABS_VOICE_ID || '',
  mexico: process.env.ELEVENLABS_VOICE_ID_MEXICO || 'DUMMY_MEXICO_VOICE_ID',
  colombia: process.env.ELEVENLABS_VOICE_ID_COLOMBIA || 'DUMMY_COLOMBIA_VOICE_ID',
};

// Available tutor characters with different Spanish accents
export const tutorCharacters: TutorCharacter[] = [
  {
    id: 'malena',
    name: 'Malena',
    accent: 'argentina',
    country: 'Argentina',
    flag: '🇦🇷',
    description: 'A warm porteña from Buenos Aires with the melodic Rioplatense accent',
    personality: 'Passionate, expressive, uses vos and typical Argentine expressions like "che" and "boludo"',
    voiceId: VOICE_IDS.argentina,
  },
  {
    id: 'ana_maria',
    name: 'Ana María',
    accent: 'mexico',
    country: 'Mexico',
    flag: '🇲🇽',
    description: 'A friendly chilanga from Mexico City with clear, neutral pronunciation',
    personality: 'Warm, patient, uses Mexican slang like "órale" and "qué onda"',
    voiceId: VOICE_IDS.mexico,
  },
  {
    id: 'marcela',
    name: 'Marcela',
    accent: 'colombia',
    country: 'Colombia',
    flag: '🇨🇴',
    description: 'A cheerful paisa from Medellín with a friendly, clear accent',
    personality: 'Upbeat, encouraging, uses Colombian expressions like "parcera" and "qué más"',
    voiceId: VOICE_IDS.colombia,
  },
];

// Get a tutor character by ID
export function getTutorCharacter(characterId: string): TutorCharacter | undefined {
  return tutorCharacters.find(c => c.id === characterId);
}

// Get a tutor character by accent
export function getTutorByAccent(accent: string): TutorCharacter | undefined {
  return tutorCharacters.find(c => c.accent === accent);
}

// Get the default tutor character
export function getDefaultTutor(): TutorCharacter {
  return tutorCharacters[0]; // Malena (Argentina) is the default
}

// Get voice ID for a character
export function getVoiceIdForCharacter(characterId: string): string {
  const character = getTutorCharacter(characterId);
  if (character) {
    return character.voiceId;
  }
  // Fallback to default
  return getDefaultTutor().voiceId;
}

// Get voice ID for an accent
export function getVoiceIdForAccent(accent: string): string {
  const character = getTutorByAccent(accent);
  if (character) {
    return character.voiceId;
  }
  // Fallback to default
  return getDefaultTutor().voiceId;
}

// Export voice IDs for direct access if needed
export { VOICE_IDS };

