#!/usr/bin/env bash
# Publish @wordorb/sdk to npm
# Run: bash publish.sh
#
# Prerequisites:
#   1. npm login (run `npm login` first if token expired)
#   2. @wordorb org must exist on npm (create at https://www.npmjs.com/org/create)
#      OR change package name to unscoped if org is unavailable
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Checking npm auth..."
npm whoami || { echo "ERROR: Not logged in. Run 'npm login' first."; exit 1; }

echo "==> Building..."
npm run build

echo "==> Publishing @wordorb/sdk..."
npm publish --access public

echo ""
echo "==> Published!"
echo "    https://www.npmjs.com/package/@wordorb/sdk"
