#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:4000}"
WEB_BASE_URL="${WEB_BASE_URL:-http://127.0.0.1:3000}"
WORKER_BASE_URL="${WORKER_BASE_URL:-http://127.0.0.1:4100}"
GATEWAY_BASE_URL="${GATEWAY_BASE_URL:-http://127.0.0.1:4200}"
DOCS_BASE_URL="${DOCS_BASE_URL:-http://127.0.0.1:4300}"
SMOKE_LOGIN_EMAIL="${SMOKE_LOGIN_EMAIL:-admin@acme.local}"
SMOKE_LOGIN_PASSWORD="${SMOKE_LOGIN_PASSWORD:-ChangeMe123!}"

if ! command -v jq >/dev/null 2>&1; then
  echo "[smoke] jq is required for auth smoke checks"
  exit 1
fi

check_health() {
  local name="$1"
  local url="$2"
  echo "[smoke] checking ${name} health: ${url}"
  curl -fsS "$url" > /tmp/"${name}"-health.json
  grep -q '"status":"ok"' /tmp/"${name}"-health.json
}

check_web_page() {
  local name="$1"
  local url="$2"
  echo "[smoke] checking web page: ${url}"
  curl -fsS "$url" > /tmp/"${name}"-page.html
  grep -qi "<html" /tmp/"${name}"-page.html
}

check_authed_api_get() {
  local name="$1"
  local path="$2"
  echo "[smoke] checking authed api endpoint: ${path}"
  curl -fsS "${API_BASE_URL}${path}" \
    -H "Authorization: Bearer ${SMOKE_TOKEN}" \
    -H "x-company-id: ${SMOKE_COMPANY_ID}" > /tmp/"${name}"-api.json
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

echo "[smoke] checking auth/login flow: ${API_BASE_URL}/auth/login"
curl -fsS -X POST "${API_BASE_URL}/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${SMOKE_LOGIN_EMAIL}\",\"password\":\"${SMOKE_LOGIN_PASSWORD}\"}" > /tmp/api-login.json

SMOKE_TOKEN="$(jq -r '.token // empty' /tmp/api-login.json)"
SMOKE_COMPANY_ID="$(jq -r '.defaultCompanyId // empty' /tmp/api-login.json)"

if [ -z "${SMOKE_TOKEN}" ] || [ -z "${SMOKE_COMPANY_ID}" ]; then
  echo "[smoke] login response missing token or defaultCompanyId"
  exit 1
fi

check_authed_api_get "auth-me" "/auth/me"
check_authed_api_get "documents" "/documents?limit=5"
check_authed_api_get "approvals" "/approvals/inbox"
check_authed_api_get "attendance-ledger" "/attendance/ledgers?limit=5"
check_authed_api_get "expenses" "/expenses/claims?limit=5"

check_web_page "dashboard" "${WEB_BASE_URL}/"
check_web_page "documents" "${WEB_BASE_URL}/documents"
check_web_page "approvals" "${WEB_BASE_URL}/approvals"
check_web_page "attendance-ledger" "${WEB_BASE_URL}/attendance/ledger"
check_web_page "expenses" "${WEB_BASE_URL}/expenses"

echo "[smoke] all checks passed"
