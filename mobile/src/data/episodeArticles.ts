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
    writing_prompt: "1. Florencia says: \"Deseo que entiendas algo desde el principio. Buenos Aires no es solo una ciudad. Es un sentimiento.\"\n\nThink of a place that isn't just a location to you — it's a feeling. What do you want someone you care about to experience there? What do you hope they'll understand about it that words alone can't explain?\n\nBegin with: \"Quiero que...\" or \"Espero que...\"\n\n2. Florencia says: \"Mi abuela me traía acá cuando era chica. Ella me enseñó que cada taza de café tiene una historia.\"\n\nFlorencia's grandmother brought her to Café Tortoni as a child, and those visits shaped who she became. Think of a place from your childhood that a person close to you introduced you to. What do you wish others could understand about why it still matters to you?\n\nBegin with: \"Ojalá...\" or \"Deseo que...\"\n\n3. Florencia says: \"En Buenos Aires, las cosas no siempre son lo que parecen.\"\n\nFlorencia hints that she carries secrets beneath the surface. What is something about yourself that you hope people will discover over time — something that isn't obvious when they first meet you?\n\nBegin with: \"Espero que descubras...\" or \"No quiero que pienses...\"\n\n\nClose with: \"Espero que...\" — expressing what you hope this journey will reveal about you."
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
    writing_prompt: "1. Florencia says: \"Mi abuela bailaba como si el mundo dejara de existir.\"\n\nFlorencia's grandmother danced tango as if the world stopped existing. Is there something you do — a passion, a hobby, a ritual — that makes you feel that way? What surprises you about how it makes you feel?\n\nBegin with: \"Me emociona que...\" or \"Es increíble que...\"\n\n2. Florencia says: \"Ella me enseñó a bailar tango. Me enseñó a sentir.\"\n\nFlorencia's grandmother didn't just teach her dance steps — she taught her to feel. Think about someone who taught you something that went far beyond the skill itself. What did they really teach you?\n\nBegin with: \"Me alegra que...\" or \"Es maravilloso que...\"\n\n3. Florencia says: \"¿Quieres intentarlo? No te preocupes si no es perfecto.\"\n\nFlorencia invites you to dance even if it won't be perfect. When was the last time you tried something new even though you were afraid of failing? What emotions surprised you?\n\nBegin with: \"Me sorprende que...\" or \"Es emocionante que...\"\n\n\nClose with: \"Me alegra que...\" — expressing gratitude for someone who taught you to feel, not just to do."
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
    writing_prompt: "1. Florencia says: \"Dudo que haya sido un accidente que encontraras ese disco.\"\n\nYou found a \"Soñemos\" record at the San Telmo market — and Florencia doesn't believe it was an accident. Think about a coincidence in your own life that felt too perfect to be random. Do you doubt it was just chance?\n\nBegin with: \"Dudo que haya sido...\" or \"No creo que haya sido...\"\n\n2. Florencia says: \"Compré algo hoy... pero es un secreto.\"\n\nFlorencia is keeping a secret — she bought something at the market but won't say what. We all carry small secrets and unspoken intentions. Is there something you've done for someone that they may not know about? Or a choice you've kept to yourself?\n\nBegin with: \"Es posible que haya...\" or \"Puede que haya...\"\n\n3. Florencia says: \"En Buenos Aires, los misterios están en todas partes. Solo hay que saber mirar.\"\n\nFlorencia sees mystery everywhere — she doubts the obvious and questions appearances. Looking back at a moment in your past, what do you now question that you once took at face value? A relationship, a decision, a turning point?\n\nBegin with: \"No estoy seguro/a de que haya sido...\" or \"Dudo que...\"\n\n\nClose with: \"Dudo que haya sido...\" — expressing that some things in life are too meaningful to be mere coincidence."
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
    writing_prompt: "1. Florencia says: \"Ahora somos amigos. Cuando compartís un mate, ya no sos un extraño.\"\n\nFlorencia tells you that sharing mate means you belong. In your life, what ritual or moment marked the shift from being an outsider to being welcomed? What do you hope that experience has taught you about connection?\n\nBegin with: \"Espero que hayas experimentado...\" or \"Me alegra que hayas...\"\n\n2. Florencia says: \"Mi abuela no pudo venir al asado, pero siempre está presente.\"\n\nFlorencia's grandmother \"couldn't make it,\" but she is always present in spirit. Think about someone whose absence you feel, even when surrounded by others. What do you wish you had told them during a shared moment?\n\nBegin with: \"Ojalá hayas tenido...\" or \"Espero que hayas sentido...\"\n\n3. Florencia says: \"El mate no se toma solo. Se comparte.\"\n\nMate is never drunk alone — it's shared. Florencia is teaching you that belonging requires vulnerability and trust. When in your life have you let someone in, and how did it change you? What does belonging truly mean to you?\n\nBegin with: \"Me alegra que hayas podido...\" or \"Espero que hayas encontrado...\"\n\n\nClose with: \"Ojalá hayas...\" — expressing a wish that someone in your life knows how much they mean to you."
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
    writing_prompt: "1. Florencia says: \"Si hubiera sabido lo que mi abuela sacrificó... no habría preguntado tanto.\"\n\nFlorencia's grandmother Valentina Reyes was offered a role at Teatro Colón — the chance of a lifetime — but chose family instead. If you had known earlier what someone sacrificed for you, what would you have done differently?\n\nBegin with: \"Si hubiera sabido...\" or \"No habría...\"\n\n2. Florencia says: \"Ella también fue bailarina. Le ofrecieron un lugar en una compañía de tango... y no lo acepté.\"\n\nFlorencia herself was offered a spot in a tango company and didn't take it — just like her grandmother before her. Is there an opportunity you didn't take that still lives in your mind? What do you think would have happened if you had been braver?\n\nBegin with: \"Ojalá hubiera...\" or \"Si hubiera tenido el valor...\"\n\n3. Florencia says: \"Hay cosas que quería decirle y ya no puedo.\"\n\nFlorencia stands at her grandmother's grave at Chacarita, carrying words she never said. Is there someone in your life — gone or simply distant — to whom you owe unspoken words? What would you say if you could go back?\n\nBegin with: \"Hubiera querido...\" or \"Si hubiera sabido...\"\n\n\nClose with: \"Si hubiera...\" — imagining a different past, but accepting the present with grace."
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
    writing_prompt: "1. Florencia says: \"Quisiera que pudieras ver lo que yo veo cuando miro este escenario.\"\n\nYou're standing inside Teatro Colón — the stage where Florencia's grandmother almost performed. If you could stand in a place that represents someone else's unfulfilled dream, what would you wish for them? What dream would you want to bring back to life?\n\nBegin with: \"Quisiera que...\" or \"Si pudiera...\"\n\n2. Florencia says: \"Los artistas sacrifican todo para que otros puedan sentir algo.\"\n\nFlorencia reflects on what artists give up so that others can feel something real. Have you ever given up something important so that someone else could benefit? What made that sacrifice feel worth it — or did it?\n\nBegin with: \"Como si fuera...\" or \"Aunque fuera difícil...\"\n\n3. Florencia says: \"La ilusión y la realidad... a veces no hay diferencia.\"\n\nAt Teatro Colón, illusion and reality blur. Florencia asks whether beauty can reshape the world. Is there a dream you hold that others might call an illusion? What would it take for that dream to become real?\n\nBegin with: \"Desearía que...\" or \"Si tuviera la oportunidad...\"\n\n\nClose with: \"Quisiera que...\" — expressing the dream you would bring to life if nothing stood in your way."
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
    writing_prompt: "1. Florencia says: \"La gente pintó estas casas con lo que tenía. No tenían mucho, pero lo hicieron hermoso.\"\n\nIn La Boca, poor immigrant families painted their homes with leftover ship paint — and created one of the most beautiful neighborhoods in the world. Think of a time when you built something meaningful out of very little. What did that experience teach you?\n\nBegin with: \"Como si fuera...\" or \"Aunque pareciera...\"\n\n2. Florencia says: \"A veces las ilusiones pueden ser tan reales como la realidad.\"\n\nFlorencia says illusions can be as real as reality — if you choose to believe. Is there something you believe in that others might call naive or unrealistic? A hope, a conviction, a vision for the future?\n\nBegin with: \"Como si existiera...\" or \"Aunque no fuera obvio...\"\n\n3. Florencia says: \"A veces hay que creer primero para que se haga real.\"\n\nSometimes you have to believe first for something to become real. Florencia and you are standing in a place built by dreamers. When in your life has a hope or belief — one that others doubted — actually become your reality?\n\nBegin with: \"Para que fuera posible...\" or \"Como si ya fuera real...\"\n\n\nClose with: \"Como si...\" — describing your life as though the dream you believe in were already true."
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
    writing_prompt: "1. Florencia says: \"Este mate lo compré en San Telmo... el día que nos conocimos. Era para ti.\"\n\nThe secret purchase from Episode 3 was a mate cup — and it was for you all along. Florencia planned this farewell gift from the moment your friendship began. Has someone ever shown you that they valued your connection more than you realized? What do you wish you had known sooner?\n\nBegin with: \"Espero que...\" or \"Me alegra que haya...\" or \"Quisiera que...\"\n\n2. Florencia says: \"Gracias por caminar conmigo.\"\n\nFlorencia thanks you for walking alongside her through Buenos Aires, through memories of her grandmother, and through her own grief. Who in your life has walked alongside you? If you could thank them using everything this journey has taught you, what would you say?\n\nBegin with: \"Ojalá que...\" or \"Si pudiera...\" or \"Hubiera querido...\"\n\n3. Florencia says: \"Los sueños que compartimos... esos no tienen que terminar nunca.\"\n\nThe shared dreams don't have to end. This is the final episode, but Florencia is telling you that what you've built together — in language, in connection, in understanding — continues. What dreams do you carry forward? What do you wish for yourself and those you love?\n\nBegin with: \"Quiero que...\" or \"Espero que...\" or \"Ojalá...\"\n\n\nClose with: \"Los sueños que compartimos...\" — honoring what this journey gave you, and the dreams that continue."
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
