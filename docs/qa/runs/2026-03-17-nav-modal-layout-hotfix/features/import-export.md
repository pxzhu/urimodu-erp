# Feature QA: import-export

## Summary

- Feature group: import/export
- Owner area: 비동기 잡 도메인
- Status: PARTIAL (`PASS` / `FAIL` / `PARTIAL`)

## Scope

- 이번 런은 UI 레이아웃/모달 개선 중심으로 import/export는 회귀 범위 제외

## Preconditions

- N/A

## Test Data

- N/A

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | import/export 전용 회귀 실행 | 잡 lifecycle 검증 | 이번 런 미실행 | PARTIAL |

## Evidence

- API evidence: `api/openapi-endpoints.csv` (inventory)

## Notes For Whitepaper

- 사용자 관점 가치: 본 런에서는 직접 영향 없음
- 운영/개발 관점 가치: 다음 안정화 런에서 재검증 필요

## Follow-up TODO

- import/export async 잡 전용 QA 시나리오 추가
