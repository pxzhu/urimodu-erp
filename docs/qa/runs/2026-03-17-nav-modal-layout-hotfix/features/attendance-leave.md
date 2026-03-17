# Feature QA: attendance-leave

## Summary

- Feature group: 근태/휴가
- Owner area: ledger + leave route 가시성
- Status: PARTIAL (`PASS` / `FAIL` / `PARTIAL`)

## Scope

- `/attendance/ledger`, `/leave` 접근 및 메뉴 회귀

## Preconditions

- 시드 근태/휴가 데이터

## Test Data

- admin/employee 계정

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | `/attendance/ledger` 진입 | 원장 화면 렌더링 | 정상 | PASS |
| 2 | `/leave` 반복 이동 | 메뉴 재진입 시 멈춤 없음 | 정상 | PASS |
| 3 | 신청/결재 동기화 상세 확인 | 엔드투엔드 검증 | 이번 런 범위 외 | PARTIAL |

## Evidence

- UI screenshots:
  - `screenshots/admin/admin-04-attendance-ledger.png`
  - `screenshots/user/user-04-attendance-ledger.png`
- API evidence: `artifacts/navigation.log`

## Notes For Whitepaper

- 사용자 관점 가치: 근태/휴가 메뉴 이동 안정성 향상
- 운영/개발 관점 가치: 모바일 네비 회귀에 근태 경로 포함

## Follow-up TODO

- 근태 정정/휴가 상세 입력 모달 UX 별도 점검
