// API Configuration
// Dev: Use Mac's LAN IP so physical iOS/Android devices on the same Wi-Fi can reach it.
// `localhost` here would resolve to the device itself, not your dev machine.
const DEV_HOST = '192.168.0.12';

export const API_URL = __DEV__
  ? `http://${DEV_HOST}:3001/api/v1`
  : 'https://spanish-lab-api.onrender.com/api/v1';

export const WS_URL = __DEV__
  ? `ws://${DEV_HOST}:3001/ws`
  : 'wss://spanish-lab-api.onrender.com/ws';

// Supabase Configuration
export const SUPABASE_URL = 'https://bqlnhmsskcnbinexmnra.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbG5obXNza2NuYmluZXhtbnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODA1OTcsImV4cCI6MjA4MDM1NjU5N30.zx-Dznwg2SVQIBVI7lZn7hGTOvD70B-Rm6tZPgN681g';

// App Configuration
export const APP_NAME = 'Spanish Lab';

// Spanish Levels
export const SPANISH_LEVELS = [
  { value: 'A1', label: 'A1 - Beginner', description: 'Can understand basic phrases' },
  { value: 'A2', label: 'A2 - Elementary', description: 'Can communicate in simple tasks' },
  { value: 'B1', label: 'B1 - Intermediate', description: 'Can handle most travel situations' },
  { value: 'B2', label: 'B2 - Upper Intermediate', description: 'Can interact with fluency' },
  { value: 'C1', label: 'C1 - Advanced', description: 'Can express ideas fluently' },
  { value: 'C2', label: 'C2 - Mastery', description: 'Near-native proficiency' },
] as const;

// Conversation Modes
export const CONVERSATION_MODES = [
  {
    id: 'open',
    title: 'Open Chat',
    subtitle: 'Conversación Abierta',
    description: 'Free-form conversation on any topic',
    icon: 'chatbubbles',
    color: '#4ECDC4',
  },
  {
    id: 'topic',
    title: 'Topic Focus',
    subtitle: 'Tema Específico',
    description: 'Discuss a specific topic in depth',
    icon: 'compass',
    color: '#FF6B6B',
  },
  {
    id: 'vocabulary',
    title: 'Vocabulary',
    subtitle: 'Vocabulario',
    description: 'Practice specific vocabulary sets',
    icon: 'book',
    color: '#45B7D1',
  },
  {
    id: 'grammar',
    title: 'Grammar',
    subtitle: 'Gramática',
    description: 'Focus on specific grammar rules',
    icon: 'school',
    color: '#96CEB4',
  },
  {
    id: 'roleplay',
    title: 'Role Play',
    subtitle: 'Juego de Rol',
    description: 'Practice with different personas',
    icon: 'people',
    color: '#DDA0DD',
  },
] as const;

// Grammar Practice Options for Speak page
// unlockAfterEpisode: the option becomes available when current_episode > this value
export const GRAMMAR_PRACTICE_OPTIONS = [
  {
    id: 'present_subjunctive',
    title: 'Present Tense Subjunctive',
    subtitle: 'Presente de Subjuntivo',
    description: 'Practice forming and using the present subjunctive',
    grammarFocus: 'Present Tense Subjunctive (Presente de Subjuntivo)',
    unlockAfterEpisode: 1,
  },
  {
    id: 'present_perfect_subjunctive',
    title: 'Present Perfect Subjunctive',
    subtitle: 'Pretérito Perfecto de Subjuntivo',
    description: 'Practice the present perfect subjunctive',
    grammarFocus: 'Present Perfect Subjunctive (Pretérito Perfecto de Subjuntivo)',
    unlockAfterEpisode: 3,
  },
  {
    id: 'pluperfect_subjunctive',
    title: 'Pluperfect Subjunctive',
    subtitle: 'Pluscuamperfecto de Subjuntivo',
    description: 'Practice the pluperfect subjunctive',
    grammarFocus: 'Pluperfect Subjunctive (Pluscuamperfecto de Subjuntivo)',
    unlockAfterEpisode: 5,
  },
  {
    id: 'imperfect_subjunctive',
    title: 'Imperfect Subjunctive',
    subtitle: 'Imperfecto de Subjuntivo',
    description: 'Practice the imperfect subjunctive',
    grammarFocus: 'Imperfect Subjunctive (Imperfecto de Subjuntivo)',
    unlockAfterEpisode: 6,
  },
  {
    id: 'all_subjunctive',
    title: 'All Subjunctive Forms',
    subtitle: 'Todas las Formas del Subjuntivo',
    description: 'Comprehensive practice across all subjunctive tenses',
    grammarFocus: 'All Subjunctive Forms - comprehensive review',
    unlockAfterEpisode: 8,
  },
] as const;

// Default Topics
export const DEFAULT_TOPICS = [
  { id: 'sports', name: 'Deportes', icon: '⚽', color: '#4CAF50' },
  { id: 'philosophy', name: 'Filosofía', icon: '🤔', color: '#9C27B0' },
  { id: 'cafes', name: 'Cafés', icon: '☕', color: '#795548' },
  { id: 'dating', name: 'Citas', icon: '❤️', color: '#E91E63' },
  { id: 'restaurants', name: 'Restaurantes', icon: '🍽️', color: '#FF9800' },
  { id: 'travel', name: 'Viajes', icon: '✈️', color: '#2196F3' },
  { id: 'work', name: 'Trabajo', icon: '💼', color: '#607D8B' },
  { id: 'culture', name: 'Cultura', icon: '🎭', color: '#FF5722' },
  { id: 'news', name: 'Actualidad', icon: '📰', color: '#3F51B5' },
  { id: 'daily', name: 'Vida Cotidiana', icon: '🏠', color: '#00BCD4' },
] as const;

// Grammar Rules by Level
export const GRAMMAR_RULES = {
  A1: [
    'Present tense (regular)',
    'Gender and articles',
    'Ser vs Estar (basic)',
    'Numbers and time',
  ],
  A2: [
    'Present tense (irregular)',
    'Reflexive verbs',
    'Preterite tense',
    'Imperfect tense',
  ],
  B1: [
    'Present subjunctive',
    'Commands (imperative)',
    'Future tense',
    'Conditional tense',
  ],
  B2: [
    'Imperfect subjunctive',
    'Perfect subjunctive',
    'Conditional perfect',
    'Passive voice',
  ],
  C1: [
    'Pluperfect subjunctive',
    'Future perfect',
    'Advanced conditionals',
    'Literary tenses',
  ],
  C2: [
    'All tenses mastery',
    'Stylistic nuances',
    'Regional variations',
  ],
} as const;

// Default Role-Play Personas
export const DEFAULT_PERSONAS = [
  {
    id: 'teacher',
    name: 'Profesora Carmen',
    description: 'A patient Spanish teacher',
    avatar: '👩‍🏫',
  },
  {
    id: 'friend',
    name: 'Tu Amigo Miguel',
    description: 'A casual friend for everyday chat',
    avatar: '👋',
  },
  {
    id: 'romantic',
    name: 'Tu Pareja',
    description: 'Practice romantic expressions',
    avatar: '💕',
  },
  {
    id: 'grandparent',
    name: 'Abuela Rosa',
    description: 'A wise grandmother with stories',
    avatar: '👵',
  },
  {
    id: 'business',
    name: 'Sr. García',
    description: 'Professional business contact',
    avatar: '👔',
  },
] as const;

// Voice Activity Detection settings
export const VAD_CONFIG = {
  silenceThreshold: 1500, // ms of silence to end recording
  minRecordingLength: 500, // ms minimum recording length
  maxRecordingLength: 60000, // ms maximum recording (1 minute)
} as const;

// Correction Depth Options
export const CORRECTION_DEPTHS = [
  { value: 'light', label: 'Light', description: 'Only major errors' },
  { value: 'standard', label: 'Standard', description: 'Important corrections with explanations' },
  { value: 'deep', label: 'Deep', description: 'Detailed corrections with examples' },
] as const;

// Accent Preferences
export const ACCENT_OPTIONS = [
  { value: 'mexico', label: 'Mexican Spanish', flag: '🇲🇽' },
  { value: 'spain', label: 'Castilian Spanish', flag: '🇪🇸' },
  { value: 'argentina', label: 'Argentine Spanish', flag: '🇦🇷' },
  { value: 'colombia', label: 'Colombian Spanish', flag: '🇨🇴' },
] as const;

// Tutor Characters - Each has a unique voice and personality
// These correspond to different ElevenLabs voices for different Spanish accents
export const TUTOR_CHARACTERS = [
  {
    id: 'florencia',
    name: 'Florencia',
    accent: 'argentina',
    country: 'Argentina',
    flag: '🇦🇷',
    avatar: '👩‍🦱',
    description: 'A warm porteña from Buenos Aires',
    shortDescription: 'Rioplatense accent',
    personality: 'Passionate and expressive, uses vos',
    samplePhrases: ['¡Che, qué bueno verte!', '¿Cómo andás?'],
    color: '#75AADB', // Light blue (Argentina flag)
  },
  {
    id: 'ana_maria',
    name: 'Ana María',
    accent: 'mexico',
    country: 'Mexico',
    flag: '🇲🇽',
    avatar: '👩‍🦰',
    description: 'A friendly chilanga from Mexico City',
    shortDescription: 'Mexican accent',
    personality: 'Warm and patient, very clear pronunciation',
    samplePhrases: ['¡Órale, qué onda!', '¿Qué tal, amiga?'],
    color: '#006847', // Green (Mexico flag)
  },
  {
    id: 'marcela',
    name: 'Marcela',
    accent: 'colombia',
    country: 'Colombia',
    flag: '🇨🇴',
    avatar: '👩‍💼',
    description: 'A cheerful paisa from Medellín',
    shortDescription: 'Colombian accent',
    personality: 'Upbeat and encouraging, very friendly',
    samplePhrases: ['¡Quiubo, parcera!', '¿Qué más, amiga?'],
    color: '#FCD116', // Yellow (Colombia flag)
  },
] as const;

// Type for tutor character
export type TutorCharacter = typeof TUTOR_CHARACTERS[number];

// Get the default tutor character
export const DEFAULT_TUTOR_ID = 'florencia';

// Helper to get tutor by ID
export const getTutorById = (id: string): TutorCharacter | undefined => {
  return TUTOR_CHARACTERS.find(t => t.id === id);
};

