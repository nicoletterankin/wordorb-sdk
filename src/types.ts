/**
 * @wordorb/sdk — Type definitions
 * https://wordorb.ai
 */

// ── Client Options ──────────────────────────────────────────────────

export interface WordOrbOptions {
  /** API key (starts with `wo_`). Omit for free tier (50 req/day). */
  apiKey?: string;
  /** Base URL override. Default: `https://wordorb.ai` */
  baseUrl?: string;
  /** Request timeout in milliseconds. Default: `15000` */
  timeout?: number;
  /** Maximum automatic retries on rate-limit (429). Default: `3` */
  maxRetries?: number;
}

// ── Word Enrichment ─────────────────────────────────────────────────

export interface EnrichOptions {
  /** ISO 639-1 language code for multilingual results */
  lang?: string;
}

export interface WordTones {
  child: string;
  teen: string;
  adult: string;
}

export interface WordResult {
  word: string;
  ipa: string;
  pos: string;
  def: string;
  etym: string;
  langs: Record<string, string>;
  tones: WordTones;
  image_url: string | null;
  audio_url: string | null;
  _source: string;
  _tier: string;
}

// ── Lessons ─────────────────────────────────────────────────────────

export interface LessonOptions {
  /** Track: learn, teach, grow, trivia. Default: `learn` */
  track?: string;
  /** Archetype override */
  archetype?: string;
  /** ISO 639-1 language code */
  lang?: string;
}

export interface LessonPhases {
  hook: string;
  story: string;
  wonder: string;
  action: string;
  wisdom: string;
}

export interface LessonResult {
  day: number;
  track: string;
  title: string;
  theme: string;
  age_group: string;
  language: string;
  archetype: string;
  phases: LessonPhases;
  archetypes_available: string[];
  languages_available: string[];
  _product: string;
  _tier: string;
}

// ── Quiz / Assessment ───────────────────────────────────────────────

export interface QuizOptions {
  /** Track: learn, teach, grow, trivia. Default: `learn` */
  track?: string;
  /** ISO 639-1 language code */
  lang?: string;
  /** Maximum interactions to return */
  count?: number;
}

export interface QuizInteraction {
  type: string;
  phase: string;
  age_group: string;
  language: string;
  prompt: string;
  choices: string[] | null;
  answer: string;
  explanation: string;
}

export interface QuizResult {
  day: number;
  track: string;
  age: string | null;
  lang: string | null;
  count: number;
  interactions: QuizInteraction[];
  _product: string;
  _tier: string;
}

// ── Knowledge Graph ─────────────────────────────────────────────────

export interface GraphLesson {
  day: number;
  track: string;
  phase: string;
  context: string | null;
  importance: number;
  lesson_url: string;
}

export interface GraphResult {
  word: string;
  appears_in: number;
  lessons: GraphLesson[];
  related_words: string[];
  word_url: string;
  _product: string;
  _tier: string;
}

// ── Stats ───────────────────────────────────────────────────────────

export interface TierInfo {
  daily_limit: number | string;
  price: string;
}

export interface StatsResult {
  products: {
    word_orb: { words: number; kv_cached: number; feedback: number };
    lesson_orb: {
      base_lessons: number;
      archetype_variants: number;
      total_blocks: number;
    };
    quiz_orb: { interactions: number };
    knowledge_graph: { word_lesson_links: number };
  };
  active_keys: number;
  calls_today: number;
  top_words_today: { word: string; lookups: number }[];
  tiers: Record<string, TierInfo>;
  version: string;
  ts: string;
}

// ── Error shapes ────────────────────────────────────────────────────

export interface ApiErrorBody {
  code: string;
  error: string;
  trace_id?: string;
  retryable?: boolean;
}
