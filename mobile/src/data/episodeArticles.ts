/**
 * Episode Articles - Structured Content
 * 
 * Contains Florencia's narrative, grammar explanations, and writing prompts
 * for each episode article. Uses data from grammarLessons.ts and episodeDialogueExamples.ts.
 */

import { getGrammarLesson, GrammarLesson } from './grammarLessons';
import { getEpisodeDialogueExamples, EpisodeDialogueData } from './episodeDialogueExamples';

export interface NarrativeSection {
  type: 'intro' | 'reflection' | 'cultural' | 'closing';
  content: string;
}

export interface ArticleContent {
  episode_number: number;
  title: string;
  subtitle: string;
  grammar_focus: string;
  grammar_summary: string; // Brief summary of what this subjunctive form is and when to use it
  estimated_read_minutes: number;
  narrative_sections: NarrativeSection[];
  cultural_highlight: {
    title: string;
    content: string;
  };
  writing_prompt: string;
}

/**
 * Florencia's narrative content for each episode article
 * Written in her voice, connecting grammar to the story
 */
export const articleNarratives: Record<number, ArticleContent> = {
  1: {
    episode_number: 1,
    title: 'The Grammar of Desire',
    subtitle: 'Discover the art of expressing desires through the present subjunctive in Spanish.',
    grammar_focus: 'present_subjunctive_formation',
    grammar_summary: 'The present subjunctive expresses desires, hopes, and wishes about actions that haven\'t happened yet. Use it when you want someone else to do something, when expressing what you hope will occur, or when making requests. It captures the uncertainty of wanting—the space between wishing and reality.',
    estimated_read_minutes: 3,
    narrative_sections: [
      {
        type: 'intro',
        content: "¡Hola, che!\n\nWelcome back. I\'ve been thinking about our first meeting at Café Tortoni. Do you remember when I told you, \"Quiero que sepas algo... Este café es especial para mí\"?\n\nThat moment matters to me. I was expressing a desire—I wanted you to know something personal, something I don\'t share with everyone. In Spanish, when we wish for something, when we hope, when we want someone else to understand us, we use the subjunctive.\n\nThink about it: \"Espero que descubras algo sorprendente sobre vos mismo en las próximas ocho semanas.\" That\'s what I told you. A hope. A wish. The grammar of desire."
      },
      {
        type: 'closing',
        content: "The present subjunctive is your tool for expressing what your heart wishes for. Every time you use \"quiero que...\" or \"espero que...\", you\'re opening a door to possibility.\n\nI promised to be your guide through Buenos Aires. That promise began with desire—with wanting to share this city with you. Now, you have the grammar to express your own wishes too."
      }
    ],
    cultural_highlight: {
      title: 'Café Tortoni',
      content: "Founded in 1858, Café Tortoni is Buenos Aires\' oldest café. Its Parisian-style décor attracted legendary figures like Carlos Gardel and Jorge Luis Borges. The café represents the sophisticated, European-influenced side of Argentine culture."
    },
    writing_prompt: "Write about what you hope to achieve by learning Spanish. Use expressions like \"espero que...\", \"quiero que...\", and \"ojalá...\" to express your desires and dreams."
  },

  2: {
    episode_number: 2,
    title: 'Dancing with Emotion',
    subtitle: 'Expressing feelings through tango and the present subjunctive.',
    grammar_focus: 'subjunctive_emotions',
    grammar_summary: 'When expressing emotions about someone else\'s actions—happiness, sadness, surprise, fear—Spanish uses the subjunctive. The key is that you\'re expressing how you feel about what another person does, not stating a fact. Your feelings color the grammar.',
    estimated_read_minutes: 3,
    narrative_sections: [
      {
        type: 'intro',
        content: "Che, I can\'t stop thinking about our night at Salón Marabú.\n\nWhen I saw you step onto that dance floor, I said \"Me emociona que estés acá conmigo.\" I was genuinely moved that you were there with me. That\'s what emotions do in Spanish—they transform the grammar.\n\n\"Es hermoso que se comuniquen sin palabras,\" I whispered, watching the dancers. Beautiful that they communicate without speaking. \"Me fascina que la música tenga el poder de transportarnos a otro tiempo.\" Fascinating that music can transport us.\n\nEvery feeling I shared that night—joy, wonder, gratitude—carried the subjunctive. Because when emotions are involved, we\'re not stating facts. We\'re sharing our hearts."
      },
      {
        type: 'closing',
        content: "The subjunctive of emotion lets you connect deeply with others. When you say \"Me alegra que te animes a intentarlo,\" you\'re not just glad—you\'re glad about someone else\'s courage.\n\nTango taught me that connection comes through feeling. The grammar of emotion works the same way."
      }
    ],
    cultural_highlight: {
      title: 'Salón Marabú',
      content: "Salón Marabú is one of Buenos Aires\' historic milongas from the Golden Age of Tango in the 1940s-50s. The milonga is both a style of dance and the venue where tango is danced socially."
    },
    writing_prompt: "Describe a moment that moved you emotionally. Use expressions like \"me alegra que...\", \"me sorprende que...\", and \"es increíble que...\" to convey your feelings."
  },

  3: {
    episode_number: 3,
    title: 'The Art of Doubt',
    subtitle: 'Exploring uncertainty with the perfect subjunctive.',
    grammar_focus: 'subjunctive_doubt',
    grammar_summary: 'The perfect subjunctive expresses doubt or uncertainty about past events. When you question whether something happened, when you\'re skeptical, when reality feels uncertain—this is your grammar. It combines the present subjunctive of \"haber\" with the past participle.',
    estimated_read_minutes: 3,
    narrative_sections: [
      {
        type: 'intro',
        content: "¿Te acordás de San Telmo?\n\nWhen you stumbled upon that old Carlos Di Sarli record, I couldn\'t believe it. \"Dudo que hayas visto algo así antes,\" I said about the mate ritual. And then: \"No creo que haya sido casualidad que encontraras ese disco.\"\n\nDoubt. Uncertainty. The sense that some things are too perfect to be random.\n\nThe perfect subjunctive lets us question the past. \"Dudo que el universo haya hecho esto sin razón,\" I told you. Do I really believe in fate? Maybe. But the grammar of doubt lets me explore that mystery—to hold possibility without certainty."
      },
      {
        type: 'closing',
        content: "San Telmo is full of mysteries—antiques with hidden histories, vendors with secrets. The perfect subjunctive matches that energy perfectly.\n\nWhen you\'re not quite sure about what happened, when you want to express skepticism or wonder, reach for \"dudo que haya...\" and \"no creo que haya sido...\". Let the uncertainty live in your words."
      }
    ],
    cultural_highlight: {
      title: 'Feria de San Telmo',
      content: "The San Telmo Market preserves the immigrant, working-class fabric of Buenos Aires—the raw social material from which tango and porteño identity emerged. Every Sunday, the streets fill with antiques, street performers, and the aroma of choripán."
    },
    writing_prompt: "Write about something you\'re uncertain about. Use expressions like \"dudo que...\", \"no creo que...\", and \"es posible que...\" to express your doubts."
  },

  4: {
    episode_number: 4,
    title: 'The Grammar of Belonging',
    subtitle: 'Expressing gratitude and fulfilled wishes with the perfect subjunctive.',
    grammar_focus: 'subjunctive_desires',
    grammar_summary: 'The perfect subjunctive with desire expressions captures feelings about completed actions. When you\'re glad something happened, when you\'re grateful someone did something, when wishes have already come true—this form expresses that emotional response to the past.',
    estimated_read_minutes: 3,
    narrative_sections: [
      {
        type: 'intro',
        content: "Che, that asado was special.\n\nWhen you arrived at my family\'s home, I said \"Me alegra que hayas venido hoy.\" I was genuinely happy you came. Not that you would come someday—but that you actually did.\n\n\"Me encanta que hayas aceptado la invitación,\" I told you. I was thrilled you accepted. \"Me hace feliz que hayas tomado mate conmigo\"—happy that we shared that ritual together.\n\nDo you see the pattern? These aren\'t hopes for the future. They\'re gratitude for what already happened. The perfect subjunctive lets us express emotion about completed moments."
      },
      {
        type: 'closing',
        content: "Sharing mate at the asado meant you became part of my circle. \"Espero que hayas sentido algo especial hoy,\" I said as you left.\n\nThe grammar of belonging expresses what matters after it happens—the warmth of gratitude, the joy of connection already made."
      }
    ],
    cultural_highlight: {
      title: 'The Asado Ritual',
      content: "Argentine asado is a communal ritual rooted in gaucho life that transforms beef, fire, and time into an expression of national identity and social equality. The asador holds a position of honor and responsibility."
    },
    writing_prompt: "Reflect on a moment when you felt truly welcomed somewhere. Use expressions like \"me alegra que hayas...\", \"espero que hayas...\", and \"ojalá hayas...\" to express your gratitude about past events."
  },

  5: {
    episode_number: 5,
    title: 'The Grammar of What Could Have Been',
    subtitle: 'Exploring hypothetical pasts with the pluperfect subjunctive.',
    grammar_focus: 'pluperfect_subjunctive',
    grammar_summary: 'The pluperfect subjunctive imagines how the past could have been different. It\'s the grammar of \"what if\"—of paths not taken, of wondering about alternative histories. Use it when reflecting on choices, expressing regret, or imagining different outcomes.',
    estimated_read_minutes: 3,
    narrative_sections: [
      {
        type: 'intro',
        content: "I finally told you the truth at the cemetery.\n\n\"Si te lo hubiera dicho antes, quizás no me hubieras entendido,\" I confessed. If I had told you earlier, maybe you wouldn\'t have understood. The pluperfect subjunctive—the grammar of alternative pasts.\n\nMy grandmother was offered everything. \"Si hubiera aceptado ese papel... su vida habría sido otra.\" If she had accepted that role, her life would have been different. But she chose love. She chose family.\n\n\"Ojalá hubiera tenido el mismo coraje que ella,\" I admitted. I wish I had had her courage. When they offered me a place in a touring tango company, I was afraid. \"Si hubiera aceptado...\" If I had accepted..."
      },
      {
        type: 'closing',
        content: "The pluperfect subjunctive lets us explore the roads not taken. It\'s not about regret—it\'s about understanding that our choices make us who we are.\n\n\"Si no hubieras venido conmigo hoy, no sé si habría podido contarte todo esto.\" Thank you for listening."
      }
    ],
    cultural_highlight: {
      title: 'Cementerio de la Chacarita',
      content: "Chacarita is Buenos Aires\' great popular necropolis, where Carlos Gardel, Carlos Di Sarli, and other cultural icons are buried. Unlike the aristocratic Recoleta Cemetery, Chacarita represents the working-class soul of the city."
    },
    writing_prompt: "Think about a decision that shaped your life. Write about what might have been different using \"si hubiera...\" and \"habría...\" to explore alternative paths."
  },

  6: {
    episode_number: 6,
    title: 'The Grammar of Dreams',
    subtitle: 'Expressing wishes and comparisons with the imperfect subjunctive.',
    grammar_focus: 'imperfect_subjunctive',
    grammar_summary: 'The imperfect subjunctive expresses hypotheticals, unlikely wishes, and comparisons to unreal situations. Use \"como si\" for \"as if\" comparisons, \"ojalá\" for wishes about present/future, and \"si + imperfect subjunctive\" for unlikely conditions.',
    estimated_read_minutes: 3,
    narrative_sections: [
      {
        type: 'intro',
        content: "At Teatro Colón, I revealed something I\'d been hiding.\n\n\"Hablo como si fuera una artista, ¿no?\" I asked you. I speak as if I were an artist. \"Bueno... es porque lo soy.\" Well, it\'s because I am.\n\n\"Es como si la pobreza se transformara en belleza,\" I said about tango\'s journey from the conventillos to this grand stage. As if poverty transformed into beauty.\n\nThe imperfect subjunctive lives in the space between real and imagined. \"Ojalá este momento durara para siempre,\" I whispered when \"Soñemos\" played. If only this moment would last forever."
      },
      {
        type: 'closing',
        content: "Dreams need their own grammar. When you wish for things that aren\'t quite real yet, when you compare reality to imagination, when you create hypotheticals—the imperfect subjunctive is your tool.\n\n\"Si te dijera que a veces la línea entre la realidad y la ilusión se vuelve tan fina que desaparece...\" What if I told you that line sometimes disappears?"
      }
    ],
    cultural_highlight: {
      title: 'Teatro Colón',
      content: "Teatro Colón embodies Argentina\'s aspiration toward European high culture. Opened in 1908, it\'s considered one of the world\'s best opera houses. Tango\'s presence on its stage marks the nation\'s embrace of its own popular, immigrant-born art."
    },
    writing_prompt: "Describe a dream or wish you have for the future. Use \"ojalá...\", \"si pudiera...\", and \"como si...\" to express your hopes and hypotheticals."
  },

  7: {
    episode_number: 7,
    title: 'Beauty Born from Necessity',
    subtitle: 'Conditionals and comparisons with the imperfect subjunctive.',
    grammar_focus: 'conditional_tense',
    grammar_summary: 'The imperfect subjunctive pairs with the conditional to create \"if... then\" statements about unlikely situations. Use it for hypothetical conditions, to ask about imagined scenarios, and to express what would happen if things were different.',
    estimated_read_minutes: 3,
    narrative_sections: [
      {
        type: 'intro',
        content: "La Boca showed us how necessity becomes art.\n\n\"Si no fuera por la pobreza, esta belleza no existiría,\" I told you. If it weren\'t for poverty, this beauty wouldn\'t exist. The immigrants painted their houses with leftover ship paint—and created something iconic.\n\n\"Si te preguntara qué es real y qué es ilusión en nuestra historia... ¿qué me responderías?\" If I asked you what\'s real and what\'s illusion... what would you answer?\n\n\"Si me conocieras mejor, sabrías que a veces ni yo sé dónde termina la actuación.\" If you knew me better, you\'d know that sometimes even I don\'t know where the performance ends."
      },
      {
        type: 'closing',
        content: "\"Si tuviera el poder de detener el tiempo, lo haría ahora mismo.\" If I had the power to stop time, I would do it right now.\n\nThe conditional plus imperfect subjunctive lets us imagine different realities. It\'s the grammar of possibility, of \"what would happen if...\""
      }
    ],
    cultural_highlight: {
      title: 'La Boca',
      content: "La Boca is a working-class immigrant port neighborhood where tango, football, and Buenos Aires\' popular identity took shape. The colorful houses were painted with leftover ship paint—beauty born from economic necessity."
    },
    writing_prompt: "Write about what you would do if you could change something in your life. Use \"si pudiera...\", \"si tuviera...\", and conditional forms like \"haría\", \"sería\", \"tendría\"."
  },

  8: {
    episode_number: 8,
    title: 'Soñemos',
    subtitle: 'A comprehensive review bringing together all the grammar of dreaming.',
    grammar_focus: 'comprehensive_review',
    grammar_summary: 'This episode weaves together all subjunctive forms: present for desires and emotions, perfect for past doubts and gratitude, pluperfect for hypothetical pasts, and imperfect for dreams and conditions. These aren\'t separate rules—they\'re one flowing language of the heart.',
    estimated_read_minutes: 3,
    narrative_sections: [
      {
        type: 'intro',
        content: "We\'re back where we started. Café Tortoni.\n\n\"Me alegra que hayas venido hoy,\" I said, sliding the mate cup across the table. The perfect subjunctive—gratitude for what happened. \"Tengo algo para vos.\"\n\nThe mate cup from San Telmo. \"Si no lo hubiera comprado ese día, otro se lo habría llevado.\" Pluperfect subjunctive—imagining a different past.\n\n\"No creo que la hayas visto antes,\" I nodded toward my grandmother\'s photo on the wall. Doubt about the past. \"Mirala... parece como si fuera una estrella de cine.\" Imperfect subjunctive—an \"as if\" comparison.\n\nEight weeks of grammar, woven into one goodbye."
      },
      {
        type: 'closing',
        content: "\"Ojalá puedas volver algún día.\" Present subjunctive—a wish for the future.\n\n\"Si fuera vos... no dejaría de soñar.\" Imperfect subjunctive with conditional—advice in the form of a hypothetical.\n\n¿Sabés qué es lo mejor de los sueños? Que podés elegir seguir soñando o transformarlos en realidad.\n\nChau, che."
      }
    ],
    cultural_highlight: {
      title: 'Full Circle',
      content: "Café Tortoni represents both the beginning and end of our journey. In Argentine culture, the mate cup symbolizes belonging—when someone gives you a mate, they\'re welcoming you into their circle forever."
    },
    writing_prompt: "Write a letter to yourself about your Spanish learning journey. Use all the subjunctive forms you\'ve learned to express your hopes, doubts, regrets, and dreams."
  }
};

/**
 * Get complete article data combining narrative, grammar lesson, and dialogue examples
 */
export interface CompleteArticleData {
  article: ArticleContent;
  grammarLesson: GrammarLesson | null;
  dialogueExamples: EpisodeDialogueData | null;
}

export function getCompleteArticleData(episodeNumber: number): CompleteArticleData | null {
  const article = articleNarratives[episodeNumber];
  if (!article) return null;

  const grammarLesson = getGrammarLesson(article.grammar_focus);
  const dialogueExamples = getEpisodeDialogueExamples(episodeNumber);

  return {
    article,
    grammarLesson,
    dialogueExamples,
  };
}

/**
 * Get article by grammar focus key
 */
export function getArticleByGrammarFocus(grammarFocus: string): ArticleContent | null {
  return Object.values(articleNarratives).find(a => a.grammar_focus === grammarFocus) || null;
}
