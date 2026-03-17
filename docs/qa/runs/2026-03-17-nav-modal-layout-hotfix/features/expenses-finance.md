# Feature QA: expenses-finance

## Summary

- Feature group: 경비/회계
- Owner area: 경비 목록 가시성
- Status: PARTIAL (`PASS` / `FAIL` / `PARTIAL`)

## Scope

- `/expenses` 화면 접근 + 시드 데이터 렌더링 확인

## Preconditions

- 시드 경비 데이터

## Test Data

- admin/employee 계정

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | `/expenses` 진입 | 목록/상태 렌더링 | 정상 | PASS |
| 2 | 전표/계정과목 상세 라우트 검증 | 상세 기능 검증 | 이번 런 범위 외 | PARTIAL |

## Evidence

- UI screenshots:
  - `screenshots/admin/admin-05-expense-claims.png`
  - `screenshots/user/user-05-expense-claims.png`

## Notes For Whitepaper

- 사용자 관점 가치: 경비 현황 가독성 확보
- 운영/개발 관점 가치: 재무 라우트는 별도 도메인 QA 런으로 분리

## Follow-up TODO

- 상세/생성/승인 플로우 전수 스모크 추가
