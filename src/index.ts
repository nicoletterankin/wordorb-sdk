/**
 * @wordorb/sdk — Official Node.js / TypeScript SDK for the Word Orb API
 *
 * Zero-config free tier (50 requests/day, no API key required).
 * Full docs: https://wordorb.ai/docs
 *
 * @example
 * ```ts
 * import { WordOrb } from "@wordorb/sdk";
 *
 * const orb = new WordOrb();                     // free tier
 * const orb = new WordOrb({ apiKey: "wo_..." }); // authenticated
 *
 * const word = await orb.enrich("courage");
 * console.log(word.def, word.ipa, word.langs.es);
 * ```
 */

import { WordOrbError, RateLimitError, AuthError } from "./errors.js";
import type {
  WordOrbOptions,
  EnrichOptions,
  WordResult,
  LessonOptions,
  LessonResult,
  QuizOptions,
  QuizResult,
  GraphResult,
  StatsResult,
  ApiErrorBody,
} from "./types.js";

// Re-export everything consumers need
export { WordOrbError, RateLimitError, AuthError } from "./errors.js";
export type {
  WordOrbOptions,
  EnrichOptions,
  WordResult,
  LessonOptions,
  LessonResult,
  QuizOptions,
  QuizResult,
  QuizInteraction,
  GraphResult,
  GraphLesson,
  StatsResult,
  TierInfo,
  WordTones,
  ApiErrorBody,
} from "./types.js";

const DEFAULT_BASE_URL = "https://wordorb.ai";
const DEFAULT_TIMEOUT = 15_000;
const DEFAULT_MAX_RETRIES = 3;
const SDK_VERSION = "1.0.0";

/** Sleep helper for backoff */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Word Orb API client.
 *
 * Works in Node.js 18+, Deno, Bun, Cloudflare Workers, and modern browsers
 * (anywhere `fetch` is available).
 */
export class WordOrb {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(options: WordOrbOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.WORDORB_API_KEY;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  // ── Core request engine ─────────────────────────────────────────

  private async request<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    attempt = 0
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": `@wordorb/sdk/${SDK_VERSION}`,
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort =
        err instanceof Error && err.name === "AbortError";
      if (isAbort) {
        throw new WordOrbError(0, {
          code: "timeout",
          error: `Request timed out after ${this.timeout}ms`,
          retryable: true,
        });
      }
      throw new WordOrbError(0, {
        code: "network_error",
        error: err instanceof Error ? err.message : "Network error",
        retryable: true,
      });
    } finally {
      clearTimeout(timer);
    }

    // Rate limit — auto-retry with exponential backoff
    if (response.status === 429 && attempt < this.maxRetries) {
      const retryAfter = parseInt(
        response.headers.get("Retry-After") ?? "1",
        10
      );
      const backoff = Math.min(retryAfter * 1000, 2 ** attempt * 1000);
      await sleep(backoff);
      return this.request<T>(path, params, attempt + 1);
    }

    // Parse body
    let body: T & Partial<ApiErrorBody>;
    try {
      body = (await response.json()) as T & Partial<ApiErrorBody>;
    } catch {
      throw new WordOrbError(response.status, {
        code: "parse_error",
        error: "Failed to parse JSON response",
        retryable: false,
      });
    }

    if (!response.ok) {
      const errBody = body as unknown as ApiErrorBody;
      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("Retry-After") ?? "60",
          10
        );
        throw new RateLimitError(429, errBody, retryAfter);
      }
      if (response.status === 401 || response.status === 403) {
        throw new AuthError(response.status, errBody);
      }
      throw new WordOrbError(response.status, errBody);
    }

    return body;
  }

  // ── Public methods ──────────────────────────────────────────────

  /**
   * Full word enrichment: definition, IPA, etymology, 47-language
   * translations, tone-adapted definitions, and media URLs.
   *
   * @param word  - The word to look up
   * @param options - Optional language override
   *
   * @example
   * ```ts
   * const result = await orb.enrich("serendipity");
   * console.log(result.def);        // definition
   * console.log(result.ipa);        // /ˌsɛrənˈdɪpɪti/
   * console.log(result.langs.ja);   // セレンディピティ
   * console.log(result.tones.child); // kid-friendly definition
   * ```
   */
  async enrich(word: string, options?: EnrichOptions): Promise<WordResult> {
    return this.request<WordResult>(`/api/word/${encodeURIComponent(word)}`, {
      lang: options?.lang,
    });
  }

  /**
   * Ethics analysis for a word. Returns tone-adapted definitions
   * that contextualise the word's ethical dimensions.
   *
   * Shorthand for `enrich(word)` focused on the tones object.
   *
   * @example
   * ```ts
   * const ethics = await orb.ethics("justice");
   * console.log(ethics.tones.adult);
   * ```
   */
  async ethics(word: string): Promise<WordResult> {
    return this.enrich(word);
  }

  /**
   * Retrieve a calendar-locked daily lesson (day 1-365).
   *
   * @param day     - Calendar day (1-365)
   * @param options - Track, archetype, language overrides
   *
   * @example
   * ```ts
   * const lesson = await orb.lesson(42);
   * console.log(lesson.title);
   * console.log(lesson.phases.hook);
   * ```
   */
  async lesson(day: number, options?: LessonOptions): Promise<LessonResult> {
    return this.request<LessonResult>("/api/lesson", {
      day: day.toString(),
      track: options?.track ?? "learn",
      archetype: options?.archetype,
      lang: options?.lang,
    });
  }

  /**
   * Retrieve assessments / quiz interactions for a calendar day.
   *
   * @param day     - Calendar day (1-365)
   * @param options - Track, language, count overrides
   *
   * @example
   * ```ts
   * const quiz = await orb.quiz(42);
   * for (const q of quiz.interactions) {
   *   console.log(q.prompt, "→", q.answer);
   * }
   * ```
   */
  async quiz(day: number, options?: QuizOptions): Promise<QuizResult> {
    return this.request<QuizResult>("/api/quiz", {
      day: day.toString(),
      track: options?.track ?? "learn",
      lang: options?.lang,
      count: options?.count,
    });
  }

  /**
   * Knowledge graph: find which lessons reference a word and
   * discover related words.
   *
   * @param word - The word to graph
   *
   * @example
   * ```ts
   * const g = await orb.graph("courage");
   * console.log(`Appears in ${g.appears_in} lessons`);
   * console.log("Related:", g.related_words.join(", "));
   * ```
   */
  async graph(word: string): Promise<GraphResult> {
    return this.request<GraphResult>("/api/graph/word", {
      word,
    });
  }

  /**
   * Platform statistics: word counts, lesson counts, tier info.
   *
   * @example
   * ```ts
   * const stats = await orb.stats();
   * console.log(`${stats.products.word_orb.words} words`);
   * ```
   */
  async stats(): Promise<StatsResult> {
    return this.request<StatsResult>("/api/stats");
  }
}

/**
 * Create a WordOrb client with default options.
 * Shorthand for `new WordOrb(options)`.
 */
export function createClient(options?: WordOrbOptions): WordOrb {
  return new WordOrb(options);
}

// Default export for convenience
export default WordOrb;
