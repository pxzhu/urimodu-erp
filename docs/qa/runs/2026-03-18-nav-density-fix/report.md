# QA Run Report: 2026-03-18-nav-density-fix

## Metadata

- Date: 2026-03-18
- Branch: codex/fix-nav-accordion-and-button-density
- Commit: b85847f (base) + working tree changes on this branch
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
- Passed: 스모크에 포함된 인증/문서/결재/근태/경비 경로 확인
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

- 사이드바 상단 중복 링크(퀵/최근) 제거로 정보 중복 해소
- 섹션 드롭다운은 단일 아코디언 동작으로 변경(새 섹션 오픈 시 이전 섹션 닫힘)
- 전역 버튼 높이/패딩 축소로 화면 밀도 개선

## 6) Whitepaper Notes

- 이번 런에서 강조 가능한 UX/업무흐름 포인트:
  - 메뉴 구조를 단일 아코디언으로 단순화해 탐색 피로 감소
  - 중복 네비게이션 요소 제거로 첫 화면 정보 밀도 개선
  - 전역 버튼 높이 축소로 목록/폼 페이지 가독성 향상
