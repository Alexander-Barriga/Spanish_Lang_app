import { openai, SpanishLevel } from '../config/openai';
import { Conversation, Correction, User } from '../config/supabase';
import { 
  buildSystemPrompt, 
  getGreetingMessage, 
  ConversationMode, 
  CorrectionDepth,
  ModeContext 
} from '../prompts';
import { getCharacterPromptSection, getCharacterProfile } from '../prompts/characters';
import { 
  EmotionData, 
  parseEmotionFromText, 
  removeEmotionTags,
  getEmotionPromptInstruction 
} from './emotionalVoice';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GeneratedResponse {
  content: string;
  corrections: Correction[] | null;
  emotion?: EmotionData;
}

export class ConversationService {
  async generateGreeting(mode: ConversationMode, context: ModeContext, characterId?: string): Promise<string> {
    // If we have a character, generate a personalized greeting
    if (characterId) {
      const profile = getCharacterProfile(characterId);
      if (profile) {
        const greetings: Record<string, string[]> = {
          'malena': [
            `¡Hola! Soy ${profile.name}, de Buenos Aires. ¿Cómo andás? Contame algo de vos.`,
            `¡Che, qué bueno conocerte! Soy ${profile.name}. ¿Qué querés practicar hoy?`,
            `¡Hola! Acá ${profile.name}, lista para charlar. ¿Arrancamos?`,
          ],
          'ana_maria': [
            `¡Hola! Soy ${profile.name}, de Oaxaca. ¡Qué gusto conocerte! ¿Cómo estás?`,
            `¡Ay, qué padre! Soy ${profile.name}. ¿Ya comiste? Bueno, vamos a practicar español.`,
            `¡Hola, hola! ${profile.name} aquí, lista para platicar. ¿Qué onda?`,
          ],
          'marcela': [
            `¡Quiubo! Soy ${profile.name}, de Medellín. ¿Qué más, pues? ¡Vamos a hablar!`,
            `¡Hola, parcero! Soy ${profile.name}. ¡Qué chimba conocerte! ¿Listo para practicar?`,
            `¡Ey! ${profile.name} aquí, desde la Comuna 13. ¿Arrancamos pues?`,
          ],
        };
        const options = greetings[characterId] || greetings['malena'];
        return options[Math.floor(Math.random() * options.length)];
      }
    }
    return getGreetingMessage(mode, context);
  }

  async generateResponse(
    userMessage: string,
    conversation: Conversation,
    previousMessages: Message[],
    userProfile: User | null,
    characterId?: string
  ): Promise<GeneratedResponse> {
    const userLevel = (userProfile?.spanish_level || 'A2') as SpanishLevel;
    const correctionDepth = (userProfile?.correction_depth || 'standard') as CorrectionDepth;

    // Build base system prompt
    let systemPrompt = buildSystemPrompt({
      mode: conversation.mode as ConversationMode,
      userLevel,
      correctionDepth,
      context: {
        topic: conversation.topic || undefined,
        grammarFocus: conversation.grammar_focus || undefined,
        persona: conversation.role_play_persona || undefined,
      },
    });

    // Add character personality if a tutor is selected
    if (characterId) {
      const characterSection = getCharacterPromptSection(characterId);
      if (characterSection) {
        systemPrompt = characterSection + '\n\n---\n\n' + systemPrompt;
        console.log(`🎭 Using character: ${characterId}`);
      }
    }

    // Add emotional response instruction for human-like voice synthesis
    const emotionInstruction = getEmotionPromptInstruction();
    systemPrompt += '\n\n' + emotionInstruction;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...previousMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    try {
      // Using gpt-4o-mini for faster responses (~10x faster than gpt-4-turbo)
      // Still maintains good quality for conversational Spanish tutoring
      // max_tokens: 150 ensures responses are very short to avoid quota issues
      // This keeps responses to ~100-150 characters, well within API limits
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.8,
        max_tokens: 150, // Very short responses to stay within quota limits
        presence_penalty: 0.3,
        frequency_penalty: 0.5,
      });

      const responseText = completion.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';

      // Parse corrections from response
      const corrections = this.parseCorrections(responseText);
      
      // Parse emotion from response (for emotional voice synthesis)
      const emotion = parseEmotionFromText(responseText);
      if (emotion) {
        console.log(`🎭 Detected emotion: ${emotion.type} (intensity: ${emotion.intensity})`);
      }
      
      // Remove correction markers and emotion tags from displayed text
      let cleanContent = responseText.replace(/\[CORRECCIÓN:.*?\]/g, '');
      cleanContent = removeEmotionTags(cleanContent).trim();

      return {
        content: cleanContent,
        corrections: corrections.length > 0 ? corrections : null,
        emotion,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate response');
    }
  }

  private parseCorrections(text: string): Correction[] {
    const corrections: Correction[] = [];
    const correctionRegex = /\[CORRECCIÓN:\s*"([^"]+)"\s*→\s*"([^"]+)"\s*\|\s*([^\]]+)\]/g;

    let match;
    while ((match = correctionRegex.exec(text)) !== null) {
      corrections.push({
        type: this.detectCorrectionType(match[3]),
        original: match[1],
        corrected: match[2],
        explanation: match[3].trim(),
        grammar_rule: this.detectGrammarRule(match[3]),
      });
    }

    return corrections;
  }

  private detectCorrectionType(explanation: string): Correction['type'] {
    const lower = explanation.toLowerCase();
    if (lower.includes('conjugación') || lower.includes('conjugar') || lower.includes('verbo')) {
      return 'conjugation';
    }
    if (lower.includes('pronuncia')) {
      return 'pronunciation';
    }
    if (lower.includes('vocabulario') || lower.includes('palabra')) {
      return 'vocabulary';
    }
    return 'grammar';
  }

  private detectGrammarRule(explanation: string): string | null {
    const rules = [
      'ser vs estar', 'subjuntivo', 'pretérito', 'imperfecto', 'condicional',
      'por vs para', 'pronombres', 'género', 'concordancia', 'artículos',
    ];
    
    const lower = explanation.toLowerCase();
    for (const rule of rules) {
      if (lower.includes(rule)) {
        return rule;
      }
    }
    return null;
  }

  async analyzeUserMessage(message: string, targetGrammar?: string): Promise<{
    grammarUsed: string[];
    vocabularyUsed: string[];
    errors: Correction[];
  }> {
    // This could be enhanced with more sophisticated analysis
    const prompt = `Analiza este mensaje en español y responde en JSON:
Mensaje: "${message}"
${targetGrammar ? `Gramática objetivo: ${targetGrammar}` : ''}

Responde con:
{
  "grammarUsed": ["lista de estructuras gramaticales usadas"],
  "vocabularyUsed": ["palabras clave usadas"],
  "errors": [{"type": "grammar|vocabulary|conjugation|pronunciation", "original": "texto original", "corrected": "corrección", "explanation": "explicación"}]
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return {
        grammarUsed: result.grammarUsed || [],
        vocabularyUsed: result.vocabularyUsed || [],
        errors: (result.errors || []).map((e: Partial<Correction>) => ({
          ...e,
          grammar_rule: null,
        })),
      };
    } catch (error) {
      console.error('Analysis error:', error);
      return { grammarUsed: [], vocabularyUsed: [], errors: [] };
    }
  }
}

