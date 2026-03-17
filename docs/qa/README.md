# QA Archive Guide

이 디렉터리는 PR/릴리스마다 수행한 QA 근거를 저장하는 공식 아카이브입니다.
목표는 "모든 API, 모든 페이지, 모든 핵심 기능"의 검증 근거를 저장해 추후 백서/릴리스 노트/운영 회고에 재사용하는 것입니다.

## 원칙

- 모든 작업은 QA 증적과 함께 종료합니다.
- API는 OpenAPI 인벤토리 기준으로 누락 없이 추적합니다.
- 웹 페이지는 라우트 단위로 검증하고 스크린샷을 남깁니다.
- 기능은 시나리오 단위(입력/행위/결과)로 검증하고 상세 설명을 남깁니다.
- 역할 차이(관리자/사용자)가 있으면 분리 캡처합니다.
- 브라우저 기반 QA는 가능한 한 단일 브라우저/컨텍스트를 재사용해 반복 실행합니다(불필요한 재기동 금지).

## 권장 흐름

1. QA 런 디렉터리 생성
2. 자동 검증 실행(lint/typecheck/test/build/smoke)
3. API 엔드포인트 검증 결과 기록
4. 페이지별 스크린샷 캡처 및 결과 기록
5. 기능별 상세 시나리오 결과 문서화
6. `report.md`에 최종 통과/미해결 사항 정리

## 표준 디렉터리 구조

```text
docs/qa/runs/<run-id>/
  report.md
  api/
    openapi-endpoints.csv
  pages/
    page-checklist.csv
  features/
    <feature-name>.md
  screenshots/
    admin/
      *.png
    user/
      *.png
  artifacts/
    lint.log
    typecheck.log
    test.log
    build.log
    smoke.log
```

## 스크립트

- `pnpm qa:init`  
  QA 런 폴더/기본 템플릿/페이지 체크리스트 생성
- `pnpm qa:validate`  
  기본 검증(lint/typecheck/test/build/smoke) 실행 로그 저장
- `pnpm qa:navigation`  
  관리자/HR/사원 시점 데스크톱+모바일 반복 네비게이션 회귀 검증
- `pnpm qa:navigation:headed`  
  동일 회귀 검증을 헤디드(가시화) 모드로 실행
- `pnpm qa:screenshots`  
  역할별 주요 페이지 캡처(헤디드 모드, 단일 브라우저 세션 재사용)

참고: `qa:init` 실행 시 API가 살아 있으면 OpenAPI endpoint CSV를 자동 생성합니다.
API가 꺼져 있으면 헤더만 생성되며, 이후 API 기동 후 수동 갱신해야 합니다.

## 리포트 품질 기준

- 기능 문서(`features/*.md`)에는 "무엇을 검증했는지"를 사람이 읽고 바로 이해할 수 있어야 합니다.
- 페이지 스크린샷에는 기능 설명/상태(성공/실패/제한 사항)를 함께 기록합니다.
- 실패 항목은 원인, 영향 범위, 다음 액션(이슈 링크 포함)을 반드시 남깁니다.
