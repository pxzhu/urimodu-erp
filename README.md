[한국어](./README.ko.md)

# Korean Self-Hosted ERP

Public open-source foundation for a self-hosted Korean ERP/work platform.

## Vision

Before diving into setup and code, we recommend reading [VISION.md](./VISION.md) first.  
English version: [VISION.en.md](./VISION.en.md)

## Status

This repository currently contains:

- Monorepo scaffold (`pnpm` + `turbo`)
- Next.js web app foundation + auth/org/employee/document/approval + attendance/leave UI screens (`apps/web`)
- NestJS modular-monolith API with foundational modules and PROMPT05 attendance/leave/integration workflow (`apps/api`)
- Worker/docs-service/connector-gateway runnable services with attendance normalization/ingress forwarding
- Go edge-agent scaffold with CSV directory polling, external ID mapping, and failed-send buffering
- Docker Compose + Helm starter
- Prisma schema baseline, migrations, and Korean sample seeds

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
  PLAN.md
  adr/
  api/
  ops/
```

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker / Docker Compose (optional but recommended)
- Go 1.19+ (for edge-agent local run)

### Install and Run

```bash
make bootstrap
cp .env.example .env
pnpm dev
```

### Service Endpoints (local dev)

- Web: `http://localhost:3000`
- Web health: `http://localhost:3000/health`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`
- Swagger: `http://localhost:4000/swagger`
- Worker health: `http://localhost:4100/health`
- Connector gateway health: `http://localhost:4200/health`
- Docs service health: `http://localhost:4300/health`

### Seeded Login (Local Auth)

- Email: `admin@acme.local`
- Password: `ChangeMe123!`
- Seed command: `pnpm --filter @korean-erp/api prisma:seed`

Additional seeded users: `hr@acme.local`, `manager@acme.local`, `employee@acme.local`.

## Docker Compose

Run full local stack (PostgreSQL, Redis, MinIO, API, Web, Worker, gateway, docs-service):

```bash
cp deploy/compose/.env.example deploy/compose/.env
make compose-up
```

Stop stack:

```bash
make compose-down
```

## Helm Chart

Starter chart is located at:

- `deploy/helm/korean-erp`

Example install:

```bash
helm install korean-erp deploy/helm/korean-erp
```

The chart supports configurable image tags, env vars, ingress settings, persistence, and secret references.

## Architecture Baseline

- Core API is a **modular monolith** (no premature microservice split)
- Attendance integrations are **edge-agent + generic adapters** first
- **HWPX-first** document strategy; legacy HWP is fallback adapter only
- Audit-first data model baseline is included in Prisma schema
- API auth uses bearer sessions with company context (`x-company-id`) for membership-scoped access

## Foundational Modules (PROMPT03-04)

- `auth`: local login/logout/me, session token, OIDC-ready provider abstraction
- `org`: company/legal-entity/business-site/department CRUD + department tree
- `employee`: employee CRUD with employee number, position/title separation
- `audit`: mutation/auth action logs and query endpoint
- `files`: MinIO-backed file upload/download + metadata/checksum + audit logging
- `documents`: template-based document create/version + attachment linking + PDF render trigger
- `approvals`: approval line configure/submit/approve/reject/cancel/resubmit + inbox
- `signatures`: signature/seal asset registration from uploaded files
- Swagger docs available at `/swagger` for these endpoints

## PROMPT04 Web Screens

- `GET /files` UI: upload, metadata list, download
- `GET /documents` UI: template-based document create, version add, approval routing, submit, PDF download
- `GET /approvals` UI: approval inbox with approve/reject and comment

## Attendance and Leave Vertical Slice (PROMPT05)

- Raw attendance ingestion endpoints (`/integrations/attendance/raw`, `/integrations/attendance/raw/batch`, `/integrations/attendance/raw/csv`)
- Attendance query endpoints (`/attendance/raw-events`, `/attendance/ledgers`)
- Shift policy starter endpoints (`/attendance/shift-policies`, create/update version)
- Leave and correction endpoints (`/leave/policies`, `/leave/requests`, `/attendance-corrections`)
- Worker normalization job from immutable `AttendanceRawEvent` -> `AttendanceLedger` with policy version capture
- Edge-agent CSV directory watch + local buffer retry + external ID map config

## Documentation

- Plan: `docs/PLAN.md`
- ADRs: `docs/adr/`
- API notes: `docs/api/README.md`
- Ops notes: `docs/ops/README.md`
- Contribution: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`

## License

Apache-2.0. See `LICENSE`.
