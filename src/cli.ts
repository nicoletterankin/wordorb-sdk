#!/usr/bin/env node

/**
 * @wordorb/sdk CLI
 *
 * Usage:
 *   npx @wordorb/sdk courage
 *   npx @wordorb/sdk --lesson 42
 *   npx @wordorb/sdk --quiz 42
 *   npx @wordorb/sdk --graph courage
 *   npx @wordorb/sdk --stats
 *   npx @wordorb/sdk courage --lang es
 *   npx @wordorb/sdk --help
 */

import { WordOrb } from "./index.js";
import type { WordResult, LessonResult, QuizResult, GraphResult, StatsResult } from "./types.js";
import { WordOrbError, RateLimitError, AuthError } from "./errors.js";

const HELP = `
  Word Orb SDK CLI — https://wordorb.ai

  USAGE
    npx @wordorb/sdk <word>           Look up a word
    npx @wordorb/sdk --lesson <day>   Get lesson for day (1-365)
    npx @wordorb/sdk --quiz <day>     Get quiz for day (1-365)
    npx @wordorb/sdk --graph <word>   Knowledge graph for a word
    npx @wordorb/sdk --stats          Platform statistics

  OPTIONS
    --lang <code>     Language code (e.g. es, fr, ja)
    --track <name>    Lesson track (learn, teach, grow, trivia)
    --key <key>       API key (or set WORDORB_API_KEY env var)
    --json            Output raw JSON
    --help            Show this help

  EXAMPLES
    npx @wordorb/sdk serendipity
    npx @wordorb/sdk courage --lang ja
    npx @wordorb/sdk --lesson 81 --track grow
    npx @wordorb/sdk --graph integrity
    WORDORB_API_KEY=wo_xxx npx @wordorb/sdk resilience
`;

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--stats") {
      args.stats = true;
    } else if (
      arg.startsWith("--") &&
      i + 1 < argv.length &&
      !argv[i + 1].startsWith("--")
    ) {
      args[arg.slice(2)] = argv[++i];
    } else if (!arg.startsWith("--")) {
      positional.push(arg);
    }
  }

  if (positional.length > 0) {
    args.word = positional.join(" ");
  }

  return args;
}

function formatWord(w: WordResult): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(`  ${w.word}  ${w.ipa}  (${w.pos})`);
  lines.push(`  ${"─".repeat(50)}`);
  lines.push(`  ${w.def}`);
  lines.push("");
  lines.push(`  Etymology: ${w.etym}`);
  lines.push("");

  // Top translations (up to 10)
  const langEntries = Object.entries(w.langs).slice(0, 10);
  if (langEntries.length > 0) {
    lines.push(
      `  Translations: ${langEntries.map(([k, v]) => `${k}:${v}`).join("  ")}`
    );
    const remaining = Object.keys(w.langs).length - langEntries.length;
    if (remaining > 0) lines.push(`  ... and ${remaining} more languages`);
    lines.push("");
  }

  lines.push(`  Tones:`);
  lines.push(`    Child: ${w.tones.child}`);
  lines.push(`    Teen:  ${w.tones.teen}`);
  lines.push(`    Adult: ${w.tones.adult}`);
  lines.push("");

  return lines.join("\n");
}

function formatLesson(l: LessonResult): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(`  Day ${l.day} — ${l.title}`);
  lines.push(`  Track: ${l.track}  |  Theme: ${l.theme}  |  Archetype: ${l.archetype}`);
  lines.push(`  ${"─".repeat(50)}`);

  for (const [phase, text] of Object.entries(l.phases)) {
    lines.push("");
    lines.push(`  [${phase.toUpperCase()}]`);
    // Word wrap at ~72 chars
    const words = (text as string).split(" ");
    let line = "  ";
    for (const word of words) {
      if (line.length + word.length > 74) {
        lines.push(line);
        line = "  " + word;
      } else {
        line += (line.trim() ? " " : "") + word;
      }
    }
    if (line.trim()) lines.push(line);
  }
  lines.push("");
  return lines.join("\n");
}

function formatQuiz(q: QuizResult): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(`  Day ${q.day} Assessment — ${q.count} interactions`);
  lines.push(`  ${"─".repeat(50)}`);

  const shown = q.interactions.slice(0, 5);
  for (const [i, interaction] of shown.entries()) {
    lines.push("");
    lines.push(`  ${i + 1}. [${interaction.type}] ${interaction.prompt}`);
    if (interaction.choices) {
      for (const c of interaction.choices) {
        lines.push(`     - ${c}`);
      }
    }
    lines.push(`     Answer: ${interaction.answer}`);
  }

  if (q.interactions.length > 5) {
    lines.push(`\n  ... and ${q.interactions.length - 5} more interactions`);
  }
  lines.push("");
  return lines.join("\n");
}

function formatGraph(g: GraphResult): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(`  "${g.word}" — Knowledge Graph`);
  lines.push(`  Appears in ${g.appears_in} lessons`);
  lines.push(`  ${"─".repeat(50)}`);

  const shown = g.lessons.slice(0, 8);
  for (const l of shown) {
    lines.push(`  Day ${String(l.day).padStart(3)} (${l.track}/${l.phase}) importance:${l.importance}`);
  }
  if (g.lessons.length > 8) {
    lines.push(`  ... and ${g.lessons.length - 8} more`);
  }

  lines.push("");
  lines.push(`  Related: ${g.related_words.slice(0, 12).join(", ")}`);
  lines.push("");
  return lines.join("\n");
}

function formatStats(s: StatsResult): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(`  Word Orb Platform — v${s.version}`);
  lines.push(`  ${"─".repeat(50)}`);
  lines.push(`  Words:         ${s.products.word_orb.words.toLocaleString()}`);
  lines.push(`  Lessons:       ${s.products.lesson_orb.base_lessons.toLocaleString()}`);
  lines.push(`  Variants:      ${s.products.lesson_orb.archetype_variants.toLocaleString()}`);
  lines.push(`  Interactions:  ${s.products.quiz_orb.interactions.toLocaleString()}`);
  lines.push(`  Graph links:   ${s.products.knowledge_graph.word_lesson_links.toLocaleString()}`);
  lines.push(`  Active keys:   ${s.active_keys}`);
  lines.push(`  Calls today:   ${s.calls_today}`);
  lines.push("");
  lines.push("  Tiers:");
  for (const [name, tier] of Object.entries(s.tiers)) {
    lines.push(`    ${name.padEnd(12)} ${String(tier.daily_limit).padEnd(10)} ${tier.price}`);
  }
  lines.push("");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || Object.keys(args).length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const orb = new WordOrb({
    apiKey: args.key as string | undefined,
  });

  const asJson = !!args.json;

  try {
    if (args.stats) {
      const result = await orb.stats();
      console.log(asJson ? JSON.stringify(result, null, 2) : formatStats(result));
    } else if (args.lesson) {
      const day = parseInt(args.lesson as string, 10);
      if (isNaN(day) || day < 1 || day > 365) {
        console.error("Error: --lesson requires a day number (1-365)");
        process.exit(1);
      }
      const result = await orb.lesson(day, {
        track: args.track as string | undefined,
        lang: args.lang as string | undefined,
      });
      console.log(asJson ? JSON.stringify(result, null, 2) : formatLesson(result));
    } else if (args.quiz) {
      const day = parseInt(args.quiz as string, 10);
      if (isNaN(day) || day < 1 || day > 365) {
        console.error("Error: --quiz requires a day number (1-365)");
        process.exit(1);
      }
      const result = await orb.quiz(day, {
        track: args.track as string | undefined,
        lang: args.lang as string | undefined,
      });
      console.log(asJson ? JSON.stringify(result, null, 2) : formatQuiz(result));
    } else if (args.graph) {
      const result = await orb.graph(args.graph as string);
      console.log(asJson ? JSON.stringify(result, null, 2) : formatGraph(result));
    } else if (args.word) {
      const result = await orb.enrich(args.word as string, {
        lang: args.lang as string | undefined,
      });
      console.log(asJson ? JSON.stringify(result, null, 2) : formatWord(result));
    } else {
      console.log(HELP);
    }
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.error(`Rate limited. Retry after ${err.retryAfter}s. Get an API key at https://wordorb.ai/pricing`);
    } else if (err instanceof AuthError) {
      console.error(`Authentication failed: ${err.message}`);
      console.error("Set WORDORB_API_KEY or pass --key wo_...");
    } else if (err instanceof WordOrbError) {
      console.error(`API error (${err.status}): ${err.message}`);
      if (err.traceId) console.error(`Trace ID: ${err.traceId}`);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

main();
