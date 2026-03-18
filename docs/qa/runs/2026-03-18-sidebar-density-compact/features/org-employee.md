# Feature QA: org-employee

## Summary

- Feature group: 회사/부서/직원 탐색 및 접근 안정성
- Owner area: `apps/web/src/app/companies*`, `departments`, `employees`
- Status: PASS

## Scope

- 사이드바를 통한 조직 메뉴 반복 이동
- 직원 디렉터리 화면 진입 안정성

## Preconditions

- 관리자/사원 세션 존재
- 조직/직원 시드 데이터 존재

## Test Data

- 시드 조직/직원 데이터

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | `/employees` 반복 이동(사이드바) | 페이지 응답 멈춤 없음 | 정상 렌더/상호작용 가능 | PASS |
| 2 | 데스크톱/모바일 내비게이션 반복 클릭 | 메뉴/컨텐츠 freeze 없음 | 3 role 시나리오 통과 | PASS |

## Evidence

- API evidence: `artifacts/smoke.log` (`/employees` 관련 인증 상태 확인)
- UI screenshots: 기능 런은 액션 중심 캡처, 직원 목록은 별도 README 스크린샷 세트 참조

## Notes For Whitepaper

- 사용자 관점 가치: 조직/직원 메뉴 이동 시 지연/멈춤 최소화
- 운영/개발 관점 가치: 모바일/데스크톱 내비게이션 회귀 테스트 시나리오 확보

## Follow-up TODO

- 동적 상세 경로(`/employees/[id]`, `/employees/[id]/edit`) 자동 캡처 확장
