[English](./README.md) | [English Mirror](./README.en.md)

# 우리모두 ERP

한국 실무 워크플로우를 중심으로 설계된 Apache-2.0 공개 오픈소스 사용자 설치형(Self-hosted) ERP/업무 플랫폼입니다.

## 프로젝트 상태

`v0.1.0-alpha.0` 프리릴리스 준비 단계입니다.

현재 저장소에는 `PROMPT02`~`PROMPT07` 범위가 완료된 기준선이 반영되어 있습니다.

- 실행 가능한 모노레포 및 배포 스캐폴딩
- 모듈형 모놀리스 API와 웹 UI 기반
- 문서/전자결재 워크플로우 베이스라인
- 근태/휴가 연동 및 edge-agent 스캐폴드
- 경비/회계/가져오기·내보내기 스타터
- 운영 문서, ADR, 스모크 체크 기반

본 상태는 **알파 프리릴리스 후보**이며, 아직 프로덕션 GA 릴리스가 아닙니다.

## 알파 피드백

현재 `v0.1.0-alpha.0` 릴리스 이후 피드백을 적극적으로 수집하고 있습니다.

- 공지 이슈: [#25](https://github.com/pxzhu/urimodu-erp/issues/25)
- 피드백 트래커: [#19](https://github.com/pxzhu/urimodu-erp/issues/19)
- 안정화 마일스톤: `v0.1.1-alpha.1` ([Milestones](https://github.com/pxzhu/urimodu-erp/milestones))
- 신규 이슈 등록: [New issue form](https://github.com/pxzhu/urimodu-erp/issues/new/choose)

## 현재까지 구현된 핵심 모듈

- `auth`: 로컬 세션 인증 + RBAC + OIDC 확장 추상화
- `org`: 회사/법인/사업장/부서 베이스라인
- `employee`: 직원 마스터 + 마스킹 + 감사 훅
- `files`: MinIO 기반 파일 오브젝트 메타데이터/조회
- `documents`: 템플릿/버전/첨부 + PDF 렌더링 흐름
- `approvals`: 상신/승인/반려 워크플로우 베이스라인
- `signatures`: 서명/도장 에셋 스타터
- `attendance`: raw 이벤트 수집 + 정규화 ledger 모델
- `leave`: 휴가 요청/근태 정정 스타터
- `expenses`: 경비청구 스타터
- `finance`: 계정과목표/분개 스타터
- `import-export`: 가져오기/내보내기 잡 + 행 단위 리포팅
- `integrations`: generic ingress 계약 + connector gateway
- `audit`: 핵심 변경행위 감사로그

## 스크린샷

시드 데이터가 있는 로컬 스택에서 한국어 기본 UX(라이트모드 + 좌측 사이드바) 기준으로 실제 캡처했습니다.  
인벤토리/재촬영 절차는 [docs/screenshots/README.md](./docs/screenshots/README.md)를 참고하세요.

### 관리자 화면

#### 직원 디렉터리 (`/employees`)

![관리자 직원 디렉터리](./docs/screenshots/admin-01-employees-directory.png)

#### 문서 및 템플릿 (`/documents`)

![관리자 문서 및 템플릿](./docs/screenshots/admin-02-documents-and-templates.png)

#### 결재함 (`/approvals`)

![관리자 결재함](./docs/screenshots/admin-03-approvals-inbox.png)

#### 근태 원장 (`/attendance/ledger`)

![관리자 근태 원장](./docs/screenshots/admin-04-attendance-ledger.png)

#### 경비청구 (`/expenses`)

![관리자 경비청구](./docs/screenshots/admin-05-expense-claims.png)

### 사용자 화면

#### 직원 디렉터리 (`/employees`)

![사용자 직원 디렉터리](./docs/screenshots/user-01-employees-directory.png)

#### 문서 및 템플릿 (`/documents`)

![사용자 문서 및 템플릿](./docs/screenshots/user-02-documents-and-templates.png)

#### 결재함 (`/approvals`)

![사용자 결재함](./docs/screenshots/user-03-approvals-inbox.png)

#### 근태 원장 (`/attendance/ledger`)

![사용자 근태 원장](./docs/screenshots/user-04-attendance-ledger.png)

#### 경비청구 (`/expenses`)

![사용자 경비청구](./docs/screenshots/user-05-expense-claims.png)

## 빠른 시작 (Quickstart)

### 사전 요구사항

- Node.js 20+
- pnpm 10+
- Docker / Docker Compose (권장)
- Go 1.19+ (edge-agent 로컬 실행 시)

### 로컬 부팅

```bash
make bootstrap
cp .env.example .env
cp deploy/compose/.env.example deploy/compose/.env
make compose-up
pnpm --filter @korean-erp/api prisma:seed
pnpm dev
```

### 로컬 엔드포인트

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger UI: `http://localhost:4000/swagger`
- OpenAPI JSON: `http://localhost:4000/swagger-json`
- Worker health: `http://localhost:4100/health`
- Connector gateway health: `http://localhost:4200/health`
- Docs service health: `http://localhost:4300/health`

### 시드 계정

- `admin@acme.local`
- `hr@acme.local`
- `manager@acme.local`
- `employee@acme.local`

기본 비밀번호: `ChangeMe123!` (`SEED_DEFAULT_PASSWORD`로 변경 가능)

### 스모크 체크

```bash
make smoke
```

### Helm 체크 (로컬 Helm 선택)

```bash
make helm-lint
make helm-template
```

Helm 래퍼(`scripts/helmw.sh`)는 로컬 `helm`이 있으면 우선 사용하고, 없으면 Docker `alpine/helm`으로 fallback 합니다.

### QA 아카이브 워크플로우

```bash
pnpm qa:init
pnpm qa:validate
pnpm qa:screenshots
```

생성된 `docs/qa/runs/<run-id>/` 체크리스트 파일을 채워 API/페이지/기능 단위 증적을 완료하세요.

## 로드맵 / 다음 단계

[docs/roadmap.md](./docs/roadmap.md)를 참고하세요.

다음 우선순위:

- payroll
- advanced accounting
- deeper ADT/S1 adapters
- HWPX export hardening
- mobile app
- notification integrations

## 지원 및 기여

- 비전: [VISION.md](./VISION.md) / [VISION.en.md](./VISION.en.md)
- 기여 가이드: [CONTRIBUTING.md](./CONTRIBUTING.md)
- 보안 정책: [SECURITY.md](./SECURITY.md)
- 이슈 트래커: [GitHub Issues](https://github.com/pxzhu/urimodu-erp/issues)

## 문서 맵

- 실행 계획 로그: [docs/PLAN.md](./docs/PLAN.md)
- 아키텍처 다이어그램: [docs/architecture/README.md](./docs/architecture/README.md)
- ADR: [docs/adr](./docs/adr)
- API 노트: [docs/api/README.md](./docs/api/README.md)
- QA 아카이브 가이드: [docs/qa/README.md](./docs/qa/README.md)
- 운영 노트: [docs/ops/README.md](./docs/ops/README.md)
- 릴리스 노트 초안: [docs/releases/v0.1.0-alpha.0.md](./docs/releases/v0.1.0-alpha.0.md)
- 변경 이력: [CHANGELOG.md](./CHANGELOG.md)

## 라이선스

Apache-2.0 ([LICENSE](./LICENSE))
