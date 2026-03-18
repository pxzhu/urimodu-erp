# Feature QA: import-export

## Summary

- Feature group: 가져오기/내보내기 작업 생성 및 비동기 처리
- Owner area: `apps/web/src/app/imports`, `apps/web/src/app/exports`, `apps/worker`
- Status: PASS

## Scope

- CSV 업로드 후 벤더 import job 생성
- expense export job 생성
- worker 후처리 실패 원인 점검/수정 포함

## Preconditions

- 관리자 권한 세션
- 로컬 MinIO/worker 정상 연결
- QA 샘플 CSV 준비(`artifacts/qa-import.csv`)

## Test Data

- CSV:
  - `code,name,businessNo,contactName,email,phone,address`
  - `V-QA-01,QA 공급사,...`

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | `/imports`에서 CSV 선택 후 `벤더 가져오기 생성` 클릭 | 작업 생성, 에러 미노출 | PASS (수정 후) | PASS |
| 2 | `/exports`에서 `경비 청구 내보내기 생성` 클릭 | 작업 생성, 에러 미노출 | PASS | PASS |
| 3 | worker 환경 점검 | MinIO 연결 가능해야 함 | 누락 env 발견 후 compose 수정 | PASS |
| 4 | docs-service 템플릿 목록 확인 | 템플릿 5종 노출 | 경로 fallback 수정 후 PASS | PASS |

## Evidence

- API evidence: `artifacts/smoke.log`, `artifacts/summary.txt`
- UI screenshots: `screenshots/admin/functional-import-export-submit.png`

## Notes For Whitepaper

- 사용자 관점 가치: 가져오기/내보내기 버튼 클릭 후 실제 작업 생성까지 완료됨
- 운영/개발 관점 가치: worker-MinIO 의존성 누락 같은 운영성 결함을 QA 중 조기 검출

## Follow-up TODO

- import/export 상세 결과 파일 다운로드 E2E 시나리오 추가
