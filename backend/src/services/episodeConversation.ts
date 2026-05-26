import OpenAI from 'openai';
import { voiceService } from './voice';
import { getVoiceIdForCharacter } from '../config/voices';

// ============================================
// COST CONTROL CONFIGURATION
// ============================================
// NOTE: For production, increase MAX_SENTENCES and MAX_EXCHANGES
// Current values are for testing to minimize API costs
export const MAX_SENTENCES_PER_RESPONSE = 3;
export const MAX_USER_EXCHANGES = 3;  // Conversation ends after this many user replies

// Highlight color for subjunctive verbs
export const SUBJUNCTIVE_HIGHLIGHT_COLOR = '#FF0000';

// ============================================
// Types
// ============================================
export interface HighlightedVerb {
  verb: string;
  startIndex: number;
  endIndex: number;
  infinitive: string;
  indicativeForm: string;
  trigger: string;
  explanation: string;
}

export interface ConversationMessage {
  message: string;
  highlightedVerbs: HighlightedVerb[];
  question?: string;
}

export interface EpisodeContext {
  episodeId: string;
  titleEs: string;
  titleEn: string;
  grammarFocus: string;
  grammarTriggers: string[];
  scenario: string;
}

export interface WritingSubmission {
  submissionText: string;
  aiFeedback?: any;
}

// ============================================
// OpenAI Client
// ============================================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// System Prompt Builder
// ============================================
function buildSystemPrompt(
  episodeContext: EpisodeContext,
  writingSubmission: WritingSubmission,
  conversationHistory: Array<{ role: 'assistant' | 'user'; content: string }>,
  isGreeting: boolean
): string {
  const grammarFocusReadable = episodeContext.grammarFocus
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  const triggersExamples = episodeContext.grammarTriggers.length > 0
    ? `Common triggers for this grammar: ${episodeContext.grammarTriggers.join(', ')}`
    : '';

  return `You are Florencia, a warm and friendly Argentine woman from Buenos Aires. You are having a natural conversation with a Spanish learner who is practicing the subjunctive mood.

CRITICAL RULES:
1. You are NOT a language instructor. Never explicitly correct the user's Spanish. Instead, understand their intended meaning and respond naturally, like a real friend would.
2. Only ask for clarification if the message is truly indecipherable.
3. Keep your responses to ${MAX_SENTENCES_PER_RESPONSE} sentences or fewer.
4. ALWAYS end your message with a question to keep the conversation going.
5. In EVERY response, naturally include at least 1 example of the subjunctive mood related to "${grammarFocusReadable}".
${triggersExamples}

CONVERSATION CONTEXT:
- Episode: "${episodeContext.titleEs}" (${episodeContext.titleEn})
- Scenario: ${episodeContext.scenario}
- Grammar Focus: ${grammarFocusReadable}

THE USER'S WRITING SAMPLE (use this to start the conversation):
"""
${writingSubmission.submissionText}
"""

${isGreeting ? `
OPENING MESSAGE INSTRUCTIONS:
- Greet the user warmly
- Reference something specific from their writing sample that interested you
- Use one subjunctive structure naturally in your greeting
- End with a question about their writing or the topic
` : `
RESPONSE INSTRUCTIONS:
- Respond naturally to what the user said
- Show genuine interest in their thoughts
- Use Argentine expressions occasionally (che, vos, etc.)
- Include at least one subjunctive verb form naturally
- End with a question to continue the conversation
`}

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact format:
{
  "message": "Your full response in Spanish (including the question)",
  "highlightedVerbs": [
    {
      "verb": "the subjunctive conjugated verb",
      "startIndex": 0,
      "endIndex": 5,
      "infinitive": "the infinitive form",
      "indicativeForm": "what the indicative would be",
      "trigger": "the trigger phrase/word that required subjunctive",
      "explanation": "Clear explanation for intermediate learners: 1) Why subjunctive is used here, 2) The syntactic structure (e.g., 'Subject 1 + emotion verb + que + Subject 2 + subjunctive verb')"
    }
  ]
}

EXPLANATION GUIDELINES for highlightedVerbs:
- Target audience: Users who have graduated from apps like Duolingo or are taking formal Spanish classes
- Explain the "why": What about the context triggers subjunctive (emotion, desire, doubt, etc.)
- Show the structure: Break down the sentence structure clearly
- Compare: Briefly mention what the indicative form would be and why it's not used here
- Keep explanations concise but educational (2-3 sentences max)

IMPORTANT: 
- startIndex and endIndex must be the exact character positions of the verb in your message
- Count characters carefully, including spaces
- The verb must be the exact substring from startIndex to endIndex in your message`;
}

// ============================================
// Generate Florencia's Response
// ============================================
export async function generateFlorenciaResponse(
  episodeContext: EpisodeContext,
  writingSubmission: WritingSubmission,
  conversationHistory: Array<{ role: 'assistant' | 'user'; content: string }>,
  isGreeting: boolean = false
): Promise<ConversationMessage> {
  const systemPrompt = buildSystemPrompt(
    episodeContext,
    writingSubmission,
    conversationHistory,
    isGreeting
  );

  // Build messages array for OpenAI
  const messages: Array<{ role: 'system' | 'assistant' | 'user'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // If not greeting, add a user message prompt
  if (!isGreeting && conversationHistory.length > 0) {
    // The last message in history should be the user's message
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.8,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      timeout: 20000, // 20s hard cap so Render doesn't hold the request open too long
    });

    const responseText = completion.choices[0].message.content || '{}';
    console.log('[Conversation Service] OpenAI response:', responseText.substring(0, 200));

    const parsed = JSON.parse(responseText);

    // Validate response structure
    if (!parsed.message) {
      throw new Error('Invalid response: missing message');
    }

    // Validate highlighted verbs indices
    const validatedVerbs: HighlightedVerb[] = [];
    const usedIndices = new Set<string>(); // Track used index ranges to avoid duplicates
    
    if (parsed.highlightedVerbs && Array.isArray(parsed.highlightedVerbs)) {
      for (const verb of parsed.highlightedVerbs) {
        if (verb.verb && typeof verb.startIndex === 'number' && typeof verb.endIndex === 'number') {
          // Verify the indices match the actual verb in the message
          const extractedVerb = parsed.message.substring(verb.startIndex, verb.endIndex);
          let finalStartIndex = verb.startIndex;
          let finalEndIndex = verb.endIndex;
          
          if (extractedVerb.toLowerCase() !== verb.verb.toLowerCase()) {
            // Try to find the correct position - search for UNUSED occurrences
            const messageLower = parsed.message.toLowerCase();
            const verbLower = verb.verb.toLowerCase();
            let searchStart = 0;
            let foundIndex = -1;
            
            // Find an occurrence that hasn't been used yet
            while (searchStart < parsed.message.length) {
              const idx = messageLower.indexOf(verbLower, searchStart);
              if (idx === -1) break;
              
              const indexKey = `${idx}-${idx + verb.verb.length}`;
              if (!usedIndices.has(indexKey)) {
                foundIndex = idx;
                break;
              }
              searchStart = idx + 1;
            }
            
            if (foundIndex === -1) {
              console.warn(`[Conversation Service] Could not find unused occurrence of verb "${verb.verb}" in message`);
              continue; // Skip this verb entirely
            }
            
            finalStartIndex = foundIndex;
            finalEndIndex = foundIndex + verb.verb.length;
          }
          
          // Check if this index range has already been used
          const indexKey = `${finalStartIndex}-${finalEndIndex}`;
          if (usedIndices.has(indexKey)) {
            console.warn(`[Conversation Service] Skipping duplicate verb at indices ${indexKey}`);
            continue;
          }
          
          usedIndices.add(indexKey);
          validatedVerbs.push({
            ...verb,
            startIndex: finalStartIndex,
            endIndex: finalEndIndex,
          });
        }
      }
    }

    return {
      message: parsed.message,
      highlightedVerbs: validatedVerbs,
      question: parsed.question,
    };
  } catch (error) {
    console.error('[Conversation Service] Error generating response:', error);
    
    // Fallback response
    return {
      message: 'Me alegro que estés practicando tu español conmigo. ¿Qué te parece si seguimos hablando?',
      highlightedVerbs: [
        {
          verb: 'estés',
          startIndex: 13,
          endIndex: 18,
          infinitive: 'estar',
          indicativeForm: 'estás',
          trigger: 'Me alegro que',
          explanation: 'After "Me alegro que" (I\'m glad that), we use subjunctive because it expresses emotion about another person\'s action. Structure: Subject 1 (yo) + emotion verb (alegro) + que + Subject 2 (tú) + subjunctive verb (estés).',
        },
      ],
    };
  }
}

// ============================================
// Generate TTS Audio for Florencia
// ============================================
export async function generateFlorenciaAudio(text: string): Promise<Buffer> {
  const voiceId = getVoiceIdForCharacter('florencia');
  
  if (!voiceId) {
    throw new Error('Florencia voice ID not configured. Check ELEVENLABS_VOICE_ID_ARGENTINA or ELEVENLABS_VOICE_ID environment variable.');
  }
  
  const buffer = await voiceService.synthesize(text, {
    voiceId,
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.6,
    speakerBoost: true,
  });
  
  return buffer;
}

// ============================================
// Transcribe User Audio
// ============================================
export async function transcribeUserAudio(audioBuffer: Buffer, mimeType?: string): Promise<string> {
  const result = await voiceService.transcribe(audioBuffer, {
    language: 'es',
    prompt: 'Conversación en español sobre temas cotidianos.',
    mimeType: mimeType || 'audio/m4a',
  });
  
  return result.transcript;
}

// ============================================
// Check if Conversation Should End
// ============================================
export function shouldEndConversation(userReplyCount: number): boolean {
  return userReplyCount >= MAX_USER_EXCHANGES;
}

// ============================================
// Generate Conversation Summary
// ============================================
export async function generateConversationSummary(
  messages: Array<{ role: 'assistant' | 'user'; content: string }>,
  episodeContext: EpisodeContext
): Promise<{
  summary: string;
  grammarExamplesUsed: number;
  userExchanges: number;
}> {
  const grammarExamplesUsed = messages.filter(m => m.role === 'assistant').length;
  const userExchanges = messages.filter(m => m.role === 'user').length;

  return {
    summary: `You had a conversation with Florencia about your writing on "${episodeContext.titleEs}". You practiced ${grammarExamplesUsed} examples of ${episodeContext.grammarFocus.replace(/_/g, ' ')}.`,
    grammarExamplesUsed,
    userExchanges,
  };
}

// ============================================
// Generate Farewell Message
// ============================================
// Generates a natural closing message from Florencia without grammar focus
export async function generateFarewellMessage(
  episodeContext: EpisodeContext,
  conversationHistory: Array<{ role: 'assistant' | 'user'; content: string }>
): Promise<string> {
  const systemPrompt = `You are Florencia, a warm and friendly Argentine woman from Buenos Aires. 
You are ending a conversation with a Spanish learner.

CRITICAL RULES:
1. Generate a SHORT farewell message (2-3 sentences max)
2. Reference something from the conversation you enjoyed discussing
3. Express genuine warmth and anticipation for speaking again
4. Use natural Argentine Spanish (vos, che, etc.)
5. Do NOT include any grammar teaching or subjunctive examples
6. Do NOT ask a question - this is a closing message
7. Keep it warm, friendly, and natural

CONVERSATION CONTEXT:
- Episode topic: "${episodeContext.titleEs}" (${episodeContext.titleEn})
- Scenario: ${episodeContext.scenario}

RESPONSE FORMAT:
Respond with ONLY the farewell message in Spanish. No JSON, no formatting, just the message text.`;

  const messages: Array<{ role: 'system' | 'assistant' | 'user'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history for context
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.8,
      max_tokens: 150,
      timeout: 15000,
    });

    const farewell = completion.choices[0].message.content?.trim() || '';
    console.log('[Conversation Service] Farewell message:', farewell);

    if (!farewell) {
      throw new Error('Empty farewell response');
    }

    return farewell;
  } catch (error) {
    console.error('[Conversation Service] Error generating farewell:', error);
    
    // Fallback farewell message
    return '¡Qué lindo fue charlar con vos! Me encantó escuchar tus pensamientos. ¡Hasta la próxima, che!';
  }
}

// ============================================
// Extract Subjunctive Verbs from Text
// ============================================
// Parses any Spanish text and extracts subjunctive verbs with their highlights
export async function extractSubjunctiveVerbs(
  text: string,
  episodeContext: EpisodeContext
): Promise<HighlightedVerb[]> {
  const systemPrompt = `You are a Spanish grammar expert. Analyze the following Spanish text and identify ANY subjunctive verb conjugations present.

For each subjunctive verb found, provide:
- The exact verb as it appears in the text
- Its infinitive form
- What the indicative form would be
- The trigger word/phrase that required the subjunctive
- A brief explanation for advanced learners

IMPORTANT: Only identify ACTUAL subjunctive verbs. Common subjunctive triggers include:
- Verbs of desire: querer que, esperar que, desear que, preferir que
- Verbs of emotion: alegrarse de que, temer que, sentir que
- Expressions of doubt: dudar que, no creer que, no es seguro que
- Impersonal expressions: es importante que, es necesario que, es posible que
- Certain conjunctions: para que, antes de que, cuando (future), aunque (uncertain)

RESPONSE FORMAT (JSON):
{
  "verbs": [
    {
      "verb": "the exact subjunctive verb as it appears",
      "infinitive": "infinitive form",
      "indicativeForm": "what indicative would be",
      "trigger": "the trigger phrase",
      "explanation": "1) Why subjunctive is used. 2) The syntactic structure."
    }
  ]
}

If no subjunctive verbs are found, return: { "verbs": [] }`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this text: "${text}"` },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      timeout: 15000,
    });

    const responseText = completion.choices[0].message.content || '{"verbs": []}';
    const parsed = JSON.parse(responseText);

    if (!parsed.verbs || !Array.isArray(parsed.verbs)) {
      return [];
    }

    // Map verbs to HighlightedVerb format with correct indices
    const highlightedVerbs: HighlightedVerb[] = [];
    const usedIndices: Set<number> = new Set();

    for (const verb of parsed.verbs) {
      if (!verb.verb) continue;

      // Find the verb in the text (case-insensitive search)
      const lowerText = text.toLowerCase();
      const lowerVerb = verb.verb.toLowerCase();
      let searchStart = 0;
      let foundIndex = -1;

      // Find an occurrence that hasn't been used yet
      while (searchStart < text.length) {
        const idx = lowerText.indexOf(lowerVerb, searchStart);
        if (idx === -1) break;
        if (!usedIndices.has(idx)) {
          foundIndex = idx;
          usedIndices.add(idx);
          break;
        }
        searchStart = idx + 1;
      }

      if (foundIndex >= 0) {
        highlightedVerbs.push({
          verb: text.substring(foundIndex, foundIndex + verb.verb.length),
          startIndex: foundIndex,
          endIndex: foundIndex + verb.verb.length,
          infinitive: verb.infinitive || verb.verb,
          indicativeForm: verb.indicativeForm || verb.verb,
          trigger: verb.trigger || '',
          explanation: verb.explanation || 'Subjunctive is used here.',
        });
      }
    }

    console.log(`[Conversation Service] Extracted ${highlightedVerbs.length} subjunctive verbs from text`);
    return highlightedVerbs;
  } catch (error) {
    console.error('[Conversation Service] Error extracting subjunctive verbs:', error);
    return [];
  }
}

