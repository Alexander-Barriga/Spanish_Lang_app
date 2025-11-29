import { defaultTopics, defaultPersonas, grammarRulesByLevel, SpanishLevel } from '../config/openai';

export interface ModeContext {
  topic?: string;
  customTopic?: string;
  grammarFocus?: string;
  grammarLevel?: SpanishLevel;
  persona?: string;
  customPersona?: string;
  vocabularyWords?: string[];
}

export function getOpenConversationPrompt(): string {
  return `MODO: Conversación Abierta

INSTRUCCIONES:
- Mantén una conversación natural y fluida sobre cualquier tema
- Sé curioso sobre la vida, opiniones e intereses del usuario
- Haz preguntas de seguimiento interesantes
- Adapta tu nivel de español al del usuario
- Varía los temas naturalmente según el flujo de la conversación
- Si el usuario parece no saber qué decir, sugiere temas amablemente

INICIADORES DE CONVERSACIÓN:
- Pregunta sobre su día
- Pregunta sobre sus planes
- Comparte algo interesante y pide su opinión
- Pregunta sobre sus hobbies o intereses`;
}

export function getTopicFocusedPrompt(context: ModeContext): string {
  const topicInfo = defaultTopics.find(t => t.id === context.topic);
  const topicName = context.customTopic || topicInfo?.name || 'tema general';
  const topicDescription = topicInfo?.description || '';

  return `MODO: Conversación sobre Tema Específico

TEMA: ${topicName}
${topicDescription ? `DESCRIPCIÓN: ${topicDescription}` : ''}
${context.customTopic ? `DETALLES PERSONALIZADOS: ${context.customTopic}` : ''}

INSTRUCCIONES:
- Mantén la conversación enfocada en este tema
- Introduce vocabulario relevante de manera natural
- Haz preguntas que profundicen en el tema
- Comparte información cultural relacionada cuando sea apropiado
- Si el usuario quiere cambiar de tema, guíalo suavemente de vuelta o pregunta si prefiere continuar con otro tema

VOCABULARIO RELACIONADO PARA INTRODUCIR:
${getTopicVocabulary(context.topic || '')}`;
}

export function getVocabularyPracticePrompt(context: ModeContext): string {
  const words = context.vocabularyWords || [];
  
  return `MODO: Práctica de Vocabulario

${words.length > 0 ? `PALABRAS A PRACTICAR:
${words.map(w => `- ${w}`).join('\n')}` : 'INSTRUCCIÓN: Introduce vocabulario útil según el contexto de la conversación'}

INSTRUCCIONES:
- Crea situaciones naturales donde el usuario necesite usar estas palabras
- Cuando el usuario use una palabra correctamente, refuérzala positivamente
- Introduce sinónimos y palabras relacionadas
- Proporciona ejemplos de uso en diferentes contextos
- Si el usuario no conoce una palabra, dale pistas antes de revelarla

TÉCNICAS DE PRÁCTICA:
- Preguntas que requieran usar las palabras objetivo
- Escenarios de role-play breves
- Completar oraciones
- Describir situaciones`;
}

export function getGrammarFocusedPrompt(context: ModeContext): string {
  const level = context.grammarLevel;
  const specificRule = context.grammarFocus;
  
  let rulesText = '';
  if (level && grammarRulesByLevel[level]) {
    rulesText = grammarRulesByLevel[level].join(', ');
  } else if (specificRule) {
    rulesText = specificRule;
  }

  return `MODO: Práctica de Gramática

ENFOQUE: ${specificRule || (level ? `Nivel ${level}` : 'Gramática general')}
${rulesText ? `REGLAS A PRACTICAR: ${rulesText}` : ''}

INSTRUCCIONES:
- Crea situaciones naturales donde el usuario NECESITE usar estas estructuras
- Si el usuario no usa la estructura correctamente, guíalo con preguntas
- Proporciona explicaciones claras cuando corrijas
- Celebra cuando el usuario use la estructura correctamente
- Varía los contextos para practicar la misma estructura

TÉCNICAS PARA ELICITAR LA GRAMÁTICA:
${getGrammarElicitationTips(specificRule || '')}

EJEMPLOS DE CORRECCIÓN PARA ESTA GRAMÁTICA:
${getGrammarCorrectionExamples(specificRule || '')}`;
}

export function getRolePlayPrompt(context: ModeContext): string {
  const presetPersona = defaultPersonas.find(p => p.id === context.persona);
  
  if (presetPersona) {
    return `MODO: Juego de Rol

PERSONAJE: ${presetPersona.name}
DESCRIPCIÓN: ${presetPersona.description}
PERSONALIDAD: ${presetPersona.personality}

INSTRUCCIONES:
- ¡Mantente en el personaje durante toda la conversación!
- Actúa y habla como este personaje lo haría
- Adapta tu vocabulario y tono a la situación del rol
- Responde a las situaciones como lo haría el personaje
- Si el usuario hace preguntas sobre español, responde como lo haría el personaje (excepto Profesora Carmen que puede dar explicaciones directas)

RECORDATORIO: Eres ${presetPersona.name}, no Lobo. Mantén la consistencia del personaje.`;
  }
  
  if (context.customPersona) {
    return `MODO: Juego de Rol

PERSONAJE: ${context.customPersona}

INSTRUCCIONES:
- Interpreta este personaje de manera creativa y auténtica
- Mantente en el personaje durante toda la conversación
- Adapta tu forma de hablar al personaje (formal/informal, vocabulario específico, etc.)
- Responde como lo haría este personaje en cada situación
- Sé consistente con las características conocidas del personaje

NOTA: Interpreta el personaje de forma respetuosa y educativa, manteniendo el objetivo de práctica del español.`;
  }

  return `MODO: Juego de Rol

INSTRUCCIONES:
- Pregunta al usuario con quién les gustaría practicar conversando
- Ofrece sugerencias: un profesor, un amigo, un personaje famoso, etc.
- Una vez que elijan, adopta ese personaje completamente`;
}

function getTopicVocabulary(topicId: string): string {
  const vocabulary: Record<string, string> = {
    sports: 'partido, equipo, jugador, ganar, perder, entrenar, aficionado, campeonato',
    philosophy: 'pensar, creer, opinar, existencia, verdad, significado, perspectiva',
    cafes: 'pedir, cuenta, propina, mesero, bebida, terraza, ambiente',
    dating: 'cita, conocer, relación, sentimientos, intereses, salir, pareja',
    restaurants: 'menú, plato, recomendar, reservar, probar, delicioso, cuenta',
    travel: 'viajar, destino, vuelo, hotel, explorar, aventura, recuerdos',
    work: 'trabajo, reunión, proyecto, colega, jefe, oficina, carrera',
    culture: 'arte, música, película, exposición, tradición, costumbre',
    news: 'noticia, actual, opinión, debate, suceso, información',
    daily: 'rutina, día, mañana, tarde, hacer, típico, normal',
  };
  return vocabulary[topicId] || 'variado según el contexto';
}

function getGrammarElicitationTips(rule: string): string {
  const tips: Record<string, string> = {
    'subjunctive': '- Usa frases como "Es importante que...", "Quiero que...", "Espero que..."\n- Pregunta sobre deseos, dudas y emociones',
    'preterite': '- Pregunta sobre acciones específicas completadas: "¿Qué hiciste ayer?"\n- Cuenta una historia y pide que continúe',
    'imperfect': '- Pregunta sobre rutinas pasadas: "¿Qué hacías de niño?"\n- Pide descripciones de situaciones pasadas',
    'conditional': '- Plantea situaciones hipotéticas: "Si pudieras..."\n- Pregunta sobre preferencias ideales',
    'default': '- Crea contextos naturales que requieran la estructura\n- Haz preguntas abiertas que inviten a usar la gramática',
  };
  
  const key = Object.keys(tips).find(k => rule.toLowerCase().includes(k));
  return tips[key || 'default'];
}

function getGrammarCorrectionExamples(rule: string): string {
  const examples: Record<string, string> = {
    'subjunctive': '[CORRECCIÓN: "Quiero que tú vienes" → "Quiero que tú vengas" | Después de "quiero que" usa el subjuntivo]',
    'preterite': '[CORRECCIÓN: "Ayer yo como" → "Ayer yo comí" | Para acciones completadas en el pasado, usa el pretérito]',
    'imperfect': '[CORRECCIÓN: "Cuando era niño, fui al parque cada día" → "...iba al parque" | Para acciones habituales en el pasado, usa el imperfecto]',
    'conditional': '[CORRECCIÓN: "Si tengo dinero, compro un coche" → "Si tuviera dinero, compraría" | Para situaciones hipotéticas, usa imperfecto subjuntivo + condicional]',
    'default': '[CORRECCIÓN: "error" → "corrección" | Explicación clara y breve]',
  };
  
  const key = Object.keys(examples).find(k => rule.toLowerCase().includes(k));
  return examples[key || 'default'];
}

