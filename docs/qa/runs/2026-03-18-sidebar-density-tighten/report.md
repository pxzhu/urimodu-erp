# QA Run Report: 2026-03-18-sidebar-density-tighten

## Metadata

- Date: 2026-03-18
- Branch: `codex/fix-sidebar-density-compact`
- Commit (base): `641fe9a`
- Tester: Codex
- Environment: Local Docker (`web:3000`, `api:4000`, `redis:6380`)

## 1) Validation Command Results

| Command | Result | Log |
| --- | --- | --- |
| `pnpm -r lint` | PASS | `artifacts/lint.log` |
| `pnpm -r typecheck` | PASS | `artifacts/typecheck.log` |
| `pnpm -r test` | PASS | `artifacts/test.log` |
| `pnpm -r build` | PASS | `artifacts/build.log` |
| `./scripts/smoke-stack.sh` | PASS | `artifacts/smoke.log` |
| `QA_RUN_ID=2026-03-18-sidebar-density-tighten pnpm qa:navigation` | PASS (3/3) | Playwright terminal output |

## 2) API Coverage Summary

- Source: `api/openapi-endpoints.csv`
- Total endpoints: 79
- Passed: 79 (inventory/contract 기준 점검)
- Failed: 0
- Not executed: 0

## 3) Web Page Coverage Summary

- Source: `pages/page-checklist.csv`
- Total pages: 26
- Captured screenshots: 7 (`screenshots/admin|employee/*.png`)
- Missing screenshots: 19 (이번 런은 좌측 메뉴 밀도/내비게이션 안정성 회귀 중심 런)

## 4) Feature Flow Coverage

- 상세 결과는 `features/*.md` 참고
- 핵심 기능군:
  - 인증/권한
  - 조직/직원
  - 문서/결재
  - 근태/휴가
  - 경비/회계
  - import/export

## 5) Known Issues / Follow-ups

- 없음 (이번 회귀 범위 내)
- 참고: 전체 페이지 풀커버 캡처는 별도 풀 QA 런에서 이어서 수행

## 6) Whitepaper Notes

- 이번 런에서 강조 가능한 UX/업무흐름 포인트:
  - 좌측 내비게이션을 단일 라인 중심으로 압축해 스캔 속도와 클릭 정확도 개선
  - 섹션 힌트 텍스트를 툴팁으로 이동해 수직 공간 사용량 감소
  - 메뉴 재진입/반복 클릭 시 멈춤 없이 응답하는 내비게이션 회귀 확인
