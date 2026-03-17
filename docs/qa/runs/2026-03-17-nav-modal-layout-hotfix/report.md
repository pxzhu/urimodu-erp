# QA Run Report: 2026-03-17-nav-modal-layout-hotfix

## Metadata

- Date: 2026-03-17
- Branch: codex/fix-nav-overlap-and-modal-doc-flow
- Commit: TBD (pre-commit)
- Tester: Codex + Playwright
- Environment: local dev web(`127.0.0.1:3001`), local API(`127.0.0.1:4000`)

## 1) Validation Command Results

| Command | Result | Log |
| --- | --- | --- |
| `corepack pnpm -r lint` | PASS | `artifacts/lint.log` |
| `corepack pnpm -r typecheck` | PASS | `artifacts/typecheck.log` |
| `corepack pnpm -r test` | PASS | `artifacts/test.log` |
| `corepack pnpm -r build` | PASS | `artifacts/build.log` |
| `corepack pnpm qa:navigation` | PASS | `artifacts/navigation.log` |
| `corepack pnpm qa:screenshots` | PASS | `artifacts/screenshots.log` |

## 2) API Coverage Summary

- Source: `api/openapi-endpoints.csv`
- Endpoint inventory: 79 routes
- Execution evidence: authentication + page-driven API paths verified during navigation/screenshot QA
- Notes: this run focused on nav/layout + modal UX hardening, not full endpoint-by-endpoint API matrix replay

## 3) Web Page Coverage Summary

- Source: `pages/page-checklist.csv`
- PASS routes: 10
- NOT_RUN routes: 16
- Captured screenshots: 16 (admin 8 + user 8)
- Screenshot folders:
  - `screenshots/admin/*.png`
  - `screenshots/user/*.png`

## 4) Feature Flow Coverage

- 문서/결재: 모달 기반 작성/버전추가/결재선설정/승인/반려 플로우 동작 확인
- 네비게이션: 데스크톱/모바일 반복 이동 시 멈춤 없음 확인
- 레이아웃: 모바일 메뉴 확장/축소 및 섹션 아코디언 표시 정상 확인

## 5) Known Issues / Follow-ups

- 전체 페이지(26개) 전량 스크린샷 자동 캡처는 별도 확장 과제로 유지
- API 79개 전수 호출 검증은 전용 API 매트릭스 런에서 수행 권장

## 6) Whitepaper Notes

- 문서/결재 입력을 모달로 통일해 목록 중심 UX를 강화
- 긴 메뉴를 섹션 접이식으로 바꿔 정보 밀도와 탐색성을 함께 개선
- 모바일에서 메뉴 오버레이 겹침/클릭 불가 현상 완화
