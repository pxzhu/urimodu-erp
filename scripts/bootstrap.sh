#!/usr/bin/env bash
set -euo pipefail

corepack enable
pnpm install
pnpm --filter @korean-erp/api prisma:generate

echo "Bootstrap complete. Run: pnpm dev"
