# 기능 QA: 모바일 사이드바/탭 전환 안정성

## 범위
- 사이드 메뉴 열기/닫기
- 메뉴 클릭 후 페이지 전환
- 문서 화면 단계 탭 전환
- 관리자/사원 역할별 반복 이동

## 시나리오
1. `/documents` 진입 후 단계 탭(작성/목록)을 반복 전환
2. `/documents -> /approvals -> /documents -> /employees -> /leave -> /expenses` 순환 이동
3. 모바일 폭에서 메뉴를 반복 열고 닫으며 동일 라우트를 반복 전환

## 결과
- 데스크톱/모바일 모두 네비게이션 테스트 통과
- 메뉴 클릭 후 모바일 메뉴 자동 닫힘 동작 확인
- 문서 단계 탭이 로딩 중에도 표시되며 사용자가 흐름을 인지 가능

## 증빙
- `scripts/qa-navigation-i18n-regression.spec.ts` 통과
- 관련 스크린샷: `docs/screenshots/admin-02-documents-and-templates.png`, `docs/screenshots/user-02-documents-and-templates.png`
