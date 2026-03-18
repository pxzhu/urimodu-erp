# Feature QA: expenses-finance

## Summary

- Feature group: 경비/재무 화면 버튼 액션
- Owner area: `apps/web/src/app/expenses`, `accounting/*`
- Status: PASS

## Scope

- 경비 청구 항목 추가/삭제 버튼
- 경비 목록 접근 안정성

## Preconditions

- 관리자/사원 세션
- 경비 시드 데이터

## Test Data

- 시드 경비 청구 항목

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | `/expenses`에서 `항목 추가` 클릭 | 입력 행 1개 증가 | 정상 증가 | PASS |
| 2 | 마지막 행 `항목 삭제` 클릭 | 방금 추가 행 제거 | 정상 제거 | PASS |
| 3 | 반복 내비게이션 후 재작업 | 버튼 비활성/멈춤 없음 | 정상 | PASS |

## Evidence

- API evidence: `artifacts/smoke.log` (`/expenses/claims`)
- UI screenshots: 기능 액션은 Playwright 런에서 검증, 시각 캡처는 README 세트 참조

## Notes For Whitepaper

- 사용자 관점 가치: 폼 기반 경비 입력 작업의 즉각적 반응성 확보
- 운영/개발 관점 가치: 경비 화면 회귀 포인트(행 편집 액션) 자동화

## Follow-up TODO

- 첨부파일 업로드 버튼 동작까지 경비 QA 시나리오 확장
