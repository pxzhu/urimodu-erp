#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

RUN_ID="${1:-}"
if [[ -z "${RUN_ID}" ]]; then
  RUN_ID="$(find docs/qa/runs -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort | tail -n 1)"
fi

if [[ -z "${RUN_ID}" ]]; then
  echo "[qa:validate] no run id found. create one first with: pnpm qa:init"
  exit 1
fi

RUN_DIR="docs/qa/runs/${RUN_ID}"
if [[ ! -d "${RUN_DIR}" ]]; then
  echo "[qa:validate] run directory not found: ${RUN_DIR}"
  exit 1
fi

ARTIFACT_DIR="${RUN_DIR}/artifacts"
mkdir -p "${ARTIFACT_DIR}"

RESULTS=()

run_check() {
  local name="$1"
  shift
  local log_file="${ARTIFACT_DIR}/${name}.log"
  echo "[qa:validate] running ${name}: $*"
  if "$@" >"${log_file}" 2>&1; then
    RESULTS+=("${name}=PASS")
    echo "[qa:validate] ${name}: PASS"
  else
    RESULTS+=("${name}=FAIL")
    echo "[qa:validate] ${name}: FAIL (see ${log_file})"
  fi
}

run_check lint corepack pnpm -r lint
run_check typecheck corepack pnpm -r typecheck
run_check test corepack pnpm -r test
run_check build corepack pnpm -r build
run_check smoke ./scripts/smoke-stack.sh

if [[ "${QA_INCLUDE_GO:-0}" == "1" ]]; then
  run_check go-test bash -lc "cd agents/edge-agent && go test ./..."
fi

SUMMARY_FILE="${ARTIFACT_DIR}/summary.txt"
{
  echo "run_id=${RUN_ID}"
  echo "date=$(date '+%F %T %Z')"
  echo "branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo N/A)"
  echo "commit=$(git rev-parse --short HEAD 2>/dev/null || echo N/A)"
  printf '%s\n' "${RESULTS[@]}"
} > "${SUMMARY_FILE}"

echo "[qa:validate] summary written: ${SUMMARY_FILE}"

if printf '%s\n' "${RESULTS[@]}" | grep -q "=FAIL$"; then
  exit 1
fi

echo "[qa:validate] all checks passed"
