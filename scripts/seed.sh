#!/usr/bin/env bash
set -euo pipefail

pnpm --filter @korean-erp/api prisma:seed
