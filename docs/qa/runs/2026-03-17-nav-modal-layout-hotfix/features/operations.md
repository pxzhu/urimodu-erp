# Feature QA: operations

## Summary

- Feature group: 내비게이션/레이아웃 안정화
- Owner area: `dashboard-nav`, `ui-shell-provider`, global styles
- Status: PASS (`PASS` / `FAIL` / `PARTIAL`)

## Scope

- 긴 메뉴 섹션 아코디언 전환
- 모바일 메뉴 열림/닫힘 반복 시 멈춤 방지
- 사이드바 폭 계산 안정화

## Preconditions

- 데스크톱/모바일 뷰포트 Playwright 실행 가능

## Test Data

- 관리자/인사/사원 계정

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | 데스크톱 반복 메뉴 클릭 | URL 이동 + UI 멈춤 없음 | 2회 반복 통과 | PASS |
| 2 | 모바일 메뉴 열고 3개 라우트 반복 이동 | 클릭 가능 상태 유지 | 타임아웃 없이 통과 | PASS |
| 3 | 다시 같은 메뉴 재클릭 | 셸 인터랙션 유지 | 정상 | PASS |

## Evidence

- API evidence: `artifacts/navigation.log`
- UI screenshots:
  - `screenshots/admin/admin-06-workspace-hub.png`
  - `screenshots/user/user-06-workspace-hub.png`

## Notes For Whitepaper

- 사용자 관점 가치: 긴 메뉴도 섹션 단위로 빠르게 탐색
- 운영/개발 관점 가치: 모바일 바디락/브레이크포인트 전환 안정화

## Follow-up TODO

- 섹션 확장 상태를 사용자별 저장 옵션으로 확장 가능
