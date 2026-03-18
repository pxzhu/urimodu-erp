# Feature QA: operations

## Summary

- Feature group: 좌측 내비게이션/운영 메뉴 안정성
- Owner area: `apps/web/src/components/dashboard-nav.tsx`, `apps/web/src/styles/globals.css`
- Status: PASS

## Scope

- 사이드바 섹션 버튼 높이 압축
- 섹션 힌트 텍스트를 단일 행 UI로 정리
- 데스크톱/모바일에서 반복 클릭 시 멈춤 회귀 확인

## Preconditions

- Docker local stack 기동 (`web:3000`, `api:4000`)
- 시드 사용자 계정 로그인 가능

## Test Data

- 관리자: `admin@acme.local`
- 사용자: `employee@acme.local`
- 기본 비밀번호: seed 기본값

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | `/workspace` 진입 후 좌측 섹션 토글 반복 클릭 | 섹션 열림/닫힘이 즉시 반응, 멈춤 없음 | 반응 정상 | PASS |
| 2 | `/documents` 등 섹션 간 반복 이동 | 이전 섹션은 접히고 선택 섹션만 유지 | 동작 정상 | PASS |
| 3 | 모바일 폭에서 메뉴 열기/닫기 반복 | 메뉴 토글이 유지되고 링크 이동 가능 | 동작 정상 | PASS |

## Evidence

- UI screenshots:
  - `screenshots/admin/functional-workspace-favorite.png`
  - `screenshots/admin/functional-collaboration-guide.png`
  - `screenshots/employee/functional-workspace-favorite.png`
- 자동 검증: `QA_RUN_ID=2026-03-18-sidebar-density-tighten pnpm qa:navigation` (3 passed)

## Notes For Whitepaper

- 좌측 메뉴를 1줄 중심 정보 구조로 정리해 업무 화면당 스캔 속도를 높임
- 멀티 모듈 ERP에서도 반복 네비게이션 안정성을 유지하는 UX 기준 확보

## Follow-up TODO

- 전체 26개 페이지 스크린샷 풀셋은 별도 전체 QA 런에서 갱신
