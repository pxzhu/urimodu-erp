#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if command -v helm >/dev/null 2>&1; then
  exec helm "$@"
fi

if command -v docker >/dev/null 2>&1; then
  exec docker run --rm \
    -v "${ROOT_DIR}:/workspace" \
    -w /workspace \
    alpine/helm:3.16.2 \
    "$@"
fi

echo "[helmw] helm not found and docker is unavailable." >&2
echo "[helmw] install helm locally or run where docker is available." >&2
exit 1
