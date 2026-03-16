# QA Report - 2026-03-16 WEHAGO UI Refresh

## 실행 환경
- Web: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:4000`

## 검증 명령
- `corepack pnpm -r lint`
- `corepack pnpm -r typecheck`
- `corepack pnpm -r test`
- `corepack pnpm -r build`
- `SCREENSHOT_BASE_URL=http://127.0.0.1:3000 SCREENSHOT_API_BASE_URL=http://127.0.0.1:4000 corepack pnpm qa:navigation`
- `SCREENSHOT_BASE_URL=http://127.0.0.1:3000 SCREENSHOT_API_BASE_URL=http://127.0.0.1:4000 corepack pnpm qa:screenshots`

## 결과
- 정적 검증(린트/타입체크/테스트/빌드): 통과
- 네비게이션 회귀 테스트: 통과
- 관리자/사원 스크린샷 캡처: 통과

## 아티팩트
- API 엔드포인트 인벤토리: `api/openapi-endpoints.csv`
- 페이지 체크리스트: `pages/page-checklist.csv`
- 기능 상세:
  - `features/navigation-and-mobile-sidebar.md`
  - `features/wehago-inspired-workspace-and-collab.md`
- 스크린샷:
  - `screenshots/admin/*.png`
  - `screenshots/user/*.png`
