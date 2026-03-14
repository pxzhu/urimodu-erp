[한국어](./README.ko.md) | [English Mirror](./README.en.md)

# Urimodu ERP (Korean Self-Hosted ERP)

Open-source, Apache-2.0 licensed, self-hosted ERP/work platform focused on Korean business workflows.

## Vision

Read [VISION.md](./VISION.md) first for project direction and principles.  
English vision: [VISION.en.md](./VISION.en.md)

## Current Status

The repository currently provides a runnable PROMPT02-PROMPT07 baseline:

- `pnpm` + `turbo` monorepo
- Next.js web app (`apps/web`)
- NestJS modular-monolith API (`apps/api`)
- Worker (`apps/worker`), docs-service (`apps/docs-service`), connector gateway (`apps/connector-gateway`)
- Go edge-agent scaffold (`agents/edge-agent`)
- Docker Compose stack + Helm chart starter
- Prisma schema, migrations, Korean sample seed data

## Prompt Progress

- PROMPT02: OSS bootstrap, monorepo foundation, CI and deploy skeleton
- PROMPT03: auth/org/employee/audit modules
- PROMPT04: files/documents/approvals/signatures/PDF vertical slice
- PROMPT05: attendance/leave/integrations/edge-agent vertical slice
- PROMPT06: expenses/finance/import-export vertical slice
- PROMPT07: finalization docs, ADR hardening, runbooks, smoke tests, roadmap

## Architecture Baseline

- Core API remains a modular monolith.
- Document strategy is HWPX-first, with legacy HWP fallback-only adapters.
- Attendance keeps immutable raw events and normalized ledgers.
- Important mutations write audit logs.
- Edge integrations use generic contracts and edge-agent/gateway boundaries.

Architecture diagrams: [docs/architecture/README.md](./docs/architecture/README.md)

## Monorepo Structure

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

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker / Docker Compose (recommended)
- Go 1.19+ (if running edge-agent)

### Install and Run

```bash
make bootstrap
cp .env.example .env
pnpm dev
```

### Service Endpoints

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

Stop:

```bash
make compose-down
```

Guide: [docs/deploy/docker-compose.md](./docs/deploy/docker-compose.md)

## Seed Data

```bash
pnpm --filter @korean-erp/api prisma:seed
```

Seed users:

- `admin@acme.local`
- `hr@acme.local`
- `manager@acme.local`
- `employee@acme.local`

Default password: `ChangeMe123!` (override via `SEED_DEFAULT_PASSWORD`)

Seed + template details: [docs/ops/seeding.md](./docs/ops/seeding.md)

## Operations and Security

- Ops index: [docs/ops/README.md](./docs/ops/README.md)
- Backup/restore: [docs/ops/backup-restore.md](./docs/ops/backup-restore.md)
- Production notes: [docs/ops/production.md](./docs/ops/production.md)
- Security checklist: [docs/ops/security-checklist.md](./docs/ops/security-checklist.md)
- Smoke tests: [docs/testing/smoke-tests.md](./docs/testing/smoke-tests.md)

Run smoke checks after boot:

```bash
make smoke
```

## Helm

Chart path: `deploy/helm/korean-erp`

```bash
helm install korean-erp deploy/helm/korean-erp
```

Values guide: [docs/deploy/helm-values.md](./docs/deploy/helm-values.md)

## Roadmap

Next roadmap priorities are tracked in [docs/roadmap.md](./docs/roadmap.md):

- payroll
- advanced accounting
- deeper ADT/S1 adapters
- HWPX export hardening
- mobile app
- notification integrations

## License

Apache-2.0 ([LICENSE](./LICENSE))
