# Feature QA: auth-rbac

## Summary

- Feature group: 인증/세션/RBAC 기본 접근 통제
- Owner area: `apps/api/src/modules/auth`, `apps/web/src/lib/auth`
- Status: PASS

## Scope

- `/auth/login`, `/auth/me` 인증 경로
- 관리자/사원 세션 주입 후 페이지 접근
- 권한 기반 메뉴 노출 차이(운영 메뉴 관리자 전용)

## Preconditions

- 로컬 스택 실행(`erp-api`, `erp-web`)
- 시드 계정 사용:
  - `admin@acme.local`
  - `employee@acme.local`

## Test Data

- 기본 비밀번호: `ChangeMe123!`
- `x-company-id`: 로그인 응답 기본 회사값

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | `/auth/login` 호출 | 토큰+기본 회사 ID 반환 | 정상 반환 | PASS |
| 2 | `/auth/me` 인증 조회 | 사용자 식별 성공 | 정상 반환 | PASS |
| 3 | 관리자/사원 세션으로 웹 진입 | 역할별 화면 접근 정상 | `/workspace` 진입 정상 | PASS |

## Evidence

- API evidence: `artifacts/smoke.log`, `artifacts/test.log`
- UI screenshots: `screenshots/admin/functional-workspace-favorite.png`, `screenshots/employee/functional-workspace-favorite.png`

## Notes For Whitepaper

- 사용자 관점 가치: 로그인 후 역할에 맞는 동작 시작점이 명확함
- 운영/개발 관점 가치: 헤더 기반 인증 규약과 세션 구조를 재현 가능한 방식으로 검증

## Follow-up TODO

- 세부 RBAC(엔드포인트별 403) 자동화 시나리오 추가
