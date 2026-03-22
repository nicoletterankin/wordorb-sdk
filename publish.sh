#!/usr/bin/env bash
# Publish @wordorb/sdk to npm
#
# Before running this script:
#   1. Run: npm login
#   2. Create @wordorb org at: https://www.npmjs.com/org/create
#      (free tier, name: wordorb)
#
# Usage: bash publish.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Checking npm auth..."
USERNAME=$(npm whoami 2>/dev/null) || { echo "ERROR: Not logged in. Run 'npm login' first."; exit 1; }
echo "    Logged in as: $USERNAME"

echo "==> Building..."
npm run build

echo "==> Publishing @wordorb/sdk@1.0.0..."
npm publish --access public

echo ""
echo "==> SUCCESS!"
echo "    npm: https://www.npmjs.com/package/@wordorb/sdk"
echo "    Try: npx @wordorb/sdk courage"
