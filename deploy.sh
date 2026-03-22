#!/usr/bin/env bash
# Deploy @wordorb/sdk — init git, create GitHub repo, publish to npm
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Initializing git repo..."
git init
git add -A
git commit -m "feat: @wordorb/sdk v1.0.0 — Official Word Orb API SDK

TypeScript SDK with zero-config free tier, auto-retry on rate limits,
CLI tool, and full type declarations.

- WordOrb.enrich() — word enrichment (162K+ words, 47 languages)
- WordOrb.lesson() — calendar-locked daily lessons (365 days, 4 tracks)
- WordOrb.quiz() — assessment interactions
- WordOrb.graph() — knowledge graph connections
- WordOrb.stats() — platform statistics
- WordOrb.ethics() — ethics/tone analysis
- CLI: npx @wordorb/sdk courage
- Error classes: WordOrbError, RateLimitError, AuthError
- Exponential backoff on rate limits (429)
- Works in Node 18+, Deno, Bun, Cloudflare Workers"

echo "==> Creating GitHub repo..."
gh repo create nicoletterankin/wordorb-sdk --public --source . --push --description "Official SDK for the Word Orb API — vocabulary enrichment, multilingual translations, daily lessons, assessments, and knowledge graph"

echo "==> Publishing to npm..."
npm publish --access public

echo ""
echo "==> Done!"
echo "    GitHub: https://github.com/nicoletterankin/wordorb-sdk"
echo "    npm:    https://www.npmjs.com/package/@wordorb/sdk"
