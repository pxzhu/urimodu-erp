# Feature QA: auth-rbac

## Summary

- Feature group: 인증/권한
- Owner area: session auth + role scenarios
- Status: PASS (`PASS` / `FAIL` / `PARTIAL`)

## Scope

- admin/hr/employee 세션 주입 및 로그인 리다이렉트
- 역할별 주요 라우트 접근

## Preconditions

- `/auth/login` 사용 가능

## Test Data

- admin@acme.local / hr@acme.local / employee@acme.local

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | 세션 생성 후 `/` 진입 | 로그인 화면으로 되돌아가지 않음 | 정상 | PASS |
| 2 | 역할별 기본 라우트 이동 | 접근 가능한 라우트 렌더링 | 정상 | PASS |

## Evidence

- API evidence: `artifacts/navigation.log`
- UI screenshots: admin/user 전역 캡처 세트

## Notes For Whitepaper

- 사용자 관점 가치: 역할별 기본 업무 화면 진입이 빠름
- 운영/개발 관점 가치: QA 시나리오를 역할별로 분리해 회귀 검증 가능

## Follow-up TODO

- RBAC 금지 라우트의 명시적 403 캡처 케이스 추가
