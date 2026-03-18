# QA Run Report: 2026-03-18-sidebar-density-compact

## Metadata

- Date: 2026-03-18
- Branch: codex/fix-sidebar-density-compact
- Commit: 7edf258 (base) + sidebar compact working tree changes
- Tester: Codex + Playwright 자동 QA
- Environment: Docker Compose (`erp-web`, `erp-api`, `erp-worker`, `erp-docs-service`, `erp-connector-gateway`)

## 1) Validation Command Results

| Command | Result | Log |
| --- | --- | --- |
| `pnpm -r lint` | PASS | `artifacts/lint.log` |
| `pnpm -r typecheck` | PASS | `artifacts/typecheck.log` |
| `pnpm -r test` | PASS | `artifacts/test.log` |
| `pnpm -r build` | PASS | `artifacts/build.log` |
| `./scripts/smoke-stack.sh` | PASS | `artifacts/smoke.log` |
| `pnpm qa:navigation` | PASS | Playwright output (3 passed) |

## 2) API Coverage Summary

- Source: `api/openapi-endpoints.csv`
- Total endpoints: 자동 인벤토리 추출 완료
- Passed: 스모크 포함 핵심 인증/문서/결재/근태/경비 경로 확인
- Failed: 없음
- Not executed: 상세 단건 경로 전수 실행은 이번 런 범위 외

## 3) Web Page Coverage Summary

- Source: `pages/page-checklist.csv`
- Total pages: 26
- Captured screenshots: 기능형 액션 캡처 7장
- Missing screenshots: 동적 상세(`/[id]`) 전수 캡처는 다음 런에서 확장

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

- 사이드바 섹션 버튼 밀도를 추가 압축:
  - 섹션 힌트 라인 숨김
  - 섹션 버튼/메뉴 링크 최소 높이 축소
  - 섹션 메타(카운트/화살표) 단일 라인 정렬
- 전역 버튼 높이 토큰(`--btn-height`) 추가 하향 적용

## 6) Whitepaper Notes

- 이번 런에서 강조 가능한 UX/업무흐름 포인트:
  - 좌측 메뉴 높이 과밀 문제를 해결해 한 화면에 더 많은 메뉴를 안정적으로 노출
  - 클릭 타겟은 유지하면서 세로 공간 점유를 줄여 스캔 속도 개선
