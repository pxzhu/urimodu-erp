[English](./README.md)

# Korean Self-Hosted ERP

사용자 설치형(Self-hosted) 한국형 ERP/업무 플랫폼을 위한 공개 오픈소스 기반 레포입니다.

## 상태

현재 레포에는 다음이 포함되어 있습니다.

- 모노레포 스캐폴드 (`pnpm` + `turbo`)
- Next.js 웹 앱 기반 + auth/org/employee 화면 시작 구현 (`apps/web`)
- NestJS 모듈형 모놀리스 API 기반 모듈 구현 (`apps/api`)
- worker/docs-service/connector-gateway 스캐폴드
- Go edge-agent 스캐폴드
- Docker Compose + Helm 시작 구성
- Prisma 스키마 베이스라인, 마이그레이션, 한국 샘플 시드

## 모노레포 구조

```text
apps/
  web/
  api/
  worker/
  docs-service/
  connector-gateway/
agents/
  edge-agent/
packages/
  ui/
  domain/
  contracts/
  sdk/
  shared/
  config/
deploy/
  compose/
  helm/
docs/
  PLAN.md
  adr/
  api/
  ops/
```

## 로컬 설정

### 사전 요구사항

- Node.js 20+
- pnpm 10+
- Docker / Docker Compose (권장)
- Go 1.19+ (edge-agent 실행 시)

### 설치 및 실행

```bash
make bootstrap
cp .env.example .env
pnpm dev
```

### 로컬 엔드포인트

- Web: `http://localhost:3000`
- Web health: `http://localhost:3000/health`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`
- Swagger: `http://localhost:4000/swagger`
- Worker health: `http://localhost:4100/health`
- Connector gateway health: `http://localhost:4200/health`
- Docs service health: `http://localhost:4300/health`

### 시드 로그인 (로컬 인증)

- Email: `admin@acme.local`
- Password: `ChangeMe123!`
- 시드 명령: `pnpm --filter @korean-erp/api prisma:seed`

추가 시드 사용자: `hr@acme.local`, `manager@acme.local`, `employee@acme.local`

## Docker Compose

전체 로컬 스택(PostgreSQL, Redis, MinIO, API, Web, Worker, gateway, docs-service) 실행:

```bash
cp deploy/compose/.env.example deploy/compose/.env
make compose-up
```

중지:

```bash
make compose-down
```

## Helm 차트

시작용 차트 경로:

- `deploy/helm/korean-erp`

설치 예시:

```bash
helm install korean-erp deploy/helm/korean-erp
```

차트는 이미지 태그, 환경변수, ingress, persistence, secret 참조를 설정할 수 있습니다.

## 아키텍처 기준

- 코어 API는 **모듈형 모놀리스**를 유지합니다.
- 근태 연동은 **edge-agent + generic adapter**를 기본으로 합니다.
- 문서 전략은 **HWPX 우선**, legacy HWP는 fallback adapter만 유지합니다.
- 감사 로그 중심의 데이터 모델 베이스라인을 Prisma 스키마에 포함했습니다.
- API 인증은 bearer 세션 + 회사 컨텍스트(`x-company-id`)를 사용합니다.

## 기반 모듈 구현 (PROMPT03)

- `auth`: local login/logout/me, 세션 토큰, OIDC 확장용 provider 추상화
- `org`: company/legal-entity/business-site/department CRUD + 부서 트리
- `employee`: employee number 기반 직원 CRUD, position/title 분리
- `audit`: 생성/수정/삭제 및 인증 민감 동작 감사로그 저장/조회
- Swagger 문서: `/swagger`

## 문서

- 실행 계획: `docs/PLAN.md`
- ADR: `docs/adr/`
- API 노트: `docs/api/README.md`
- 운영 노트: `docs/ops/README.md`
- 기여 가이드: `CONTRIBUTING.md`
- 보안 정책: `SECURITY.md`

## 라이선스

Apache-2.0 (`LICENSE` 참고)
