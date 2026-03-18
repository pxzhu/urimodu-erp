# Feature QA: documents-approvals

## Summary

- Feature group: 문서 작성/결재 액션 버튼 동작
- Owner area: `apps/web/src/app/documents`, `apps/web/src/app/approvals`
- Status: PASS

## Scope

- 문서 작성 버튼 클릭 시 모달 또는 문서 작업 컨텍스트 반응
- 결재 승인 버튼 클릭 시 액션 모달 열기/닫기

## Preconditions

- 관리자/사원 세션
- 문서/결재 시드 데이터

## Test Data

- 시드 결재선/문서 샘플

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | `/documents`에서 `문서 작성` 클릭 | 모달 오픈 또는 문서 작업 영역 반응 | role별 반응 정상 | PASS |
| 2 | `/approvals`에서 `승인` 클릭(표시 시) | 액션 모달 오픈/취소 가능 | 정상 동작 | PASS |
| 3 | 반복 내비게이션 후 재클릭 | 페이지 멈춤 없이 유지 | 정상 | PASS |

## Evidence

- API evidence: `artifacts/smoke.log` (`/documents`, `/approvals/inbox`)
- UI screenshots:
  - `screenshots/admin/functional-documents-modal.png`
  - `screenshots/employee/functional-documents-modal.png`

## Notes For Whitepaper

- 사용자 관점 가치: 목록 기반 UI에서 필요 시 모달로만 액션 진입
- 운영/개발 관점 가치: 버튼 반응성/모달 상태 전환 회귀 포인트 확보

## Follow-up TODO

- 결재자별 승인/반려 결과 상태 동기화 E2E assertions 확장
