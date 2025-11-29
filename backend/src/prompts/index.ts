export { getBaseTutorPrompt, getCorrectionDepthPrompt } from './base-tutor';
export { 
  getOpenConversationPrompt,
  getTopicFocusedPrompt,
  getVocabularyPracticePrompt,
  getGrammarFocusedPrompt,
  getRolePlayPrompt,
  type ModeContext,
} from './modes';

import { SpanishLevel } from '../config/openai';
import { getBaseTutorPrompt, getCorrectionDepthPrompt } from './base-tutor';
import {
  getOpenConversationPrompt,
  getTopicFocusedPrompt,
  getVocabularyPracticePrompt,
  getGrammarFocusedPrompt,
  getRolePlayPrompt,
  ModeContext,
} from './modes';

export type ConversationMode = 'open' | 'topic' | 'vocabulary' | 'grammar' | 'roleplay';
export type CorrectionDepth = 'light' | 'standard' | 'deep';

export interface SystemPromptConfig {
  mode: ConversationMode;
  userLevel: SpanishLevel;
  correctionDepth: CorrectionDepth;
  context?: ModeContext;
}

/**
 * Build a complete system prompt for the conversation
 */
export function buildSystemPrompt(config: SystemPromptConfig): string {
  const { mode, userLevel, correctionDepth, context = {} } = config;

  // Base tutor personality
  const basePrompt = getBaseTutorPrompt(userLevel);

  // Mode-specific instructions
  let modePrompt: string;
  switch (mode) {
    case 'open':
      modePrompt = getOpenConversationPrompt();
      break;
    case 'topic':
      modePrompt = getTopicFocusedPrompt(context);
      break;
    case 'vocabulary':
      modePrompt = getVocabularyPracticePrompt(context);
      break;
    case 'grammar':
      modePrompt = getGrammarFocusedPrompt(context);
      break;
    case 'roleplay':
      modePrompt = getRolePlayPrompt(context);
      break;
    default:
      modePrompt = getOpenConversationPrompt();
  }

  // Correction depth settings
  const correctionPrompt = getCorrectionDepthPrompt(correctionDepth);

  // Combine all prompts
  return `${basePrompt}

---

${modePrompt}

---

${correctionPrompt}`;
}

/**
 * Get a greeting message for a new conversation
 */
export function getGreetingMessage(mode: ConversationMode, context?: ModeContext): string {
  const greetings: Record<ConversationMode, () => string> = {
    open: () => {
      const options = [
        '¡Hola! Soy Lobo, tu compañero de español. ¿Cómo estás hoy? Podemos hablar de lo que quieras.',
        '¡Buenas! Me alegra verte. ¿Qué tal tu día? Cuéntame algo.',
        '¡Hola, amigo! ¿Listo para practicar un poco de español? ¿De qué te gustaría charlar?',
      ];
      return options[Math.floor(Math.random() * options.length)];
    },
    topic: () => {
      const topicName = context?.customTopic || context?.topic || 'este tema';
      return `¡Excelente elección! Hablemos de ${topicName}. ¿Qué te interesa más al respecto?`;
    },
    vocabulary: () => {
      return '¡Vamos a expandir tu vocabulario! Te voy a presentar palabras nuevas en contexto natural. ¿Listo para empezar?';
    },
    grammar: () => {
      const focus = context?.grammarFocus || context?.grammarLevel || 'gramática';
      return `Vamos a practicar ${focus}. No te preocupes por los errores - ¡son parte del aprendizaje! ¿Empezamos?`;
    },
    roleplay: () => {
      if (context?.persona === 'teacher') {
        return '¡Buenos días! Soy la profesora Carmen. Estoy aquí para ayudarte con cualquier pregunta sobre el español. ¿En qué puedo ayudarte hoy?';
      }
      if (context?.persona === 'friend') {
        return '¡Ey, qué pasa! Soy Miguel. Hace tiempo que no hablamos, ¿no? ¿Qué cuentas?';
      }
      if (context?.persona === 'romantic') {
        return 'Hola, mi amor. Me alegra mucho hablar contigo. ¿Cómo ha ido tu día?';
      }
      if (context?.persona === 'grandparent') {
        return 'Ay, mi niño querido. ¡Qué alegría verte! Siéntate, siéntate. ¿Quieres que te cuente algo?';
      }
      if (context?.persona === 'business') {
        return 'Buenos días. Soy el señor García. Es un placer conocerle. ¿En qué puedo servirle?';
      }
      if (context?.customPersona) {
        return `*Entra en escena* ¡Hola! Me han dicho que querías hablar conmigo. Soy ${context.customPersona}. ¿Qué quieres saber?`;
      }
      return '¿Con quién te gustaría practicar hoy? Puedo ser un profesor, un amigo, o quien tú quieras.';
    },
  };

  return greetings[mode]();
}

