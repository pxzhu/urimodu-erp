# Feature QA: attendance-leave

## Summary

- Feature group: 근태 원본/원장/휴가 접근 및 액션
- Owner area: `apps/web/src/app/attendance/*`, `apps/web/src/app/leave`
- Status: PASS

## Scope

- 근태 원본 페이지의 새로고침 버튼 동작
- 근태 원장/휴가 페이지 반복 이동 안정성

## Preconditions

- 근태 시드 데이터와 role 세션 준비

## Test Data

- 관리자/사원 계정
- 근태 원본 이벤트 및 원장 시드

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | `/attendance/raw`에서 `새로고침` 클릭 | 요청 재실행, 화면 멈춤 없음 | 정상 동작 | PASS |
| 2 | `/attendance/ledger`, `/leave` 반복 이동 | 메뉴/화면 freeze 없음 | 정상 | PASS |

## Evidence

- API evidence: `artifacts/smoke.log` (`/attendance/ledgers` 호출)
- UI screenshots: 기능 런은 액션 중심, 상세 시각 증거는 README 스크린샷 세트 참조

## Notes For Whitepaper

- 사용자 관점 가치: 근태/휴가 화면 전환 시 반응성 확보
- 운영/개발 관점 가치: 반복 네비게이션 회귀 테스트로 freeze 재발 방지

## Follow-up TODO

- 야간/교대 규칙 상세 시나리오를 UI 레벨 자동화로 추가
