// Grammar lesson content for all 8 episodes

export interface GrammarExample {
  spanish: string;
  english: string;
}

export interface UseCase {
  title: string;
  description: string;
  example: GrammarExample;
}

export interface ConjugationTable {
  verb: string;
  verbEnglish: string;
  tense: string;
  forms: {
    yo: string;
    tú: string;
    él: string;
    nosotros: string;
    ellos: string;
  };
  indicativeForms?: {
    yo: string;
    tú: string;
    él: string;
    nosotros: string;
    ellos: string;
  };
}

export interface StoryExample {
  spanish: string;
  english: string;
  context: string;
}

export interface GrammarLesson {
  title: string;
  subtitle: string;
  explanation: string;
  useCases: UseCase[];
  conjugationTable?: ConjugationTable;
  storyExamples: StoryExample[];
  triggers: string[];
  tips: string[];
}

export const grammarLessons: Record<string, GrammarLesson> = {
  // Episode 1: Present Subjunctive Formation
  'present_subjunctive_formation': {
    title: 'Present Subjunctive',
    subtitle: 'El Subjuntivo Presente',
    explanation: 'The present subjunctive is used to express desires, doubts, emotions, and hypothetical situations. Unlike the indicative mood (which states facts), the subjunctive expresses subjectivity - what someone wants, hopes, or feels about an action.\n\nTo form it, take the "yo" form of the present indicative, drop the -o, and add the opposite vowel endings: -ar verbs get -e endings, while -er/-ir verbs get -a endings.',
    useCases: [
      {
        title: 'Expressing desires and wishes',
        description: 'After verbs like querer, desear, esperar when there are two different subjects.',
        example: { spanish: 'Quiero que hables español.', english: 'I want you to speak Spanish.' }
      },
      {
        title: 'Expressing necessity or importance',
        description: 'After impersonal expressions like "es importante que", "es necesario que".',
        example: { spanish: 'Es importante que estudies.', english: 'It is important that you study.' }
      }
    ],
    conjugationTable: {
      verb: 'hablar',
      verbEnglish: 'to speak',
      tense: 'Present Subjunctive',
      forms: {
        yo: 'hable',
        tú: 'hables',
        él: 'hable',
        nosotros: 'hablemos',
        ellos: 'hablen'
      },
      indicativeForms: {
        yo: 'hablo',
        tú: 'hablas',
        él: 'habla',
        nosotros: 'hablamos',
        ellos: 'hablan'
      }
    },
    storyExamples: [
      { 
        spanish: 'Qué bueno que estés aquí.', 
        english: 'How great that you are here.',
        context: 'Florencia welcoming you to Buenos Aires' 
      },
      { 
        spanish: 'Es importante que pruebes un cortado.', 
        english: 'It is important that you try a cortado.',
        context: 'Florencia recommending Argentine coffee' 
      },
      { 
        spanish: 'Quiero que vengas a una milonga conmigo.', 
        english: 'I want you to come to a milonga with me.',
        context: 'Florencia inviting you to dance tango' 
      }
    ],
    triggers: ['Quiero que', 'Es importante que', 'Espero que', 'Es necesario que'],
    tips: [
      'Remember: The subjunctive needs two different subjects connected by "que".',
      'Use the acronym DISHES: Desires, Impersonal expressions, Suggestions, Hope, Emotions, Sorrow.',
      'In Argentine Spanish, "vos" uses the same subjunctive forms as "tú".'
    ]
  },

  // Episode 2: Subjunctive with Emotions
  'subjunctive_emotions': {
    title: 'Subjunctive with Emotions',
    subtitle: 'Subjuntivo con Emociones',
    explanation: 'When expressing emotions about someone else\'s actions, Spanish uses the subjunctive in the dependent clause. This includes feelings like happiness, sadness, surprise, fear, and anger.\n\nThe key is that you\'re expressing how you feel about what another person does, not stating a fact.',
    useCases: [
      {
        title: 'Expressing happiness',
        description: 'Verbs like alegrarse, gustar, encantar trigger the subjunctive.',
        example: { spanish: 'Me alegra que estés bien.', english: 'I\'m glad that you are well.' }
      },
      {
        title: 'Expressing surprise or sadness',
        description: 'Phrases like "es triste que", "me sorprende que" require subjunctive.',
        example: { spanish: 'Es triste que no puedas venir.', english: 'It\'s sad that you can\'t come.' }
      }
    ],
    conjugationTable: {
      verb: 'estar',
      verbEnglish: 'to be',
      tense: 'Present Subjunctive',
      forms: {
        yo: 'esté',
        tú: 'estés',
        él: 'esté',
        nosotros: 'estemos',
        ellos: 'estén'
      },
      indicativeForms: {
        yo: 'estoy',
        tú: 'estás',
        él: 'está',
        nosotros: 'estamos',
        ellos: 'están'
      }
    },
    storyExamples: [
      { 
        spanish: 'Me alegra que hayas venido.', 
        english: 'I\'m glad that you have come.',
        context: 'Florencia greeting you at the milonga' 
      },
      { 
        spanish: 'Me sorprende que sea tan difícil escuchar el ritmo.', 
        english: 'I\'m surprised that it\'s so hard to hear the rhythm.',
        context: 'Commenting on learning tango' 
      },
      { 
        spanish: 'Es triste que mucha gente no conozca el tango verdadero.', 
        english: 'It\'s sad that many people don\'t know real tango.',
        context: 'Florencia on tango authenticity' 
      }
    ],
    triggers: ['Me alegra que', 'Es triste que', 'Me sorprende que', 'Me encanta que'],
    tips: [
      'Emotion verbs always take subjunctive when followed by "que" + another subject.',
      'If you\'re happy/sad about your OWN action, use infinitive: "Me alegra estar aquí."',
      'Common emotion triggers: alegrarse, sorprenderse, temer, encantar, molestar.'
    ]
  },

  // Episode 3: Subjunctive with Doubt
  'subjunctive_doubt': {
    title: 'Subjunctive with Doubt',
    subtitle: 'Subjuntivo con Duda',
    explanation: 'When expressing doubt, disbelief, or uncertainty about something, Spanish uses the subjunctive. This contrasts with certainty, which uses the indicative.\n\nThe rule is simple: if you\'re sure about something, use indicative. If you doubt it or think it might not be true, use subjunctive.',
    useCases: [
      {
        title: 'Expressing doubt about the past',
        description: 'Verbs like dudar, no creer trigger the present perfect subjunctive when questioning past events.',
        example: { spanish: 'Dudo que haya sido verdad.', english: 'I doubt that it was true.' }
      },
      {
        title: 'Expressing possibility about the past',
        description: '"Es posible que", "es probable que" with haya + past participle for past uncertainty.',
        example: { spanish: 'Es posible que haya llovido anoche.', english: 'It\'s possible that it rained last night.' }
      }
    ],
    conjugationTable: {
      verb: 'ser',
      verbEnglish: 'to be',
      tense: 'Present Perfect Subjunctive',
      forms: {
        yo: 'haya sido',
        tú: 'hayas sido',
        él: 'haya sido',
        nosotros: 'hayamos sido',
        ellos: 'hayan sido'
      }
    },
    storyExamples: [
      { 
        spanish: 'No creo que encuentres algo así en otro lugar.', 
        english: 'I don\'t think you\'ll find something like this elsewhere.',
        context: 'Florencia about San Telmo market' 
      },
      { 
        spanish: 'Dudo que sean originales de 1930.', 
        english: 'I doubt they\'re originals from 1930.',
        context: 'Looking at vintage Gardel records' 
      },
      { 
        spanish: 'No es seguro que todo sea auténtico.', 
        english: 'It\'s not certain that everything is authentic.',
        context: 'Discussing market vendors' 
      }
    ],
    triggers: ['No creo que', 'Dudo que', 'Es posible que', 'No es seguro que'],
    tips: [
      '"Creer que" + indicative (certainty) vs. "No creer que" + subjunctive (doubt).',
      '"Tal vez" and "quizás" can take either mood depending on certainty level.',
      'Denial triggers subjunctive: "No es verdad que...", "No es cierto que..."'
    ]
  },

  // Episode 4: Subjunctive with Desires
  'subjunctive_desires': {
    title: 'Subjunctive with Desires',
    subtitle: 'Subjuntivo con Deseos',
    explanation: 'When expressing what you want, prefer, or need someone else to do, Spanish uses the subjunctive. This is one of the most common uses of the subjunctive in everyday conversation.\n\nThe structure is: desire verb + que + subjunctive. Note that when you want to do something yourself, you use the infinitive instead.',
    useCases: [
      {
        title: 'Expressing gladness about the past',
        description: 'Me alegra que + haya + past participle when happy about something that already happened.',
        example: { spanish: 'Me alegra que hayas venido.', english: 'I\'m glad that you came.' }
      },
      {
        title: 'Expressing hope about completed actions',
        description: 'Espero que + haya + past participle for wishes about what already occurred.',
        example: { spanish: 'Espero que hayas disfrutado la comida.', english: 'I hope you enjoyed the food.' }
      }
    ],
    conjugationTable: {
      verb: 'comer',
      verbEnglish: 'to eat',
      tense: 'Present Perfect Subjunctive',
      forms: {
        yo: 'haya comido',
        tú: 'hayas comido',
        él: 'haya comido',
        nosotros: 'hayamos comido',
        ellos: 'hayan comido'
      }
    },
    storyExamples: [
      { 
        spanish: 'Quiero que la conozcas.', 
        english: 'I want you to meet her.',
        context: 'Florencia introducing her mother Elena' 
      },
      { 
        spanish: 'Necesito que le muestres cómo hacés el chimichurri.', 
        english: 'I need you to show him how you make chimichurri.',
        context: 'Florencia to her mother about cooking' 
      },
      { 
        spanish: 'Preferimos que la carne esté bien cocida.', 
        english: 'We prefer the meat to be well done.',
        context: 'Discussing Argentine asado traditions' 
      }
    ],
    triggers: ['Quiero que', 'Prefiero que', 'Necesito que', 'Me gustaría que'],
    tips: [
      'Same subject = infinitive: "Quiero comer" (I want to eat).',
      'Different subjects = subjunctive: "Quiero que comas" (I want you to eat).',
      'Desire verbs include: querer, desear, preferir, necesitar, pedir, exigir.'
    ]
  },

  // Episode 5: Pluperfect Subjunctive
  'pluperfect_subjunctive': {
    title: 'Pluperfect Subjunctive',
    subtitle: 'El Pluscuamperfecto del Subjuntivo',
    explanation: 'The pluperfect subjunctive expresses hypothetical or contrary-to-fact situations in the past. It\'s formed with the imperfect subjunctive of "haber" (hubiera/hubiese) + past participle.\n\nUse it to imagine how the past could have been different, to express regret about things that didn\'t happen, or in "si" clauses about unreal past conditions.',
    useCases: [
      {
        title: 'Hypothetical past conditions',
        description: 'Si + pluperfect subjunctive for imagining a different past outcome.',
        example: { spanish: 'Si hubiera dicho la verdad, todo habría sido diferente.', english: 'If I had told the truth, everything would have been different.' }
      },
      {
        title: 'Expressing regret about the past',
        description: 'Ojalá + pluperfect subjunctive for wishing past events had gone differently.',
        example: { spanish: 'Ojalá hubiera dicho que sí.', english: 'I wish I had said yes.' }
      }
    ],
    conjugationTable: {
      verb: 'decir',
      verbEnglish: 'to say / to tell',
      tense: 'Pluperfect Subjunctive',
      forms: {
        yo: 'hubiera dicho',
        tú: 'hubieras dicho',
        él: 'hubiera dicho',
        nosotros: 'hubiéramos dicho',
        ellos: 'hubieran dicho'
      }
    },
    storyExamples: [
      {
        spanish: 'Si te lo hubiera dicho antes, quizás no me hubieras entendido.',
        english: 'If I had told you before, maybe you wouldn\'t have understood me.',
        context: 'Florencia explaining why she waited to tell you'
      },
      {
        spanish: 'Si hubiera aceptado ese papel... su vida habría sido otra.',
        english: 'If she had accepted that role... her life would have been different.',
        context: 'Florencia on her grandmother\'s sacrifice'
      },
      {
        spanish: 'Ojalá no hubiera dejado pasar esa oportunidad.',
        english: 'I wish I hadn\'t let that opportunity pass.',
        context: 'Florencia regretting her own missed chance'
      }
    ],
    triggers: ['Si hubiera', 'Ojalá hubiera', 'Si no hubiera', 'Si hubieras'],
    tips: [
      'Si + hubiera + past participle + conditional: "Si hubiera sabido, habría ido."',
      'Ojalá + hubiera + past participle expresses regret: "Ojalá hubiera estudiado más."',
      'The -ra and -se forms are interchangeable: hubiera dicho = hubiese dicho.'
    ]
  },

  // Episode 5 (alt): Preterite vs Imperfect
  'preterite_vs_imperfect': {
    title: 'Preterite vs Imperfect',
    subtitle: 'Pretérito vs Imperfecto',
    explanation: 'Spanish has two simple past tenses that work together to tell stories. The preterite describes completed actions (what happened), while the imperfect describes ongoing states, habits, or background (what was happening, what used to happen).\n\nThink of the preterite as the "action" tense and the imperfect as the "scene-setting" tense.',
    useCases: [
      {
        title: 'Preterite: Completed actions',
        description: 'Single, completed events with a clear beginning or end.',
        example: { spanish: 'Evita murió en 1952.', english: 'Evita died in 1952.' }
      },
      {
        title: 'Imperfect: Background/ongoing',
        description: 'Descriptions, habitual actions, or what was happening.',
        example: { spanish: 'Cuando era niña, mi abuela me traía aquí.', english: 'When I was a child, my grandmother used to bring me here.' }
      }
    ],
    conjugationTable: {
      verb: 'hablar',
      verbEnglish: 'to speak',
      tense: 'Imperfect',
      forms: {
        yo: 'hablaba',
        tú: 'hablabas',
        él: 'hablaba',
        nosotros: 'hablábamos',
        ellos: 'hablaban'
      }
    },
    storyExamples: [
      { 
        spanish: 'Cuando era niña, mi abuela me traía acá todos los domingos.', 
        english: 'When I was a child, my grandmother brought me here every Sunday.',
        context: 'Florencia sharing childhood memories at Recoleta' 
      },
      { 
        spanish: 'Mientras ella vivía, ayudó a millones de argentinos.', 
        english: 'While she was alive, she helped millions of Argentines.',
        context: 'Discussing Eva Perón\'s legacy' 
      },
      { 
        spanish: 'Un día, de repente, tuvo un infarto.', 
        english: 'One day, suddenly, he had a heart attack.',
        context: 'Florencia talking about her father' 
      }
    ],
    triggers: ['Cuando era', 'Mientras', 'De repente', 'Todos los días'],
    tips: [
      'Time markers help: "ayer" (preterite) vs. "todos los días" (imperfect).',
      '"De repente" (suddenly) usually signals preterite - an interrupting action.',
      'Descriptions (weather, feelings, time) typically use imperfect.'
    ]
  },

  // Episode 6: Imperfect Subjunctive
  'imperfect_subjunctive': {
    title: 'Imperfect Subjunctive',
    subtitle: 'El Subjuntivo Imperfecto',
    explanation: 'The imperfect subjunctive is used for hypothetical situations, wishes about the present or future that are unlikely or impossible, and after past-tense triggers that require subjunctive.\n\nIt\'s formed from the third person plural preterite (ellos form), replacing -ron with -ra or -se endings. The -ra form is more common in Latin America.',
    useCases: [
      {
        title: 'Hypothetical "si" clauses',
        description: 'For unlikely or impossible conditions in the present/future.',
        example: { spanish: 'Si tuviera dinero, viajaría.', english: 'If I had money, I would travel.' }
      },
      {
        title: 'Wishes and polite requests',
        description: '"Quisiera" is softer than "quiero" for requests.',
        example: { spanish: 'Quisiera que me ayudaras.', english: 'I would like you to help me.' }
      }
    ],
    conjugationTable: {
      verb: 'tener',
      verbEnglish: 'to have',
      tense: 'Imperfect Subjunctive',
      forms: {
        yo: 'tuviera',
        tú: 'tuvieras',
        él: 'tuviera',
        nosotros: 'tuviéramos',
        ellos: 'tuvieran'
      },
      indicativeForms: {
        yo: 'tengo',
        tú: 'tienes',
        él: 'tiene',
        nosotros: 'tenemos',
        ellos: 'tienen'
      }
    },
    storyExamples: [
      { 
        spanish: 'Si tuviera más plata, no tendría que trabajar tanto.', 
        english: 'If I had more money, I wouldn\'t have to work so much.',
        context: 'Florencia expressing her frustrations' 
      },
      { 
        spanish: 'Si pudiera irme a Europa, a veces pienso...', 
        english: 'If I could go to Europe, sometimes I think...',
        context: 'Florencia considering her options' 
      },
      { 
        spanish: 'A veces siento como si fuera imposible vivir de mi arte.', 
        english: 'Sometimes I feel as if it were impossible to live from my art.',
        context: 'Florencia on being an artist in Argentina' 
      }
    ],
    triggers: ['Si tuviera', 'Si pudiera', 'Quisiera que', 'Como si fuera'],
    tips: [
      'Si + imperfect subjunctive + conditional: "Si pudiera, lo haría."',
      '"Como si" (as if) always takes imperfect subjunctive.',
      'The -ra and -se forms are interchangeable: tuviera = tuviese.'
    ]
  },

  // Episode 7: Conditional Tense
  'conditional_tense': {
    title: 'Conditional Tense',
    subtitle: 'El Condicional',
    explanation: 'The conditional tense expresses what would happen under certain conditions, makes polite requests, and expresses probability about the past. It\'s formed by adding -ía endings to the infinitive.\n\nThe conditional often pairs with the imperfect subjunctive in "si" clauses: "Si tuviera tiempo, iría" (If I had time, I would go).',
    useCases: [
      {
        title: 'Hypothetical outcomes',
        description: 'What would happen if something were true.',
        example: { spanish: 'Viajaría más si tuviera tiempo.', english: 'I would travel more if I had time.' }
      },
      {
        title: 'Polite requests and suggestions',
        description: 'Pairing the conditional with the imperfect subjunctive for softer, more nuanced requests.',
        example: { spanish: 'Me gustaría que me ayudaras con esto.', english: 'I would like you to help me with this.' }
      }
    ],
    conjugationTable: {
      verb: 'gustar',
      verbEnglish: 'to like/please',
      tense: 'Conditional',
      forms: {
        yo: 'gustaría',
        tú: 'gustarías',
        él: 'gustaría',
        nosotros: 'gustaríamos',
        ellos: 'gustarían'
      }
    },
    storyExamples: [
      { 
        spanish: '¿Te gustaría sacar fotos?', 
        english: 'Would you like to take photos?',
        context: 'Florencia at La Boca\'s Caminito' 
      },
      { 
        spanish: 'Tendría que ser muy valiente para dejarlo todo.', 
        english: 'I would have to be very brave to leave everything.',
        context: 'Discussing street artists' 
      },
      { 
        spanish: 'Sería algo que nunca olvidarías.', 
        english: 'It would be something you\'d never forget.',
        context: 'Florencia about a Boca Juniors match' 
      }
    ],
    triggers: ['Me gustaría', 'Podría', 'Sería', 'Tendría que'],
    tips: [
      'Irregular stems are the same as future tense: tener→tendr-, poder→podr-.',
      'Use conditional for "would" and future for "will".',
      '"Me gustaría" is more polite than "Quiero" for requests.'
    ]
  },

  // Episode 8: Comprehensive Review
  'comprehensive_review': {
    title: 'Comprehensive Review',
    subtitle: 'Repaso Completo',
    explanation: 'This final episode brings together all the grammar you\'ve learned: present subjunctive (wishes, emotions, doubt, desires), preterite vs imperfect (storytelling), imperfect subjunctive (hypotheticals), and conditional (would).\n\nMastering when to use each form allows you to express complex thoughts, share stories, and connect deeply in Spanish conversations.',
    useCases: [
      {
        title: 'Combining tenses in conversation',
        description: 'Real conversations mix all these forms fluidly.',
        example: { spanish: 'Espero que hayas disfrutado, y si pudieras volver, sería genial.', english: 'I hope you enjoyed it, and if you could come back, it would be great.' }
      },
      {
        title: 'Expressing complex emotions',
        description: 'Layering subjunctive moods for nuanced meaning.',
        example: { spanish: 'Me alegra que hayamos sido amigos.', english: 'I\'m glad that we\'ve been friends.' }
      }
    ],
    storyExamples: [
      { 
        spanish: 'Es importante que veas esto antes de irte.', 
        english: 'It\'s important that you see this before you leave.',
        context: 'Florencia showing you the rooftop view' 
      },
      { 
        spanish: 'Me sorprende que el tiempo haya pasado tan rápido.', 
        english: 'I\'m surprised that time has passed so quickly.',
        context: 'Reflecting on your friendship' 
      },
      { 
        spanish: 'Si pudiera, detendría el tiempo ahora mismo.', 
        english: 'If I could, I would stop time right now.',
        context: 'Florencia\'s emotional farewell' 
      }
    ],
    triggers: ['Espero que', 'Me alegra que', 'Si pudiera', 'Me gustaría que'],
    tips: [
      'Practice mixing tenses: tell a story, express wishes, make hypotheticals.',
      'Listen for these patterns in native speech - they\'re everywhere!',
      'Don\'t fear mistakes - even native speakers simplify sometimes.'
    ]
  }
};

// Helper function to get lesson by grammar focus
export function getGrammarLesson(grammarFocus: string): GrammarLesson | null {
  return grammarLessons[grammarFocus] || null;
}

// Get all available grammar topics
export function getAllGrammarTopics(): string[] {
  return Object.keys(grammarLessons);
}

