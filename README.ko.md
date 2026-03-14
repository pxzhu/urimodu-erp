[English](./README.md) | [English Mirror](./README.en.md)

# 우리모두 ERP (한국형 사용자 설치형 ERP)

한국 실무 워크플로우를 중심으로 한 Apache-2.0 공개 오픈소스 사용자 설치형 ERP/업무 플랫폼입니다.

## 비전

프로젝트 방향성과 원칙은 [VISION.md](./VISION.md)를 먼저 읽는 것을 권장합니다.  
영문 비전: [VISION.en.md](./VISION.en.md)

## 현재 상태

현재 저장소에는 PROMPT02-PROMPT07 기준의 실행 가능한 기반이 포함되어 있습니다.

- `pnpm` + `turbo` 모노레포
- Next.js 웹 앱 (`apps/web`)
- NestJS 모듈형 모놀리스 API (`apps/api`)
- Worker (`apps/worker`), docs-service (`apps/docs-service`), connector gateway (`apps/connector-gateway`)
- Go edge-agent 스캐폴드 (`agents/edge-agent`)
- Docker Compose 스택 + Helm 시작 차트
- Prisma 스키마, 마이그레이션, 한국 샘플 시드 데이터

## 프롬프트 진행 현황

- PROMPT02: OSS 부트스트랩, 모노레포 기반, CI/배포 스켈레톤
- PROMPT03: auth/org/employee/audit 모듈
- PROMPT04: files/documents/approvals/signatures/PDF 수직 슬라이스
- PROMPT05: attendance/leave/integrations/edge-agent 수직 슬라이스
- PROMPT06: expenses/finance/import-export 수직 슬라이스
- PROMPT07: 최종화 문서, ADR 보강, 운영 런북, 스모크 테스트, 로드맵

## 아키텍처 기준

- 코어 API는 모듈형 모놀리스 구조를 유지합니다.
- 문서 전략은 HWPX 우선이며, 레거시 HWP는 fallback 전용 어댑터로 제한합니다.
- 근태는 immutable raw 이벤트와 normalized ledger를 분리합니다.
- 중요한 변경 동작은 audit log를 기록합니다.
- 외부 연동은 generic contract + edge-agent/gateway 경계를 사용합니다.

아키텍처 다이어그램: [docs/architecture/README.md](./docs/architecture/README.md)

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
  architecture/
  adr/
  api/
  deploy/
  ops/
  testing/
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

### 서비스 엔드포인트

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger UI: `http://localhost:4000/swagger`
- OpenAPI JSON: `http://localhost:4000/swagger-json`
- Worker health: `http://localhost:4100/health`
- Connector gateway health: `http://localhost:4200/health`
- Docs service health: `http://localhost:4300/health`

## Docker Compose

```bash
cp deploy/compose/.env.example deploy/compose/.env
make compose-up
```

중지:

```bash
make compose-down
```

가이드: [docs/deploy/docker-compose.md](./docs/deploy/docker-compose.md)

## 시드 데이터

```bash
pnpm --filter @korean-erp/api prisma:seed
```

시드 사용자:

- `admin@acme.local`
- `hr@acme.local`
- `manager@acme.local`
- `employee@acme.local`

기본 비밀번호: `ChangeMe123!` (`SEED_DEFAULT_PASSWORD`로 변경 가능)

시드/템플릿 상세: [docs/ops/seeding.md](./docs/ops/seeding.md)

## 운영 및 보안

- 운영 문서 인덱스: [docs/ops/README.md](./docs/ops/README.md)
- 백업/복구: [docs/ops/backup-restore.md](./docs/ops/backup-restore.md)
- 운영 환경 노트: [docs/ops/production.md](./docs/ops/production.md)
- 보안 체크리스트: [docs/ops/security-checklist.md](./docs/ops/security-checklist.md)
- 스모크 테스트: [docs/testing/smoke-tests.md](./docs/testing/smoke-tests.md)

부팅 후 스모크 테스트:

```bash
make smoke
```

## Helm

차트 경로: `deploy/helm/korean-erp`

```bash
helm install korean-erp deploy/helm/korean-erp
```

Values 가이드: [docs/deploy/helm-values.md](./docs/deploy/helm-values.md)

## 로드맵

다음 단계 우선순위는 [docs/roadmap.md](./docs/roadmap.md)에서 관리합니다.

- payroll
- advanced accounting
- deeper ADT/S1 adapters
- HWPX export hardening
- mobile app
- notification integrations

## 라이선스

Apache-2.0 ([LICENSE](./LICENSE))
