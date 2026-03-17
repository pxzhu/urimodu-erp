# Feature QA: documents-approvals

## Summary

- Feature group: 문서/결재 UX
- Owner area: `apps/web/src/app/documents`, `apps/web/src/app/approvals`
- Status: PASS (`PASS` / `FAIL` / `PARTIAL`)

## Scope

- 문서 페이지 목록 중심 UX 유지
- 작성/버전추가/결재선설정 모달 전환
- 결재함 승인/반려 모달 전환

## Preconditions

- 관리자/사원 샘플 계정 세션 생성 가능
- 문서 샘플 데이터 존재

## Test Data

- 시드 사용자: admin, employee
- 시드 문서/결재선

## Steps And Results

| Step | Action | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | `/documents` 진입 | 목록/상세 기본 레이아웃 노출 | 정상 노출 | PASS |
| 2 | 문서 작성 클릭 | 작성 폼이 모달로 표시 | 모달 열림 확인 | PASS |
| 3 | 버전 추가 클릭 | 버전 폼이 모달로 표시 | 모달 열림 확인 | PASS |
| 4 | 결재선 설정 클릭 | 결재선 모달 표시 + 검색 선택 | 모달 열림/선택 가능 | PASS |
| 5 | `/approvals` 승인/반려 클릭 | 코멘트 입력 모달 후 처리 | 모달 처리 정상 | PASS |

## Evidence

- API evidence: `artifacts/navigation.log`
- UI screenshots:
  - `screenshots/admin/admin-02-documents-and-templates.png`
  - `screenshots/admin/admin-03-approvals-inbox.png`
  - `screenshots/user/user-02-documents-and-templates.png`
  - `screenshots/user/user-03-approvals-inbox.png`

## Notes For Whitepaper

- 사용자 관점 가치: 입력 작업을 모달에 집중시켜 목록 읽기 흐름이 끊기지 않음
- 운영/개발 관점 가치: 라우팅 구조를 바꾸지 않고 UX 일관성 강화

## Follow-up TODO

- 모달 내부 폼 검증 메시지 스타일 통일
