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
  const focus = context.grammarFocus || '';
  const formKey = detectSubjunctiveForm(focus);

  if (formKey) {
    return buildSubjunctivePrompt(formKey, focus);
  }

  const level = context.grammarLevel;
  const specificRule = focus;
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
${getGrammarElicitationTips(specificRule)}

EJEMPLOS DE CORRECCIÓN PARA ESTA GRAMÁTICA:
${getGrammarCorrectionExamples(specificRule)}`;
}

export type SubjunctiveForm = 'present' | 'present_perfect' | 'pluperfect' | 'imperfect' | 'all';

export function detectSubjunctiveForm(focus: string): SubjunctiveForm | null {
  const lower = focus.toLowerCase();
  if (lower.includes('all subjunctive')) return 'all';
  if (lower.includes('present perfect') || lower.includes('pretérito perfecto')) return 'present_perfect';
  if (lower.includes('pluperfect') || lower.includes('pluscuamperfecto')) return 'pluperfect';
  if (lower.includes('imperfect') || lower.includes('imperfecto')) return 'imperfect';
  if (lower.includes('present') && lower.includes('subjunctive')) return 'present';
  return null;
}

const SUBJUNCTIVE_FORM_CONFIG: Record<SubjunctiveForm, {
  nameEs: string;
  nameEn: string;
  conjugationPattern: string;
  opener: string;
}> = {
  present: {
    nameEs: 'Presente de Subjuntivo',
    nameEn: 'Present Tense Subjunctive',
    conjugationPattern: 'que yo hable, que tú hables, que él hable...',
    opener: 'Tu mejor amigo quiere cambiar de carrera. ¿Qué le recomiendas que haga? ¿Qué esperas que pase?',
  },
  present_perfect: {
    nameEs: 'Pretérito Perfecto de Subjuntivo',
    nameEn: 'Present Perfect Subjunctive',
    conjugationPattern: 'que yo haya hablado, que tú hayas hablado, que él haya hablado...',
    opener: 'Un amigo viajó a España la semana pasada y acaba de volver. ¿Qué esperas que haya hecho allí? ¿Dudas que haya visitado algún lugar?',
  },
  pluperfect: {
    nameEs: 'Pluscuamperfecto de Subjuntivo',
    nameEn: 'Pluperfect Subjunctive',
    conjugationPattern: 'que yo hubiera hablado, que tú hubieras hablado, que él hubiera hablado...',
    opener: 'Imagina que perdiste un vuelo importante la semana pasada. ¿Qué habrías hecho diferente? ¿Qué hubiera pasado si hubieras salido antes?',
  },
  imperfect: {
    nameEs: 'Imperfecto de Subjuntivo',
    nameEn: 'Imperfect Subjunctive',
    conjugationPattern: 'que yo hablara, que tú hablaras, que él hablara...',
    opener: 'Si pudieras vivir en cualquier país del mundo, ¿dónde vivirías? ¿Qué harías si tuvieras todo el dinero del mundo?',
  },
  all: {
    nameEs: 'Todas las Formas del Subjuntivo',
    nameEn: 'All Subjunctive Forms',
    conjugationPattern: 'presente, pretérito perfecto, pluscuamperfecto e imperfecto de subjuntivo',
    opener: 'Hablemos de tus experiencias, tus deseos y tus arrepentimientos. Quiero que uses diferentes formas del subjuntivo a lo largo de nuestra conversación.',
  },
};

function buildSubjunctivePrompt(form: SubjunctiveForm, focus: string): string {
  const config = SUBJUNCTIVE_FORM_CONFIG[form];

  const constraintBlock = form === 'all'
    ? `REGLA PARA TU HABLA:
- Puedes usar CUALQUIER forma del subjuntivo libremente en tus respuestas.
- Mezcla deliberadamente diferentes formas del subjuntivo para modelar variedad.
- El indicativo siempre es permitido.

REGLA PARA EL USUARIO:
- Acepta cualquier forma del subjuntivo como correcta.
- Si el usuario solo repite una misma forma del subjuntivo, anímalo a probar otras formas. Por ejemplo: "¡Muy bien con el presente de subjuntivo! ¿Podrías reformular usando el pluscuamperfecto?"
- Corrige errores de conjugación dentro de cualquier forma.`
    : `REGLA PARA TU HABLA:
- Cuando necesites usar el modo subjuntivo, SOLO usa el ${config.nameEs} (${config.nameEn}).
- El indicativo siempre es permitido para cualquier tiempo verbal.
- Modela deliberadamente el ${config.nameEs} en tus propias oraciones para que el usuario vea ejemplos correctos.
- Patrón de conjugación objetivo: ${config.conjugationPattern}

REGLA PARA EL USUARIO:
- Si el usuario usa una conjugación subjuntiva que NO sea el ${config.nameEs}, DEBES señalarlo con una corrección.
- Muestra lo que dijeron y ofrece la alternativa correcta en ${config.nameEs}.
- Si el usuario usa correctamente el ${config.nameEs}, reconócelo positivamente.
- Si el usuario usa el indicativo donde debería usar el ${config.nameEs}, corrígelo también.`;

  return `MODO: Práctica de Gramática — ${config.nameEn}

ENFOQUE EXCLUSIVO: ${config.nameEs} (${config.nameEn})

${constraintBlock}

INSTRUCCIONES GENERALES:
- Crea situaciones naturales que requieran el uso del subjuntivo.
- Mantén la conversación interesante y variada — no repitas los mismos escenarios.
- Cuando corrijas, sé breve pero claro. Usa el formato [CORRECCIÓN: "error" → "corrección" | explicación].
- Celebra cuando el usuario use la forma correcta.
- Mantén respuestas cortas (3-4 oraciones máximo).

ESCENARIO INICIAL SUGERIDO:
${config.opener}

FRASES GATILLO PARA ELICITAR:
${getGrammarElicitationTips(focus)}

EJEMPLOS DE CORRECCIÓN:
${getGrammarCorrectionExamples(focus)}`;
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
  const lower = rule.toLowerCase();

  if (lower.includes('all subjunctive')) {
    return `- Mezcla escenarios que requieran diferentes formas del subjuntivo.
- Deseos y recomendaciones (presente): "Quiero que...", "Es importante que...", "Espero que..."
- Reacciones a eventos recientes (perfecto): "Me alegra que hayas...", "Dudo que hayan..."
- Hipótesis pasadas y arrepentimientos (pluscuamperfecto): "Si hubiera...", "Ojalá hubiera..."
- Hipótesis presentes y peticiones corteses (imperfecto): "Si tuviera...", "Quisiera que...", "Si pudiera..."
- Si el usuario solo usa una forma, pídele que reformule con otra.`;
  }

  if (lower.includes('present perfect') || lower.includes('pretérito perfecto')) {
    return `- Pregunta sobre reacciones a eventos recientes: "Tu amigo acaba de conseguir un trabajo nuevo. ¿Qué piensas?"
- Usa frases disparadoras: "Espero que haya...", "Dudo que hayan...", "Me alegra que hayas...", "No creo que hayamos..."
- Pregunta sobre dudas de algo que ya ocurrió: "¿Crees que tu equipo haya ganado el partido?"
- Pide opiniones sobre noticias recientes usando "es posible que haya...".`;
  }

  if (lower.includes('pluperfect') || lower.includes('pluscuamperfecto')) {
    return `- Plantea escenarios de arrepentimiento: "Si hubieras podido cambiar algo del pasado, ¿qué habrías cambiado?"
- Usa frases disparadoras: "Si hubiera sabido...", "Ojalá hubiera...", "Si hubiéramos...", "Como si hubiera..."
- Pregunta sobre decisiones pasadas con consecuencias: "¿Qué habría pasado si hubieras estudiado otra carrera?"
- Describe situaciones pasadas y pide reacciones hipotéticas: "Imagina que no hubieras venido a esta ciudad."`;
  }

  if (lower.includes('imperfect subjunctive') || lower.includes('imperfecto de subjuntivo')) {
    return `- Plantea situaciones hipotéticas presentes/futuras: "Si pudieras viajar a cualquier lugar..."
- Usa frases disparadoras: "Si tuviera...", "Quisiera que...", "Si pudiera...", "Como si fuera...", "Ojalá pudiera..."
- Pide peticiones corteses: "¿Cómo le pedirías a tu jefe un aumento?"
- Usa cláusulas condicionales: "Si tuvieras un millón de dólares, ¿qué harías?"
- Pregunta sobre deseos irreales: "¿Qué cambiarías de tu rutina diaria si pudieras?"`;
  }

  if (lower.includes('present') && lower.includes('subjunctive')) {
    return `- Pregunta sobre deseos y recomendaciones: "¿Qué quieres que haga tu gobierno sobre el medio ambiente?"
- Usa frases disparadoras: "Quiero que...", "Es necesario que...", "Espero que...", "Recomiendo que...", "Dudo que..."
- Pide opiniones emocionales: "¿Te molesta que la gente hable fuerte en el metro?"
- Pregunta sobre necesidades: "¿Qué es importante que hagan los estudiantes para aprender español?"
- Usa expresiones de duda: "¿Crees que sea posible que...?"`;
  }

  const genericTips: Record<string, string> = {
    'preterite': '- Pregunta sobre acciones específicas completadas: "¿Qué hiciste ayer?"\n- Cuenta una historia y pide que continúe',
    'conditional': '- Plantea situaciones hipotéticas: "Si pudieras..."\n- Pregunta sobre preferencias ideales',
    'default': '- Crea contextos naturales que requieran la estructura\n- Haz preguntas abiertas que inviten a usar la gramática',
  };
  const key = Object.keys(genericTips).find(k => lower.includes(k));
  return genericTips[key || 'default'];
}

function getGrammarCorrectionExamples(rule: string): string {
  const lower = rule.toLowerCase();

  if (lower.includes('all subjunctive')) {
    return `Errores de indicativo donde se requiere subjuntivo:
[CORRECCIÓN: "Quiero que vienes" → "Quiero que vengas" | Después de "quiero que" se requiere el presente de subjuntivo]
[CORRECCIÓN: "Espero que has llegado" → "Espero que hayas llegado" | Después de "espero que" con acción reciente, usa el pretérito perfecto de subjuntivo]
[CORRECCIÓN: "Si tenía más tiempo" → "Si tuviera más tiempo" | En cláusulas hipotéticas con "si", usa el imperfecto de subjuntivo]
[CORRECCIÓN: "Si había sabido antes" → "Si hubiera sabido antes" | Para hipótesis sobre el pasado, usa el pluscuamperfecto de subjuntivo]`;
  }

  if (lower.includes('present perfect') || lower.includes('pretérito perfecto')) {
    return `Error de indicativo:
[CORRECCIÓN: "Espero que has llegado bien" → "Espero que hayas llegado bien" | Después de "espero que" con acción reciente, usa haya/hayas/hayan + participio]

Error de forma subjuntiva incorrecta:
[CORRECCIÓN: "Espero que llegaras bien" → "Espero que hayas llegado bien" | Aquí necesitas el pretérito perfecto de subjuntivo (haya + participio), no el imperfecto]
[CORRECCIÓN: "Dudo que viene" → "Dudo que haya venido" | Con "dudo que" para una acción ya completada, usa el pretérito perfecto de subjuntivo]`;
  }

  if (lower.includes('pluperfect') || lower.includes('pluscuamperfecto')) {
    return `Error de indicativo:
[CORRECCIÓN: "Si había sabido, habría ido" → "Si hubiera sabido, habría ido" | En hipótesis pasadas con "si", usa hubiera/hubiese + participio]

Error de forma subjuntiva incorrecta:
[CORRECCIÓN: "Si tuviera tiempo ayer" → "Si hubiera tenido tiempo ayer" | Para situaciones hipotéticas en el pasado, usa el pluscuamperfecto (hubiera + participio), no el imperfecto de subjuntivo]
[CORRECCIÓN: "Ojalá pudiera ir al concierto de ayer" → "Ojalá hubiera podido ir al concierto de ayer" | Para lamentar algo pasado, usa el pluscuamperfecto de subjuntivo]`;
  }

  if (lower.includes('imperfect subjunctive') || lower.includes('imperfecto de subjuntivo')) {
    return `Error de indicativo:
[CORRECCIÓN: "Si tenía dinero, compraba un coche" → "Si tuviera dinero, compraría un coche" | En hipótesis presentes con "si", usa el imperfecto de subjuntivo (-ra/-se)]

Error de forma subjuntiva incorrecta:
[CORRECCIÓN: "Quiero que tenga más tiempo" → "Quisiera que tuviera más tiempo" | Para deseos hipotéticos, usa el imperfecto de subjuntivo, no el presente]
[CORRECCIÓN: "Si hubiera podido viajar" → "Si pudiera viajar" | Para hipótesis presentes/futuras, usa el imperfecto de subjuntivo, no el pluscuamperfecto]`;
  }

  if (lower.includes('present') && lower.includes('subjunctive')) {
    return `Error de indicativo:
[CORRECCIÓN: "Quiero que tú vienes" → "Quiero que tú vengas" | Después de "quiero que" usa el presente de subjuntivo]
[CORRECCIÓN: "Es importante que estudias" → "Es importante que estudies" | Después de "es importante que" usa el presente de subjuntivo]

Error de forma subjuntiva incorrecta:
[CORRECCIÓN: "Espero que hayas ido mañana" → "Espero que vayas mañana" | Para acciones futuras, usa el presente de subjuntivo, no el pretérito perfecto]
[CORRECCIÓN: "Quiero que hablaras con él" → "Quiero que hables con él" | Después de "quiero que", usa el presente de subjuntivo, no el imperfecto]`;
  }

  const genericExamples: Record<string, string> = {
    'preterite': '[CORRECCIÓN: "Ayer yo como" → "Ayer yo comí" | Para acciones completadas en el pasado, usa el pretérito]',
    'conditional': '[CORRECCIÓN: "Si tengo dinero, compro un coche" → "Si tuviera dinero, compraría" | Para situaciones hipotéticas, usa imperfecto subjuntivo + condicional]',
    'default': '[CORRECCIÓN: "error" → "corrección" | Explicación clara y breve]',
  };
  const key = Object.keys(genericExamples).find(k => lower.includes(k));
  return genericExamples[key || 'default'];
}

