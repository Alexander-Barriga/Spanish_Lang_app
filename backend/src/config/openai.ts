import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Conversation mode types
export type ConversationMode = 'open' | 'topic' | 'vocabulary' | 'grammar' | 'roleplay';

// Spanish levels for grammar focus
export type SpanishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// Grammar rules by level
export const grammarRulesByLevel: Record<SpanishLevel, string[]> = {
  A1: [
    'Present tense (regular verbs)',
    'Gender and articles',
    'Plural forms',
    'Basic adjectives',
    'Ser vs Estar (basic)',
    'Numbers and time',
  ],
  A2: [
    'Present tense (irregular verbs)',
    'Reflexive verbs',
    'Preterite tense',
    'Imperfect tense',
    'Direct object pronouns',
    'Indirect object pronouns',
  ],
  B1: [
    'Present subjunctive',
    'Commands (imperative)',
    'Future tense',
    'Conditional tense',
    'Por vs Para',
    'Relative pronouns',
  ],
  B2: [
    'Imperfect subjunctive',
    'Present perfect subjunctive',
    'Conditional perfect',
    'Passive voice',
    'Advanced prepositions',
    'Idiomatic expressions',
  ],
  C1: [
    'Pluperfect subjunctive',
    'Future perfect',
    'Advanced conditionals',
    'Literary tenses',
    'Regional variations',
    'Formal register',
  ],
  C2: [
    'All tenses mastery',
    'Stylistic nuances',
    'Dialectal variations',
    'Historical Spanish',
    'Professional/Academic Spanish',
    'Native-level expressions',
  ],
};

// Default topics for conversation
export const defaultTopics = [
  { id: 'sports', name: 'Deportes', description: 'Football, basketball, tennis, and more' },
  { id: 'philosophy', name: 'Filosofía', description: 'Deep discussions about life and meaning' },
  { id: 'cafes', name: 'Cafés y Restaurantes', description: 'Ordering, recommendations, small talk' },
  { id: 'dating', name: 'Citas y Relaciones', description: 'Romance, dating culture, expressions' },
  { id: 'restaurants', name: 'Restaurantes', description: 'Food, ordering, culinary vocabulary' },
  { id: 'travel', name: 'Viajes', description: 'Travel planning, destinations, experiences' },
  { id: 'work', name: 'Trabajo', description: 'Professional conversations, interviews' },
  { id: 'culture', name: 'Cultura', description: 'Art, music, cinema, literature' },
  { id: 'news', name: 'Actualidad', description: 'Current events and news discussions' },
  { id: 'daily', name: 'Vida Cotidiana', description: 'Everyday conversations and routines' },
];

// Pre-built role-play personas
export const defaultPersonas = [
  {
    id: 'teacher',
    name: 'Profesora Carmen',
    description: 'A patient Spanish teacher who can answer any language questions',
    personality: 'Patient, encouraging, knowledgeable, uses clear explanations',
  },
  {
    id: 'friend',
    name: 'Tu Amigo Miguel',
    description: 'A casual friend to practice everyday conversation',
    personality: 'Friendly, uses slang, relaxed, humorous',
  },
  {
    id: 'romantic',
    name: 'Tu Pareja',
    description: 'Practice romantic conversations and expressions',
    personality: 'Caring, uses terms of endearment, emotionally expressive',
  },
  {
    id: 'grandparent',
    name: 'Abuela Rosa',
    description: 'A wise grandmother with stories and life advice',
    personality: 'Warm, nostalgic, uses traditional expressions, wise',
  },
  {
    id: 'business',
    name: 'Sr. García',
    description: 'A formal business contact for professional practice',
    personality: 'Formal, professional, uses usted, business vocabulary',
  },
];

