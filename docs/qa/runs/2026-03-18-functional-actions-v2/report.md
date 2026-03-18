# QA Run Report: 2026-03-18-functional-actions-v2

## Metadata

- Date: 2026-03-18
- Branch: codex/fix-functional-qa-and-actions
- Commit: 12f1ffb (pre-commit workspace validation run)
- Tester: Codex + Playwright 자동 QA
- Environment: Docker Compose (`erp-web`, `erp-api`, `erp-worker`, `erp-docs-service`, `erp-connector-gateway`, `erp-postgres`, `erp-minio`)

## 1) Validation Command Results

| Command | Result | Log |
| --- | --- | --- |
| `pnpm -r lint` | PASS | `artifacts/lint.log` |
| `pnpm -r typecheck` | PASS | `artifacts/typecheck.log` |
| `pnpm -r test` | PASS | `artifacts/test.log` |
| `pnpm -r build` | PASS | `artifacts/build.log` |
| `./scripts/smoke-stack.sh` | PASS | `artifacts/smoke.log` |
| `pnpm qa:navigation` (functional actions) | PASS | Playwright output (3 passed) |

## 2) API Coverage Summary

- Source: `api/openapi-endpoints.csv`
- Total endpoints: 자동 인벤토리 추출 완료 (CSV 기준)
- Passed: 인증/문서/결재/근태/경비/import-export 핵심 read/write 경로를 스모크 + 기능형 QA로 실행 확인
- Failed: 없음 (이번 런 기준)
- Not executed: 상세 단건 경로(`/.../{id}` 전체)와 일부 관리자 생성 경로는 인벤토리만 유지, 전수 실행은 다음 QA 런에서 확장

## 3) Web Page Coverage Summary

- Source: `pages/page-checklist.csv`
- Total pages: 26 (앱 라우트 인벤토리)
- Captured screenshots: 기능형 액션 스크린샷 7장 (`screenshots/admin/*`, `screenshots/employee/*`)
- Missing screenshots: 동적 상세 페이지(`/[id]`) 전수 캡처는 이번 런 범위 외

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

- 1차 실패 원인 수정 완료:
  - `worker` 컨테이너에 MinIO 환경변수가 없어 import job 후처리가 실패하던 문제를 `deploy/compose/docker-compose.yml`에서 수정
  - `docs-service`가 `dist/templates`만 탐색해 템플릿 목록이 비던 문제를 `apps/docs-service/src/server.ts` fallback 로직으로 수정
- 추후 과제:
  - `pages/page-checklist.csv`의 동적 상세 라우트 전수 캡처 자동화
  - `api/openapi-endpoints.csv` 행 단위 실행 결과 자동 기록 스크립트 도입

## 6) Whitepaper Notes

- 이번 런에서 강조 가능한 UX/업무흐름 포인트:
  - 버튼 클릭 후 실제 비즈니스 액션(모달 열기/닫기, 항목 추가/삭제, import/export 작업 생성)이 끊기지 않는지 역할별로 검증
  - 사이드바 반복 내비게이션(데스크톱/모바일)에서 UI freeze가 발생하지 않음을 반복 시나리오로 검증
  - 근태/결재/문서/경비 핵심 흐름의 한국어 UI 상태에서 기능 일관성 확인
