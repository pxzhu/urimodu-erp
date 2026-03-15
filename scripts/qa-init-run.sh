#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

DATE_STAMP="$(date +%F)"
BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "local")"
SAFE_BRANCH="$(echo "${BRANCH_NAME}" | tr '/ ' '-' | tr -cd 'a-zA-Z0-9._-')"

RUN_ID="${1:-${DATE_STAMP}-${SAFE_BRANCH}}"
RUN_DIR="docs/qa/runs/${RUN_ID}"
API_BASE_URL="${QA_API_BASE_URL:-http://localhost:4000}"
SWAGGER_URL="${API_BASE_URL}/swagger-json"
SWAGGER_TEMP_FILE="${RUN_DIR}/api/.swagger.json.tmp"
SWAGGER_OUTPUT_FILE="${RUN_DIR}/api/swagger.json"

if [[ -e "${RUN_DIR}" ]]; then
  echo "[qa:init] run directory already exists: ${RUN_DIR}"
  exit 1
fi

mkdir -p "${RUN_DIR}/api" "${RUN_DIR}/pages" "${RUN_DIR}/features" \
  "${RUN_DIR}/screenshots/admin" "${RUN_DIR}/screenshots/user" "${RUN_DIR}/artifacts"

cat > "${RUN_DIR}/report.md" <<EOF
# QA Run Report: ${RUN_ID}

## Metadata

- Date: ${DATE_STAMP}
- Branch: ${BRANCH_NAME}
- Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")
- Tester: TODO
- Environment: TODO

## 1) Validation Command Results

| Command | Result | Log |
| --- | --- | --- |
| \`pnpm -r lint\` | TODO | \`artifacts/lint.log\` |
| \`pnpm -r typecheck\` | TODO | \`artifacts/typecheck.log\` |
| \`pnpm -r test\` | TODO | \`artifacts/test.log\` |
| \`pnpm -r build\` | TODO | \`artifacts/build.log\` |
| \`./scripts/smoke-stack.sh\` | TODO | \`artifacts/smoke.log\` |

## 2) API Coverage Summary

- Source: \`api/openapi-endpoints.csv\`
- Total endpoints: TODO
- Passed: TODO
- Failed: TODO
- Not executed (reason required): TODO

## 3) Web Page Coverage Summary

- Source: \`pages/page-checklist.csv\`
- Total pages: TODO
- Captured screenshots: TODO
- Missing screenshots (reason required): TODO

## 4) Feature Flow Coverage

- 상세 결과는 \`features/*.md\` 참고
- 핵심 기능군:
  - 인증/권한
  - 조직/직원
  - 문서/결재
  - 근태/휴가
  - 경비/회계
  - import/export

## 5) Known Issues / Follow-ups

- TODO

## 6) Whitepaper Notes

- 이번 런에서 강조 가능한 UX/업무흐름 포인트:
  - TODO
EOF

{
  echo "route,source_file,status,screenshot_admin,screenshot_user,notes"
  find apps/web/src/app -name "page.tsx" | sort | while read -r page_file; do
    route="${page_file#apps/web/src/app}"
    route="${route%/page.tsx}"
    if [[ -z "${route}" ]]; then
      route="/"
    else
      route="/${route#/}"
    fi
    echo "\"${route}\",\"${page_file}\",\"TODO\",\"\",\"\",\"\""
  done
} > "${RUN_DIR}/pages/page-checklist.csv"

if command -v jq >/dev/null 2>&1 && curl -fsS "${SWAGGER_URL}" -o "${SWAGGER_TEMP_FILE}"; then
  mv "${SWAGGER_TEMP_FILE}" "${SWAGGER_OUTPUT_FILE}"
  jq -r '
    ["method","path","operationId","tags","status","http_status","evidence","notes"],
    (
      .paths
      | to_entries[]
      | . as $pathEntry
      | $pathEntry.value
      | to_entries[]
      | select(.key | IN("get","post","put","patch","delete","options","head"))
      | [
          (.key | ascii_upcase),
          $pathEntry.key,
          (.value.operationId // ""),
          ((.value.tags // []) | join("|")),
          "TODO",
          "",
          "",
          ""
        ]
    )
    | @csv
  ' "${SWAGGER_OUTPUT_FILE}" > "${RUN_DIR}/api/openapi-endpoints.csv"
else
  rm -f "${SWAGGER_TEMP_FILE}" "${SWAGGER_OUTPUT_FILE}"
  echo "method,path,operationId,tags,status,http_status,evidence,notes" > "${RUN_DIR}/api/openapi-endpoints.csv"
  echo "[qa:init] OpenAPI fetch skipped (API not reachable or jq missing): ${SWAGGER_URL}"
fi

for feature in \
  auth-rbac \
  org-employee \
  documents-approvals \
  attendance-leave \
  expenses-finance \
  import-export \
  operations; do
  cat > "${RUN_DIR}/features/${feature}.md" <<EOF
# Feature QA: ${feature}

## Summary

- Feature group: TODO
- Owner area: TODO
- Status: TODO (\`PASS\` / \`FAIL\` / \`PARTIAL\`)

## Scope

- TODO

## Preconditions

- TODO

## Test Data

- TODO

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | TODO | TODO | TODO | TODO |

## Evidence

- API evidence: TODO
- UI screenshots: TODO

## Notes For Whitepaper

- 사용자 관점 가치: TODO
- 운영/개발 관점 가치: TODO

## Follow-up TODO

- TODO
EOF
done

echo "[qa:init] created: ${RUN_DIR}"
echo "[qa:init] next: pnpm qa:validate ${RUN_ID}"
