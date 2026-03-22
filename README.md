# @wordorb/sdk

Official Node.js / TypeScript SDK for the [Word Orb](https://wordorb.ai) API.

162,000+ words across 47 languages. Daily lessons, assessments, knowledge graph, and multilingual vocabulary enrichment.

## Quickstart

```bash
npm install @wordorb/sdk
```

```ts
import { WordOrb } from "@wordorb/sdk";

const orb = new WordOrb(); // free tier — 50 requests/day, no key needed

const word = await orb.enrich("courage");
console.log(word.def);        // "Courage is the ability to face fear..."
console.log(word.ipa);        // /ˈkɜːrɪdʒ/
console.log(word.langs.es);   // "coraje"
console.log(word.langs.ja);   // "勇気"
console.log(word.tones.child); // kid-friendly definition
```

## Authentication

```ts
// Option 1: Constructor
const orb = new WordOrb({ apiKey: "wo_..." });

// Option 2: Environment variable
// Set WORDORB_API_KEY=wo_...
const orb = new WordOrb(); // auto-reads env var

// Option 3: Free tier (no key)
const orb = new WordOrb(); // 50 requests/day
```

Get a free API key at [wordorb.ai/pricing](https://wordorb.ai/pricing).

## API Reference

### `orb.enrich(word, options?)`

Full word enrichment: definition, IPA pronunciation, etymology, translations across 47 languages, tone-adapted definitions, and media URLs.

```ts
const result = await orb.enrich("serendipity");
// result.word     → "serendipity"
// result.ipa      → "/ˌsɛrənˈdɪpɪti/"
// result.pos      → "noun"
// result.def      → full definition
// result.etym     → etymology
// result.langs    → { es: "serendipia", fr: "sérendipité", ... }
// result.tones    → { child: "...", teen: "...", adult: "..." }

// Multilingual override
const jp = await orb.enrich("courage", { lang: "ja" });
```

### `orb.ethics(word)`

Ethics and tone analysis for a word. Returns the same enrichment data with focus on contextual ethical dimensions across child, teen, and adult tones.

```ts
const ethics = await orb.ethics("justice");
console.log(ethics.tones.adult);
console.log(ethics.tones.child);
```

### `orb.lesson(day, options?)`

Calendar-locked daily lesson (day 1-365). Each lesson has five phases: hook, story, wonder, action, wisdom.

```ts
const lesson = await orb.lesson(42);
console.log(lesson.title);          // lesson title
console.log(lesson.theme);          // e.g. "ecology"
console.log(lesson.phases.hook);    // opening hook
console.log(lesson.phases.wisdom);  // closing wisdom

// Options
const lesson = await orb.lesson(42, {
  track: "grow",          // learn, teach, grow, trivia
  archetype: "explorer",  // explorer, scientist, rebel, ...
  lang: "es",             // ISO 639-1
});
```

### `orb.quiz(day, options?)`

Assessment interactions for a calendar day. Multiple question types: open, multiple-choice, and more.

```ts
const quiz = await orb.quiz(42);
console.log(quiz.count); // number of interactions

for (const q of quiz.interactions) {
  console.log(q.type);    // "open", "mcq", etc.
  console.log(q.prompt);
  console.log(q.answer);
}

// Options
const quiz = await orb.quiz(42, { track: "teach", lang: "fr" });
```

### `orb.graph(word)`

Knowledge graph: discover which lessons reference a word and find related words.

```ts
const g = await orb.graph("courage");
console.log(g.appears_in);     // 17
console.log(g.related_words);  // ["intention", "integrity", ...]

for (const lesson of g.lessons) {
  console.log(`Day ${lesson.day} (${lesson.track}/${lesson.phase})`);
}
```

### `orb.stats()`

Platform statistics. No authentication required.

```ts
const stats = await orb.stats();
console.log(stats.products.word_orb.words);    // 162253
console.log(stats.products.quiz_orb.interactions); // 64000+
console.log(stats.version);                    // "6.2.0"
```

## Error Handling

The SDK provides typed error classes with automatic retry on rate limits.

```ts
import { WordOrb, WordOrbError, RateLimitError, AuthError } from "@wordorb/sdk";

const orb = new WordOrb();

try {
  const word = await orb.enrich("test");
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${err.retryAfter}s`);
  } else if (err instanceof AuthError) {
    console.log("Invalid or missing API key");
  } else if (err instanceof WordOrbError) {
    console.log(`API error ${err.status}: ${err.message}`);
    console.log(`Trace ID: ${err.traceId}`);
  }
}
```

Rate limit responses (HTTP 429) are automatically retried up to 3 times with exponential backoff.

## CLI

Look up any word from the command line:

```bash
npx @wordorb/sdk courage

# Multilingual
npx @wordorb/sdk courage --lang ja

# Daily lesson
npx @wordorb/sdk --lesson 42

# Assessment
npx @wordorb/sdk --quiz 42

# Knowledge graph
npx @wordorb/sdk --graph integrity

# Platform stats
npx @wordorb/sdk --stats

# JSON output
npx @wordorb/sdk courage --json

# With API key
npx @wordorb/sdk resilience --key wo_...
```

## Framework Integrations

### Next.js / React Server Components

```ts
// app/word/[slug]/page.tsx
import { WordOrb } from "@wordorb/sdk";

const orb = new WordOrb({ apiKey: process.env.WORDORB_API_KEY });

export default async function WordPage({ params }: { params: { slug: string } }) {
  const word = await orb.enrich(params.slug);

  return (
    <div>
      <h1>{word.word} <span>{word.ipa}</span></h1>
      <p>{word.def}</p>
      <p><em>{word.etym}</em></p>
    </div>
  );
}
```

### Express / Fastify

```ts
import express from "express";
import { WordOrb } from "@wordorb/sdk";

const app = express();
const orb = new WordOrb({ apiKey: process.env.WORDORB_API_KEY });

app.get("/word/:word", async (req, res) => {
  try {
    const result = await orb.enrich(req.params.word);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000);
```

### Cloudflare Workers

```ts
import { WordOrb } from "@wordorb/sdk";

export default {
  async fetch(request: Request, env: { WORDORB_API_KEY: string }) {
    const orb = new WordOrb({ apiKey: env.WORDORB_API_KEY });
    const url = new URL(request.url);
    const word = url.pathname.slice(1) || "hello";
    const result = await orb.enrich(word);
    return Response.json(result);
  },
};
```

### Python (via subprocess)

```python
import subprocess, json

result = subprocess.run(
    ["npx", "@wordorb/sdk", "courage", "--json"],
    capture_output=True, text=True
)
word = json.loads(result.stdout)
print(word["def"])
```

## Configuration

```ts
const orb = new WordOrb({
  apiKey: "wo_...",           // optional — omit for free tier
  baseUrl: "https://wordorb.ai", // default
  timeout: 15000,             // ms, default 15s
  maxRetries: 3,              // rate-limit retries, default 3
});
```

## Requirements

- Node.js 18+ (uses native `fetch`)
- Also works in Deno, Bun, and Cloudflare Workers

## Links

- [API Documentation](https://wordorb.ai/docs)
- [API Playground](https://wordorb.ai/playground)
- [Dashboard](https://wordorb.ai/dashboard)
- [Pricing](https://wordorb.ai/pricing)
- [Lesson of the Day PBC](https://lotdpbc.com)

## License

MIT -- Lesson of the Day PBC
