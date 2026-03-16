/**
 * Grammar Example Parser
 * 
 * Parses storyline-rewritten.txt to extract grammar examples from episode dialogues.
 * Generates a TypeScript data file for use in the mobile app.
 */

import * as fs from 'fs';
import * as path from 'path';

interface GrammarExample {
  spanish: string;
  english: string;
  grammar_form: string;
  grammar_type: string;
  scene_number: number;
  scene_context: string;
}

interface EpisodeGrammarData {
  episode_number: number;
  episode_title: string;
  grammar_focus: string;
  grammar_focus_spanish: string;
  setting: string;
  cultural_context: string;
  examples: GrammarExample[];
}

// Grammar focus mapping for Spanish names
const GRAMMAR_FOCUS_SPANISH: Record<string, string> = {
  'present_subjunctive_formation': 'El Subjuntivo Presente',
  'subjunctive_emotions': 'Subjuntivo con Emociones',
  'subjunctive_doubt': 'Subjuntivo con Duda (Perfecto)',
  'subjunctive_desires': 'Subjuntivo con Deseos (Perfecto)',
  'pluperfect_subjunctive': 'El Pluscuamperfecto del Subjuntivo',
  'imperfect_subjunctive': 'El Subjuntivo Imperfecto',
  'conditional_tense': 'El Condicional',
  'comprehensive_review': 'Repaso Completo',
};

// Map episode numbers to grammar focus keys
const EPISODE_GRAMMAR_KEYS: Record<number, string> = {
  1: 'present_subjunctive_formation',
  2: 'subjunctive_emotions',
  3: 'subjunctive_doubt',
  4: 'subjunctive_desires',
  5: 'pluperfect_subjunctive',
  6: 'imperfect_subjunctive',
  7: 'conditional_tense',
  8: 'comprehensive_review',
};

function parseStorylineFile(filePath: string): EpisodeGrammarData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const episodes: EpisodeGrammarData[] = [];
  
  // Split by episode markers
  const episodeRegex = /={80}\nEPISODE (\d+): ([^\n]+)\nGrammar Focus: ([^\n]+)\nCharacters: ([^\n]+)\nSetting: ([^\n]+)\n={80}\n\nCultural Context:\n([\s\S]*?)(?=--- Scene|\n={80})/g;
  
  // Alternative pattern for finding episodes
  const episodeSections = content.split(/={80}\nEPISODE/);
  
  for (let i = 1; i < episodeSections.length; i++) {
    const section = 'EPISODE' + episodeSections[i];
    
    // Parse episode header
    const headerMatch = section.match(/EPISODE (\d+): ([^\n]+)\nGrammar Focus: ([^\n]+)\n(?:Characters: ([^\n]+)\n)?Setting: ([^\n]+)/);
    
    if (!headerMatch) continue;
    
    const episodeNumber = parseInt(headerMatch[1]);
    const episodeTitle = headerMatch[2].trim();
    const grammarFocus = headerMatch[3].trim();
    const setting = headerMatch[5]?.trim() || '';
    
    // Extract cultural context
    const culturalMatch = section.match(/Cultural Context:\n([\s\S]*?)(?=--- Scene)/);
    const culturalContext = culturalMatch ? culturalMatch[1].trim() : '';
    
    // Find all grammar examples in this episode
    const examples: GrammarExample[] = [];
    
    // Match scenes with grammar annotations
    const sceneRegex = /--- Scene (\d+)[^\n]*\n(?:\[[^\]]+\]\n)*\[GRAMMAR: ([^\]]+)\]\n\n(?:FLORENCIA|WAITER) \(Spanish\):\n([^\n]+)\n\nFLORENCI?A \(English\):\n([^\n]+)/g;
    
    let sceneMatch;
    while ((sceneMatch = sceneRegex.exec(section)) !== null) {
      const sceneNumber = parseInt(sceneMatch[1]);
      const grammarAnnotation = sceneMatch[2];
      const spanishDialogue = sceneMatch[3].trim();
      const englishDialogue = sceneMatch[4].trim();
      
      // Parse grammar annotation - format: "Type - "form" - description"
      const grammarParts = grammarAnnotation.split(' - ');
      const grammarType = grammarParts[0]?.trim() || grammarAnnotation;
      const grammarForm = grammarParts[1]?.replace(/"/g, '').trim() || '';
      const sceneContext = grammarParts[2]?.trim() || 'Florencia speaking';
      
      examples.push({
        spanish: spanishDialogue,
        english: englishDialogue,
        grammar_form: grammarForm,
        grammar_type: grammarType,
        scene_number: sceneNumber,
        scene_context: generateSceneContext(episodeNumber, sceneNumber, sceneContext),
      });
    }
    
    const grammarKey = EPISODE_GRAMMAR_KEYS[episodeNumber] || 'unknown';
    
    episodes.push({
      episode_number: episodeNumber,
      episode_title: episodeTitle,
      grammar_focus: grammarKey,
      grammar_focus_spanish: GRAMMAR_FOCUS_SPANISH[grammarKey] || grammarFocus,
      setting: setting,
      cultural_context: culturalContext,
      examples: examples,
    });
  }
  
  return episodes;
}

function generateSceneContext(episodeNumber: number, sceneNumber: number, rawContext: string): string {
  // Generate more descriptive context based on episode and scene
  const contextMap: Record<number, Record<number, string>> = {
    1: {
      5: 'Florencia revealing her family\'s connection to Café Tortoni',
      8: 'Florencia sharing her philosophy about Buenos Aires',
      9: 'Florencia suggesting fate brought you together',
      13: 'Florencia recommending you try local coffee',
      15: 'Florencia hinting at her grandmother\'s tango legacy',
      16: 'Florencia inviting you to dance tango',
      19: 'Florencia promising discoveries about yourself',
      20: 'Florencia on the blur between reality and illusion',
      21: 'Florencia wanting to share her favorite places',
    },
    2: {
      2: 'Arriving at the historic Salón Marabú',
      4: 'Florencia moved by your presence at the milonga',
      6: 'Watching tango couples communicate through dance',
      8: 'Florencia marveling at music\'s power',
      10: 'Florencia inviting you to dance',
      11: 'Florencia reassuring you about not knowing the steps',
      13: 'Florencia encouraging your first tango attempts',
      15: 'Florencia impressed by your natural movement',
      16: 'Sharing a special moment while dancing',
      18: 'Florencia intrigued by your mystery',
    },
    3: {
      3: 'Introducing mate culture at San Telmo market',
      5: 'Florencia challenging you to understand mate\'s importance',
      9: 'Florencia curious about what you found at the market',
      11: 'Discovering the Di Sarli record was no coincidence',
      12: 'Florencia on the universe\'s hidden connections',
      14: 'Florencia teasing about her secret purchase',
      15: 'Florencia playfully guarding her mystery',
      17: 'Florencia on San Telmo\'s authentic Buenos Aires character',
      19: 'Florencia inviting you to her family\'s asado',
      21: 'Reflecting on the special day at San Telmo',
    },
    4: {
      3: 'Welcoming you to her family\'s asado',
      4: 'Florencia glad you accepted the invitation',
      6: 'Hoping you came hungry for authentic asado',
      8: 'Florencia happy you remembered the mate lesson',
      10: 'Offering you mate for the first time',
      12: 'Celebrating your first mate together',
      14: 'Florencia glad you met her family',
      16: 'Florencia sorry you couldn\'t meet her grandmother',
      18: 'Hoping you enjoyed the day\'s experience',
      20: 'Promising to share more about her grandmother',
    },
    5: {
      4: 'Explaining why she didn\'t tell you sooner',
      6: 'Imagining if you had known Di Sarli',
      8: 'Sharing her grandmother\'s Teatro Colón opportunity',
      9: 'Revealing her grandmother\'s sacrifice for family',
      10: 'Wondering about the path not taken',
      12: 'Wishing she had her grandmother\'s courage',
      13: 'Confessing her own missed opportunity',
      14: 'Regretting letting fear decide',
      15: 'Imagining her grandmother\'s guidance',
      17: 'Grateful for your support at the cemetery',
    },
    6: {
      3: 'Florencia on dressing like it\'s your last night',
      4: 'Complimenting your elegant appearance',
      6: 'Reflecting on tango\'s transformation from poverty to art',
      7: 'Wishing she could show you her stage feelings',
      8: 'Hinting at her artist identity',
      10: 'Artists creating illusions with beauty',
      12: 'Asking about the line between reality and illusion',
      13: 'Questioning what you feel is real',
      16: 'Wishing the moment would last forever',
    },
    7: {
      3: 'Describing La Boca\'s colorful history',
      4: 'Explaining why the houses are so colorful',
      5: 'Reflecting on necessity becoming art',
      7: 'Asking what\'s real in your story together',
      8: 'Confessing she sometimes loses herself in performance',
      9: 'Feeling an unexpected connection with you',
      11: 'Questioning if illusions can be real',
      12: 'Unable to choose a favorite moment',
      13: 'Noticing how time passes differently with you',
      16: 'Wishing she could stop time',
    },
    8: {
      3: 'Ordering coffee at Café Tortoni',
      7: 'Glad you came for the final meeting',
      9: 'Explaining why she bought the mate cup',
      11: 'Pointing out a photo you haven\'t seen',
      13: 'Showing you her grandmother\'s photo',
      16: 'Reminiscing about the eight weeks together',
      17: 'Playfully teasing about what was real',
      20: 'Hoping you\'ll return someday',
      22: 'Wishing you enjoy the mate gift',
      25: 'Final advice about dreaming',
    },
  };
  
  return contextMap[episodeNumber]?.[sceneNumber] || rawContext || 'Florencia speaking';
}

function generateTypeScriptOutput(episodes: EpisodeGrammarData[]): string {
  const output = `/**
 * Episode Dialogue Grammar Examples
 * 
 * Auto-generated from storyline-rewritten.txt
 * Contains grammar examples extracted from each episode's dialogue
 */

export interface DialogueExample {
  spanish: string;
  english: string;
  grammar_form: string;
  grammar_type: string;
  scene_number: number;
  scene_context: string;
}

export interface EpisodeDialogueData {
  episode_number: number;
  episode_title: string;
  grammar_focus: string;
  grammar_focus_spanish: string;
  setting: string;
  cultural_context: string;
  examples: DialogueExample[];
}

export const episodeDialogueExamples: EpisodeDialogueData[] = ${JSON.stringify(episodes, null, 2)};

/**
 * Get dialogue examples for a specific episode
 */
export function getEpisodeDialogueExamples(episodeNumber: number): EpisodeDialogueData | null {
  return episodeDialogueExamples.find(e => e.episode_number === episodeNumber) || null;
}

/**
 * Get dialogue examples by grammar focus key
 */
export function getDialogueExamplesByGrammarFocus(grammarFocus: string): EpisodeDialogueData | null {
  return episodeDialogueExamples.find(e => e.grammar_focus === grammarFocus) || null;
}
`;

  return output;
}

// Main execution
const storylinePath = path.join(__dirname, 'storyline-rewritten.txt');
const outputPath = path.join(__dirname, '../../mobile/src/data/episodeDialogueExamples.ts');

console.log('📖 Parsing storyline file...');
const episodes = parseStorylineFile(storylinePath);

console.log(`✅ Found ${episodes.length} episodes with grammar examples:`);
episodes.forEach(ep => {
  console.log(`   Episode ${ep.episode_number}: ${ep.episode_title} - ${ep.examples.length} examples`);
});

console.log('\n📝 Generating TypeScript output...');
const tsOutput = generateTypeScriptOutput(episodes);

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, tsOutput);
console.log(`✅ Written to: ${outputPath}`);
