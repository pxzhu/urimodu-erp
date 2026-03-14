#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:4000}"
WEB_BASE_URL="${WEB_BASE_URL:-http://localhost:3000}"
WORKER_BASE_URL="${WORKER_BASE_URL:-http://localhost:4100}"
GATEWAY_BASE_URL="${GATEWAY_BASE_URL:-http://localhost:4200}"
DOCS_BASE_URL="${DOCS_BASE_URL:-http://localhost:4300}"

check_health() {
  local name="$1"
  local url="$2"
  echo "[smoke] checking ${name} health: ${url}"
  curl -fsS "$url" > /tmp/"${name}"-health.json
  grep -q '"status":"ok"' /tmp/"${name}"-health.json
}

check_health "web" "${WEB_BASE_URL}/health"
check_health "api" "${API_BASE_URL}/health"
check_health "worker" "${WORKER_BASE_URL}/health"
check_health "gateway" "${GATEWAY_BASE_URL}/health"
check_health "docs" "${DOCS_BASE_URL}/health"

echo "[smoke] checking swagger json: ${API_BASE_URL}/swagger-json"
curl -fsS "${API_BASE_URL}/swagger-json" > /tmp/api-swagger.json
grep -q '"openapi"' /tmp/api-swagger.json

echo "[smoke] checking docs-service templates: ${DOCS_BASE_URL}/templates"
curl -fsS "${DOCS_BASE_URL}/templates" > /tmp/docs-templates.json
grep -q 'leave-request.html' /tmp/docs-templates.json

echo "[smoke] checking docs-service pdf render: ${DOCS_BASE_URL}/render/pdf"
curl -fsS -X POST "${DOCS_BASE_URL}/render/pdf" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Smoke Test","html":"<h1>스모크 테스트</h1><p>문서 렌더 확인</p>"}' \
  -o /tmp/docs-smoke.pdf

test -s /tmp/docs-smoke.pdf

echo "[smoke] all checks passed"
