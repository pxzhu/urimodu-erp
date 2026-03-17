# 기능 QA: 내비게이션/셸 안정성 (모바일 포함)

## 범위
- 사이드 내비게이션 메뉴 열기/닫기
- 메뉴 반복 클릭 시 라우트 전환 안정성
- 문서 화면 단계 탭 반복 클릭 안정성
- 역할별(admin/hr/employee) 전환 시 공통 셸 동작

## 시나리오
1. `/documents` 진입 후 단계 탭(작성/목록) 반복 전환
2. 데스크톱에서 승인/문서/직원/휴가/경비 라우트 반복 순환
3. 모바일 폭에서 메뉴 반복 열기 + 라우트 전환 + 동일 메뉴 재클릭

## 결과
- 데스크톱/모바일 모두 통과
- 모바일 메뉴 토글 동작이 반복 전환에서도 끊기지 않음
- 라우트 전환 후 메뉴 재오픈/재클릭 동작 정상
- 셸 상단 설정/로그아웃 컨트롤 노출 정상

## 증빙
- `scripts/qa-navigation-i18n-regression.spec.ts` 통과
- `../screenshots/admin/admin-02-documents-and-templates.png`
- `../screenshots/user/user-02-documents-and-templates.png`
