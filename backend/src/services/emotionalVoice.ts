/**
 * Emotional Voice Service
 * 
 * Maps AI-detected emotions to ElevenLabs voice parameters
 * for human-like emotional speech synthesis.
 * 
 * Uses 27 distinct emotions across the emotional spectrum:
 * - Positive emotions (content → ecstatic)
 * - Encouraging emotions (reassuring → nurturing)
 * - Contemplative emotions (thoughtful → stern)
 * - Surprise emotions (curious → shocked)
 */

// ============================================
// EMOTION TYPE DEFINITIONS
// ============================================

/**
 * 27 distinct emotion types organized by category and intensity
 */
export type EmotionType =
  // Positive Emotions (mild → extreme)
  | 'content'        // Mild satisfaction, at peace
  | 'pleased'        // Light happiness, approval
  | 'happy'          // Standard happiness
  | 'joyful'         // Strong happiness, delight
  | 'excited'        // High energy, enthusiasm
  | 'ecstatic'       // Extreme joy, overwhelming happiness
  | 'proud'          // Sense of achievement, satisfaction
  | 'amused'         // Finding something funny, entertained
  | 'playful'        // Lighthearted, teasing, fun
  
  // Encouraging/Supportive Emotions (mild → strong)
  | 'reassuring'     // Gentle comfort, calming
  | 'encouraging'    // Supportive, motivating
  | 'enthusiastic'   // Very supportive, energetic motivation
  | 'empathetic'     // Understanding, relating to feelings
  | 'compassionate'  // Deep caring, emotional connection
  | 'nurturing'      // Warm guidance, protective care
  
  // Contemplative/Serious Emotions (mild → strong)
  | 'thoughtful'     // Reflective, considering
  | 'curious'        // Interested, inquisitive
  | 'concerned'      // Mild worry, attentive
  | 'worried'        // More anxious, troubled
  | 'disappointed'   // Mild letdown, sadness
  | 'frustrated'     // Annoyance, exasperation
  | 'stern'          // Firm, serious, authoritative
  
  // Surprise Emotions (mild → extreme)
  | 'intrigued'      // Curious interest, fascinated
  | 'surprised'      // Mild surprise, unexpected
  | 'amazed'         // Strong surprise, impressed
  | 'astonished'     // Very surprised, incredulous
  | 'shocked';       // Extreme surprise, disbelief

/**
 * Emotion data structure returned by AI
 */
export interface EmotionData {
  type: EmotionType;
  intensity: number; // 0.0 to 1.0
}

/**
 * ElevenLabs voice settings interface
 */
export interface ElevenLabsVoiceSettings {
  stability: number;        // 0-1: Lower = more variable/emotional
  similarity_boost: number; // 0-1: How closely to match the original voice
  style: number;            // 0-1: Higher = more exaggerated/expressive
  use_speaker_boost: boolean;
}

// ============================================
// EMOTION CATEGORIES FOR PROMPTING
// ============================================

/**
 * Emotion categories with their types for use in AI prompts
 */
export const EMOTION_CATEGORIES = {
  positive: ['content', 'pleased', 'happy', 'joyful', 'excited', 'ecstatic', 'proud', 'amused', 'playful'],
  encouraging: ['reassuring', 'encouraging', 'enthusiastic', 'empathetic', 'compassionate', 'nurturing'],
  contemplative: ['thoughtful', 'curious', 'concerned', 'worried', 'disappointed', 'frustrated', 'stern'],
  surprise: ['intrigued', 'surprised', 'amazed', 'astonished', 'shocked'],
} as const;

/**
 * All emotion types as an array (for validation)
 */
export const ALL_EMOTIONS: EmotionType[] = [
  ...EMOTION_CATEGORIES.positive,
  ...EMOTION_CATEGORIES.encouraging,
  ...EMOTION_CATEGORIES.contemplative,
  ...EMOTION_CATEGORIES.surprise,
] as EmotionType[];

// ============================================
// VOICE SETTINGS MAPPING
// ============================================

/**
 * Voice parameter profiles for each emotion
 * 
 * Parameters explained:
 * - stability: Lower = more pitch variation (emotional), Higher = monotone
 * - similarity_boost: How much to preserve original voice character
 * - style: Higher = more dramatic expression, Lower = subtle
 */
const EMOTION_VOICE_PROFILES: Record<EmotionType, Partial<ElevenLabsVoiceSettings>> = {
  // ========== POSITIVE EMOTIONS ==========
  content: {
    stability: 0.65,    // Calm, steady
    style: 0.4,         // Subtle warmth
  },
  pleased: {
    stability: 0.55,
    style: 0.5,
  },
  happy: {
    stability: 0.45,
    style: 0.6,
  },
  joyful: {
    stability: 0.35,    // More variation
    style: 0.75,        // Expressive
  },
  excited: {
    stability: 0.25,    // High variation
    style: 0.85,        // Very expressive
  },
  ecstatic: {
    stability: 0.15,    // Maximum variation
    style: 0.95,        // Extremely expressive
  },
  proud: {
    stability: 0.4,
    style: 0.7,         // Warm and confident
  },
  amused: {
    stability: 0.35,    // Lighthearted variation
    style: 0.65,
  },
  playful: {
    stability: 0.3,     // Fun, bouncy
    style: 0.75,
  },
  
  // ========== ENCOURAGING EMOTIONS ==========
  reassuring: {
    stability: 0.7,     // Stable, calming
    style: 0.5,         // Gentle warmth
  },
  encouraging: {
    stability: 0.5,
    style: 0.65,        // Warm and supportive
  },
  enthusiastic: {
    stability: 0.3,     // Energetic
    style: 0.8,         // Very encouraging
  },
  empathetic: {
    stability: 0.6,     // Soft, understanding
    style: 0.6,
  },
  compassionate: {
    stability: 0.65,    // Tender
    style: 0.55,        // Gentle expression
  },
  nurturing: {
    stability: 0.7,     // Warm, steady
    style: 0.5,         // Soft guidance
  },
  
  // ========== CONTEMPLATIVE/SERIOUS ==========
  thoughtful: {
    stability: 0.7,     // Measured, deliberate
    style: 0.4,
  },
  curious: {
    stability: 0.5,     // Slight uptick
    style: 0.55,
  },
  concerned: {
    stability: 0.6,
    style: 0.5,
  },
  worried: {
    stability: 0.5,     // More anxious variation
    style: 0.6,
  },
  disappointed: {
    stability: 0.65,    // Subdued
    style: 0.45,        // Less energy
  },
  frustrated: {
    stability: 0.35,    // Tense variation
    style: 0.65,
  },
  stern: {
    stability: 0.75,    // Firm, controlled
    style: 0.55,        // Authoritative
  },
  
  // ========== SURPRISE EMOTIONS ==========
  intrigued: {
    stability: 0.45,
    style: 0.6,
  },
  surprised: {
    stability: 0.35,    // Reactive variation
    style: 0.7,
  },
  amazed: {
    stability: 0.25,    // Strong reaction
    style: 0.8,
  },
  astonished: {
    stability: 0.2,
    style: 0.85,
  },
  shocked: {
    stability: 0.15,    // Maximum reaction
    style: 0.9,
  },
};

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Default neutral voice settings
 */
export const DEFAULT_VOICE_SETTINGS: ElevenLabsVoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.5,
  use_speaker_boost: true,
};

/**
 * Get voice settings adjusted for the given emotion
 * 
 * @param emotion - The detected emotion data (optional)
 * @returns ElevenLabs voice settings tuned for the emotion
 */
export function getEmotionalVoiceSettings(
  emotion?: EmotionData
): ElevenLabsVoiceSettings {
  // Return default if no emotion provided
  if (!emotion) {
    return { ...DEFAULT_VOICE_SETTINGS };
  }
  
  const { type, intensity } = emotion;
  
  // Get the emotion-specific profile
  const emotionProfile = EMOTION_VOICE_PROFILES[type];
  
  if (!emotionProfile) {
    console.warn(`Unknown emotion type: ${type}, using defaults`);
    return { ...DEFAULT_VOICE_SETTINGS };
  }
  
  // Blend between default and emotion-specific values based on intensity
  return {
    stability: blendValue(
      DEFAULT_VOICE_SETTINGS.stability,
      emotionProfile.stability ?? DEFAULT_VOICE_SETTINGS.stability,
      intensity
    ),
    similarity_boost: DEFAULT_VOICE_SETTINGS.similarity_boost,
    style: blendValue(
      DEFAULT_VOICE_SETTINGS.style,
      emotionProfile.style ?? DEFAULT_VOICE_SETTINGS.style,
      intensity
    ),
    use_speaker_boost: true,
  };
}

/**
 * Blend between two values based on intensity
 * @param base - Starting value
 * @param target - Target value for full intensity
 * @param intensity - How much to blend (0-1)
 */
function blendValue(base: number, target: number, intensity: number): number {
  // Clamp intensity between 0 and 1
  const clampedIntensity = Math.max(0, Math.min(1, intensity));
  return base + (target - base) * clampedIntensity;
}

/**
 * Validate if a string is a valid emotion type
 */
export function isValidEmotionType(type: string): type is EmotionType {
  return ALL_EMOTIONS.includes(type as EmotionType);
}

/**
 * Parse emotion from AI response text
 * Format: [EMOTION: type|intensity]
 * 
 * @param text - The AI response text containing emotion tag
 * @returns Parsed emotion data or undefined
 */
export function parseEmotionFromText(text: string): EmotionData | undefined {
  const emotionRegex = /\[EMOTION:\s*(\w+)\|([0-9.]+)\]/i;
  const match = text.match(emotionRegex);
  
  if (match) {
    const type = match[1].toLowerCase();
    const intensity = parseFloat(match[2]);
    
    if (isValidEmotionType(type) && !isNaN(intensity)) {
      return {
        type,
        intensity: Math.max(0, Math.min(1, intensity)), // Clamp to 0-1
      };
    } else {
      console.warn(`Invalid emotion format: type=${type}, intensity=${intensity}`);
    }
  }
  
  return undefined;
}

/**
 * Remove emotion tags from text
 */
export function removeEmotionTags(text: string): string {
  return text.replace(/\[EMOTION:\s*\w+\|[0-9.]+\]/gi, '').trim();
}

/**
 * Get a human-readable description of an emotion
 */
export function getEmotionDescription(type: EmotionType): string {
  const descriptions: Record<EmotionType, string> = {
    // Positive
    content: 'satisfied and at peace',
    pleased: 'lightly happy, showing approval',
    happy: 'genuinely happy',
    joyful: 'very happy and delighted',
    excited: 'highly energetic and enthusiastic',
    ecstatic: 'overwhelmingly joyful',
    proud: 'showing pride and achievement',
    amused: 'finding something funny',
    playful: 'lighthearted and teasing',
    
    // Encouraging
    reassuring: 'gentle and comforting',
    encouraging: 'supportive and motivating',
    enthusiastic: 'very supportive with energy',
    empathetic: 'understanding and relating',
    compassionate: 'deeply caring',
    nurturing: 'warmly guiding',
    
    // Contemplative
    thoughtful: 'reflective and considering',
    curious: 'interested and inquisitive',
    concerned: 'mildly worried',
    worried: 'anxious and troubled',
    disappointed: 'let down but understanding',
    frustrated: 'annoyed but patient',
    stern: 'firm and serious',
    
    // Surprise
    intrigued: 'fascinated and curious',
    surprised: 'mildly caught off guard',
    amazed: 'strongly impressed',
    astonished: 'very surprised',
    shocked: 'extremely surprised',
  };
  
  return descriptions[type] || 'neutral';
}

/**
 * Generate the emotion instruction for AI prompts
 */
export function getEmotionPromptInstruction(): string {
  return `
=== EMOTIONAL RESPONSE SYSTEM ===

After EVERY response, you MUST add an emotion tag in this exact format:
[EMOTION: <emotion_type>|<intensity>]

Available emotion types (choose the one that BEST matches your response):

POSITIVE EMOTIONS (use when celebrating success, expressing joy):
- content (0.3-0.5): Mild satisfaction, peaceful
- pleased (0.4-0.6): Light happiness, approval  
- happy (0.5-0.7): Genuine happiness
- joyful (0.6-0.8): Strong happiness, delight
- excited (0.7-0.9): High energy enthusiasm
- ecstatic (0.8-1.0): Overwhelming joy
- proud (0.5-0.8): Achievement, satisfaction
- amused (0.4-0.7): Finding something funny
- playful (0.5-0.8): Lighthearted, teasing

ENCOURAGING EMOTIONS (use when supporting, comforting):
- reassuring (0.4-0.6): Gentle comfort, calming
- encouraging (0.5-0.7): Supportive, motivating
- enthusiastic (0.7-0.9): Very energetic support
- empathetic (0.5-0.7): Understanding feelings
- compassionate (0.6-0.8): Deep caring
- nurturing (0.5-0.7): Warm guidance

CONTEMPLATIVE EMOTIONS (use when thinking, concerned):
- thoughtful (0.3-0.5): Reflective, considering
- curious (0.4-0.6): Interested, inquisitive
- concerned (0.4-0.6): Mild worry
- worried (0.5-0.7): More anxious
- disappointed (0.4-0.6): Mild letdown
- frustrated (0.5-0.7): Annoyance (use sparingly)
- stern (0.5-0.7): Firm, serious

SURPRISE EMOTIONS (use when reacting to unexpected):
- intrigued (0.4-0.6): Fascinated
- surprised (0.5-0.7): Caught off guard
- amazed (0.6-0.8): Strongly impressed
- astonished (0.7-0.9): Very surprised
- shocked (0.8-1.0): Extreme surprise

INTENSITY GUIDE:
- 0.3-0.4: Subtle, barely noticeable
- 0.5-0.6: Moderate, clearly present
- 0.7-0.8: Strong, very noticeable
- 0.9-1.0: Intense, overwhelming

EXAMPLES:
- "¡Excelente trabajo! Has mejorado muchísimo. [EMOTION: proud|0.8]"
- "Hmm, déjame pensar en cómo explicarte esto mejor. [EMOTION: thoughtful|0.5]"
- "¡No te preocupes! Todos cometemos errores al aprender. [EMOTION: reassuring|0.6]"
- "¡Wow! ¡No me esperaba esa respuesta tan creativa! [EMOTION: amazed|0.75]"

IMPORTANT: Always place the emotion tag at the END of your response.
`;
}

