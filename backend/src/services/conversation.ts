import { openai, SpanishLevel } from '../config/openai';
import { Conversation, Correction, User, supabaseAdmin } from '../config/supabase';
import { 
  buildSystemPrompt, 
  getGreetingMessage, 
  ConversationMode, 
  CorrectionDepth,
  ModeContext,
  detectSubjunctiveForm,
  SubjunctiveForm,
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

export interface GreetingResult {
  text: string;
  audioUrl?: string;
}

const GRAMMAR_GREETINGS: Record<SubjunctiveForm, string[]> = {
  present: [
    '¡Hola! Hoy vamos a practicar el presente de subjuntivo. Espero que estés lista para hablar, porque tengo muchas preguntas. Si usás otra forma del subjuntivo, te voy a ayudar a corregirla. Decime, tu mejor amigo quiere cambiar de carrera. ¿Qué le recomendás que haga?',
    '¡Che, qué bueno verte! Hoy nos enfocamos en el presente de subjuntivo — esas frases con "quiero que...", "espero que...", "es necesario que...". Si te equivocás con la forma, te aviso. Contame, ¿qué querés que pase en tu vida este año?',
  ],
  present_perfect: [
    '¡Hola! Hoy practicamos el pretérito perfecto de subjuntivo — frases con "haya", "hayas", "hayamos" + participio. Me alegra que hayas elegido esta forma, es muy útil. Si usás otra forma del subjuntivo, te voy a corregir. Decime, un amigo acaba de volver de un viaje largo. ¿Qué esperás que haya hecho?',
    '¡Che, arrancamos! Hoy nos enfocamos en el pretérito perfecto de subjuntivo. Dudo que hayas practicado mucho esta forma, así que vamos a cambiar eso. Si usás el subjuntivo equivocado, te ayudo. Contame, ¿qué es lo mejor que te haya pasado esta semana?',
  ],
  pluperfect: [
    '¡Hola! Hoy vamos con el pluscuamperfecto de subjuntivo — esas frases con "hubiera" o "hubiese" + participio. Ojalá hubiera empezado a enseñarte esto antes, ¡pero nunca es tarde! Si usás otra forma del subjuntivo, te aviso. Decime, si hubieras podido cambiar algo de tu pasado, ¿qué habrías hecho diferente?',
    '¡Che, qué bueno que estés acá! Hoy practicamos el pluscuamperfecto de subjuntivo — para hablar de lo que podría haber sido pero no fue. Si hubiera sabido que ibas a elegir esta forma, habría preparado algo especial. Contame, ¿qué hubiera pasado si hubieras tomado una decisión diferente en tu vida?',
  ],
  imperfect: [
    '¡Hola! Hoy nos enfocamos en el imperfecto de subjuntivo — esas frases con "pudiera", "tuviera", "quisiera". Si pudiera elegir un tema perfecto para vos, elegiría este. Si usás otra forma del subjuntivo, te corrijo. Decime, si pudieras vivir en cualquier ciudad del mundo, ¿dónde vivirías?',
    '¡Che, arrancamos con el imperfecto de subjuntivo! Quisiera que practiques mucho hoy. Vamos a hablar de situaciones hipotéticas y deseos. Si te sale otra forma del subjuntivo, te ayudo. Contame, si tuvieras un superpoder, ¿cuál elegirías y por qué?',
  ],
  all: [
    '¡Hola! Hoy vale todo — vamos a mezclar todas las formas del subjuntivo. Espero que estés lista, porque me encantaría que usaras el presente, el perfecto, el pluscuamperfecto y el imperfecto. Si solo usás una forma, te voy a pedir que pruebes otra. Contame, ¿qué deseos tenés, qué lamentás del pasado y qué cambiarías hoy?',
    '¡Che, hoy es día de mezclar! Quiero que uses todas las formas del subjuntivo: presente, perfecto, pluscuamperfecto e imperfecto. Ojalá hubiera podido practicar así cuando yo aprendía. Si pudieras dominar una sola forma, ¿cuál sería? Pero hoy practicamos todas.',
  ],
};

export class ConversationService {
  async generateGreeting(mode: ConversationMode, context: ModeContext, characterId?: string): Promise<GreetingResult> {
    if (mode === 'grammar' && context.grammarFocus) {
      const form = detectSubjunctiveForm(context.grammarFocus);
      if (form) {
        const options = GRAMMAR_GREETINGS[form];
        return { text: options[Math.floor(Math.random() * options.length)] };
      }
    }

    // If we have a character, try to fetch stored greeting from database
    if (characterId) {
      try {
        // Get a random greeting index (0, 1, or 2)
        const greetingIndex = Math.floor(Math.random() * 3);
        
        const { data, error } = await supabaseAdmin
          .from('tutor_greetings')
          .select('greeting_text, audio_url')
          .eq('character_id', characterId)
          .eq('greeting_index', greetingIndex)
          .single();

        if (!error && data) {
          console.log(`✅ Using stored greeting for ${characterId} (index ${greetingIndex})`);
          return {
            text: data.greeting_text,
            audioUrl: data.audio_url,
          };
        } else {
          console.warn(`⚠️ No stored greeting found for ${characterId}, falling back to generated text`);
        }
      } catch (error) {
        console.warn(`⚠️ Error fetching stored greeting:`, error);
      }

      // Fallback to generated greeting text if stored greeting not found
      const profile = getCharacterProfile(characterId);
      if (profile) {
        const greetings: Record<string, string[]> = {
          'florencia': [
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
        const options = greetings[characterId] || greetings['florencia'];
        return {
          text: options[Math.floor(Math.random() * options.length)],
        };
      }
    }
    return {
      text: getGreetingMessage(mode, context),
    };
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
      const isGrammarMode = conversation.mode === 'grammar';
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.8,
        max_tokens: isGrammarMode ? 220 : 150,
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

