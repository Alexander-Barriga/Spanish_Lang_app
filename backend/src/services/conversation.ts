import { openai, SpanishLevel } from '../config/openai';
import { Conversation, Correction, User } from '../config/supabase';
import { 
  buildSystemPrompt, 
  getGreetingMessage, 
  ConversationMode, 
  CorrectionDepth,
  ModeContext 
} from '../prompts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GeneratedResponse {
  content: string;
  corrections: Correction[] | null;
}

export class ConversationService {
  async generateGreeting(mode: ConversationMode, context: ModeContext): Promise<string> {
    return getGreetingMessage(mode, context);
  }

  async generateResponse(
    userMessage: string,
    conversation: Conversation,
    previousMessages: Message[],
    userProfile: User | null
  ): Promise<GeneratedResponse> {
    const userLevel = (userProfile?.spanish_level || 'A2') as SpanishLevel;
    const correctionDepth = (userProfile?.correction_depth || 'standard') as CorrectionDepth;

    // Build system prompt using the new prompt system
    const systemPrompt = buildSystemPrompt({
      mode: conversation.mode as ConversationMode,
      userLevel,
      correctionDepth,
      context: {
        topic: conversation.topic || undefined,
        grammarFocus: conversation.grammar_focus || undefined,
        persona: conversation.role_play_persona || undefined,
      },
    });

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
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.8,
        max_tokens: 300, // Reduced for faster responses in voice conversations
        presence_penalty: 0.3,
        frequency_penalty: 0.5,
      });

      const responseText = completion.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';

      // Parse corrections from response
      const corrections = this.parseCorrections(responseText);
      
      // Remove correction markers from displayed text
      const cleanContent = responseText.replace(/\[CORRECCIÓN:.*?\]/g, '').trim();

      return {
        content: cleanContent,
        corrections: corrections.length > 0 ? corrections : null,
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

