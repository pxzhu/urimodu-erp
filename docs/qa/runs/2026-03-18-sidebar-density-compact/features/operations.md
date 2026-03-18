# Feature QA: operations

## Summary

- Feature group: 운영 관점 안정성 (내비게이션/스택 헬스/스모크)
- Owner area: `scripts/smoke-stack.sh`, `scripts/qa-navigation-i18n-regression.spec.ts`, `deploy/compose`
- Status: PASS

## Scope

- 데스크톱/모바일 내비게이션 반복 클릭
- 서비스 헬스체크 + 문서 렌더 스모크
- 도커 구성 결함 수정 후 재검증

## Preconditions

- Docker Compose 스택 구동
- 시드 계정/데이터 준비

## Test Data

- 관리자/사원 계정
- QA CSV 샘플

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | `pnpm qa:navigation` 실행 | 3개 시나리오 통과 | PASS | PASS |
| 2 | `pnpm qa:validate <run-id>` 실행 | lint/typecheck/test/build/smoke 모두 통과 | PASS | PASS |
| 3 | Compose worker env 점검 | MinIO 연동 필수 | 누락 값 보강 후 PASS | PASS |

## Evidence

- API evidence: `artifacts/*.log`, `artifacts/summary.txt`
- UI screenshots: `screenshots/admin/*`, `screenshots/employee/*` (기능형 캡처)

## Notes For Whitepaper

- 사용자 관점 가치: 메뉴 반복 클릭 시 멈춤 현상 회귀 차단
- 운영/개발 관점 가치: 품질 게이트와 운영 설정 검증을 하나의 런에 통합

## Follow-up TODO

- OpenAPI 전체 엔드포인트 행 단위 자동 실행 리포트 자동화
