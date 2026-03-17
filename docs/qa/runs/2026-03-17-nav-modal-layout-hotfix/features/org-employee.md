# Feature QA: org-employee

## Summary

- Feature group: 조직/직원
- Owner area: 직원 목록 화면 가시성
- Status: PARTIAL (`PASS` / `FAIL` / `PARTIAL`)

## Scope

- 직원 목록 렌더링 및 메뉴 접근성 확인

## Preconditions

- 샘플 직원 데이터 존재

## Test Data

- 관리자/사원 계정

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | `/employees` 접근 | 목록/열 구조 정상 표시 | 정상 | PASS |
| 2 | 상세/생성/수정 라우트 전수 확인 | 모든 서브 라우트 검증 | 이번 런 범위 외 | PARTIAL |

## Evidence

- UI screenshots:
  - `screenshots/admin/admin-01-employees-directory.png`
  - `screenshots/user/user-01-employees-directory.png`

## Notes For Whitepaper

- 사용자 관점 가치: 직원 디렉터리 정보 접근성 확보
- 운영/개발 관점 가치: 조직 도메인 상세 라우트는 별도 런으로 분리 검증

## Follow-up TODO

- 직원 생성/수정/비활성 흐름 전용 QA 시나리오 추가
